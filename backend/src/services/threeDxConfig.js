import { existsSync, readFileSync } from 'node:fs';
import {
  DEFAULT_THREEDX_SPACE_URL,
  parsePassportUrlMeta,
  resolveThreeDxSpaceUrl
} from './threeDxUrlValidation.js';

function readSecretFile(name) {
  const paths = [`/etc/secrets/${name}`, `/run/secrets/${name}`];
  for (const filePath of paths) {
    try {
      if (existsSync(filePath)) {
        return readFileSync(filePath, 'utf8').trim();
      }
    } catch {
      // ignore unreadable secret mount
    }
  }
  return '';
}

function envOrSecret(name) {
  const fromEnv = String(process.env[name] || '').replace(/^\uFEFF/, '').trim();
  if (fromEnv) return fromEnv;
  return readSecretFile(name);
}

function hasCredentialPair(username, password) {
  return Boolean(String(username || '').trim() && String(password || '').trim());
}

function resolveAuth({ bearerToken, cookie, username, password, authModeEnv }) {
  const hasUserPass = hasCredentialPair(username, password);
  if (bearerToken) {
    return { authMode: 'bearer', authConfigured: true, needsExplicitMode: false, casFallback: false };
  }
  if (hasUserPass && authModeEnv !== 'cookie-only' && authModeEnv !== 'cookie') {
    return { authMode: 'cas', authConfigured: true, needsExplicitMode: false, casFallback: false };
  }
  if (cookie && (authModeEnv === 'cookie' || authModeEnv === 'cookie-only' || !hasUserPass)) {
    return {
      authMode: 'cookie',
      authConfigured: true,
      needsExplicitMode: false,
      casFallback: false
    };
  }
  if (authModeEnv === 'basic' && hasUserPass) {
    return { authMode: 'basic', authConfigured: true, needsExplicitMode: false, casFallback: false };
  }
  if (hasUserPass) {
    return { authMode: 'none', authConfigured: false, needsExplicitMode: true, casFallback: false };
  }
  return { authMode: 'none', authConfigured: false, needsExplicitMode: false, casFallback: false };
}

function stripEnvAssignment(value, key) {
  const raw = String(value || '').replace(/^\uFEFF/, '').trim();
  const prefix = `${key}=`;
  if (raw.toLowerCase().startsWith(prefix.toLowerCase())) {
    return raw.slice(prefix.length).trim();
  }
  return raw;
}

function stripSecurityContext(value) {
  let raw = stripEnvAssignment(String(value || ''), 'THREEDX_SECURITY_CONTEXT');
  raw = stripEnvAssignment(raw, 'SECURITY_CONTEXT');
  const hadNewline = /[\r\n]/.test(raw);
  const normalized = raw.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return { normalized, hadNewline };
}

