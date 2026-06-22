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
  const spaceMatch = raw.match(/https:\/\/(r\d+)-([a-z0-9]+)-space\.3dexperience\.3ds\.com(?:\/enovia)?/i);
  if (spaceMatch) {
    const tenant = spaceMatch[1].toLowerCase();
    const region = spaceMatch[2].toLowerCase();
    return `https://${tenant}-${region}-space.3dexperience.3ds.com/enovia`;
  }
  const ifweMatch = raw.match(/https:\/\/(r\d+)-([a-z0-9]+)-ifwe\.3dexperience\.3ds\.com/i);
  if (ifweMatch) {
    const tenant = ifweMatch[1].toLowerCase();
    const region = ifweMatch[2].toLowerCase();
    return `https://${tenant}-${region}-space.3dexperience.3ds.com/enovia`;
  }
  if (/-ifwe\.|#dashboard/i.test(raw)) return '';
  return trimSlash(raw);
}

export function parseSpaceUrlMeta(value) {
  const raw = String(value || '').trim();
  const sanitized = sanitizeSpaceUrl(raw);
  let host = '';
  try {
    host = sanitized ? new URL(sanitized).hostname : '';
  } catch {
    host = '';
  }
  return {
    rawConfigured: Boolean(raw),
    sanitized,
    host,
    derivedFromIfwe: /-ifwe\./i.test(raw) && /-space\./i.test(sanitized),
    invalidIfweOrDashboard: /-ifwe\.|#dashboard/i.test(raw) && !sanitized
  };
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

function parseSetCookieLine(line, requestUrl) {
  const parts = String(line).split(';').map((part) => part.trim());
  const [nameValue] = parts;
  const idx = nameValue.indexOf('=');
  if (idx < 1) return null;
  const name = nameValue.slice(0, idx).trim();
  const value = nameValue.slice(idx + 1).trim();
  let domain = '';
  let path = '/';
  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower.startsWith('domain=')) domain = part.slice(7).trim().toLowerCase();
    else if (lower.startsWith('path=')) path = part.slice(5).trim() || '/';
  }
  if (!domain) {
    try {
      domain = new URL(requestUrl).hostname.toLowerCase();
    } catch {
      domain = '';
    }
  }
  return { name, value, domain, path };
}

function hostMatchesCookie(hostname, cookieDomain) {
  const host = String(hostname || '').toLowerCase();
  const domain = String(cookieDomain || '').toLowerCase().replace(/^\./, '');
  if (!host || !domain) return false;
  return host === domain || host.endsWith(`.${domain}`);
}

