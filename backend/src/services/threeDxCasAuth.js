const SESSION_TTL_MS = 90 * 60 * 1000;

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

export function derivePassportCandidates(spaceUrl, explicitPassportUrl = '') {
  if (explicitPassportUrl) return [trimSlash(explicitPassportUrl)];
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

  ingest(response) {
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
  }

  header() {
    return [...this.map.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  has(name) {
    return this.map.has(name);
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
  const csrf = payload?.csrf;
  if (typeof csrf === 'string') return { name: 'ENO_CSRF_TOKEN', value: csrf };
  return {
    name: csrf?.name || payload?.csrfName || 'ENO_CSRF_TOKEN',
    value: csrf?.value || payload?.token || ''
  };
}

async function readResponse(response) {
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    text,
    json: parseJsonSafe(text)
  };
}

function loginPathsForPassport(passportUrl) {
  if (/\.iam\.3dexperience\.3ds\.com/i.test(passportUrl)) {
    return ['/login'];
  }
  return ['/login', '/iam/login'];
}

async function fetchWithJar(jar, url, options = {}) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; BOM-Analytics-Resolver/1.0)',
    ...(options.headers || {})
  };
  const cookieHeader = jar.header();
  if (cookieHeader) headers.Cookie = cookieHeader;
  const response = await fetch(url, {
    ...options,
    headers,
    redirect: 'manual'
  });
  jar.ingest(response);
  return response;
}

function normalizeCredential(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

async function followRedirects(jar, startResponse, maxHops = 12, { securityContext = '', spaceUrl = '' } = {}) {
  let response = startResponse;
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
    const headers = { Accept: 'application/json' };
    if (securityContext && spaceHost && location.includes(spaceHost)) {
      headers.SecurityContext = securityContext;
    }
    response = await fetchWithJar(jar, location, { method: 'GET', headers });
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
    }
  }

  throw lastError || new Error('CAS login failed for all passport URL candidates');
}

async function casLoginOnce({ passportUrl, spaceUrl, securityContext, username, password }) {
  const jar = new CookieJar();
  const serviceUrl = `${spaceUrl}/resources/v1/application/CSRF`;
  const loginPaths = loginPathsForPassport(passportUrl);
  let lastError = null;

  for (const loginPath of loginPaths) {
    try {
      return await casLoginWithPath({
        jar,
        passportUrl,
        loginPath,
        spaceUrl,
        serviceUrl,
        securityContext,
        username,
        password
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('CAS login failed for all passport login paths');
}

function extractLoginTicket(payload) {
  const json = payload?.json;
  if (json && typeof json.lt === 'string' && json.lt) return json.lt;
  if (json?.response && typeof json.response.lt === 'string' && json.response.lt) return json.response.lt;
  const text = String(payload?.text || '');
  const match = text.match(/"lt"\s*:\s*"([^"]+)"/);
  return match ? match[1] : '';
}

async function fetchLoginTicket(jar, passportUrl, loginPath) {
  const url = `${passportUrl}${loginPath}?action=get_auth_params`;
  const headerSets = [
    { Accept: 'application/json' },
    { Accept: 'application/json, text/plain, */*' },
    { Accept: '*/*' }
  ];
  let lastPayload = null;
  for (const headers of headerSets) {
    const ticketResponse = await fetchWithJar(jar, url, { method: 'GET', headers });
    const ticketPayload = await readResponse(ticketResponse);
    lastPayload = ticketPayload;
    const lt = extractLoginTicket(ticketPayload);
    if (lt) return { lt, ticketPayload };
  }
  return { lt: '', ticketPayload: lastPayload };
}

async function casLoginWithPath({
  jar,
  passportUrl,
  loginPath,
  spaceUrl,
  serviceUrl,
  securityContext,
  username,
  password
}) {
  const { lt, ticketPayload } = await fetchLoginTicket(jar, passportUrl, loginPath);
  if (!lt) {
    if (ticketPayload.status === 403) {
      throw new Error('CAS_PASSPORT_BLOCKED: 3DPassport blocked server login (403). Use fresh ENOVIA_COOKIE or whitelist Render IP.');
    }
    throw new Error(`CAS login ticket unavailable (${ticketPayload.status})`);
  }

  const loginBody = new URLSearchParams({ lt, username, password }).toString();
  const loginResponse = await fetchWithJar(
    jar,
    `${passportUrl}${loginPath}?service=${encodeURIComponent(serviceUrl)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json'
      },
      body: loginBody
    }
  );

  if (loginResponse.status === 200 && !loginResponse.headers.get('location')) {
    throw new Error('CAS login rejected — verify THREEDX_USERNAME and THREEDX_PASSWORD');
  }

  let finalResponse = await followRedirects(jar, loginResponse, 12, { securityContext, spaceUrl });
  let csrf = extractCsrf(finalResponse.json);

  if (!csrf.value || !finalResponse.ok) {
    const csrfResponse = await fetchWithJar(jar, serviceUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(securityContext ? { SecurityContext: securityContext } : {})
      }
    });
    finalResponse = await readResponse(csrfResponse);
    csrf = extractCsrf(finalResponse.json);
  }

  const cookieHeader = jar.header();

  if (!cookieHeader) {
    throw new Error('CAS login completed without session cookies');
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