export function getThreeDxConfig() {
  const rawThreeDxSpaceUrl = stripEnvAssignment(envOrSecret('THREEDX_SPACE_URL'), 'THREEDX_SPACE_URL');
  const rawLegacySpaceUrl = stripEnvAssignment(envOrSecret('SPACE_URL'), 'SPACE_URL');
  const spaceSourceRaw = rawThreeDxSpaceUrl || rawLegacySpaceUrl;
  const spaceResolved = resolveThreeDxSpaceUrl(spaceSourceRaw);
  const passportRaw = stripEnvAssignment(envOrSecret('THREEDX_PASSPORT_URL'), 'THREEDX_PASSPORT_URL');
  const passportMeta = parsePassportUrlMeta(passportRaw);
  const passportUrl = passportMeta.passportUrl;
  const passportUrlHost = passportMeta.passportUrlHost;
  const passportUrlIgnored = passportMeta.passportUrlIgnored;
  const securityContextRaw = envOrSecret('THREEDX_SECURITY_CONTEXT') || envOrSecret('SECURITY_CONTEXT') || process.env.SECURITY_CONTEXT || '';
  const securityContextParsed = stripSecurityContext(securityContextRaw);
  const securityContext = securityContextParsed.normalized;
  const securityContextHadNewline = securityContextParsed.hadNewline;
  const securityContextValid = /^ctx::/.test(securityContext);
  const username = stripEnvAssignment(envOrSecret('THREEDX_USERNAME'), 'THREEDX_USERNAME');
  const password = stripEnvAssignment(envOrSecret('THREEDX_PASSWORD'), 'THREEDX_PASSWORD');
  const bearerToken = envOrSecret('ENOVIA_BEARER_TOKEN');
  const cookie = envOrSecret('ENOVIA_COOKIE');
  const csrfToken = envOrSecret('ENO_CSRF_TOKEN');
  const bomServiceMode = String(process.env.BOM_SERVICE_MODE || '').trim().toLowerCase();
  const authModeEnv = String(process.env.THREEDX_AUTH_MODE || '').trim().toLowerCase();

  const usernameConfigured = Boolean(username);
  const passwordConfigured = Boolean(password);
  const auth = resolveAuth({ bearerToken, cookie, username, password, authModeEnv });

  const isConfigured = Boolean(spaceResolved.spaceUrl && securityContext && auth.authConfigured);

  let mode;
  if (bomServiceMode === 'mock') {
    mode = 'mock';
  } else if (bomServiceMode === 'dseng') {
    mode = isConfigured ? 'dseng-official' : 'not-configured';
  } else if (isConfigured) {
    mode = 'dseng-official';
  } else {
    mode = 'not-configured';
  }

  return {
    mode,
    bomServiceMode,
    spaceUrl: spaceResolved.spaceUrl,
    spaceUrlHost: spaceResolved.spaceUrlHost,
    spaceUrlPath: spaceResolved.spaceUrlPath,
    spaceUrlValid: spaceResolved.spaceUrlValid,
    spaceUrlUsedDefault: spaceResolved.spaceUrlUsedDefault,
    spaceUrlRejectedHost: spaceResolved.spaceUrlRejectedHost,
    spaceUrlConfigError: spaceResolved.spaceUrlConfigError,
    spaceUrlDerivedFromIfwe: spaceResolved.spaceUrlDerivedFromIfwe,
    spaceUrlInvalid: spaceResolved.spaceUrlInvalid,
    defaultSpaceUrl: DEFAULT_THREEDX_SPACE_URL,
    passportUrl,
    passportUrlHost,
    passportUrlIgnored,
    securityContext,
    securityContextValid,
    securityContextHadNewline,
    username,
    password,
    bearerToken,
    cookie,
    csrfToken,
    authMode: auth.authMode,
    authModeEnv,
    authConfigured: auth.authConfigured,
    authNeedsExplicitMode: auth.needsExplicitMode,
    casFallback: auth.casFallback,
    usernameConfigured,
    passwordConfigured,
    credentialsConfigured: auth.authConfigured,
    isConfigured,
    upstream: {
      spaceUrlConfigured: Boolean(spaceResolved.spaceUrl),
      securityContextConfigured: Boolean(securityContext),
      credentialsConfigured: auth.authConfigured
    }
  };
}

export function getPublicEnvironmentFlags(config = getThreeDxConfig()) {
  let credentialsMode = 'none';
  if (config.bomServiceMode === 'mock' || config.mode === 'mock') {
    credentialsMode = 'mock';
  } else if (config.authMode === 'bearer') {
    credentialsMode = 'bearer';
  } else if (config.authMode === 'cookie') {
    credentialsMode = 'cookie';
  } else if (config.authMode === 'cas') {
    credentialsMode = 'cas';
  } else if (config.authMode === 'basic') {
    credentialsMode = 'basic';
  }

  return {
    spaceUrlConfigured: config.upstream.spaceUrlConfigured,
    securityContextConfigured: config.upstream.securityContextConfigured,
    credentialsMode
  };
}
