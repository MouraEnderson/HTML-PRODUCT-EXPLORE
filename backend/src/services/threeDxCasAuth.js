const SESSION_TTL_MS = 90 * 60 * 1000;
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
const JSON_ACCEPT = 'application/json, text/plain, */*';

const sessionCache = new Map();

function trimSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

export function sanitizeSpaceUrl(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/https:\/\/r\d+-[a-z0-9]+-space\.3dexperience\.3ds\.com\/enovia/i);
  if (match) return match[0].replace(/\/$/, '');
  return trimSlash(raw);
}

export function sanitizePassportUrl(value) {
  const raw = String(value || '').replace(/^\uFEFF/, '').trim();
  const stripped = raw.replace(/^THREEDX_PASSPORT_URL=/i, '').trim();
  const match = stripped.match(/https:\/\/r\d+-[a-z0-9]+\.iam\.3dexperience\.3ds\.com/i);
  if (match) return match[0].replace(/\/$/, '');
  return '';
}

export function derivePassportCandidates(spaceUrl, explicitPassportUrl = '') {
  const explicit = sanitizePassportUrl(explicitPassportUrl);
  if (explicit) return [explicit];
  const match = String(spaceUrl).match(/https:\/\/(r\d+)-([a-z0-9]+)-space\.3dexperience\.3ds\.com/i);
  if (!match) return [];
  const tenant = match[1].toLowerCase();
  const spaceRegion = match[2].toLowerCase();
  const regions = [...new Set([spaceRegion === 'us1' ? 'eu1' : spaceRegion, 'eu1', 'us1'])];
  return regions.map((region) => `https://${tenant}-${region}.iam.3dexperience.3ds.com`);
}

class CookieJar {
  constructor() {
    this.map = new Map();
  }

  ingest(response, requestUrl = '') {
    const lines = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
    if (!lines.length) {
      const raw = response.headers.get('set-cookie');
      if (raw) lines.push(...raw.split(/,(?=[^;]+?=)/));
    }
    for (const line of lines) {
      const [pair] = String(line).split(';');
      const idx = pair.indexOf('=');
      if (idx < 1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (name) this.map.set(name, value);
    }
    void requestUrl;
  }

  header() {
    return [...this.map.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  has(name) {
    return this.map.has(name);
  }

  hasSsoCookie() {
    return this.has('CASTGC') || this.has('CATSTGC');
  }
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractCsrf(payload) {
  const csrf = payload?.json?.csrf;
  if (typeof csrf === 'string') return { name: 'ENO_CSRF_TOKEN', value: csrf };
  return {
    name: csrf?.name || payload?.json?.csrfName || 'ENO_CSRF_TOKEN',
    value: csrf?.value || payload?.json?.token || ''
  };
}

async function readResponse(response) {
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    contentType: response.headers.get('content-type') || '',
    text,
    json: parseJsonSafe(text)
  };
}

function loginPathsForPassport(passportUrl) {
  if (/\.iam\.3dexperience\.3ds\.com/i.test(passportUrl)) {
    return ['/login', '/cas/login'];
  }
  return ['/login', '/iam/login', '/cas/login'];
}

function resolveRedirectUrl(currentUrl, location) {
  const raw = String(location || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw, currentUrl).href;
  } catch {
    return raw;
  }
}

function normalizeCredential(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

async function fetchWithJar(jar, url, options = {}) {
  const headers = {
    'User-Agent': BROWSER_USER_AGENT,
    ...(options.headers || {})
  };
  const cookieHeader = jar.header();
  if (cookieHeader) headers.Cookie = cookieHeader;
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual'
    });
    jar.ingest(response, url);
    return response;
  } catch (error) {
    const safeUrl = String(url).replace(/ticket=[^&]+/gi, 'ticket=***');
    throw new Error(`CAS fetch failed for ${safeUrl}: ${error.message}`);
  }
}

async function followRedirects(jar, startResponse, startUrl, maxHops = 16, { securityContext = '', spaceUrl = '' } = {}) {
  let response = startResponse;
  let currentUrl = startUrl;
  const spaceHost = (() => {
    try {
      return spaceUrl ? new URL(spaceUrl).host : '';
    } catch {
      return '';
    }
  })();

  for (let hop = 0; hop < maxHops; hop += 1) {
    const status = response.status;
    if (status < 300 || status >= 400) {
      return readResponse(response);
    }
    const location = response.headers.get('location');
    if (!location) {
      return readResponse(response);
    }
    currentUrl = resolveRedirectUrl(currentUrl, location);
    const headers = { Accept: JSON_ACCEPT };
    if (securityContext && spaceHost && currentUrl.includes(spaceHost)) {
      headers.SecurityContext = securityContext;
    }
    response = await fetchWithJar(jar, currentUrl, { method: 'GET', headers });
  }
  return readResponse(response);
}

