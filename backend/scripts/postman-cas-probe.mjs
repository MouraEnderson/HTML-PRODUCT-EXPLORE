#!/usr/bin/env node
/**
 * Equivalente ao Postman Primer: ticket → CAS login → CSRF → EngItem.
 * Uso:
 *   THREEDX_USERNAME=... THREEDX_PASSWORD=... node scripts/postman-cas-probe.mjs
 */

const PASSPORT_URL = process.env.THREEDX_PASSPORT_URL || 'https://r1132100929518-eu1.iam.3dexperience.3ds.com';
const SPACE_URL = process.env.THREEDX_SPACE_URL || process.env.SPACE_URL || 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
const SECURITY_CONTEXT = process.env.THREEDX_SECURITY_CONTEXT || process.env.SECURITY_CONTEXT || 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO';
const ROOT_ID = process.env.ROOT_ID || '63FC553465A62400699E0792000086AB';
const USERNAME = process.env.THREEDX_USERNAME || '';
const PASSWORD = process.env.THREEDX_PASSWORD || '';
const CSRF_URL = `${SPACE_URL.replace(/\/$/, '')}/resources/v1/application/CSRF`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function parseSetCookie(lines, jar, requestUrl) {
  for (const line of lines) {
    const [pair] = String(line).split(';');
    const idx = pair.indexOf('=');
    if (idx < 1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    let domain = '';
    try {
      domain = new URL(requestUrl).hostname;
    } catch {
      domain = '';
    }
    jar.push({ name, value, domain });
  }
}

function cookieHeader(jar, url) {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return '';
  }
  const map = new Map();
  for (const c of jar) {
    if (host === c.domain || host.endsWith(`.${c.domain}`) || c.domain.endsWith(host) || host.endsWith(c.domain.replace(/^\./, ''))) {
      map.set(c.name, c.value);
    }
  }
  return [...map.entries()].map(([n, v]) => `${n}=${v}`).join('; ');
}

async function fetchManual(url, { method = 'GET', headers = {}, body = null, jar = [] } = {}) {
  const h = { 'User-Agent': UA, ...headers };
  const ch = cookieHeader(jar, url);
  if (ch) h.Cookie = ch;
  const res = await fetch(url, { method, headers: h, body, redirect: 'manual' });
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  parseSetCookie(setCookies, jar, url);
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, jar };
}

async function followRedirects(start, startUrl, jar, max = 12) {
  let res = start;
  let url = startUrl;
  for (let i = 0; i < max; i += 1) {
    if (res.status < 300 || res.status >= 400) return res;
    const loc = res.headers.get('location');
    if (!loc) return res;
    url = new URL(loc, url).href;
    res = await fetchManual(url, { jar });
  }
  return res;
}

function summarize(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  try {
    const json = JSON.parse(raw);
    return JSON.stringify(json).slice(0, 220);
  } catch {
    return raw.slice(0, 220);
  }
}

const report = { steps: [], ok: false };

async function main() {
  if (!USERNAME || !PASSWORD) {
    console.error('FAIL: set THREEDX_USERNAME and THREEDX_PASSWORD');
    process.exit(1);
  }

  const jar = [];

  // Step 0 — ticket
  const ticketUrl = `${PASSPORT_URL}/login?action=get_auth_params`;
  const ticket = await fetchManual(ticketUrl, {
    jar,
    headers: { Accept: 'application/json' }
  });
  let lt = '';
  try {
    lt = JSON.parse(ticket.text).lt || '';
  } catch {
    lt = '';
  }
  report.steps.push({ step: '0-ticket', status: ticket.status, ok: ticket.status === 200 && Boolean(lt), lt: Boolean(lt) });
  if (!lt) {
    report.error = 'Login ticket unavailable';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // Step 1 — CAS service login
  const serviceLoginUrl = `${PASSPORT_URL}/login?service=${encodeURIComponent(CSRF_URL)}`;
  const body = new URLSearchParams({ lt, username: USERNAME, password: PASSWORD, rememberMe: 'no' });
  const login = await fetchManual(serviceLoginUrl, {
    method: 'POST',
    jar,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'text/html,application/json'
    },
    body: body.toString()
  });
  const loginFinal = await followRedirects(login, serviceLoginUrl, jar);
  report.steps.push({
    step: '1-cas-login',
    status: loginFinal.status,
    ok: loginFinal.status === 200,
    body: summarize(loginFinal.text)
  });

  // Step 2 — CSRF (reuse redirect response if already JSON)
  let csrfToken = '';
  let csrfName = 'ENO_CSRF_TOKEN';
  try {
    const parsed = JSON.parse(loginFinal.text);
    csrfToken = parsed?.csrf?.value || parsed?.token || '';
    csrfName = parsed?.csrf?.name || csrfName;
  } catch {
    // fetch CSRF only if redirect body is not CSRF JSON
  }
  if (!csrfToken) {
    const csrf = await fetchManual(CSRF_URL, { jar, headers: { Accept: 'application/json' } });
    const csrfFinal = await followRedirects(csrf, CSRF_URL, jar);
    report.steps.push({ step: '2-csrf', status: csrfFinal.status, ok: csrfFinal.status === 200, body: summarize(csrfFinal.text) });
    try {
      const parsed = JSON.parse(csrfFinal.text);
      csrfToken = parsed?.csrf?.value || parsed?.token || '';
      csrfName = parsed?.csrf?.name || csrfName;
    } catch {
      report.error = summarize(csrfFinal.text);
    }
  } else {
    report.steps.push({ step: '2-csrf', status: 200, ok: true, fromRedirect: true });
  }

  if (!csrfToken) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  // Step 3 — EngItem
  const engUrl = `${SPACE_URL.replace(/\/$/, '')}/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(ROOT_ID)}`;
  const eng = await fetchManual(engUrl, {
    jar,
    headers: {
      Accept: 'application/json',
      SecurityContext: SECURITY_CONTEXT,
      [csrfName]: csrfToken
    }
  });
  report.steps.push({ step: '3-engitem', status: eng.status, ok: eng.status === 200, body: summarize(eng.text) });
  report.ok = eng.status === 200;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