export class CookieJar {
  constructor() {
    this.cookies = [];
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
      const parsed = parseSetCookieLine(line, requestUrl);
      if (!parsed?.name) continue;
      this.cookies = this.cookies.filter(
        (cookie) => !(cookie.name === parsed.name && cookie.domain === parsed.domain && cookie.path === parsed.path)
      );
      this.cookies.push(parsed);
    }
  }

  headerForUrl(url) {
    let hostname = '';
    let pathname = '/';
    try {
      const parsed = new URL(url);
      hostname = parsed.hostname;
      pathname = parsed.pathname || '/';
    } catch {
      return '';
    }
    const matched = new Map();
    for (const cookie of this.cookies) {
      if (!hostMatchesCookie(hostname, cookie.domain)) continue;
      if (!pathname.startsWith(cookie.path || '/')) continue;
      matched.set(cookie.name, cookie.value);
    }
    return [...matched.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  header() {
    const matched = new Map();
    for (const cookie of this.cookies) {
      matched.set(cookie.name, cookie.value);
    }
    return [...matched.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  has(name) {
    return this.cookies.some((cookie) => cookie.name === name);
  }

  hasSsoCookie() {
    return this.has('CASTGC') || this.has('CATSTGC');
  }

  hasHostSession(hostname) {
    return this.cookies.some(
      (cookie) => cookie.name === 'JSESSIONID' && hostMatchesCookie(hostname, cookie.domain)
    );
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
  const cookieHeader = jar.headerForUrl(url);
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

async function followRedirects(jar, startResponse, startUrl, maxHops = 16) {
  let response = startResponse;
  let currentUrl = startUrl;

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
    response = await fetchWithJar(jar, currentUrl, {
      method: 'GET',
      headers: { Accept: JSON_ACCEPT }
    });
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
      if (isCredentialRejection(error) || !isTicketUnavailable(error)) {
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

async function postCasLogin(jar, { passportUrl, loginPath, loginUrl, lt, username, password }) {
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

  return loginResponse;
}

function summarizeAuthBody(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.startsWith('{')) {
    try {
      const json = JSON.parse(raw);
      const code = json.error || json.code || json.response;
      const desc = json.error_description || json.message || json.description;
      return [code, desc].filter(Boolean).join(': ').slice(0, 180);
    } catch {
      // fall through
    }
  }
  return raw.slice(0, 180);
}

async function finalizeCasSession(jar, serviceUrl, spaceUrl, finalResponse) {
  const csrf = extractCsrf(finalResponse);
  const spaceHost = new URL(spaceUrl).hostname;
  const cookieHeader = jar.headerForUrl(serviceUrl) || jar.headerForUrl(spaceUrl);

  if (!cookieHeader) {
    throw new Error('CAS login completed without session cookies');
  }
  if (!jar.hasSsoCookie() && !jar.hasHostSession(spaceHost)) {
    throw new Error('CAS login completed without SSO or session cookies');
  }
  if (finalResponse.status === 401 || finalResponse.status === 403) {
    const detail = summarizeAuthBody(finalResponse.text);
    throw new Error(
      detail
        ? `CAS service authentication failed (${finalResponse.status}): ${detail}`
        : `CAS service authentication failed (${finalResponse.status})`
    );
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

async function fetchCsrfSession(jar, serviceUrl, spaceUrl, securityContext = '') {
  const csrfHeaders = { Accept: JSON_ACCEPT };
  if (securityContext) csrfHeaders.SecurityContext = securityContext;

  let csrfResponse = await fetchWithJar(jar, serviceUrl, {
    method: 'GET',
    headers: csrfHeaders
  });
  let finalResponse = await followRedirects(jar, csrfResponse, serviceUrl, 16);
  if (finalResponse.ok && extractCsrf(finalResponse).value) {
    return finalizeCasSession(jar, serviceUrl, spaceUrl, finalResponse);
  }

  if (securityContext) {
    csrfResponse = await fetchWithJar(jar, serviceUrl, {
      method: 'GET',
      headers: { Accept: JSON_ACCEPT }
    });
    finalResponse = await followRedirects(jar, csrfResponse, serviceUrl, 16);
    if (finalResponse.ok && extractCsrf(finalResponse).value) {
      return finalizeCasSession(jar, serviceUrl, spaceUrl, finalResponse);
    }
  }

  return finalizeCasSession(jar, serviceUrl, spaceUrl, finalResponse);
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

  try {
    const serviceLoginUrl = `${passportUrl}${loginPath}?service=${encodeURIComponent(serviceUrl)}`;
    const serviceLoginResponse = await postCasLogin(jar, {
      passportUrl,
      loginPath,
      loginUrl: serviceLoginUrl,
      lt,
      username,
      password
    });
    const redirectLocation = serviceLoginResponse.headers.get('location') || '';
    if (serviceLoginResponse.status >= 300 && serviceLoginResponse.status < 400 && !/ticket=ST-/i.test(redirectLocation)) {
      throw new Error('CAS login rejected — verify THREEDX_USERNAME and THREEDX_PASSWORD');
    }
    const serviceFinalResponse = await followRedirects(jar, serviceLoginResponse, serviceLoginUrl, 16);
    const serviceCsrf = extractCsrf(serviceFinalResponse);
    if (serviceCsrf.value && serviceFinalResponse.ok) {
      return finalizeCasSession(jar, serviceUrl, spaceUrl, serviceFinalResponse);
    }
    return await fetchCsrfSession(jar, serviceUrl, spaceUrl, securityContext);
  } catch (error) {
    const msg = String(error?.message || '');
    if (!/CAS service authentication failed \(401\)|CAS CSRF token unavailable \(401\)|invalid_grant|authenticated session/i.test(msg)) {
      throw error;
    }
  }

  const freshJar = new CookieJar();
  const retryTicket = await fetchLoginTicket(freshJar, passportUrl, loginPath);
  if (!retryTicket.lt) {
    throw new Error(`CAS login ticket unavailable (${retryTicket.ticketPayload.status})`);
  }

  const passportLoginUrl = `${passportUrl}${loginPath}`;
  const passportLoginResponse = await postCasLogin(freshJar, {
    passportUrl,
    loginPath,
    loginUrl: passportLoginUrl,
    lt: retryTicket.lt,
    username,
    password
  });
  await followRedirects(freshJar, passportLoginResponse, passportLoginUrl, 16);
  return await fetchCsrfSession(freshJar, serviceUrl, spaceUrl, securityContext);
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
