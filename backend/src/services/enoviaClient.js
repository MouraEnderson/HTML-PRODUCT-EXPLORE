const DEFAULT_TOP = 100;
const SENSITIVE_KEY_RE = /cookie|token|authorization|password|secret|bearer|csrf/i;

export function summarizeBody(body) {
  if (body == null) return '';
  if (typeof body === 'string') return body.slice(0, 500);
  if (typeof body !== 'object') return String(body).slice(0, 500);
  const out = {};
  for (const key of Object.keys(body).slice(0, 30)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    const value = body[key];
    if (value == null || typeof value !== 'object') {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 5);
    } else {
      out[key] = summarizeBody(value);
    }
  }
  return JSON.stringify(out).slice(0, 500);
}

export class EnoviaClient {
  constructor({
    spaceUrl,
    csrfToken,
    csrfHeaderName = 'ENO_CSRF_TOKEN',
    securityContext,
    cookie,
    bearerToken,
    username,
    password,
    authMode = ''
  }) {
    if (!spaceUrl) throw new Error('spaceUrl is required.');
    this.spaceUrl = String(spaceUrl).replace(/\/$/, '');
    this.csrfToken = csrfToken || '';
    this.csrfHeaderName = csrfHeaderName || 'ENO_CSRF_TOKEN';
    this.securityContext = securityContext || '';
    this.cookie = cookie || '';
    this.bearerToken = bearerToken || '';
    this.username = username || '';
    this.password = password || '';
    this.authMode = authMode || '';
  }

  headers(extra = {}, { jsonBody = true } = {}) {
    const h = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...extra
    };
    if (jsonBody) h['Content-Type'] = 'application/json';
    if (this.csrfToken) h[this.csrfHeaderName || 'ENO_CSRF_TOKEN'] = this.csrfToken;
    if (this.securityContext) h.SecurityContext = this.securityContext;
    if (this.bearerToken) {
      h.Authorization = `Bearer ${this.bearerToken}`;
    } else if (this.authMode === 'basic' && this.username && this.password) {
      const token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      h.Authorization = `Basic ${token}`;
    }
    if (this.cookie) h.Cookie = this.cookie;
    return h;
  }

  async get(path) {
    const url = `${this.spaceUrl}${path}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers({}, { jsonBody: false }) });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const error = new Error(`ENOVIA GET ${response.status}: ${path}`);
      error.status = response.status;
      error.url = url;
      error.body = body;
      error.bodySummary = summarizeBody(body);
      throw error;
    }
    return body;
  }

  async post(path, body = {}) {
    const url = `${this.spaceUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers({}, { jsonBody: true }),
      body: JSON.stringify(body || {})
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const error = new Error(`ENOVIA POST ${response.status}: ${path}`);
      error.status = response.status;
      error.url = url;
      error.body = data;
      error.bodySummary = summarizeBody(data);
      throw error;
    }
    return data;
  }

  async getCsrfInfo() {
    const data = await this.get('/resources/v1/application/CSRF');
    const csrf = data?.csrf || {};
    if (typeof csrf === 'string') return { name: 'ENO_CSRF_TOKEN', value: csrf };
    return {
      name: csrf.name || data?.csrfName || 'ENO_CSRF_TOKEN',
      value: csrf.value || data?.token || ''
    };
  }

  async getCsrf() {
    const data = await this.getCsrfInfo();
    return data.value || '';
  }

  async searchEngItems(searchStr, top = 20) {
    const q = encodeURIComponent(searchStr);
    return this.get(`/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=${q}&$top=${top}`);
  }

  async getEngItem(id) {
    return this.get(`/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(id)}`);
  }

  async getEngInstances(parentId, { skip = 0, top = DEFAULT_TOP } = {}) {
    const id = encodeURIComponent(parentId);
    const query = [
      '$mva=true',
      `$skip=${skip}`,
      `$top=${top}`,
      '$mask=dsmveng%3AEngInstanceMask.Details',
      '$fields=dsmvcfg%3Aattribute.hasConfiguredInstance'
    ].join('&');
    return this.get(`/resources/v1/modeler/dseng/dseng:EngItem/${id}/dseng:EngInstance?${query}`);
  }

  async expandEngItem(parentId, body = {}) {
    const id = encodeURIComponent(parentId);
    return this.post(`/resources/v1/modeler/dseng/dseng:EngItem/${id}/expand`, body);
  }

  async getAllEngInstances(parentId, { pageSize = DEFAULT_TOP, maxPages = 200 } = {}) {
    const all = [];
    let skip = 0;
    let total = null;
    for (let page = 0; page < maxPages; page += 1) {
      const data = await this.getEngInstances(parentId, { skip, top: pageSize });
      const members = extractMembers(data);
      all.push(...members);
      total = Number(data?.totalItems ?? data?.total ?? members.length);
      skip += members.length;
      if (!members.length || skip >= total) break;
    }
    return { totalItems: total ?? all.length, member: all };
  }
}

export function extractMembers(data) {
  if (!data) return [];
  if (Array.isArray(data.member)) return data.member;
  if (Array.isArray(data.members)) return data.members;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

export function firstMember(data) {
  return extractMembers(data)[0] || null;
}

export function objectId(obj) {
  return String(obj?.id || obj?.physicalid || obj?.physicalId || obj?.identifier || '').trim();
}
