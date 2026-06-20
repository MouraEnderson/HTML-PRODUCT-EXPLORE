export const DEFAULT_THREEDX_SPACE_URL =
  'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';

const BLOCKED_SPACE_PATTERN =
  /github\.io|assets\/js|html-product-explore|mouraenderson|#dashboard|-ifwe\./i;

function trimSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

export function sanitizeBlockedSpaceUrlHost(url) {
  try {
    return new URL(String(url || '')).hostname;
  } catch {
    const match = String(url || '').match(/https?:\/\/([^/?#]+)/i);
    return match ? match[1] : 'invalid';
  }
}

export function isValidThreeDxSpaceUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  if (!/^https:\/\//i.test(raw)) return false;
  if (BLOCKED_SPACE_PATTERN.test(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (!/-space\.3dexperience\.3ds\.com$/i.test(parsed.hostname)) return false;
    if (!/^\/enovia(\/|$)/i.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function extractSanitizedSpaceCandidate(value) {
  const raw = String(value || '').trim();
  const spaceMatch = raw.match(
    /https:\/\/(r\d+)-([a-z0-9]+)-space\.3dexperience\.3ds\.com(?:\/enovia)?/i
  );
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
  if (BLOCKED_SPACE_PATTERN.test(raw)) return '';
  if (/-ifwe\.|#dashboard/i.test(raw)) return '';
  return trimSlash(raw);
}

export function resolveThreeDxSpaceUrl(rawConfigured = '') {
  const raw = String(rawConfigured || '').replace(/^\uFEFF/, '').trim();
  const candidate = extractSanitizedSpaceCandidate(raw);

  if (isValidThreeDxSpaceUrl(candidate)) {
    const parsed = new URL(candidate);
    return {
      spaceUrl: trimSlash(candidate),
      spaceUrlHost: parsed.hostname.toLowerCase(),
      spaceUrlPath: parsed.pathname.replace(/\/$/, '') || '/enovia',
      spaceUrlValid: true,
      spaceUrlInvalid: false,
      spaceUrlUsedDefault: false,
      spaceUrlRejectedHost: '',
      spaceUrlConfigError: null,
      spaceUrlDerivedFromIfwe: /-ifwe\./i.test(raw) && /-space\./i.test(candidate),
      rawConfigured: Boolean(raw)
    };
  }

  const defaultParsed = new URL(DEFAULT_THREEDX_SPACE_URL);
  const rejectedHost = raw ? sanitizeBlockedSpaceUrlHost(raw) : '';

  return {
    spaceUrl: DEFAULT_THREEDX_SPACE_URL,
    spaceUrlHost: defaultParsed.hostname.toLowerCase(),
    spaceUrlPath: '/enovia',
    spaceUrlValid: true,
    spaceUrlInvalid: Boolean(raw),
    spaceUrlUsedDefault: true,
    spaceUrlRejectedHost: rejectedHost,
    spaceUrlConfigError: raw ? 'INVALID_THREEDX_SPACE_URL' : null,
    spaceUrlDerivedFromIfwe: false,
    rawConfigured: Boolean(raw)
  };
}

export function parsePassportUrlMeta(rawPassportUrl = '') {
  const raw = String(rawPassportUrl || '').replace(/^\uFEFF/, '').trim();
  const stripped = raw.replace(/^THREEDX_PASSPORT_URL=/i, '').trim();
  const match = stripped.match(/https:\/\/r\d+-[a-z0-9]+\.iam\.3dexperience\.3ds\.com/i);
  const passportUrl = match ? match[0].replace(/\/$/, '') : '';
  let passportUrlHost = '';
  if (passportUrl) {
    try {
      passportUrlHost = new URL(passportUrl).hostname.toLowerCase();
    } catch {
      passportUrlHost = '';
    }
  }
  return {
    passportUrl,
    passportUrlHost,
    passportUrlIgnored: Boolean(stripped && !passportUrl)
  };
}

export function classifyUpstreamAuthFailure(message = '', bodyPreview = '') {
  const text = `${message} ${bodyPreview}`.toLowerCase();
  if (/invalid_threedx_space_url|github\.io|assets\/js|html-product-explore/.test(text)) {
    return { errorType: 'invalid_space_url', upstreamStatus: 0, receivedLoginHtml: false };
  }
  if (/tenant .* does not exist/.test(text)) {
    return { errorType: 'tenant_not_found', upstreamStatus: 401, receivedLoginHtml: false };
  }
  if (/cas login rejected|invalid credentials|incorrect password/.test(text)) {
    return { errorType: 'credentials_rejected', upstreamStatus: 401, receivedLoginHtml: false };
  }
  if (/login \| 3dexperience id|title>login|<form[^>]*login/i.test(text)) {
    return { errorType: 'login_html', upstreamStatus: 200, receivedLoginHtml: true };
  }
  if (/csrf token unavailable|invalid_grant|service ticket/.test(text)) {
    return { errorType: 'csrf_failed', upstreamStatus: 401, receivedLoginHtml: false };
  }
  if (/cas service authentication failed \(401\)/.test(text)) {
    return { errorType: 'space_auth_401', upstreamStatus: 401, receivedLoginHtml: false };
  }
  if (/cas service authentication failed \(403\)/.test(text)) {
    return { errorType: 'space_auth_403', upstreamStatus: 403, receivedLoginHtml: false };
  }
  return { errorType: 'upstream_auth_failed', upstreamStatus: 0, receivedLoginHtml: false };
}
