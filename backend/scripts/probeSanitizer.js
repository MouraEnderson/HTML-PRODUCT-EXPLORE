const SENSITIVE_KEY_RE = /cookie|token|authorization|password|secret|bearer|csrf|set-cookie|ticketurl|ticket_url/i;
const SENSITIVE_VALUE_RE = /(JSESSIONID|ENO_CSRF|Bearer\s+\S+|Basic\s+\S+)/gi;

export function sanitizeValue(value, depth = 0) {
  if (depth > 8) return '[truncated]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.replace(SENSITIVE_VALUE_RE, '[REDACTED]').slice(0, 2000);
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitizeValue(val, depth + 1);
  }
  return out;
}

export function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
