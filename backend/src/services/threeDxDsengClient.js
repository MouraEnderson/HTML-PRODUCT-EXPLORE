import { EnoviaClient, extractMembers } from './enoviaClient.js';
import { getThreeDxConfig } from './threeDxConfig.js';

const ENG_ITEM_ENDPOINT = '/dseng:EngItem/{ID}';
const ENG_INSTANCE_ENDPOINT = '/dseng:EngItem/{ID}/dseng:EngInstance';

export class ThreeDxDsengClient {
  constructor(config = getThreeDxConfig()) {
    this.config = config;
    this.endpointsUsed = [];
    this.client = new EnoviaClient({
      spaceUrl: config.spaceUrl,
      securityContext: config.securityContext,
      username: config.authMode === 'basic' ? config.username : '',
      password: config.authMode === 'basic' ? config.password : '',
      bearerToken: config.bearerToken,
      cookie: config.cookie,
      csrfToken: config.csrfToken,
      authMode: config.authMode
    });
  }

  recordEndpoint(method, endpoint, status) {
    this.endpointsUsed.push({ method, endpoint, status });
  }

  async ensureCsrf() {
    if (this.client.csrfToken || process.env.AUTO_CSRF !== 'true') {
      return;
    }
    const data = await this.client.getCsrf();
    this.client.csrfToken = data || '';
  }

  mapUpstreamError(error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
      return { code: 'UPSTREAM_AUTH_FAILED', message: 'Failed to authenticate with 3DEXPERIENCE' };
    }
    if (status === 404) {
      return { code: 'ROOT_NOT_FOUND', message: 'EngItem not found' };
    }
    return {
      code: 'UPSTREAM_DSENG_ERROR',
      message: `3DEXPERIENCE dseng request failed (${status || 'unknown'})`
    };
  }

  async getEngItem(id) {
    const endpoint = ENG_ITEM_ENDPOINT;
    try {
      await this.ensureCsrf();
      const data = await this.client.getEngItem(id);
      this.recordEndpoint('GET', endpoint, 200);
      return { ok: true, data };
    } catch (error) {
      this.recordEndpoint('GET', endpoint, Number(error?.status || 502));
      throw error;
    }
  }

  async getEngInstances(parentId) {
    const endpoint = ENG_INSTANCE_ENDPOINT;
    try {
      await this.ensureCsrf();
      const data = await this.client.getEngInstances(parentId, { skip: 0, top: 100 });
      this.recordEndpoint('GET', endpoint, 200);
      return { ok: true, data, members: extractMembers(data) };
    } catch (error) {
      this.recordEndpoint('GET', endpoint, Number(error?.status || 502));
      throw error;
    }
  }

  getEndpointsUsed() {
    return [...this.endpointsUsed];
  }
}

export function assertDsengConfigured(config = getThreeDxConfig()) {
  if (!config.spaceUrl || !config.securityContext) {
    return {
      ok: false,
      code: 'UPSTREAM_NOT_CONFIGURED',
      message: '3DEXPERIENCE upstream configuration is missing'
    };
  }
  if (config.authNeedsExplicitMode) {
    return {
      ok: false,
      code: 'UPSTREAM_AUTH_NOT_IMPLEMENTED',
      message: '3DEXPERIENCE authentication mode is not implemented or not explicitly configured'
    };
  }
  if (!config.authConfigured) {
    return {
      ok: false,
      code: 'UPSTREAM_NOT_CONFIGURED',
      message: '3DEXPERIENCE upstream configuration is missing'
    };
  }
  return { ok: true };
}
