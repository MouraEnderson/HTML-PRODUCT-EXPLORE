import { EnoviaClient, extractMembers } from './enoviaClient.js';
import { getThreeDxConfig } from './threeDxConfig.js';
import { getCasCredentials, invalidateCasSession } from './threeDxCasAuth.js';

const ENG_ITEM_ENDPOINT = '/dseng:EngItem/{ID}';
const ENG_ITEM_SEARCH_ENDPOINT = '/dseng:EngItem/search';
const ENG_INSTANCE_ENDPOINT = '/dseng:EngItem/{ID}/dseng:EngInstance';
const ENG_ITEM_EXPAND_ENDPOINT = '/dseng:EngItem/{ID}/expand';

export class ThreeDxDsengClient {
  constructor(config = getThreeDxConfig()) {
    this.config = config;
    this.endpointsUsed = [];
    this._authReady = false;
    this._authModeInUse = config.authMode;
    const selectedAuth = {
      bearerToken: config.authMode === 'bearer' ? config.bearerToken : '',
      cookie: config.authMode === 'cookie' ? config.cookie : '',
      username: config.authMode === 'basic' ? config.username : '',
      password: config.authMode === 'basic' ? config.password : ''
    };
    this.client = new EnoviaClient({
      spaceUrl: config.spaceUrl,
      securityContext: config.securityContext,
      csrfToken: config.csrfToken,
      authMode: config.authMode === 'basic' ? 'basic' : '',
      ...selectedAuth
    });
  }

  async ensureAuthenticated({ forceRefresh = false } = {}) {
    if (this._authReady && !forceRefresh) return;

    if (this.config.authMode === 'cas' || this._authModeInUse === 'cas') {
      try {
        const creds = await getCasCredentials(this.config, { forceRefresh });
        this.client.cookie = creds.cookie;
        this.client.csrfToken = creds.csrfToken || this.client.csrfToken || '';
        this.client.csrfHeaderName = creds.csrfHeaderName || this.client.csrfHeaderName;
        this._authModeInUse = 'cas';
        this._authReady = true;
        return;
      } catch (error) {
        const msg = String(error?.message || '');
        const casBlocked = /CAS_PASSPORT_BLOCKED|login ticket unavailable \(403\)/i.test(msg);
        const casTicketFailed = /CAS login ticket unavailable/i.test(msg);
        const casRejected = /CAS service authentication failed|CAS login rejected/i.test(msg);
        if ((casBlocked || casRejected || casTicketFailed) && this.config.cookie) {
          this.client.cookie = this.config.cookie;
          this._authModeInUse = 'cookie';
          this._authReady = true;
          return;
        }
        throw error;
      }
    }

    if (this.config.authMode === 'cookie') {
      this.client.cookie = this.config.cookie;
      this._authModeInUse = 'cookie';
      this._authReady = true;
      return;
    }

    this._authReady = true;
  }

  async switchToCasAuth({ forceRefresh = true } = {}) {
    if (!this.config.username || !this.config.password) {
      throw new Error('CAS fallback requires THREEDX_USERNAME and THREEDX_PASSWORD');
    }
    invalidateCasSession(this.config);
    this._authReady = false;
    this._authModeInUse = 'cas';
    await this.ensureAuthenticated({ forceRefresh });
  }

  isAuthFailure(error) {
    return this.mapUpstreamError(error).code === 'UPSTREAM_AUTH_FAILED';
  }

  async withAuthRetry(operation) {
    await this.ensureAuthenticated();
    try {
      return await operation();
    } catch (error) {
      const canRetryWithCas = this.config.casFallback || this.config.authMode === 'cas';
      if (!canRetryWithCas || !this.isAuthFailure(error)) {
        throw error;
      }
      await this.switchToCasAuth({ forceRefresh: true });
      return operation();
    }
  }

  recordEndpoint(method, endpoint, status) {
    this.endpointsUsed.push({ method, endpoint, status });
  }

  async ensureCsrf() {
    await this.ensureAuthenticated();
    if (this.client.csrfToken || process.env.AUTO_CSRF !== 'true') {
      return;
    }
    const data = await this.client.getCsrfInfo();
    this.client.csrfToken = data?.value || '';
    this.client.csrfHeaderName = data?.name || this.client.csrfHeaderName || 'ENO_CSRF_TOKEN';
  }

  mapUpstreamError(error) {
    const status = Number(error?.status || 0);
    const upstreamDetail = `${error?.bodySummary || ''} ${error?.message || ''}`;
    if (/invalid_grant|authenticated session|service ticket/i.test(upstreamDetail)) {
      return { code: 'UPSTREAM_AUTH_FAILED', message: 'Failed to authenticate with 3DEXPERIENCE' };
    }
    if (/CAS service authentication failed|CAS login rejected|CAS CSRF token unavailable|CAS_PASSPORT_BLOCKED|login ticket unavailable/i.test(upstreamDetail)) {
      return { code: 'UPSTREAM_AUTH_FAILED', message: 'Failed to authenticate with 3DEXPERIENCE' };
    }
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
    return this.withAuthRetry(async () => {
      try {
        const data = await this.client.getEngItem(id);
        this.recordEndpoint('GET', endpoint, 200);
        return { ok: true, data };
      } catch (error) {
        this.recordEndpoint('GET', endpoint, Number(error?.status || 502));
        throw error;
      }
    });
  }

  async searchEngItems(searchStr, top = 20) {
    const endpoint = ENG_ITEM_SEARCH_ENDPOINT;
    return this.withAuthRetry(async () => {
      try {
        const data = await this.client.searchEngItems(searchStr, top);
        this.recordEndpoint('GET', endpoint, 200);
        return { ok: true, data };
      } catch (error) {
        this.recordEndpoint('GET', endpoint, Number(error?.status || 502));
        throw error;
      }
    });
  }

  async getEngInstances(parentId) {
    const endpoint = ENG_INSTANCE_ENDPOINT;
    return this.withAuthRetry(async () => {
      try {
        const maxPages = Number(process.env.DSENG_MAX_INSTANCE_PAGES || 20);
        const data = await this.client.getAllEngInstances(parentId, {
          pageSize: 100,
          maxPages
        });
        const members = extractMembers(data);
        const totalItems = Number(data?.totalItems ?? members.length);
        const truncatedInstancesCount = totalItems > members.length
          ? totalItems - members.length
          : 0;
        this.recordEndpoint('GET', endpoint, 200);
        return {
          ok: true,
          data,
          members,
          totalItems,
          truncatedInstancesCount
        };
      } catch (error) {
        this.recordEndpoint('GET', endpoint, Number(error?.status || 502));
        throw error;
      }
    });
  }

  async expandEngItem(parentId, { expandDepth = 1 } = {}) {
    const endpoint = ENG_ITEM_EXPAND_ENDPOINT;
    const body = {
      expandDepth,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
    return this.withAuthRetry(async () => {
      try {
        await this.ensureCsrf();
        const data = await this.client.expandEngItem(parentId, body);
        this.recordEndpoint('POST', endpoint, 200);
        return { ok: true, data };
      } catch (error) {
        this.recordEndpoint('POST', endpoint, Number(error?.status || 502));
        throw error;
      }
    });
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
