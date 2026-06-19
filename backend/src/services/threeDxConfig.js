import { sanitizeSpaceUrl } from './threeDxCasAuth.js';

function trimSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function hasCredentialPair(username, password) {
  return Boolean(String(username || '').trim() && String(password || '').trim());
}

function resolveAuth({ bearerToken, cookie, username, password, authModeEnv }) {
  const hasUserPass = hasCredentialPair(username, password);
  if (bearerToken) {
    return { authMode: 'bearer', authConfigured: true, needsExplicitMode: false, casFallback: false };
  }
  if (hasUserPass && (authModeEnv === 'cas' || authModeEnv === 'auto' || !cookie)) {
    return { authMode: 'cas', authConfigured: true, needsExplicitMode: false, casFallback: false };
  }
  if (cookie) {
    return {
      authMode: 'cookie',
      authConfigured: true,
      needsExplicitMode: false,
      casFallback: hasUserPass && authModeEnv !== 'cookie-only'
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

export function getThreeDxConfig() {
  const spaceUrl = sanitizeSpaceUrl(process.env.THREEDX_SPACE_URL || process.env.SPACE_URL || '');
  const passportUrl = trimSlash(process.env.THREEDX_PASSPORT_URL || '');
  const securityContext = String(
    process.env.THREEDX_SECURITY_CONTEXT || process.env.SECURITY_CONTEXT || ''
  ).trim();
  const username = String(process.env.THREEDX_USERNAME || '').trim();
  const password = String(process.env.THREEDX_PASSWORD || '').trim();
  const bearerToken = String(process.env.ENOVIA_BEARER_TOKEN || '').trim();
  const cookie = String(process.env.ENOVIA_COOKIE || '').trim();
  const csrfToken = String(process.env.ENO_CSRF_TOKEN || '').trim();
  const bomServiceMode = String(process.env.BOM_SERVICE_MODE || '').trim().toLowerCase();
  const authModeEnv = String(process.env.THREEDX_AUTH_MODE || '').trim().toLowerCase();

  const usernameConfigured = Boolean(username);
  const passwordConfigured = Boolean(password);
  const auth = resolveAuth({ bearerToken, cookie, username, password, authModeEnv });

  const isConfigured = Boolean(spaceUrl && securityContext && auth.authConfigured);

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
    spaceUrl,
    passportUrl,
    securityContext,
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
      spaceUrlConfigured: Boolean(spaceUrl),
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
