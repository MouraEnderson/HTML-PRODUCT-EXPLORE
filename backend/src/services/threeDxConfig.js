function trimSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function hasCredentialPair(username, password) {
  return Boolean(String(username || '').trim() && String(password || '').trim());
}

export function getThreeDxConfig() {
  const spaceUrl = trimSlash(process.env.THREEDX_SPACE_URL || process.env.SPACE_URL || '');
  const securityContext = String(
    process.env.THREEDX_SECURITY_CONTEXT || process.env.SECURITY_CONTEXT || ''
  ).trim();
  const username = String(process.env.THREEDX_USERNAME || '').trim();
  const password = String(process.env.THREEDX_PASSWORD || '').trim();
  const bearerToken = String(process.env.ENOVIA_BEARER_TOKEN || '').trim();
  const cookie = String(process.env.ENOVIA_COOKIE || '').trim();
  const csrfToken = String(process.env.ENO_CSRF_TOKEN || '').trim();
  const bomServiceMode = String(process.env.BOM_SERVICE_MODE || '').trim().toLowerCase();

  const usernameConfigured = Boolean(username);
  const passwordConfigured = Boolean(password);
  const bearerConfigured = Boolean(bearerToken);
  const cookieConfigured = Boolean(cookie);
  const credentialsConfigured =
    hasCredentialPair(username, password) || bearerConfigured || cookieConfigured;

  const isConfigured = Boolean(spaceUrl && securityContext && credentialsConfigured);

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
    securityContext,
    username,
    password,
    bearerToken,
    cookie,
    csrfToken,
    usernameConfigured,
    passwordConfigured,
    credentialsConfigured,
    isConfigured,
    upstream: {
      spaceUrlConfigured: Boolean(spaceUrl),
      securityContextConfigured: Boolean(securityContext),
      credentialsConfigured
    }
  };
}

export function getPublicEnvironmentFlags(config = getThreeDxConfig()) {
  let credentialsMode = 'none';
  if (config.bomServiceMode === 'mock' || config.mode === 'mock') {
    credentialsMode = 'mock';
  } else if (hasCredentialPair(config.username, config.password)) {
    credentialsMode = 'env';
  } else if (config.bearerToken) {
    credentialsMode = 'bearer';
  } else if (config.cookie) {
    credentialsMode = 'cookie';
  }

  return {
    spaceUrlConfigured: config.upstream.spaceUrlConfigured,
    securityContextConfigured: config.upstream.securityContextConfigured,
    credentialsMode
  };
}