function cacheKey(config) {
  return [
    sanitizeSpaceUrl(config.spaceUrl),
    String(config.securityContext || ''),
    String(config.username || ''),
    trimSlash(config.passportUrl || '')
  ].join('|');
}

export function invalidateCasSession(config = {}) {
  sessionCache.delete(cacheKey(config));
}

function isCredentialRejection(error) {
  return /CAS login rejected/i.test(String(error?.message || ''));
}

function isTicketUnavailable(error) {
  return /login ticket unavailable/i.test(String(error?.message || ''));
}

export async function casLogin(config, { forceRefresh = false } = {}) {
  const spaceUrl = sanitizeSpaceUrl(config.spaceUrl);
  const username = normalizeCredential(config.username);
  const password = normalizeCredential(config.password);
  const securityContext = normalizeCredential(config.securityContext);
  if (!spaceUrl || !username || !password) {
    throw new Error('CAS login requires spaceUrl, username and password');
  }

  const key = cacheKey({ ...config, spaceUrl });
  const cached = sessionCache.get(key);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const passportCandidates = derivePassportCandidates(spaceUrl, config.passportUrl);
  if (!passportCandidates.length) {
    throw new Error('Unable to derive 3DPassport URL from THREEDX_SPACE_URL');
  }

  let lastError = null;
  for (const passportUrl of passportCandidates) {
    try {
      const session = await casLoginOnce({
        passportUrl,
        spaceUrl,
        securityContext,
        username,
        password
      });
      const record = {
        ...session,
        passportUrl,
        expiresAt: Date.now() + SESSION_TTL_MS
      };
      sessionCache.set(key, record);
      return record;
    } catch (error) {
      lastError = error;
      if (isCredentialRejection(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('CAS login failed for all passport URL candidates');
}

async function casLoginOnce({ passportUrl, spaceUrl, securityContext, username, password }) {
  const loginPaths = loginPathsForPassport(passportUrl);
  let lastError = null;
  let lastTicketError = null;

  for (const loginPath of loginPaths) {
    const jar = new CookieJar();
    try {
      return await casLoginWithPath({
        jar,
        passportUrl,
        loginPath,
        spaceUrl,
        securityContext,
        username,
        password
      });
    } catch (error) {
      lastError = error;
      if (isCredentialRejection(error)) {
        throw error;
      }
      if (isTicketUnavailable(error)) {
        lastTicketError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastTicketError || lastError || new Error('CAS login failed for all passport login paths');
}

function extractLoginTicket(payload) {
  const json = payload?.json;
  if (json && typeof json.lt === 'string' && json.lt) return json.lt;
  if (json?.response && typeof json.response.lt === 'string' && json.response.lt) return json.response.lt;
  const text = String(payload?.text || '');
  const jsonMatch = text.match(/"lt"\s*:\s*"([^"]+)"/);
  if (jsonMatch) return jsonMatch[1];
  const htmlMatch = text.match(/name=["']lt["'][^>]*value=["']([^"']+)["']/i)
    || text.match(/value=["']([^"']+)["'][^>]*name=["']lt["']/i);
  return htmlMatch ? htmlMatch[1] : '';
}

async function fetchLoginTicket(jar, passportUrl, loginPath) {
  const url = `${passportUrl}${loginPath}?action=get_auth_params`;
  const headerSets = [
    { Accept: JSON_ACCEPT, 'X-Requested-With': 'XMLHttpRequest' },
    { Accept: JSON_ACCEPT },
    { Accept: BROWSER_ACCEPT }
  ];
  let lastPayload = null;
  for (const headers of headerSets) {
    const ticketResponse = await fetchWithJar(jar, url, { method: 'GET', headers });
    const ticketPayload = await readResponse(ticketResponse);
    lastPayload = ticketPayload;
    const lt = extractLoginTicket(ticketPayload);
    if (lt) return { lt, ticketPayload, loginPath };
  }
  return { lt: '', ticketPayload: lastPayload, loginPath };
}

function loginRejectedPayload(payload) {
  const text = String(payload?.text || '').toLowerCase();
  return /authentication failed|invalid credentials|bad credentials|login error|incorrect password|login \| 3dexperience id|title>login/i.test(text);
}

async function casLoginWithPath({
  jar,
  passportUrl,
  loginPath,
  spaceUrl,
  securityContext,
  username,
  password
}) {
  const serviceUrl = `${spaceUrl}/resources/v1/application/CSRF`;
  const { lt, ticketPayload } = await fetchLoginTicket(jar, passportUrl, loginPath);
  if (!lt) {
    if (ticketPayload.status === 403) {
      throw new Error('CAS_PASSPORT_BLOCKED: 3DPassport blocked server login (403)');
    }
    throw new Error(`CAS login ticket unavailable (${ticketPayload.status})`);
  }

  const loginUrl = `${passportUrl}${loginPath}?service=${encodeURIComponent(serviceUrl)}`;
  const loginBody = new URLSearchParams({
    lt,
    username,
    password,
    rememberMe: 'no'
  }).toString();
  const loginResponse = await fetchWithJar(jar, loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: BROWSER_ACCEPT,
      Origin: passportUrl,
      Referer: `${passportUrl}${loginPath}`
    },
    body: loginBody
  });

  const loginStatus = loginResponse.status;
  const hasRedirect = Boolean(loginResponse.headers.get('location'));
  const hasSsoBeforeRedirect = jar.hasSsoCookie();

  if (loginStatus === 401 || loginStatus === 403) {
    throw new Error('CAS login rejected — verify THREEDX_USERNAME and THREEDX_PASSWORD');
  }

  if (loginStatus === 200 && !hasRedirect && !hasSsoBeforeRedirect) {
    const loginPayload = await readResponse(loginResponse);
    if (loginRejectedPayload(loginPayload)) {
      throw new Error('CAS login rejected — verify THREEDX_USERNAME and THREEDX_PASSWORD');
    }
    if (!jar.hasSsoCookie()) {
      throw new Error('CAS login rejected — verify THREEDX_USERNAME and THREEDX_PASSWORD');
    }
  }

  let finalResponse = await followRedirects(jar, loginResponse, loginUrl, 16, { securityContext, spaceUrl });
  let csrf = extractCsrf(finalResponse);

  if (!csrf.value || !finalResponse.ok) {
    const csrfResponse = await fetchWithJar(jar, serviceUrl, {
      method: 'GET',
      headers: {
        Accept: JSON_ACCEPT,
        ...(securityContext ? { SecurityContext: securityContext } : {})
      }
    });
    finalResponse = await readResponse(csrfResponse);
    csrf = extractCsrf(finalResponse);
  }

  const cookieHeader = jar.header();

  if (!cookieHeader) {
    throw new Error('CAS login completed without session cookies');
  }
  if (!jar.hasSsoCookie() && !jar.has('JSESSIONID')) {
    throw new Error('CAS login completed without SSO or session cookies');
  }
  if (finalResponse.status === 401 || finalResponse.status === 403) {
    throw new Error(`CAS service authentication failed (${finalResponse.status})`);
  }
  if (!csrf.value && !finalResponse.ok) {
    throw new Error(`CAS CSRF token unavailable (${finalResponse.status})`);
  }
  if (/invalid_grant|authenticated session|service ticket/i.test(finalResponse.text || '')) {
    throw new Error('CAS login returned authentication error from 3DSpace');
  }

  return {
    cookieHeader,
    csrfToken: csrf.value || '',
    csrfHeaderName: csrf.name || 'ENO_CSRF_TOKEN'
  };
}

export async function getCasCredentials(config, options = {}) {
  const session = await casLogin(config, options);
  return {
    cookie: session.cookieHeader,
    csrfToken: session.csrfToken || '',
    csrfHeaderName: session.csrfHeaderName || 'ENO_CSRF_TOKEN'
  };
}

export async function probeCasAuth(config = {}) {
  const spaceUrl = sanitizeSpaceUrl(config.spaceUrl);
  const username = normalizeCredential(config.username);
  const password = normalizeCredential(config.password);
  const passportCandidates = derivePassportCandidates(spaceUrl, config.passportUrl);
  const probe = {
    spaceUrl: Boolean(spaceUrl),
    usernameConfigured: Boolean(username),
    passwordConfigured: Boolean(password),
    passportCandidates: passportCandidates.length,
    steps: []
  };

  if (!spaceUrl || !username || !password || !passportCandidates.length) {
    probe.error = 'CAS probe requires spaceUrl, username and password';
    return probe;
  }

  for (const passportUrl of passportCandidates) {
    const loginPaths = loginPathsForPassport(passportUrl);
    for (const loginPath of loginPaths) {
      const jar = new CookieJar();
      const step = {
        passportUrl,
        loginPath,
        ticketStatus: 0,
        ticketContentType: '',
        hasLt: false,
        bodyLength: 0,
        hasPassportSession: false
      };
      try {
        const { lt, ticketPayload } = await fetchLoginTicket(jar, passportUrl, loginPath);
        step.ticketStatus = ticketPayload.status;
        step.ticketContentType = ticketPayload.contentType;
        step.bodyLength = String(ticketPayload.text || '').length;
        step.hasLt = Boolean(lt);
        step.hasPassportSession = jar.has('JSESSIONID');
        probe.steps.push(step);
        if (lt) {
          probe.selectedPassport = passportUrl;
          probe.selectedLoginPath = loginPath;
          probe.ticketOk = true;
          return probe;
        }
      } catch (error) {
        step.error = String(error?.message || error);
        probe.steps.push(step);
      }
    }
  }

  probe.ticketOk = false;
  probe.error = 'CAS login ticket unavailable on all passport candidates';
  return probe;
}
