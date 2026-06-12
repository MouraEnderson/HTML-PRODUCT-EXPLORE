const DEFAULT_TOP = 100;

export class EnoviaClient {
  constructor({ spaceUrl, csrfToken, securityContext, cookie, bearerToken, username, password }) {
    if (!spaceUrl) throw new Error('spaceUrl is required.');
    this.spaceUrl = String(spaceUrl).replace(/\/$/, '');
    this.csrfToken = csrfToken || '';
    this.securityContext = securityContext || '';
    this.cookie = cookie || '';
    this.bearerToken = bearerToken || '';
    this.username = username || '';
    this.password = password || '';
  }

  headers(extra = {}) {
    const h = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...extra
    };
    if (this.csrfToken) h.ENO_CSRF_TOKEN = this.csrfToken;
    if (this.securityContext) h.SecurityContext = this.securityContext;
    if (this.cookie) h.Cookie = this.cookie;
    if (this.bearerToken) {
      h.Authorization = `Bearer ${this.bearerToken}`;
    } else if (this.username && this.password) {
      const token = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      h.Authorization = `Basic ${token}`;
    }
    return h;
  }

  async get(path) {
    const url = `${this.spaceUrl}${path}`;
    const response = await fetch(url, { method: 'GET', headers: this.headers() });
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
      throw error;
    }
    return body;
  }

  async getCsrf() {
    const data = await this.get('/resources/v1/application/CSRF');
    return data?.csrf?.value || data?.csrf || data?.token || '';
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
