/**
 * @file waf3dx-client-bom20260617d.js
 * Cliente oficial WAFData → 3DSpace (sessão do usuário logado no 3DDashboard).
 * Sem cookie manual, sem Render CAS, sem persistência de CSRF/token.
 */
(function (w) {
  'use strict';

  var BUILD = 'bom20260617d';
  var LOG = '[__waf3dxClient]';
  var DEFAULT_TIMEOUT_MS = 60000;
  var REQUEST_TIMEOUT_MS = 55000;
  var SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  var SECURITY_CONTEXT = 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO';
  var ROOT_ID = '63FC553465A62400699E0792000086AB';
  var ROOT_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var TAMPO_ID = '63FC553465A62400699DB56700005253';
  var MANUAL_CSRF_HEADER_RE = /^x-csrf-token$/i;
  var SENSITIVE_KEY_RE = /csrf|token|cookie|authorization|session|password|secret/i;

  var lastDiagnostic = null;
  var cachedCsrf = null;
  var cachedSpaceUrl = '';

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  function n(v) {
    return Number(v || 0);
  }

  function cleanUrl(url) {
    return s(url).replace(/\/+$/, '');
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(LOG);
      console.log.apply(console, args);
    } catch (e) {}
  }

  function cfg() {
    return (w.APP_CONFIG && w.APP_CONFIG) || {};
  }

  function uiRoot() {
    return w.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    try {
      var root = uiRoot();
      return (root.querySelector && root.querySelector('#' + id)) || document.getElementById(id);
    } catch (e) {
      return document.getElementById(id);
    }
  }

  function esc(v) {
    return s(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function maskSc(sc) {
    sc = s(sc);
    if (!sc) return '(ausente)';
    if (sc.length <= 16) return sc;
    return sc.slice(0, 12) + '…';
  }

  function getRequire() {
    if (typeof w.require === 'function') return w.require;
    if (typeof w.requirejs === 'function') return w.requirejs;
    return null;
  }

  function getWafDirect() {
    if (w.WAFData && w.WAFData.authenticatedRequest) return { waf: w.WAFData, source: 'window.WAFData' };
    try {
      if (w.widget && w.widget.WAFData && w.widget.WAFData.authenticatedRequest) {
        return { waf: w.widget.WAFData, source: 'widget.WAFData' };
      }
    } catch (e0) {}
    return null;
  }

  function ensurePlatformContext() {
    if (typeof w.PlatformContext === 'undefined' || !w.PlatformContext.init) {
      return Promise.resolve();
    }
    return Promise.resolve(w.PlatformContext.init()).catch(function () {});
  }

  function getSecurityContextValue() {
    try {
      var st = w.PlatformContext && w.PlatformContext.getState && w.PlatformContext.getState();
      if (st && st.securityContext) return s(st.securityContext);
    } catch (e0) {}
    try {
      if (w.widget && w.widget.wafSecurityContext) return s(w.widget.wafSecurityContext);
    } catch (e1) {}
    return s(cfg().SECURITY_CONTEXT_DEFAULT || SECURITY_CONTEXT);
  }

  function rejectIfweUrl(url) {
    url = s(url);
    if (/ifwe\.3dexperience/i.test(url)) {
      throw new Error('Host ifwe inválido para dseng — use 3DSpace *-space*');
    }
    return url;
  }

  function ensureSpaceUrl() {
    return ensurePlatformContext().then(function () {
      if (typeof w.CompassServices !== 'undefined' && w.CompassServices.ensureWorkingSpaceUrl) {
        return w.CompassServices.ensureWorkingSpaceUrl().then(function (url) {
          if (url && typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.init) w.EnoviaApi.init(url);
          return rejectIfweUrl(cleanUrl(url));
        });
      }
      if (typeof w.CompassServices !== 'undefined' && w.CompassServices.getVerifiedSpaceUrl) {
        var v = w.CompassServices.getVerifiedSpaceUrl();
        if (v) return rejectIfweUrl(cleanUrl(v));
      }
      var td = cfg().TENANT_DEFAULTS;
      if (td && td.spaceHost) return rejectIfweUrl('https://' + td.spaceHost + '/enovia');
      return cleanUrl(SPACE_URL);
    });
  }

  function parseWafStatus(err, msg) {
    var status = n(err && (err.status || err.statusCode || err.responseCode));
    msg = s(msg);
    if (!status && msg) {
      var m = msg.match(/ResponseCode[^0-9]*(\d{3})/i) || msg.match(/\bHTTP\s*(\d{3})\b/i);
      if (m) status = n(m[1]);
    }
    if (!status && /NetworkError|ResponseCode.*0/i.test(msg)) return 0;
    return status;
  }

  function extractResponseText(err, msg, backend) {
    if (backend != null) {
      if (typeof backend === 'string') return backend;
      try {
        return JSON.stringify(backend);
      } catch (e) {
        return String(backend);
      }
    }
    if (err) {
      if (typeof err === 'string') return err;
      if (err.responseText) return s(err.responseText);
      if (err.body) return typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
      if (err.data) return typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
      if (err.response) return typeof err.response === 'string' ? err.response : JSON.stringify(err.response);
    }
    return s(msg);
  }

  function parseJsonMaybe(data) {
    if (data == null) return null;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return { raw: data };
      }
    }
    return data;
  }

  function sanitizeValue(key, value, depth) {
    depth = depth || 0;
    if (depth > 6) return '[depth]';
    if (SENSITIVE_KEY_RE.test(s(key))) {
      if (value == null || value === '') return '(ausente)';
      return '(presente, omitido)';
    }
    if (value == null) return null;
    if (typeof value === 'string') {
      if (value.length > 2000) return value.slice(0, 2000) + '…';
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return sanitizeValue('', item, depth + 1);
      });
    }
    if (typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) {
        out[k] = sanitizeValue(k, value[k], depth + 1);
      });
      return out;
    }
    return value;
  }

  function sanitizeError(err) {
    if (!err) return '';
    if (typeof err === 'string') return sanitizeValue('', err);
    return sanitizeValue('', {
      message: err.message || err.error || String(err),
      status: err.status || err.statusCode || err.responseCode,
      code: err.code
    });
  }

  function sanitizeHeaders(headers) {
    headers = headers || {};
    var out = {};
    Object.keys(headers).forEach(function (k) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? '(omitido)' : headers[k];
    });
    return out;
  }

  function sanitizeReport(obj) {
    return sanitizeValue('', obj);
  }

  function withTimeout(promise, ms, label) {
    ms = ms || REQUEST_TIMEOUT_MS;
    label = label || 'request';
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          status: 0,
          error: 'Timeout após ' + ms + 'ms em ' + label,
          timeout: true,
          label: label
        });
      }, ms);
      Promise.resolve(promise)
        .then(function (res) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(res);
        })
        .catch(function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            ok: false,
            status: 0,
            error: sanitizeError(err),
            label: label
          });
        });
    });
  }

  function wrapSync(fn, label) {
    try {
      var res = fn();
      if (res && typeof res.then === 'function') {
        return withTimeout(res, REQUEST_TIMEOUT_MS, label);
      }
      return Promise.resolve(res == null ? { ok: false, error: 'retorno vazio' } : res);
    } catch (e) {
      return Promise.resolve({ ok: false, status: 0, error: sanitizeError(e), label: label });
    }
  }

  function wafRequest(url, opts) {
    url = rejectIfweUrl(url);
    opts = opts || {};
    var direct = getWafDirect();
    if (!direct) {
      return Promise.resolve({
        ok: false,
        status: 0,
        error: 'WAFData indisponível',
        url: url,
        method: opts.method || 'GET',
        headers: sanitizeHeaders(opts.headers || {}),
        responseText: 'WAFData indisponível',
        responseJson: null,
        wafMessage: 'WAFData indisponível'
      });
    }

    return new Promise(function (resolve) {
      var settled = false;
      function finish(res) {
        if (settled) return;
        settled = true;
        resolve(res);
      }

      var timer = setTimeout(function () {
        finish({
          ok: false,
          status: 0,
          error: 'Timeout WAFData ' + REQUEST_TIMEOUT_MS + 'ms',
          url: url,
          method: opts.method || 'GET',
          headers: sanitizeHeaders(opts.headers || {}),
          responseText: 'Timeout',
          responseJson: null,
          wafMessage: 'Timeout',
          timeout: true
        });
      }, REQUEST_TIMEOUT_MS);

      var reqOpts = {
        method: opts.method || 'GET',
        headers: opts.headers || {},
        timeout: n(cfg().WAF_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
        onComplete: function (data, responseHeaders) {
          clearTimeout(timer);
          finish({
            ok: true,
            status: 200,
            data: data,
            url: url,
            method: opts.method || 'GET',
            headers: sanitizeHeaders(opts.headers || {}),
            responseHeaders: sanitizeHeaders(responseHeaders || {}),
            responseText: typeof data === 'string' ? data : JSON.stringify(data),
            responseJson: parseJsonMaybe(data),
            wafMessage: ''
          });
        },
        onFailure: function (err, backendresponse, response_hdrs) {
          clearTimeout(timer);
          var msg = (err && (err.message || err.error || err.statusText)) || 'WAF request failed';
          var status = parseWafStatus(err, msg);
          var responseText = extractResponseText(err, msg, backendresponse);
          finish({
            ok: false,
            status: status,
            error: sanitizeError(msg),
            err: sanitizeError(err),
            url: url,
            method: opts.method || 'GET',
            headers: sanitizeHeaders(opts.headers || {}),
            responseHeaders: sanitizeHeaders(response_hdrs || {}),
            responseText: responseText,
            responseJson: parseJsonMaybe(backendresponse),
            wafMessage: sanitizeError(msg)
          });
        }
      };

      if (opts.type) reqOpts.type = opts.type;
      if (opts.contentType) reqOpts.contentType = opts.contentType;
      if (opts.data != null) reqOpts.data = opts.data;

      try {
        direct.waf.authenticatedRequest(url, reqOpts);
      } catch (e) {
        clearTimeout(timer);
        finish({
          ok: false,
          status: 0,
          error: sanitizeError(e),
          url: url,
          method: opts.method || 'GET',
          headers: sanitizeHeaders(opts.headers || {}),
          responseText: sanitizeError(e),
          responseJson: null,
          wafMessage: sanitizeError(e)
        });
      }
    });
  }

  function request(options) {
    options = options || {};
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
        var url = options.url;
        if (!/^https?:\/\//i.test(url)) {
          url = cleanUrl(spaceUrl) + (url.charAt(0) === '/' ? url : '/' + url);
        }
        return wafRequest(url, {
          method: options.method || 'GET',
          type: options.type || 'json',
          headers: options.headers || {},
          data: options.data,
          contentType: options.contentType
        }).then(function (res) {
          return {
            ok: !!res.ok,
            status: res.status,
            data: res.responseJson != null ? res.responseJson : res.data,
            error: res.ok ? '' : res.wafMessage || res.error || '',
            url: res.url,
            method: res.method,
            headers: res.headers,
            responseText: res.responseText,
            timeout: !!res.timeout
          };
        });
      }),
      REQUEST_TIMEOUT_MS,
      'request'
    );
  }

  function detectWafData() {
    return wrapSync(function () {
      var direct = getWafDirect();
      if (direct) {
        return {
          ok: true,
          wafAvailable: true,
          source: direct.source,
          error: ''
        };
      }
      var req = getRequire();
      if (!req) {
        return {
          ok: false,
          wafAvailable: false,
          source: '',
          error: 'WAFData module not available (require missing)'
        };
      }
      return new Promise(function (resolve) {
        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          resolve({
            ok: false,
            wafAvailable: false,
            source: '',
            error: 'Timeout loading DS/WAFData/WAFData'
          });
        }, 15000);
        req(
          ['DS/WAFData/WAFData'],
          function (WAF) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (WAF && WAF.authenticatedRequest) {
              w.WAFData = WAF;
              resolve({ ok: true, wafAvailable: true, source: 'DS/WAFData/WAFData', error: '' });
            } else {
              resolve({
                ok: false,
                wafAvailable: false,
                source: 'DS/WAFData/WAFData',
                error: 'authenticatedRequest missing'
              });
            }
          },
          function () {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({
              ok: false,
              wafAvailable: false,
              source: '',
              error: 'Failed to load DS/WAFData/WAFData'
            });
          }
        );
      });
    }, 'detectWafData');
  }

  function parseCsrfPayload(data) {
    data = parseJsonMaybe(data) || {};
    var csrf = data.csrf || data;
    var name = s(csrf.name) || 'ENO_CSRF_TOKEN';
    var value = s(csrf.value || data.value || data.token);
    return { name: name, value: value, valuePresent: !!value, raw: sanitizeReport(data) };
  }

  function getCsrf(options) {
    options = options || {};
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
        cachedSpaceUrl = spaceUrl;
        var securityContext = s(options.securityContext || getSecurityContextValue());
        var url = cleanUrl(spaceUrl) + '/resources/v1/application/CSRF';
        var headers = { Accept: 'application/json' };
        if (options.withSecurityContext !== false) headers.SecurityContext = securityContext;
        return wafRequest(url, { method: 'GET', type: 'json', headers: headers }).then(function (res) {
          var parsed = res.ok ? parseCsrfPayload(res.data) : { name: 'ENO_CSRF_TOKEN', value: '', valuePresent: false };
          var out = {
            ok: res.ok && parsed.valuePresent,
            csrfOk: res.ok && parsed.valuePresent,
            status: res.status,
            name: parsed.name,
            valuePresent: parsed.valuePresent,
            url: url,
            method: 'GET',
            error: res.ok ? (parsed.valuePresent ? '' : 'CSRF token missing in response') : res.wafMessage || res.error,
            recommendation: res.ok && parsed.valuePresent ? 'CSRF OK — usar header ' + parsed.name + ' em POST' : 'Falha CSRF — verificar sessão/SecurityContext'
          };
          if (parsed.valuePresent) cachedCsrf = { name: parsed.name, value: parsed.value, valuePresent: true };
          return out;
        });
      }),
      REQUEST_TIMEOUT_MS,
      'getCsrf'
    );
  }

  function buildEngItemUrl(spaceUrl, id, suffix) {
    return (
      cleanUrl(spaceUrl) +
      '/resources/v1/modeler/dseng/dseng:EngItem/' +
      encodeURIComponent(id) +
      (suffix || '')
    );
  }

  function isDsengHexId(id) {
    id = s(id);
    if (!id || /^prd-/i.test(id)) return false;
    return /^[0-9A-F]{24,32}$/i.test(id);
  }

  function quoteUql(value) {
    return '"' + s(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function engItemSearchPath(uqlQuery, top) {
    return (
      '/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=' +
      encodeURIComponent(uqlQuery) +
      '&$top=' +
      (n(top) || 20)
    );
  }

  function memberField(m, field) {
    return s(m && m[field]);
  }

  function scoreEngItemCandidate(m, expected, hints) {
    hints = hints || {};
    expected = s(expected);
    var score = 0;
    if (memberField(m, 'id') === expected) score += 100;
    if (memberField(m, 'name') === expected) score += 95;
    if (memberField(m, 'title') === expected) score += 85;
    if (hints.title && memberField(m, 'title') === hints.title) score += 80;
    if (hints.prdId && memberField(m, 'name') === hints.prdId) score += 90;
    return score;
  }

  function chooseExactEngItem(res, expected, hints) {
    expected = s(expected);
    hints = hints || {};
    var members = extractMembers(res);
    if (!members.length) return null;
    var best = null;
    var bestScore = -1;
    var i;
    for (i = 0; i < members.length; i++) {
      var m = members[i];
      if (
        memberField(m, 'id') === expected ||
        memberField(m, 'name') === expected ||
        memberField(m, 'title') === expected
      ) {
        var score = scoreEngItemCandidate(m, expected, hints);
        if (score > bestScore) {
          best = m;
          bestScore = score;
        }
      }
    }
    if (best && isDsengHexId(best.id)) return best;
    if (members.length === 1 && isDsengHexId(members[0].id)) return members[0];
    for (i = 0; i < members.length; i++) {
      var cs = scoreEngItemCandidate(members[i], expected, hints);
      if (cs > bestScore && isDsengHexId(members[i].id)) {
        best = members[i];
        bestScore = cs;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function searchEngItems(uqlQuery, options) {
    options = options || {};
    uqlQuery = s(uqlQuery);
    if (!uqlQuery) {
      return Promise.resolve({ ok: false, members: [], status: 0, error: 'empty UQL query' });
    }
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
        var url = cleanUrl(spaceUrl) + engItemSearchPath(uqlQuery, options.top);
        var headers = { Accept: 'application/json', SecurityContext: getSecurityContextValue() };
        return wafRequest(url, { method: 'GET', type: 'json', headers: headers }).then(function (res) {
          var members = extractMembers(res.responseJson || res.data);
          return {
            ok: res.ok && members.length > 0,
            status: res.status,
            members: members,
            uqlQuery: uqlQuery,
            url: url,
            error: res.ok ? (members.length ? '' : 'empty member list') : res.wafMessage || res.error
          };
        });
      }),
      REQUEST_TIMEOUT_MS,
      'searchEngItems'
    );
  }

  /**
   * Resolve Explorer prd-* or title → dseng hex id (tenant-validated UQL paths).
   */
  function resolveEngItemRootId(options) {
    options = options || {};
    var physicalId = s(options.physicalId || options.rootId || options.id || options.name);
    var title = s(options.title || options.label);
    var attempts = [];
    var hints = { title: title, prdId: physicalId };

    if (isDsengHexId(physicalId)) {
      return Promise.resolve({
        ok: true,
        rootId: physicalId,
        source: 'DIRECT_DSENG_ID',
        title: title,
        physicalId: physicalId,
        attempts: attempts
      });
    }

    function tryQuery(label, uql, expected) {
      expected = s(expected || physicalId || title);
      return searchEngItems(uql, { top: 20 }).then(function (res) {
        attempts.push({
          label: label,
          uql: uql,
          status: res.status,
          count: (res.members || []).length,
          ok: res.ok
        });
        if (!res.ok) return null;
        var hit = chooseExactEngItem({ member: res.members }, expected, hints);
        if (!hit && title && expected !== title) {
          hit = chooseExactEngItem({ member: res.members }, title, hints);
        }
        if (hit && isDsengHexId(hit.id)) {
          return {
            ok: true,
            rootId: hit.id,
            title: memberField(hit, 'title') || title,
            name: memberField(hit, 'name'),
            source: label,
            physicalId: physicalId || memberField(hit, 'name'),
            member: sanitizeReport(hit),
            attempts: attempts
          };
        }
        return null;
      });
    }

    var chain = Promise.resolve(null);
    if (physicalId && /^prd-/i.test(physicalId)) {
      chain = chain
        .then(function (r) {
          return r || tryQuery('UQL_NAME_PRD', 'name:' + physicalId, physicalId);
        })
        .then(function (r) {
          return r || tryQuery('SEARCHSTR_PRD', physicalId, physicalId);
        });
    } else if (physicalId) {
      chain = chain.then(function (r) {
        return r || tryQuery('SEARCHSTR', physicalId, physicalId);
      });
    }
    if (title) {
      chain = chain.then(function (r) {
        return r || tryQuery('UQL_LABEL_TITLE', 'label:' + quoteUql(title), title);
      });
    }

    return chain.then(function (resolved) {
      if (resolved && resolved.ok) {
        log('resolveEngItemRootId OK', resolved.source, resolved.physicalId, '→', resolved.rootId);
        return resolved;
      }
      return {
        ok: false,
        rootId: '',
        error: 'Não foi possível resolver prd/título para dseng:EngItem id',
        physicalId: physicalId,
        title: title,
        attempts: attempts,
        recommendation:
          'GET dseng:EngItem/prd-* retorna 404 — resolver via UQL (name:prd ou label:título). Root CJ MESA: ' +
          ROOT_ID
      };
    });
  }

  function getEngItem(id, options) {
    options = options || {};
    id = s(id || options.id || ROOT_ID);
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
        var securityContext = s(options.securityContext || getSecurityContextValue());
        var url = buildEngItemUrl(spaceUrl, id);
        var headers = { Accept: 'application/json' };
        if (options.withSecurityContext !== false) headers.SecurityContext = securityContext;
        return wafRequest(url, { method: 'GET', type: 'json', headers: headers }).then(function (res) {
          var member = res.ok && res.data ? (Array.isArray(res.data.member) ? res.data.member[0] : res.data) : null;
          return {
            ok: res.ok,
            canReadRoot: res.ok,
            status: res.status,
            id: member && member.id,
            title: member && (member.title || member.name),
            type: member && member.type,
            state: member && (member.state || member.maturity),
            url: url,
            method: 'GET',
            error: res.ok ? '' : res.wafMessage || res.error,
            data: sanitizeReport(res.responseJson || res.data)
          };
        });
      }),
      REQUEST_TIMEOUT_MS,
      'getEngItem'
    );
  }

  function officialExpandBody(depth) {
    return {
      expandDepth: n(depth) || 1,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
  }

  function alternateExpandBodies(depth) {
    depth = n(depth) || 1;
    return [
      { label: 'official-dseng-v1', body: officialExpandBody(depth) },
      {
        label: 'with-3dshape-filter',
        body: {
          expandDepth: depth,
          withPath: true,
          type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape'],
          type_filter_rel: ['VPMInstance', 'VPMRepInstance']
        }
      },
      {
        label: 'depth-zero',
        body: {
          expandDepth: 0,
          withPath: true,
          type_filter_bo: ['VPMReference', 'VPMRepReference'],
          type_filter_rel: ['VPMInstance', 'VPMRepInstance']
        }
      },
      {
        label: 'without-path',
        body: {
          expandDepth: depth,
          withPath: false,
          type_filter_bo: ['VPMReference', 'VPMRepReference'],
          type_filter_rel: ['VPMInstance', 'VPMRepInstance']
        }
      }
    ];
  }

  function countExpandRows(data) {
    data = data || {};
    if (Array.isArray(data.member)) return data.member.length;
    if (data.totalItems != null) return n(data.totalItems);
    return 0;
  }

  function postExpandVariant(params) {
    params = params || {};
    var spaceUrl = cleanUrl(params.spaceUrl);
    var rootId = s(params.rootId || ROOT_ID);
    var securityContext = s(params.securityContext || getSecurityContextValue());
    var csrf = params.csrf || {};
    var bodyObj = params.body || officialExpandBody(params.expandDepth);
    var bodyString = JSON.stringify(bodyObj);
    var url = buildEngItemUrl(spaceUrl, rootId, '/expand');
    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (params.withSecurityContext !== false && securityContext) headers.SecurityContext = securityContext;
    if (params.withCsrf !== false && csrf.valuePresent && csrf.value) {
      headers[s(csrf.name) || 'ENO_CSRF_TOKEN'] = csrf.value;
    }
    if (params.withXRequestedWith) headers['X-Requested-With'] = 'XMLHttpRequest';

    return wafRequest(url, {
      method: 'POST',
      type: 'json',
      headers: headers,
      data: bodyString
    }).then(function (res) {
      var rows = countExpandRows(res.responseJson || res.data);
      return {
        ok: res.ok && rows > 0,
        expandOk: res.ok && rows > 0,
        status: res.status,
        rowsDetected: rows,
        data: res.responseJson || res.data,
        url: url,
        method: 'POST',
        variant: params.variantLabel || 'default',
        headersUsed: Object.keys(headers),
        body: sanitizeReport(bodyObj),
        error: res.ok ? (rows > 0 ? '' : 'Expand returned empty member list') : res.wafMessage || res.error,
        responseText: res.responseText ? String(res.responseText).slice(0, 1200) : '',
        pass: res.status === 200 && rows > 0
      };
    });
  }

  function expandEngItem(id, options) {
    options = options || {};
    id = s(id || options.id || ROOT_ID);
    var depth = n(options.expandDepth || options.depth) || 1;
    var variantLabel = options.variantLabel || 'official+sc+csrf';
    return withTimeout(
      ensureSpaceUrl()
        .then(function (spaceUrl) {
          return getCsrf({ securityContext: options.securityContext, withSecurityContext: options.withSecurityContext !== false }).then(
            function (csrf) {
              if (!csrf.ok && options.requireCsrf !== false) {
                return {
                  ok: false,
                  expandOk: false,
                  status: csrf.status,
                  rowsDetected: 0,
                  error: 'CSRF fetch failed: ' + (csrf.error || 'unknown'),
                  csrfOk: false,
                  recommendation: 'Resolver CSRF antes do POST expand'
                };
              }
              return postExpandVariant({
                spaceUrl: spaceUrl,
                rootId: id,
                securityContext: options.securityContext || getSecurityContextValue(),
                csrf: cachedCsrf || csrf,
                expandDepth: depth,
                body: options.body || officialExpandBody(depth),
                variantLabel: variantLabel,
                withSecurityContext: options.withSecurityContext !== false,
                withCsrf: options.withCsrf !== false,
                withXRequestedWith: !!options.withXRequestedWith
              });
            }
          );
        })
        .then(function (res) {
          if (!res) res = { ok: false, error: 'empty response' };
          res.id = id;
          res.expandDepth = depth;
          return res;
        }),
      REQUEST_TIMEOUT_MS,
      'expandEngItem'
    );
  }

  function extractMembers(payload) {
    payload = payload || {};
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.member)) return payload.data.member;
    return [];
  }

  function getEngItemRepresentations(id, options) {
    options = options || {};
    id = s(id || options.id || TAMPO_ID);
    return withTimeout(
      expandEngItem(id, {
        expandDepth: n(options.expandDepth) || 2,
        body: {
          expandDepth: n(options.expandDepth) || 2,
          withPath: true,
          type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape', 'VPMRepReference'],
          type_filter_rel: ['VPMInstance', 'VPMRepInstance']
        }
      }).then(function (expandRes) {
        var shapes = [];
        var repRefs = [];
        extractMembers(expandRes.data || expandRes.responseJson).forEach(function (m) {
          if (!m) return;
          if (/3DShape|ds3sh/i.test(s(m.type))) shapes.push({ id: s(m.id || m.physicalid), type: m.type });
          if (/VPMRepReference/i.test(s(m.type))) repRefs.push({ id: s(m.id || m.physicalid), type: m.type });
        });
        return {
          ok: expandRes.ok,
          status: expandRes.status,
          referenceId: id,
          shapes: shapes,
          repReferences: repRefs,
          shapeCount: shapes.length,
          repCount: repRefs.length,
          error: expandRes.error || '',
          expand: sanitizeReport(expandRes)
        };
      }),
      REQUEST_TIMEOUT_MS,
      'getEngItemRepresentations'
    );
  }

  function find3DShapeOrRep(id, options) {
    return withTimeout(
      getEngItemRepresentations(id, options).then(function (repRes) {
        var chosen = null;
        if (repRes.shapes && repRes.shapes.length) {
          chosen = repRes.shapes[0];
          chosen.representationType = '3DShape';
        } else if (repRes.repReferences && repRes.repReferences.length) {
          chosen = repRes.repReferences[0];
          chosen.representationType = 'VPMRepReference';
        }
        return {
          ok: !!chosen,
          representationFound: !!chosen,
          referenceId: s(id),
          representationType: chosen ? s(chosen.representationType || chosen.type) : '',
          representationId: chosen ? s(chosen.id) : '',
          representation: chosen || null,
          shapes: repRes.shapes || [],
          repReferences: repRes.repReferences || [],
          error: chosen ? '' : 'No 3DShape/VPMRepReference found in expand',
          recommendation: chosen
            ? 'Use dsdo Locate on ' + chosen.representationType
            : 'Expand did not return 3DShape — check representation on item'
        };
      }),
      REQUEST_TIMEOUT_MS,
      'find3DShapeOrRep'
    );
  }

  function buildLocatePayload(referenceId, type, spaceUrl) {
    var source = cleanUrl(spaceUrl || cachedSpaceUrl || SPACE_URL);
    return {
      data: [
        {
          id: referenceId,
          identifier: referenceId,
          type: type || 'VPMReference',
          source: source,
          relativePath: '/resources/v1/modeler/dseng/dseng:EngItem/' + referenceId
        }
      ]
    };
  }

  function extractDerivedFiles(data) {
    data = data || {};
    var files = [];
    if (Array.isArray(data.data)) files = data.data;
    else if (Array.isArray(data.files)) files = data.files;
    else if (data.dataelements && Array.isArray(data.dataelements.files)) files = data.dataelements.files;
    return files.map(function (f, idx) {
      return {
        id: s(f.id || f.fileId || 'f' + idx),
        parentId: s(f.parentId || f.objectId || ''),
        format: s(f.format || f.fileFormat || f.type).toUpperCase(),
        fileName: s(f.fileName || f.filename || f.name),
        raw: sanitizeReport(f)
      };
    });
  }

  function pickBestWebFile(files) {
    var priority = ['GLTF', 'GLB', 'OBJ', 'STL', '3DXML'];
    var i;
    for (i = 0; i < priority.length; i++) {
      var hit = files.filter(function (f) {
        return f.format === priority[i] || f.fileName.toUpperCase().indexOf('.' + priority[i]) >= 0;
      });
      if (hit.length) return hit[0];
    }
    return files[0] || null;
  }

  function locateDerivedOutputsOnce(repId, repType, referenceId) {
    referenceId = s(referenceId);
    repId = s(repId);
    repType = s(repType || 'VPMReference');
    return ensureSpaceUrl().then(function (spaceUrl) {
      return getCsrf().then(function (csrf) {
        var url = cleanUrl(spaceUrl) + '/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/Locate';
        var bodyObj = buildLocatePayload(repId, repType, spaceUrl);
        var headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          SecurityContext: getSecurityContextValue()
        };
        if (csrf.ok && cachedCsrf && cachedCsrf.value) headers[cachedCsrf.name] = cachedCsrf.value;
        return wafRequest(url, {
          method: 'POST',
          type: 'json',
          headers: headers,
          data: JSON.stringify(bodyObj)
        }).then(function (res) {
          var files = extractDerivedFiles(res.responseJson || res.data);
          var best = pickBestWebFile(files);
          return {
            ok: res.ok && files.length > 0,
            derivedOutputFound: res.ok && files.length > 0,
            status: res.status,
            referenceId: referenceId,
            representationId: repId,
            representationType: repType,
            fileCount: files.length,
            files: sanitizeReport(files),
            best: best ? sanitizeReport(best) : null,
            derivedOutputAvailable: files.length > 0,
            locateTarget: repType + ':' + repId,
            blocker: files.length ? '' : 'No derived output available for this representation',
            requiredAdminAction: files.length ? '' : 'Enable/generate derived output for web visualization',
            error: res.ok ? (files.length ? '' : 'fileCount=0') : res.wafMessage || res.error,
            url: url,
            method: 'POST'
          };
        });
      });
    });
  }

  function locateDerivedOutputs(target, options) {
    options = options || {};
    target = target || {};
    var referenceId = s(target.referenceId || target.id || TAMPO_ID);
    var candidates = [];
    var seen = {};
    function addCandidate(id, type, label) {
      id = s(id);
      type = s(type || 'VPMReference');
      if (!id) return;
      var key = type + '|' + id;
      if (seen[key]) return;
      seen[key] = true;
      candidates.push({ id: id, type: type, label: label || type });
    }
    if (target.representation && target.representation.id) {
      addCandidate(
        target.representation.id,
        target.representation.representationType || target.representationType || target.representation.type || '3DShape',
        'representation'
      );
    }
    if (target.shapes && target.shapes.length) {
      target.shapes.forEach(function (sh, idx) {
        addCandidate(sh.id, sh.type || '3DShape', 'shape-' + idx);
      });
    }
    if (target.repReferences && target.repReferences.length) {
      target.repReferences.forEach(function (rr, idx) {
        addCandidate(rr.id, rr.type || 'VPMRepReference', 'repRef-' + idx);
      });
    }
    addCandidate(referenceId, 'VPMReference', 'engItem');

    return withTimeout(
      (function tryNext(i) {
        if (i >= candidates.length) {
          return Promise.resolve({
            ok: false,
            derivedOutputFound: false,
            status: 200,
            referenceId: referenceId,
            fileCount: 0,
            error: 'fileCount=0',
            attempts: candidates.map(function (c) {
              return c.label + ':' + c.type;
            }),
            requiredAdminAction: 'Enable/generate derived output for web visualization',
            blocker: 'No derived output available for any representation candidate'
          });
        }
        var c = candidates[i];
        return locateDerivedOutputsOnce(c.id, c.type, referenceId).then(function (res) {
          if (res.derivedOutputFound) return res;
          return tryNext(i + 1);
        });
      })(0),
      REQUEST_TIMEOUT_MS,
      'locateDerivedOutputs'
    );
  }

  function extractDownloadUrl(payload) {
    payload = parseJsonMaybe(payload) || {};
    var data = payload.data || payload;
    if (Array.isArray(data) && data[0]) data = data[0];
    return s(
      data.ticketURL ||
        data.ticketUrl ||
        data.url ||
        data.href ||
        (data.dataelements && (data.dataelements.ticketURL || data.dataelements.url))
    );
  }

  function downloadDerivedOutput(target, options) {
    options = options || {};
    target = target || {};
    var file = target.best || target.file || target;
    var parentId = s(file.parentId || target.representationId || target.referenceId || TAMPO_ID);
    var fileId = s(file.id);
    if (!fileId) {
      return Promise.resolve({
        ok: false,
        error: 'fileId required for DownloadTicket',
        recommendation: 'Run locateDerivedOutputs first'
      });
    }
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
        return getCsrf().then(function (csrf) {
          var ticketUrl =
            cleanUrl(spaceUrl) +
            '/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/' +
            encodeURIComponent(parentId) +
            '/dsdo:DerivedOutputFiles/' +
            encodeURIComponent(fileId) +
            '/DownloadTicket';
          var headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            SecurityContext: getSecurityContextValue()
          };
          if (csrf.ok && cachedCsrf && cachedCsrf.value) headers[cachedCsrf.name] = cachedCsrf.value;
          return wafRequest(ticketUrl, {
            method: 'POST',
            type: 'json',
            headers: headers,
            data: JSON.stringify({})
          }).then(function (ticketRes) {
            var downloadUrl = extractDownloadUrl(ticketRes.responseJson || ticketRes.data);
            if (!ticketRes.ok || !downloadUrl) {
              return {
                ok: false,
                status: ticketRes.status,
                error: ticketRes.error || 'DownloadTicket failed',
                ticketUrl: ticketUrl,
                method: 'POST'
              };
            }
            return wafRequest(downloadUrl, { method: 'GET', type: 'text' }).then(function (binRes) {
              if (!binRes.ok) {
                return {
                  ok: false,
                  status: binRes.status,
                  error: binRes.error || 'FCS download failed',
                  downloadUrl: '(ticket URL omitida)',
                  method: 'GET'
                };
              }
              var format = s(file.format || guessFormatFromName(file.fileName));
              var buf = toArrayBuffer(binRes.data);
              var byteLength = contentByteLength(binRes.data);
              return {
                ok: true,
                status: 200,
                format: format,
                fileName: s(file.fileName),
                content: binRes.data,
                arrayBuffer: buf,
                byteLength: byteLength,
                recommendation: isWebViewFormat(format)
                  ? 'Load content in Three.js viewer via blob URL'
                  : format === 'STEP'
                    ? 'STEP downloaded — convertGeometryIfNeeded required'
                    : 'Format may require conversion before Three.js',
                viewerRenderedRealModel: false
              };
            });
          });
        });
      }),
      REQUEST_TIMEOUT_MS,
      'downloadDerivedOutput'
    );
  }

  function guessFormatFromName(name) {
    name = s(name).toUpperCase();
    if (name.indexOf('.GLB') >= 0) return 'GLB';
    if (name.indexOf('.GLTF') >= 0) return 'GLTF';
    if (name.indexOf('.OBJ') >= 0) return 'OBJ';
    if (name.indexOf('.STL') >= 0) return 'STL';
    if (name.indexOf('.3DXML') >= 0) return '3DXML';
    if (name.indexOf('.STEP') >= 0 || name.indexOf('.STP') >= 0) return 'STEP';
    return '';
  }

  var WEB_VIEW_FORMATS = ['GLB', 'GLTF', 'OBJ', 'STL'];

  function isWebViewFormat(format) {
    format = s(format).toUpperCase();
    return WEB_VIEW_FORMATS.indexOf(format) >= 0;
  }

  function pickStepFile(files) {
    files = files || [];
    var i;
    for (i = 0; i < files.length; i++) {
      var f = files[i];
      var fmt = s(f.format || guessFormatFromName(f.fileName)).toUpperCase();
      if (fmt === 'STEP' || fmt === 'STP' || /\.step$|\.stp$/i.test(s(f.fileName))) return f;
    }
    return null;
  }

  function toArrayBuffer(content) {
    if (!content) return null;
    if (content instanceof ArrayBuffer) return content;
    if (ArrayBuffer.isView(content)) return content.buffer;
    if (typeof content === 'string') {
      try {
        var bin = atob(content);
        var len = bin.length;
        var bytes = new Uint8Array(len);
        var i;
        for (i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
      } catch (e0) {
        var enc = new TextEncoder();
        return enc.encode(content).buffer;
      }
    }
    return null;
  }

  function contentByteLength(content) {
    if (!content) return 0;
    if (typeof content === 'string') return content.length;
    if (content.byteLength != null) return content.byteLength;
    if (content.length != null) return content.length;
    return 0;
  }

  function downloadBinaryUrl(downloadUrl, options) {
    options = options || {};
    return wafRequest(downloadUrl, {
      method: options.method || 'GET',
      type: options.type || 'text',
      headers: options.headers || {}
    }).then(function (res) {
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: res.error || res.wafMessage || 'Binary download failed',
          method: options.method || 'GET',
          endpoint: '(FCS ticket URL omitida)'
        };
      }
      var buf = toArrayBuffer(res.data);
      return {
        ok: true,
        status: res.status || 200,
        content: res.data,
        arrayBuffer: buf,
        byteLength: contentByteLength(res.data),
        method: options.method || 'GET'
      };
    });
  }

  function getRepresentations(id, options) {
    return getEngItemRepresentations(id, options);
  }

  function find3DGeometrySource(id, options) {
    options = options || {};
    id = s(id || options.id || TAMPO_ID);
    var evidence = [];
    return withTimeout(
      find3DShapeOrRep(id, options)
        .then(function (rep) {
          evidence.push(
            rep.representationFound
              ? 'find3DShapeOrRep PASS ' + rep.representationType
              : 'find3DShapeOrRep FAIL — ' + (rep.error || 'no representation')
          );
          if (!rep.representationFound) {
            return {
              ok: false,
              lineClickReal: true,
              representationFound: false,
              derivedOutputFound: false,
              geometrySourceFound: false,
              referenceId: id,
              evidence: evidence,
              blocker: rep.error || 'No 3DShape/VPMRepReference found',
              recommendation: rep.recommendation
            };
          }
          return locateDerivedOutputs(rep).then(function (derived) {
            evidence.push(
              derived.derivedOutputFound
                ? 'dsdo Locate fileCount=' + derived.fileCount + ' format=' + s((derived.best && derived.best.format) || '')
                : 'dsdo Locate fileCount=0'
            );
            var stepFile = pickStepFile(derived.files || []);
            var webFile = derived.best && isWebViewFormat(derived.best.format || guessFormatFromName(derived.best.fileName)) ? derived.best : null;
            if (webFile) {
              return {
                ok: true,
                lineClickReal: true,
                representationFound: true,
                derivedOutputFound: true,
                geometrySourceFound: true,
                format: s(webFile.format || guessFormatFromName(webFile.fileName)).toUpperCase(),
                path: 'derived-web-direct',
                referenceId: id,
                representation: sanitizeReport(rep),
                derivedOutput: sanitizeReport(derived),
                file: sanitizeReport(webFile),
                evidence: evidence,
                recommendation: 'Download derived ' + webFile.format + ' and render in Three.js'
              };
            }
            if (stepFile) {
              return {
                ok: true,
                lineClickReal: true,
                representationFound: true,
                derivedOutputFound: true,
                geometrySourceFound: true,
                format: 'STEP',
                path: 'derived-step-conversion',
                referenceId: id,
                representation: sanitizeReport(rep),
                derivedOutput: sanitizeReport(derived),
                file: sanitizeReport(stepFile),
                stepAvailable: true,
                evidence: evidence,
                recommendation: 'STEP available — run convertGeometryIfNeeded after download'
              };
            }
            return {
              ok: false,
              lineClickReal: true,
              representationFound: true,
              derivedOutputFound: false,
              geometrySourceFound: false,
              referenceId: id,
              representation: sanitizeReport(rep),
              derivedOutput: sanitizeReport(derived),
              evidence: evidence,
              blocker: derived.blocker || 'No downloadable or convertible geometry source found',
              requiredAdminAction: derived.requiredAdminAction,
              recommendation: derived.requiredAdminAction || 'Enable GLB/OBJ/STL or STEP derived format in Platform Manager'
            };
          });
        }),
      REQUEST_TIMEOUT_MS * 2,
      'find3DGeometrySource'
    );
  }

  function downloadGeometry(target, options) {
    options = options || {};
    target = target || {};
    if (target.path === 'derived-step-conversion' || (target.file && pickStepFile([target.file]))) {
      var merged = target.derivedOutput || target;
      merged.best = target.file || merged.best;
      return downloadDerivedOutput(merged, options).then(function (dl) {
        dl.format = s(dl.format || 'STEP').toUpperCase();
        dl.stepAvailable = dl.ok && dl.byteLength > 0;
        dl.path = 'derived-step-conversion';
        return dl;
      });
    }
    if (target.derivedOutput && target.derivedOutput.best) {
      return downloadDerivedOutput(target.derivedOutput, options);
    }
    if (target.best || target.file) {
      return downloadDerivedOutput(target, options);
    }
    return find3DGeometrySource(target.referenceId || target.id || TAMPO_ID).then(function (src) {
      if (!src.geometrySourceFound) {
        return {
          ok: false,
          error: src.blocker || 'geometry source not found',
          evidence: src.evidence || [],
          recommendation: src.recommendation
        };
      }
      return downloadGeometry(src, options);
    });
  }

  function convertGeometryIfNeeded(file, options) {
    options = options || {};
    file = file || {};
    var format = s(file.format || guessFormatFromName(file.fileName)).toUpperCase();
    var byteLength = n(file.byteLength) || contentByteLength(file.content || file.arrayBuffer);
    if (isWebViewFormat(format)) {
      return Promise.resolve({
        ok: true,
        conversionOk: true,
        conversionRequired: false,
        format: format,
        byteLength: byteLength,
        blobUrl: file.blobUrl || '',
        recommendation: 'Web-viewable format — render directly in Three.js'
      });
    }
    if (format === 'STEP' || format === 'STP') {
      if (!byteLength) {
        return Promise.resolve({
          ok: false,
          stepAvailable: false,
          conversionOk: false,
          format: 'STEP',
          blocker: 'STEP file empty or not downloaded',
          evidence: ['STEP unavailable — byteLength=0'],
          recommendation: 'Run downloadGeometry first'
        });
      }
      var converterUrl = s((cfg().STEP_GEOMETRY_CONVERTER_URL || cfg().GEOMETRY_CONVERTER_URL || '').trim());
      if (converterUrl) {
        return withTimeout(
          (function () {
            try {
              var buf = file.arrayBuffer || toArrayBuffer(file.content);
              var blob = new Blob([buf], { type: 'application/step' });
              var fd = new FormData();
              fd.append('file', blob, s(file.fileName || 'model.step'));
              fd.append('targetFormat', 'glb');
              return fetch(converterUrl, { method: 'POST', body: fd })
                .then(function (res) {
                  return res.arrayBuffer().then(function (outBuf) {
                    if (!res.ok) {
                      return {
                        ok: false,
                        stepAvailable: true,
                        conversionOk: false,
                        status: res.status,
                        format: 'STEP',
                        blocker: 'Converter HTTP ' + res.status,
                        evidence: ['STEP downloaded byteLength=' + byteLength, 'converter failed'],
                        recommendation: 'Check STEP_GEOMETRY_CONVERTER_URL service'
                      };
                    }
                    var outBlob = new Blob([outBuf], { type: 'model/gltf-binary' });
                    return {
                      ok: true,
                      stepAvailable: true,
                      conversionOk: true,
                      format: 'GLB',
                      byteLength: outBuf.byteLength,
                      blobUrl: w.URL.createObjectURL(outBlob),
                      recommendation: 'STEP converted to GLB via external converter (no session token sent)'
                    };
                  });
                })
                .catch(function (err) {
                  return {
                    ok: false,
                    stepAvailable: true,
                    conversionOk: false,
                    format: 'STEP',
                    error: sanitizeError(err),
                    evidence: ['STEP downloaded byteLength=' + byteLength, 'converter exception'],
                    recommendation: 'Fix STEP_GEOMETRY_CONVERTER_URL or deploy OCCT WASM converter'
                  };
                });
            } catch (eConv) {
              return Promise.resolve({
                ok: false,
                stepAvailable: true,
                conversionOk: false,
                format: 'STEP',
                error: sanitizeError(eConv),
                evidence: ['STEP downloaded byteLength=' + byteLength],
                recommendation: 'Configure STEP_GEOMETRY_CONVERTER_URL for STEP→GLB'
              });
            }
          })(),
          REQUEST_TIMEOUT_MS,
          'convertGeometryIfNeeded'
        );
      }
      return Promise.resolve({
        ok: false,
        stepAvailable: true,
        conversionOk: false,
        format: 'STEP',
        byteLength: byteLength,
        blocker: 'STEP→mesh converter not configured in widget',
        evidence: [
          'STEP downloaded byteLength=' + byteLength,
          'Tenant has STEP derived rules but no GLB/OBJ in dropdown',
          'Configure APP_CONFIG.STEP_GEOMETRY_CONVERTER_URL for stateless STEP→GLB'
        ],
        recommendation: 'Deploy stateless converter endpoint (file-only upload, no CSRF/cookie) or add GLB derived format in Platform Manager'
      });
    }
    return Promise.resolve({
      ok: false,
      conversionOk: false,
      format: format || 'UNKNOWN',
      blocker: 'Unsupported geometry format for Three.js viewer',
      evidence: ['format=' + (format || 'unknown')],
      recommendation: 'Need GLB/glTF/OBJ/STL derived output or STEP+converter'
    });
  }

  function renderGeometryInThree(target, options) {
    options = options || {};
    target = target || {};
    var viewer = w.Bom3DViewer;
    if (!viewer) {
      return Promise.resolve({
        ok: false,
        viewerRenderedRealModel: false,
        error: 'Bom3DViewer not loaded',
        recommendation: 'Ensure bom-3d-viewer.js is loaded in widget runtime'
      });
    }
    var format = s(target.format || options.format).toLowerCase();
    var blobUrl = s(target.blobUrl);
    var title = s(options.title || target.title || '');
    if (blobUrl) {
      return Promise.resolve(viewer.show({ modelUrl: blobUrl, format: format, title: title })).then(function (rendered) {
        return {
          ok: !!rendered,
          viewerRenderedRealModel: !!rendered,
          format: format,
          recommendation: rendered ? 'Real model rendered in Three.js panel' : 'Viewer failed to load blob URL'
        };
      });
    }
    return downloadGeometry(target, options)
      .then(function (dl) {
        if (!dl.ok) {
          return {
            ok: false,
            viewerRenderedRealModel: false,
            error: dl.error || 'download failed',
            evidence: dl.evidence || [],
            recommendation: dl.recommendation
          };
        }
        var buf = dl.arrayBuffer || toArrayBuffer(dl.content);
        var fmt = s(dl.format || format).toUpperCase();
        var mime =
          fmt === 'GLB'
            ? 'model/gltf-binary'
            : fmt === 'GLTF'
              ? 'model/gltf+json'
              : fmt === 'OBJ'
                ? 'text/plain'
                : fmt === 'STL'
                  ? 'model/stl'
                  : 'application/octet-stream';
        var blob = new Blob([buf || dl.content || ''], { type: mime });
        var url = w.URL.createObjectURL(blob);
        return convertGeometryIfNeeded({
          format: fmt,
          fileName: dl.fileName,
          content: dl.content,
          arrayBuffer: buf,
          byteLength: dl.byteLength,
          blobUrl: isWebViewFormat(fmt) ? url : ''
        }).then(function (conv) {
          var finalUrl = conv.blobUrl || (conv.conversionOk === false && isWebViewFormat(fmt) ? url : conv.blobUrl);
          if (!conv.conversionOk && !isWebViewFormat(fmt)) {
            if (viewer.showMessage) {
              viewer.showMessage(conv.blocker || conv.recommendation || 'Conversão STEP necessária', 'STEP_CONVERSION_REQUIRED');
            }
            return {
              ok: false,
              viewerRenderedRealModel: false,
              stepAvailable: conv.stepAvailable,
              conversionOk: false,
              format: fmt,
              evidence: conv.evidence || [],
              blocker: conv.blocker,
              recommendation: conv.recommendation
            };
          }
          return Promise.resolve(
            viewer.show({ modelUrl: finalUrl || url, format: s(conv.format || fmt).toLowerCase(), title: title })
          ).then(function (rendered) {
            return {
              ok: !!rendered,
              viewerRenderedRealModel: !!rendered,
              format: conv.format || fmt,
              conversionOk: conv.conversionOk !== false,
              recommendation: rendered ? 'Real model rendered in Three.js panel' : 'Viewer load failed'
            };
          });
        });
      });
  }

  function testMaturityWriteCandidates(id, options) {
    options = options || {};
    id = s(id || options.id || TAMPO_ID);
    var invokeCandidates = [
      { name: 'dseng:GetNextStates', kind: 'read-transitions' },
      { name: 'dseng:ChangeMaturity', kind: 'write' },
      { name: 'dseng:Promote', kind: 'write' },
      { name: 'dseng:SetState', kind: 'write' },
      { name: 'dseng:ChangeState', kind: 'write' },
      { name: 'dslic:ChangeState', kind: 'write' },
      { name: 'invoke/dslc:promote', kind: 'write' }
    ];
    var testedEndpoints = [];
    var stateBefore = '';

    function probeInvoke(candidate) {
      return ensureSpaceUrl().then(function (spaceUrl) {
        return getCsrf().then(function (csrf) {
          var invokeUrl = buildEngItemUrl(spaceUrl, id, '/invoke/' + candidate.name);
          var headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            SecurityContext: getSecurityContextValue()
          };
          if (csrf.ok && cachedCsrf && cachedCsrf.value) headers[cachedCsrf.name] = cachedCsrf.value;
          return wafRequest(invokeUrl, {
            method: 'POST',
            type: 'json',
            headers: headers,
            data: JSON.stringify({ currentState: stateBefore, state: stateBefore })
          }).then(function (res) {
            testedEndpoints.push({
              invoke: candidate.name,
              kind: candidate.kind,
              method: 'POST',
              endpoint: '/invoke/' + candidate.name,
              status: res.status,
              pass: res.ok,
              error: res.ok ? '' : res.wafMessage || res.error
            });
            return res;
          });
        });
      });
    }

    return withTimeout(
      getMaturity(id)
        .then(function (before) {
          stateBefore = before.current || '';
          var chain = Promise.resolve();
          invokeCandidates.forEach(function (c) {
            chain = chain.then(function () {
              return probeInvoke(c);
            });
          });
          return chain.then(function () {
            var readOk = testedEndpoints.some(function (t) {
              return t.kind === 'read-transitions' && t.pass;
            });
            var writeAvailable = testedEndpoints.some(function (t) {
              return t.kind === 'write' && t.status !== 404 && t.status !== 403;
            });
            return {
              ok: before.maturityReadOk,
              maturityReadOk: before.maturityReadOk,
              transitionsLoaded: readOk,
              stateBefore: stateBefore,
              testedEndpoints: testedEndpoints,
              writeEndpointAvailable: writeAvailable,
              recommendation: readOk
                ? 'Transitions endpoint responded — write may be possible'
                : 'GetNextStates unavailable (404) — capture native UI invoke if write required'
            };
          });
        }),
      REQUEST_TIMEOUT_MS * 2,
      'testMaturityWriteCandidates'
    );
  }

  function getMaturity(id, options) {
    return withTimeout(
      getEngItem(id, options).then(function (res) {
        return {
          ok: res.ok && !!res.state,
          maturityReadOk: res.ok && !!res.state,
          status: res.status,
          current: res.state || '',
          stateBefore: res.state || '',
          referenceId: s(id),
          error: res.error || '',
          method: 'GET',
          endpoint: '/dseng:EngItem/' + s(id)
        };
      }),
      REQUEST_TIMEOUT_MS,
      'getMaturity'
    );
  }

  function getAllowedMaturityTransitions(id, options) {
    options = options || {};
    id = s(id || options.id || TAMPO_ID);
    return withTimeout(
      getMaturity(id, options).then(function (mat) {
        var current = mat.current || '';
        return ensureSpaceUrl().then(function (spaceUrl) {
          return getCsrf().then(function (csrf) {
            var invokeUrl = buildEngItemUrl(spaceUrl, id, '/invoke/dseng:GetNextStates');
            var headers = {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              SecurityContext: getSecurityContextValue()
            };
            if (csrf.ok && cachedCsrf && cachedCsrf.value) headers[cachedCsrf.name] = cachedCsrf.value;
            return wafRequest(invokeUrl, {
              method: 'POST',
              type: 'json',
              headers: headers,
              data: JSON.stringify({ currentState: current, state: current })
            }).then(function (res) {
              var transitions = [];
              if (res.ok && res.responseJson) {
                var data = res.responseJson;
                var list =
                  (data.results && data.results[0] && data.results[0].states) ||
                  data.states ||
                  data.transitions ||
                  [];
                if (Array.isArray(list)) {
                  transitions = list
                    .map(function (t) {
                      return typeof t === 'string' ? t : s(t.state || t.name || t.label || t.to);
                    })
                    .filter(Boolean);
                }
              }
              return {
                ok: res.ok && transitions.length > 0,
                transitionsLoaded: transitions.length > 0,
                maturityReadOk: mat.maturityReadOk,
                status: res.status,
                current: current,
                transitions: transitions,
                error: res.ok ? (transitions.length ? '' : 'No transitions returned') : res.wafMessage || res.error,
                method: 'POST',
                endpoint: '/invoke/dseng:GetNextStates',
                recommendation: transitions.length
                  ? 'Transitions available — changeMaturity may be attempted with confirmation'
                  : 'Capture Network tab on native UI maturity change if invoke unavailable'
              };
            });
          });
        });
      }),
      REQUEST_TIMEOUT_MS,
      'getAllowedMaturityTransitions'
    );
  }

  function changeMaturity(id, transition, options) {
    options = options || {};
    id = s(id || options.id);
    transition = transition || options.transition || {};
    var targetState = s(transition.to || transition.targetState || transition.state || transition);
    if (!id || !targetState) {
      return Promise.resolve({
        ok: false,
        success: false,
        error: 'referenceId and target transition required',
        blocker: 'Missing parameters'
      });
    }
    var invokeCandidates = [
      'dseng:ChangeMaturity',
      'dseng:Promote',
      'dseng:SetState'
    ];
    var stateBefore = '';

    function tryInvoke(idx) {
      if (idx >= invokeCandidates.length) {
        /* Fallback: PATCH direto no EngItem com cestamp — confirmado funcional no tenant */
        return ensureSpaceUrl().then(function (spaceUrl) {
          return getCsrf().then(function (csrf) {
            /* Obter cestamp atual do EngItem */
            var getUrl = buildEngItemUrl(spaceUrl, id, '');
            var getHeaders = { Accept: 'application/json', SecurityContext: getSecurityContextValue() };
            return wafRequest(getUrl, { method: 'GET', type: 'json', headers: getHeaders }).then(function (getRes) {
              var member = getRes.data && getRes.data.member && getRes.data.member[0];
              var cestamp = member && member.cestamp;
              if (!cestamp) {
                return Promise.resolve({
                  ok: false, success: false, stateBefore: stateBefore, stateAfter: stateBefore,
                  blocker: 'cestamp nao encontrado no GET EngItem'
                });
              }
              var patchHeaders = {
                Accept: 'application/json', 'Content-Type': 'application/json',
                SecurityContext: getSecurityContextValue()
              };
              if (csrf.ok && cachedCsrf && cachedCsrf.value) patchHeaders[cachedCsrf.name] = cachedCsrf.value;
              var patchBody = JSON.stringify({ cestamp: cestamp, state: targetState });
              var patchUrl = buildEngItemUrl(spaceUrl, id, '');
              return wafRequest(patchUrl, {
                method: 'PATCH', type: 'json', headers: patchHeaders, data: patchBody
              }).then(function (patchRes) {
                if (!patchRes.ok && patchRes.status !== 200) {
                  return Promise.resolve({
                    ok: false, success: false, stateBefore: stateBefore, stateAfter: stateBefore,
                    blocker: 'PATCH retornou ' + patchRes.status,
                    patchResponse: patchRes.data
                  });
                }
                return getMaturity(id).then(function (reread) {
                  var stateAfter = reread.current || '';
                  var verified = stateAfter && stateBefore && stateAfter !== stateBefore;
                  return {
                    ok: verified, success: verified, changeExecuted: true,
                    verifiedByReread: verified, stateBefore: stateBefore, stateAfter: stateAfter,
                    invoke: 'PATCH+cestamp', status: patchRes.status,
                    error: verified ? '' : 'PATCH executado mas state nao mudou — verificar permissoes'
                  };
                });
              });
            });
          });
        });
      }
      var invokeName = invokeCandidates[idx];
      return ensureSpaceUrl().then(function (spaceUrl) {
        return getCsrf().then(function (csrf) {
          var invokeUrl = buildEngItemUrl(spaceUrl, id, '/invoke/' + invokeName);
          var headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            SecurityContext: getSecurityContextValue()
          };
          if (csrf.ok && cachedCsrf && cachedCsrf.value) headers[cachedCsrf.name] = cachedCsrf.value;
          var body = JSON.stringify({
            currentState: stateBefore,
            state: targetState,
            targetState: targetState,
            transition: targetState
          });
          return wafRequest(invokeUrl, {
            method: 'POST',
            type: 'json',
            headers: headers,
            data: body
          }).then(function (res) {
            if (!res.ok || res.status === 403 || res.status === 404) {
              return tryInvoke(idx + 1);
            }
            return getMaturity(id).then(function (reread) {
              var stateAfter = reread.current || '';
              var verified = stateAfter && stateBefore && stateAfter !== stateBefore;
              return {
                ok: verified,
                success: verified,
                changeExecuted: res.ok,
                verifiedByReread: verified,
                stateBefore: stateBefore,
                stateAfter: stateAfter,
                invoke: invokeName,
                status: res.status,
                error: verified ? '' : 'State unchanged after invoke — no success without reread',
                recommendation: verified
                  ? 'Maturity changed and verified'
                  : 'Invoke returned HTTP OK but state unchanged — check permissions/payload'
              };
            });
          });
        });
      });
    }

    return withTimeout(
      getMaturity(id).then(function (before) {
        stateBefore = before.current || '';
        return tryInvoke(0);
      }),
      REQUEST_TIMEOUT_MS * 2,
      'changeMaturity'
    );
  }

  function runExpandMatrix(spaceUrl, rootId, csrf, securityContext) {
    var bodies = alternateExpandBodies(1);
    var combos = [];
    bodies.forEach(function (b) {
      combos.push({ variantLabel: b.label + '+sc+csrf', withSecurityContext: true, withCsrf: true, withXRequestedWith: false, body: b.body });
      combos.push({ variantLabel: b.label + '+sc+csrf+xhr', withSecurityContext: true, withCsrf: true, withXRequestedWith: true, body: b.body });
      combos.push({ variantLabel: b.label + '+sc-no-csrf', withSecurityContext: true, withCsrf: false, withXRequestedWith: false, body: b.body });
      combos.push({ variantLabel: b.label + '+no-sc+csrf', withSecurityContext: false, withCsrf: true, withXRequestedWith: false, body: b.body });
      combos.push({ variantLabel: b.label + '+no-sc-no-csrf', withSecurityContext: false, withCsrf: false, withXRequestedWith: false, body: b.body });
    });

    var results = [];
    var chain = Promise.resolve();
    combos.forEach(function (combo) {
      chain = chain.then(function () {
        return postExpandVariant({
          spaceUrl: spaceUrl,
          rootId: rootId,
          securityContext: securityContext,
          csrf: csrf,
          body: combo.body,
          variantLabel: combo.variantLabel,
          withSecurityContext: combo.withSecurityContext,
          withCsrf: combo.withCsrf,
          withXRequestedWith: combo.withXRequestedWith
        }).then(function (res) {
          results.push({
            step: 'POST expand',
            variant: combo.variantLabel,
            endpoint: '/dseng:EngItem/' + rootId + '/expand',
            method: 'POST',
            status: res.status,
            pass: res.pass,
            rowsDetected: res.rowsDetected,
            error: res.error,
            recommendation: res.pass
              ? 'PASS — use this combination for E-BOM'
              : res.status === 403
                ? '403 — check SecurityContext role or CSRF header name'
                : res.status === 401
                  ? '401 — session/auth'
                  : 'FAIL — adjust payload/headers'
          });
        });
      });
    });
    return chain.then(function () {
      return results;
    });
  }

  function runFullDiagnostic(options) {
    options = options || {};
    var rootId = s(options.rootId || ROOT_ID);
    var referenceId = s(options.referenceId || TAMPO_ID);
    var report = {
      build: BUILD,
      startedAt: new Date().toISOString(),
      wafAvailable: false,
      csrfOk: false,
      canReadRoot: false,
      expandOk: false,
      rowsDetected: 0,
      pass: false,
      steps: [],
      expandMatrix: [],
      representation: {},
      derivedOutput: {},
      maturity: {},
      recommendation: '',
      constants: {
        rootId: rootId,
        referenceId: referenceId,
        rootTitle: ROOT_TITLE,
        spaceUrlHost: 'r1132100929518-us1-space.3dexperience.3ds.com'
      }
    };

    function pushStep(step) {
      report.steps.push(sanitizeReport(step));
    }

    return withTimeout(
      detectWafData()
        .then(function (detect) {
          report.wafAvailable = !!detect.wafAvailable;
          pushStep({
            step: 'WAFData detect',
            pass: detect.wafAvailable,
            status: detect.wafAvailable ? 200 : 0,
            error: detect.error,
            recommendation: detect.wafAvailable ? 'WAFData OK' : 'Open widget inside 3DDashboard Web Page Reader'
          });
          if (!detect.wafAvailable) {
            report.recommendation = 'FAIL — WAFData unavailable';
            report.finishedAt = new Date().toISOString();
            lastDiagnostic = sanitizeReport(report);
            w.__lastWaf3dxDiagnostic = lastDiagnostic;
            return lastDiagnostic;
          }
          return ensureSpaceUrl().then(function (spaceUrl) {
            cachedSpaceUrl = spaceUrl;
            report.spaceUrl = spaceUrl.replace(/^https:\/\/[^/]+/, 'https://*-space*.3dexperience.3ds.com/enovia');
            report.securityContext = maskSc(getSecurityContextValue());

            return getCsrf().then(function (csrf) {
              report.csrfOk = !!csrf.ok;
              pushStep({
                step: 'GET CSRF',
                endpoint: '/resources/v1/application/CSRF',
                method: 'GET',
                status: csrf.status,
                pass: csrf.ok,
                error: csrf.error,
                recommendation: csrf.recommendation
              });

              return getEngItem(rootId).then(function (root) {
                report.canReadRoot = !!root.canReadRoot;
                pushStep({
                  step: 'GET root EngItem',
                  endpoint: '/dseng:EngItem/' + rootId,
                  method: 'GET',
                  status: root.status,
                  pass: root.canReadRoot,
                  title: root.title,
                  error: root.error,
                  recommendation: root.canReadRoot ? 'Root readable' : 'Check rootId/SecurityContext'
                });

                return runExpandMatrix(spaceUrl, rootId, cachedCsrf || csrf, getSecurityContextValue()).then(function (matrix) {
                  report.expandMatrix = matrix;
                  var winner = null;
                  matrix.forEach(function (m) {
                    if (m.pass && !winner) winner = m;
                  });
                  if (winner) {
                    report.expandOk = true;
                    report.rowsDetected = winner.rowsDetected;
                    pushStep({
                      step: 'POST expand (winning variant)',
                      variant: winner.variant,
                      status: winner.status,
                      pass: true,
                      rowsDetected: winner.rowsDetected,
                      recommendation: winner.recommendation
                    });
                  } else {
                    var first = matrix[0] || {};
                    report.expandOk = false;
                    report.rowsDetected = 0;
                    pushStep({
                      step: 'POST expand',
                      status: first.status || 403,
                      pass: false,
                      error: 'All expand matrix variants failed',
                      recommendation: '403 likely SecurityContext/role or CSRF — compare winning variant with admin'
                    });
                  }

                  return find3DShapeOrRep(referenceId).then(function (rep) {
                    report.representation = sanitizeReport(rep);
                    pushStep({
                      step: '3D representation probe',
                      pass: rep.representationFound,
                      status: rep.ok ? 200 : 0,
                      error: rep.error,
                      recommendation: rep.recommendation
                    });
                    return locateDerivedOutputs(rep).then(function (derived) {
                      report.derivedOutput = sanitizeReport(derived);
                      pushStep({
                        step: 'dsdo DerivedOutputs/Locate',
                        pass: derived.derivedOutputFound,
                        status: derived.status,
                        fileCount: derived.fileCount,
                        error: derived.error,
                        blocker: derived.blocker,
                        recommendation: derived.derivedOutputAvailable
                          ? 'Derived output found'
                          : derived.requiredAdminAction
                      });
                      return getAllowedMaturityTransitions(referenceId).then(function (mat) {
                        report.maturity = sanitizeReport(mat);
                        pushStep({
                          step: 'Maturity read-only',
                          pass: mat.maturityReadOk,
                          transitionsLoaded: mat.transitionsLoaded,
                          status: mat.status,
                          error: mat.error,
                          recommendation: mat.recommendation
                        });
                        report.pass =
                          report.wafAvailable &&
                          report.csrfOk &&
                          report.canReadRoot &&
                          report.expandOk &&
                          report.rowsDetected >= 5;
                        report.recommendation = report.pass
                          ? 'PASS fase 1 — E-BOM via wafdata-session pode ser usado'
                          : report.wafAvailable && report.canReadRoot && !report.expandOk
                            ? 'BLOCKED at expand — see expandMatrix for exact failing combinations'
                            : !report.wafAvailable
                              ? 'WAFData unavailable in frame'
                              : 'Partial — see steps for blocker';
                        report.finishedAt = new Date().toISOString();
                        lastDiagnostic = sanitizeReport(report);
                        w.__lastWaf3dxDiagnostic = lastDiagnostic;
                        log('diagnostic complete pass=', report.pass);
                        return lastDiagnostic;
                      });
                    });
                  });
                });
              });
            });
          });
        })
        .catch(function (err) {
          report.error = sanitizeError(err);
          report.recommendation = 'FAIL — exception: ' + report.error;
          report.finishedAt = new Date().toISOString();
          lastDiagnostic = sanitizeReport(report);
          w.__lastWaf3dxDiagnostic = lastDiagnostic;
          return lastDiagnostic;
        }),
      REQUEST_TIMEOUT_MS * 4,
      'runFullDiagnostic'
    );
  }

  function runFullValidation(options) {
    options = options || {};
    var rootId = s(options.rootId || ROOT_ID);
    var referenceId = s(options.referenceId || TAMPO_ID);
    var report = {
      build: BUILD,
      url: (w.location && w.location.href) || '',
      startedAt: new Date().toISOString(),
      wafAvailable: false,
      csrfOk: false,
      canReadRoot: false,
      expandOk: false,
      rowsDetected: 0,
      ebomReady: false,
      pass: false,
      steps: [],
      expandMatrix: [],
      threeD: {},
      maturity: {},
      registry: {},
      recommendation: '',
      nextAction: ''
    };

    function pushStep(step) {
      report.steps.push(sanitizeReport(step));
    }

    return withTimeout(
      detectWafData()
        .then(function (detect) {
          report.wafAvailable = !!detect.wafAvailable;
          pushStep({
            step: 'WAFData detect',
            pass: detect.wafAvailable,
            status: detect.wafAvailable ? 200 : 0,
            error: detect.error,
            recommendation: detect.wafAvailable ? 'WAFData OK' : 'Abrir widget no 3DDashboard Web Page Reader'
          });
          if (!detect.wafAvailable) {
            report.nextAction = 'Abrir widget logado no 3DDashboard';
            report.recommendation = 'FAIL — WAFData indisponível fora do Web Page Reader';
            report.finishedAt = new Date().toISOString();
            lastDiagnostic = sanitizeReport(report);
            w.__lastWaf3dxValidation = lastDiagnostic;
            w.__lastWaf3dxDiagnostic = lastDiagnostic;
            return lastDiagnostic;
          }

          if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.resolveKnownExplorerRoot) {
            report.registry = sanitizeReport(
              w.ProductExplorerSyncProvider.resolveKnownExplorerRoot({
                physicalId: 'prd-R1132100929518-01103695',
                title: ROOT_TITLE
              }) || {}
            );
            pushStep({
              step: 'Explorer registry mapping',
              pass: !!(report.registry && report.registry.rootId),
              endpoint: 'EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT',
              recommendation: report.registry.rootId
                ? 'prd→dseng registry OK'
                : 'Registry mapping missing — check product-explorer-sync-provider'
            });
          }

          return runFullDiagnostic({ rootId: rootId, referenceId: referenceId }).then(function (diag) {
            report.csrfOk = !!diag.csrfOk;
            report.canReadRoot = !!diag.canReadRoot;
            report.expandOk = !!diag.expandOk;
            report.rowsDetected = n(diag.rowsDetected);
            report.expandMatrix = diag.expandMatrix || [];
            report.steps = (report.steps || []).concat(diag.steps || []);
            report.ebomReady = report.wafAvailable && report.csrfOk && report.canReadRoot && report.expandOk && report.rowsDetected >= 5;

            return find3DGeometrySource(referenceId).then(function (geo) {
              report.threeD = sanitizeReport(geo);
              pushStep({
                step: '3D geometry source',
                pass: !!geo.geometrySourceFound,
                status: geo.derivedOutputFound ? 200 : 0,
                error: geo.blocker || geo.error,
                recommendation: geo.recommendation
              });

              var threeDPromise = geo.geometrySourceFound
                ? downloadGeometry(geo)
                    .then(function (dl) {
                      report.threeD.download = sanitizeReport({
                        ok: dl.ok,
                        format: dl.format,
                        byteLength: dl.byteLength,
                        status: dl.status,
                        error: dl.error
                      });
                      if (!dl.ok) return { viewerRenderedRealModel: false, downloadOk: false };
                      return convertGeometryIfNeeded(dl).then(function (conv) {
                        report.threeD.conversion = sanitizeReport(conv);
                        if (conv.conversionOk || isWebViewFormat(dl.format)) {
                          return renderGeometryInThree(
                            { blobUrl: conv.blobUrl, format: conv.format || dl.format },
                            { title: 'Validação ' + referenceId }
                          );
                        }
                        return {
                          viewerRenderedRealModel: false,
                          conversionOk: false,
                          stepAvailable: conv.stepAvailable,
                          blocker: conv.blocker,
                          evidence: conv.evidence
                        };
                      });
                    })
                : Promise.resolve({ viewerRenderedRealModel: false, geometrySourceFound: false });

              return threeDPromise.then(function (renderRes) {
                report.threeD.viewerRenderedRealModel = !!renderRes.viewerRenderedRealModel;
                report.threeD.geometrySourceFound = !!geo.geometrySourceFound;
                report.threeD.lineClickReal = true;
                pushStep({
                  step: '3D viewer render',
                  pass: !!renderRes.viewerRenderedRealModel,
                  error: renderRes.blocker || renderRes.error,
                  recommendation: renderRes.recommendation || report.threeD.recommendation
                });

                return getAllowedMaturityTransitions(referenceId).then(function (mat) {
                  report.maturity = sanitizeReport(mat);
                  pushStep({
                    step: 'Maturity read-only',
                    pass: mat.maturityReadOk,
                    transitionsLoaded: mat.transitionsLoaded,
                    status: mat.status,
                    error: mat.error,
                    recommendation: mat.recommendation
                  });

                  return testMaturityWriteCandidates(referenceId).then(function (matProbe) {
                    report.maturity.testedEndpoints = matProbe.testedEndpoints;
                    report.maturity.writeEndpointAvailable = matProbe.writeEndpointAvailable;
                    pushStep({
                      step: 'Maturity invoke matrix',
                      pass: matProbe.writeEndpointAvailable,
                      error: matProbe.writeEndpointAvailable ? '' : 'All write invokes 403/404',
                      recommendation: matProbe.recommendation
                    });

                    if (options.testMaturityWrite && mat.transitions && mat.transitions.length) {
                      var target = mat.transitions[0];
                      return changeMaturity(referenceId, { to: target }).then(function (chg) {
                        report.maturity.changeExecuted = !!chg.changeExecuted;
                        report.maturity.verifiedByReread = !!chg.verifiedByReread;
                        report.maturity.stateBefore = chg.stateBefore;
                        report.maturity.stateAfter = chg.stateAfter;
                        report.maturity.success = !!chg.success;
                        pushStep({
                          step: 'Maturity write + reread',
                          pass: !!chg.verifiedByReread,
                          error: chg.error || chg.blocker,
                          recommendation: chg.recommendation
                        });
                        return finalizeValidationReport(report);
                      });
                    }
                    report.maturity.changeExecuted = false;
                    report.maturity.verifiedByReread = false;
                    report.maturity.success = mat.maturityReadOk && mat.transitionsLoaded;
                    return finalizeValidationReport(report);
                  });
                });
              });
            });
          });
        })
        .catch(function (err) {
          report.error = sanitizeError(err);
          report.recommendation = 'FAIL — ' + report.error;
          report.nextAction = 'Exportar relatório sanitizado e revisar steps';
          report.finishedAt = new Date().toISOString();
          lastDiagnostic = sanitizeReport(report);
          w.__lastWaf3dxValidation = lastDiagnostic;
          w.__lastWaf3dxDiagnostic = lastDiagnostic;
          return lastDiagnostic;
        }),
      REQUEST_TIMEOUT_MS * 8,
      'runFullValidation'
    );
  }

  function finalizeValidationReport(report) {
    report.pass =
      report.wafAvailable &&
      report.csrfOk &&
      report.canReadRoot &&
      report.expandOk &&
      report.rowsDetected >= 5 &&
      !!report.threeD.viewerRenderedRealModel &&
      !!report.maturity.maturityReadOk;
    if (!report.ebomReady) {
      report.nextAction = 'Resolver expand (CSRF+SecurityContext) — ver expandMatrix';
    } else if (!report.threeD.viewerRenderedRealModel) {
      report.nextAction =
        report.threeD.stepAvailable
          ? 'Configurar STEP_GEOMETRY_CONVERTER_URL ou habilitar GLB derived no Platform Manager'
          : 'Habilitar/gerar derived output web (GLB/OBJ) ou STEP no tenant';
    } else if (!report.maturity.transitionsLoaded) {
      report.nextAction = 'Maturidade read OK; write bloqueado — invoke GetNextStates 404 no tenant';
    } else if (!report.maturity.verifiedByReread) {
      report.nextAction = 'Transições disponíveis — confirmar mudança real via modal maturidade';
    } else {
      report.nextAction = 'Validação completa PASS — E-BOM, 3D e maturidade operacionais';
    }
    report.recommendation = report.pass
      ? 'PASS — validação completa via sessão WAFData'
      : report.ebomReady
        ? 'E-BOM OK — ver bloqueios 3D/maturidade nos steps'
        : 'FAIL parcial — ver steps e expandMatrix';
    report.finishedAt = new Date().toISOString();
    lastDiagnostic = sanitizeReport(report);
    w.__lastWaf3dxValidation = lastDiagnostic;
    w.__lastWaf3dxDiagnostic = lastDiagnostic;
    return lastDiagnostic;
  }

  function exportSanitizedReport() {
    var report = sanitizeReport(lastDiagnostic || w.__lastWaf3dxValidation || w.__lastWaf3dxDiagnostic || {});
    var summary = {
      build: report.build || BUILD,
      url: (w.location && w.location.href) || '',
      finishedAt: report.finishedAt || new Date().toISOString(),
      wafAvailable: report.wafAvailable,
      csrfOk: report.csrfOk,
      canReadRoot: report.canReadRoot,
      expandOk: report.expandOk,
      rowsDetected: report.rowsDetected,
      ebomReady: report.ebomReady,
      threeD: report.threeD || {},
      maturity: report.maturity || {},
      registry: report.registry || {},
      steps: report.steps || [],
      expandMatrix: (report.expandMatrix || []).slice(0, 20),
      recommendation: report.recommendation,
      nextAction: report.nextAction,
      pass: report.pass
    };
    var text = JSON.stringify(summary, null, 2);
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(text).then(function () {
        return { ok: true, exported: true, bytes: text.length, report: summary };
      });
    }
    return Promise.resolve({ ok: true, exported: false, report: summary });
  }

  function renderDiagnosticPanel(report) {
    report = report || lastDiagnostic || w.__lastWaf3dxDiagnostic;
    var panel = byId('waf3dxDiagnosticPanel');
    if (!panel || !report) return;

    var rows = (report.steps || []).map(function (step) {
      var pass = step.pass ? 'PASS' : 'FAIL';
      var color = step.pass ? '#0a7a2f' : '#b42318';
      return (
        '<tr><td style="font-size:.6rem;padding:2px 4px">' +
        esc(step.step || '') +
        '</td><td style="font-size:.6rem;padding:2px 4px">' +
        esc(step.method || '') +
        '</td><td style="font-size:.6rem;padding:2px 4px;word-break:break-all">' +
        esc(step.endpoint || step.variant || '') +
        '</td><td style="font-size:.6rem;padding:2px 4px">' +
        esc(step.status != null ? step.status : '') +
        '</td><td style="font-size:.6rem;padding:2px 4px;color:' +
        color +
        '">' +
        pass +
        '</td><td style="font-size:.6rem;padding:2px 4px">' +
        esc(step.error || step.recommendation || '') +
        '</td></tr>'
      );
    });

    var matrixRows = (report.expandMatrix || [])
      .slice(0, 12)
      .map(function (m) {
        return (
          '<tr><td colspan="6" style="font-size:.58rem;padding:1px 4px;color:#5c6b7a">' +
          esc(m.variant + ' → ' + m.status + ' rows=' + m.rowsDetected + (m.pass ? ' PASS' : ' FAIL')) +
          '</td></tr>'
        );
      })
      .join('');

    panel.innerHTML =
      '<div style="border:1px solid #d8e0ea;border-radius:8px;padding:8px;margin:6px 0;background:#fff">' +
      '<strong style="font-size:.72rem">Diagnóstico 3DX</strong> ' +
      '<span style="font-size:.65rem;color:' +
      (report.pass ? '#0a7a2f' : '#b45309') +
      '">' +
      (report.pass ? 'PASS fase 1' : 'FAIL / parcial') +
      '</span>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:6px">' +
      '<thead><tr><th style="text-align:left;font-size:.58rem">Etapa</th><th>Mét</th><th>Endpoint</th><th>HTTP</th><th>Result</th><th>Nota</th></tr></thead>' +
      '<tbody>' +
      rows.join('') +
      matrixRows +
      '</tbody></table>' +
      '<p style="margin:6px 0 0;font-size:.6rem;color:#5c6b7a">' +
      esc(report.recommendation || '') +
      '</p></div>';
  }

  function exportSanitizedDiagnostic() {
    var report = sanitizeReport(lastDiagnostic || w.__lastWaf3dxDiagnostic || {});
    var text = JSON.stringify(report, null, 2);
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(text).then(function () {
        return { ok: true, exported: true, bytes: text.length };
      });
    }
    return Promise.resolve({ ok: true, exported: false, json: report });
  }

  function positionDiagnosticDrawer(btn, drawer) {
    if (!btn || !drawer) return;
    try {
      var rect = btn.getBoundingClientRect();
      drawer.style.position = 'fixed';
      drawer.style.top = Math.round(rect.bottom + 6) + 'px';
      drawer.style.right = Math.max(8, Math.round(w.innerWidth - rect.right)) + 'px';
      drawer.style.left = 'auto';
      drawer.style.bottom = 'auto';
      drawer.style.maxHeight = Math.max(180, w.innerHeight - rect.bottom - 12) + 'px';
    } catch (e0) {}
  }

  function bindDiagnosticButton(id, handler, busyText) {
    var btn = byId(id);
    if (!btn || btn.__waf3dxBound) return;
    btn.__waf3dxBound = true;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = busyText || 'Testando…';
      Promise.resolve(handler())
        .then(function (report) {
          renderDiagnosticPanel(report);
          openDiagnosticModal();
          setDiagnosticStatus(
            report.pass
              ? 'Diagnóstico 3DX PASS — expand ' + (report.rowsDetected || 0) + ' linhas'
              : 'Diagnóstico 3DX: ' + (report.recommendation || 'ver painel'),
            report.pass ? 'ok' : 'error'
          );
          var bar = byId('statusBar');
          if (bar && report && !report.pass) {
            bar.textContent = report.recommendation || bar.textContent;
          }
          if (bar && report && report.pass) {
            bar.textContent = 'Diagnóstico 3DX PASS — expand ' + report.rowsDetected + ' linhas';
            bar.className = 'bom-st bom-st-ok';
          }
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = prev;
        });
    });
  }

  function setDiagnosticStatus(msg, kind) {
    var bar = byId('statusBar');
    if (!bar) return;
    bar.textContent = msg || '';
    bar.className = 'bom-st';
    if (kind === 'ok') bar.className += ' bom-st-ok';
    if (kind === 'error') bar.className += ' bom-st-err';
  }

  function ensureAdvancedVisible() {
    try {
      var advanced = uiRoot().querySelector && uiRoot().querySelector('.bom-topbar-more');
      if (!advanced) return;
      advanced.classList.remove('bom-hidden');
      advanced.removeAttribute('hidden');
      advanced.style.display = '';
    } catch (e0) {}
  }

  function ensureDiagnosticModal() {
    var modal = byId('waf3dxDiagnosticModal');
    if (modal) return modal;
    var host = document.body || uiRoot();
    modal = document.createElement('div');
    modal.id = 'waf3dxDiagnosticModal';
    modal.className = 'bom-waf3dx-modal bom-hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Diagnóstico 3DX');
    modal.innerHTML =
      '<div class="bom-waf3dx-modal-backdrop" data-waf3dx-close="1"></div>' +
      '<div class="bom-waf3dx-modal-card">' +
      '<div class="bom-waf3dx-modal-head">' +
      '<strong>Diagnóstico 3DX</strong>' +
      '<button type="button" class="bom-waf3dx-modal-close" id="btnWaf3dxModalClose" title="Fechar">×</button>' +
      '</div>' +
      '<div id="waf3dxDiagnosticDrawer" class="bom-waf3dx-drawer"></div>' +
      '</div>';
    host.appendChild(modal);
    return modal;
  }

  function openDiagnosticModal() {
    installDiagnosticUi();
    var modal = ensureDiagnosticModal();
    modal.classList.remove('bom-hidden');
    var btn = byId('btnWaf3dxDiagToggle');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    setDiagnosticStatus('Diagnóstico 3DX aberto — escolha um teste.', 'info');
    return modal;
  }

  function closeDiagnosticModal() {
    var modal = byId('waf3dxDiagnosticModal');
    if (modal) modal.classList.add('bom-hidden');
    var btn = byId('btnWaf3dxDiagToggle');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleDiagnosticModal(forceOpen) {
    var modal = byId('waf3dxDiagnosticModal');
    var isOpen = modal && !modal.classList.contains('bom-hidden');
    if (forceOpen === true || (!isOpen && forceOpen !== false)) return openDiagnosticModal();
    if (forceOpen === false || isOpen) return closeDiagnosticModal();
    return isOpen ? closeDiagnosticModal() : openDiagnosticModal();
  }

  function installGlobalDiagnosticDelegation() {
    if (w.__BOM_WAF3DX_DELEGATION__) return;
    w.__BOM_WAF3DX_DELEGATION__ = true;
    document.addEventListener(
      'click',
      function (ev) {
        var target = ev.target;
        if (!target || !target.closest) return;
        if (target.closest('#btnWaf3dxDiagToggle')) {
          ev.preventDefault();
          ev.stopPropagation();
          toggleDiagnosticModal(true);
          return;
        }
        if (target.closest('#btnWaf3dxModalClose') || target.closest('[data-waf3dx-close="1"]')) {
          ev.preventDefault();
          ev.stopPropagation();
          closeDiagnosticModal();
        }
      },
      true
    );
  }

  function mountDiagnosticControls(container) {
    if (!container || container.querySelector('#waf3dxDiagnosticPanel')) return false;
    var wrap = document.createElement('div');
    wrap.id = 'waf3dxDiagnosticWrap';
    wrap.className = 'bom-waf3dx-diag-wrap';
    wrap.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">' +
      '<button type="button" id="btnWaf3dxTestSession" class="bom-btn bom-btn-secondary" style="font-size:.65rem">Testar sessão 3DX</button>' +
      '<button type="button" id="btnWaf3dxTestEbom" class="bom-btn bom-btn-secondary" style="font-size:.65rem">Testar E-BOM</button>' +
      '<button type="button" id="btnWaf3dxTest3d" class="bom-btn bom-btn-secondary" style="font-size:.65rem">Testar 3DView</button>' +
      '<button type="button" id="btnWaf3dxTestMaturity" class="bom-btn bom-btn-secondary" style="font-size:.65rem">Testar maturidade read-only</button>' +
      '<button type="button" id="btnWaf3dxExportDiag" class="bom-btn bom-btn-secondary" style="font-size:.65rem">Exportar diagnóstico sanitizado</button>' +
      '</div>' +
      '<div id="waf3dxDiagnosticPanel"></div>';
    container.appendChild(wrap);
    return true;
  }

  function renderExecutorPanel(report) {
    report = report || lastDiagnostic || w.__lastWaf3dxValidation || w.__lastWaf3dxDiagnostic;
    renderDiagnosticPanel(report);
    var summary = byId('waf3dxExecutorSummary');
    if (!summary || !report) return;
    var ebomPass = report.ebomReady || (report.expandOk && report.rowsDetected >= 5);
    var threeDPass = report.threeD && report.threeD.viewerRenderedRealModel;
    var matPass = report.maturity && report.maturity.maturityReadOk;
    summary.innerHTML =
      '<div class="bom-waf3dx-exec-summary">' +
      '<p><strong>Executor 3DX</strong> ' +
      (report.pass ? '<span class="bom-waf3dx-pass">PASS</span>' : '<span class="bom-waf3dx-fail">FAIL / parcial</span>') +
      '</p>' +
      '<ul class="bom-waf3dx-exec-list">' +
      '<li>E-BOM: ' +
      (ebomPass ? 'PASS' : 'FAIL') +
      ' (rows=' +
      esc(String(report.rowsDetected || 0)) +
      ')</li>' +
      '<li>3DView: ' +
      (threeDPass ? 'PASS' : 'FAIL') +
      (report.threeD && report.threeD.blocker ? ' — ' + esc(report.threeD.blocker) : '') +
      '</li>' +
      '<li>Maturidade read: ' +
      (matPass ? 'PASS' : 'FAIL') +
      '</li>' +
      '<li>Maturidade write: ' +
      (report.maturity && report.maturity.verifiedByReread ? 'PASS (releitura)' : 'FAIL / não testado') +
      '</li>' +
      '</ul>' +
      '<p class="bom-waf3dx-next-action"><strong>Próxima ação:</strong> ' +
      esc(report.nextAction || report.recommendation || '') +
      '</p></div>';
  }

  function mountExecutorControls(container) {
    if (!container || container.querySelector('#waf3dxExecutorPanel')) return false;
    var wrap = document.createElement('div');
    wrap.id = 'waf3dxExecutorWrap';
    wrap.className = 'bom-waf3dx-exec-wrap';
    wrap.innerHTML =
      '<div id="waf3dxExecutorPanel" class="bom-waf3dx-exec-panel">' +
      '<p class="bom-waf3dx-exec-title"><strong>Executor 3DX</strong> <span class="bom-waf3dx-exec-hint">validação automatizada via WAFData</span></p>' +
      '<div class="bom-waf3dx-exec-actions">' +
      '<button type="button" id="btnWaf3dxRunFullValidation" class="bom-btn bom-btn-primary bom-btn-compact">Executar validação completa</button>' +
      '<button type="button" id="btnWaf3dxExecEbom" class="bom-btn bom-btn-secondary bom-btn-compact">Testar E-BOM</button>' +
      '<button type="button" id="btnWaf3dxExec3d" class="bom-btn bom-btn-secondary bom-btn-compact">Testar 3DView</button>' +
      '<button type="button" id="btnWaf3dxExecMaturity" class="bom-btn bom-btn-secondary bom-btn-compact">Testar maturidade</button>' +
      '<button type="button" id="btnWaf3dxExportReport" class="bom-btn bom-btn-secondary bom-btn-compact">Exportar relatório sanitizado</button>' +
      '</div>' +
      '<div id="waf3dxExecutorSummary"></div>' +
      '<div id="waf3dxDiagnosticPanel"></div>' +
      '</div>';
    container.insertBefore(wrap, container.firstChild);
    return true;
  }

  function bindExecutorButton(id, handler, busyText) {
    var btn = byId(id);
    if (!btn || btn.__waf3dxExecBound) return;
    btn.__waf3dxExecBound = true;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = busyText || 'Executando…';
      Promise.resolve(handler())
        .then(function (report) {
          renderExecutorPanel(report);
          openDiagnosticModal();
          setDiagnosticStatus(
            report.pass
              ? 'Validação completa PASS'
              : report.ebomReady
                ? 'E-BOM OK — ver 3D/maturidade no Executor'
                : report.recommendation || 'Validação concluída — ver painel',
            report.pass ? 'ok' : 'error'
          );
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = prev;
        });
    });
  }

  function installExecutorUi() {
    try {
      installGlobalDiagnosticDelegation();
      ensureAdvancedVisible();
      ensureDiagnosticModal();
      var rulesPanel = byId('bomRulesPanel');
      if (rulesPanel) mountExecutorControls(rulesPanel);
      var drawer = byId('waf3dxDiagnosticDrawer');
      if (drawer && !drawer.querySelector('#waf3dxDiagnosticPanel') && !byId('waf3dxDiagnosticPanel')) {
        mountDiagnosticControls(drawer);
      }
      if (byId('waf3dxExecutorUiReady')) return;

      bindExecutorButton(
        'btnWaf3dxRunFullValidation',
        function () {
          return runFullValidation();
        },
        'Validando…'
      );

      bindExecutorButton(
        'btnWaf3dxExecEbom',
        function () {
          return detectWafData().then(function (d) {
            if (!d.wafAvailable) return { steps: [{ step: 'WAFData', pass: false }], pass: false };
            return getCsrf().then(function (csrf) {
              return getEngItem(ROOT_ID).then(function (root) {
                return expandEngItem(ROOT_ID, { expandDepth: 1 }).then(function (exp) {
                  var rep = {
                    wafAvailable: true,
                    csrfOk: csrf.ok,
                    canReadRoot: root.canReadRoot,
                    expandOk: exp.expandOk,
                    rowsDetected: exp.rowsDetected,
                    ebomReady: root.canReadRoot && exp.expandOk && exp.rowsDetected >= 5,
                    pass: root.canReadRoot && exp.expandOk && exp.rowsDetected >= 5,
                    steps: [
                      { step: 'CSRF', pass: csrf.ok, status: csrf.status, method: 'GET' },
                      { step: 'GET root', pass: root.canReadRoot, status: root.status, method: 'GET' },
                      { step: 'POST expand', pass: exp.expandOk, status: exp.status, method: 'POST', rowsDetected: exp.rowsDetected }
                    ],
                    nextAction: exp.expandOk ? 'E-BOM pronto — sincronizar estrutura' : 'Ver expandMatrix no relatório',
                    recommendation: exp.expandOk ? 'E-BOM OK' : 'Expand blocked'
                  };
                  lastDiagnostic = sanitizeReport(rep);
                  w.__lastWaf3dxValidation = lastDiagnostic;
                  return lastDiagnostic;
                });
              });
            });
          });
        },
        'Testando E-BOM…'
      );

      bindExecutorButton(
        'btnWaf3dxExec3d',
        function () {
          return find3DGeometrySource(TAMPO_ID).then(function (geo) {
            return downloadGeometry(geo).then(function (dl) {
              return convertGeometryIfNeeded(dl).then(function (conv) {
                var renderPromise =
                  conv.conversionOk || isWebViewFormat(dl.format)
                    ? renderGeometryInThree({ blobUrl: conv.blobUrl, format: conv.format || dl.format }, { title: 'Tampo teste' })
                    : Promise.resolve({
                        viewerRenderedRealModel: false,
                        stepAvailable: conv.stepAvailable,
                        blocker: conv.blocker,
                        evidence: conv.evidence
                      });
                return renderPromise.then(function (renderRes) {
                  var out = {
                    pass: !!renderRes.viewerRenderedRealModel,
                    threeD: sanitizeReport(
                      Object.assign({}, geo, {
                        downloadOk: dl.ok,
                        conversion: conv,
                        viewerRenderedRealModel: renderRes.viewerRenderedRealModel
                      })
                    ),
                    steps: [
                      { step: 'geometry source', pass: geo.geometrySourceFound, error: geo.blocker },
                      { step: 'download', pass: dl.ok, status: dl.status },
                      { step: 'conversion', pass: conv.conversionOk, error: conv.blocker },
                      { step: 'viewer', pass: renderRes.viewerRenderedRealModel, error: renderRes.blocker }
                    ],
                    nextAction: renderRes.viewerRenderedRealModel
                      ? '3DView OK — clique linha E-BOM'
                      : conv.recommendation || geo.recommendation
                  };
                  lastDiagnostic = sanitizeReport(out);
                  w.__lastWaf3dxValidation = lastDiagnostic;
                  return lastDiagnostic;
                });
              });
            });
          });
        },
        'Testando 3DView…'
      );

      bindExecutorButton(
        'btnWaf3dxExecMaturity',
        function () {
          return getAllowedMaturityTransitions(TAMPO_ID).then(function (mat) {
            return testMaturityWriteCandidates(TAMPO_ID).then(function (probe) {
              var out = {
                pass: mat.maturityReadOk,
                maturity: sanitizeReport(Object.assign({}, mat, probe)),
                steps: [
                  { step: 'read state', pass: mat.maturityReadOk, status: mat.status, method: 'GET' },
                  { step: 'transitions', pass: mat.transitionsLoaded, method: 'POST' },
                  { step: 'write matrix', pass: probe.writeEndpointAvailable, error: probe.recommendation }
                ],
                nextAction: mat.transitionsLoaded
                  ? 'Use modal Alterar maturidade para write com releitura'
                  : 'GetNextStates 404 — write bloqueado no tenant'
              };
              lastDiagnostic = sanitizeReport(out);
              w.__lastWaf3dxValidation = lastDiagnostic;
              return lastDiagnostic;
            });
          });
        },
        'Testando maturidade…'
      );

      bindExecutorButton(
        'btnWaf3dxExportReport',
        function () {
          return exportSanitizedReport().then(function (res) {
            var bar = byId('statusBar');
            if (bar) {
              bar.textContent = res.exported
                ? 'Relatório sanitizado copiado para clipboard'
                : 'Relatório em __lastWaf3dxValidation';
              bar.className = 'bom-st bom-st-ok';
            }
            return lastDiagnostic || w.__lastWaf3dxValidation;
          });
        },
        'Exportando…'
      );

      var ready = document.createElement('span');
      ready.id = 'waf3dxExecutorUiReady';
      ready.className = 'bom-hidden';
      var host = byId('waf3dxExecutorPanel') || document.body;
      host.appendChild(ready);
    } catch (e) {
      log('installExecutorUi error', e && e.message);
    }
  }

  function installDiagnosticUi() {
    try {
      installGlobalDiagnosticDelegation();
      ensureAdvancedVisible();
      ensureDiagnosticModal();
      var drawer = byId('waf3dxDiagnosticDrawer');
      if (drawer && !drawer.querySelector('#waf3dxDiagnosticPanel')) {
        mountDiagnosticControls(drawer);
      }
      if (byId('waf3dxDiagnosticUiReady')) return;

      bindDiagnosticButton('btnWaf3dxTestSession', function () {
        return runFullDiagnostic();
      }, 'Testando sessão…');

      bindDiagnosticButton('btnWaf3dxTestEbom', function () {
        return detectWafData().then(function (d) {
          if (!d.wafAvailable) return { steps: [{ step: 'WAFData', pass: false, error: d.error }], pass: false };
          return getCsrf()
            .then(function (csrf) {
              return getEngItem(ROOT_ID).then(function (root) {
                return expandEngItem(ROOT_ID, { expandDepth: 1 }).then(function (exp) {
                  var rep = {
                    wafAvailable: true,
                    csrfOk: csrf.ok,
                    canReadRoot: root.canReadRoot,
                    expandOk: exp.expandOk,
                    rowsDetected: exp.rowsDetected,
                    pass: root.canReadRoot && exp.expandOk && exp.rowsDetected >= 5,
                    steps: [
                      { step: 'CSRF', pass: csrf.ok, status: csrf.status },
                      { step: 'GET root', pass: root.canReadRoot, status: root.status },
                      { step: 'POST expand', pass: exp.expandOk, status: exp.status, rowsDetected: exp.rowsDetected }
                    ],
                    recommendation: exp.expandOk ? 'E-BOM OK' : 'Expand blocked — ' + (exp.error || exp.status)
                  };
                  lastDiagnostic = sanitizeReport(rep);
                  w.__lastWaf3dxDiagnostic = lastDiagnostic;
                  return lastDiagnostic;
                });
              });
            });
        });
      }, 'Testando E-BOM…');

      bindDiagnosticButton('btnWaf3dxTest3d', function () {
        return find3DShapeOrRep(TAMPO_ID).then(function (rep) {
          return locateDerivedOutputs(rep).then(function (derived) {
            var out = {
              pass: rep.representationFound && derived.derivedOutputFound,
              steps: [
                { step: 'find3DShapeOrRep', pass: rep.representationFound, error: rep.error },
                {
                  step: 'locateDerivedOutputs',
                  pass: derived.derivedOutputFound,
                  status: derived.status,
                  fileCount: derived.fileCount,
                  error: derived.error,
                  recommendation: derived.requiredAdminAction
                }
              ],
              representation: sanitizeReport(rep),
              derivedOutput: sanitizeReport(derived),
              recommendation: derived.derivedOutputFound
                ? 'Derived output available — click E-BOM line to render'
                : derived.requiredAdminAction || derived.blocker
            };
            lastDiagnostic = sanitizeReport(out);
            w.__lastWaf3dxDiagnostic = lastDiagnostic;
            return lastDiagnostic;
          });
        });
      }, 'Testando 3DView…');

      bindDiagnosticButton('btnWaf3dxTestMaturity', function () {
        return getAllowedMaturityTransitions(TAMPO_ID).then(function (mat) {
          var out = {
            pass: mat.maturityReadOk,
            steps: [
              {
                step: 'maturity read-only',
                pass: mat.maturityReadOk,
                transitionsLoaded: mat.transitionsLoaded,
                status: mat.status,
                error: mat.error,
                recommendation: mat.recommendation
              }
            ],
            maturity: sanitizeReport(mat),
            recommendation: mat.transitionsLoaded
              ? 'Read-only OK — ' + mat.transitions.length + ' transitions'
              : mat.recommendation
          };
          lastDiagnostic = sanitizeReport(out);
          w.__lastWaf3dxDiagnostic = lastDiagnostic;
          return lastDiagnostic;
        });
      }, 'Testando maturidade…');

      bindDiagnosticButton('btnWaf3dxExportDiag', function () {
        return exportSanitizedDiagnostic().then(function (res) {
          var bar = byId('statusBar');
          if (bar) {
            bar.textContent = res.exported
              ? 'Diagnóstico sanitizado copiado para clipboard'
              : 'Diagnóstico disponível em console: __lastWaf3dxDiagnostic';
            bar.className = 'bom-st bom-st-ok';
          }
          if (!res.exported) log('export:', res.json);
          return lastDiagnostic || w.__lastWaf3dxDiagnostic;
        });
      }, 'Exportando…');

      var ready = document.createElement('span');
      ready.id = 'waf3dxDiagnosticUiReady';
      ready.className = 'bom-hidden';
      var host = byId('waf3dxDiagnosticDrawer') || document.body;
      host.appendChild(ready);
    } catch (e) {
      log('installDiagnosticUi error', e && e.message);
    }
  }

  w.__waf3dxClient = {
    build: BUILD,
    detectWafData: detectWafData,
    request: request,
    getCsrf: getCsrf,
    getEngItem: getEngItem,
    searchEngItems: searchEngItems,
    resolveEngItemRootId: resolveEngItemRootId,
    isDsengHexId: isDsengHexId,
    expandEngItem: expandEngItem,
    getEngItemRepresentations: getEngItemRepresentations,
    getRepresentations: getRepresentations,
    find3DShapeOrRep: find3DShapeOrRep,
    find3DGeometrySource: find3DGeometrySource,
    locateDerivedOutputs: locateDerivedOutputs,
    downloadDerivedOutput: downloadDerivedOutput,
    downloadGeometry: downloadGeometry,
    convertGeometryIfNeeded: convertGeometryIfNeeded,
    renderGeometryInThree: renderGeometryInThree,
    getMaturity: getMaturity,
    getAllowedMaturityTransitions: getAllowedMaturityTransitions,
    changeMaturity: changeMaturity,
    testMaturityWriteCandidates: testMaturityWriteCandidates,
    runFullDiagnostic: runFullDiagnostic,
    runFullValidation: runFullValidation,
    renderDiagnosticPanel: renderDiagnosticPanel,
    renderExecutorPanel: renderExecutorPanel,
    exportSanitizedDiagnostic: exportSanitizedDiagnostic,
    exportSanitizedReport: exportSanitizedReport,
    installDiagnosticUi: installDiagnosticUi,
    installExecutorUi: installExecutorUi,
    openDiagnosticModal: openDiagnosticModal,
    closeDiagnosticModal: closeDiagnosticModal,
    toggleDiagnosticModal: toggleDiagnosticModal,
    ensureAdvancedVisible: ensureAdvancedVisible,
    sanitizeReport: sanitizeReport,
    ensureSpaceUrl: ensureSpaceUrl,
    getSecurityContextValue: getSecurityContextValue,
    getLastDiagnostic: function () {
      return lastDiagnostic || w.__lastWaf3dxValidation || w.__lastWaf3dxDiagnostic || null;
    },
    constants: {
      SPACE_URL: SPACE_URL,
      ROOT_ID: ROOT_ID,
      ROOT_TITLE: ROOT_TITLE,
      TAMPO_ID: TAMPO_ID,
      SECURITY_CONTEXT: SECURITY_CONTEXT
    }
  };

  w.__bomOpen3dxDiagnostic = openDiagnosticModal;
  w.__bomClose3dxDiagnostic = closeDiagnosticModal;

  if (typeof w.__bomWaf3dxClientInstall === 'function') {
    w.__bomWaf3dxClientInstall();
  } else {
    installExecutorUi();
    installDiagnosticUi();
  }
})(typeof window !== 'undefined' ? window : this);
