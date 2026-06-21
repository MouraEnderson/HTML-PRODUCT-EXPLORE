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

  function locateDerivedOutputs(target, options) {
    options = options || {};
    target = target || {};
    var referenceId = s(target.referenceId || target.id || TAMPO_ID);
    var repType = s(target.representationType || target.type || 'VPMReference');
    var repId = s(target.representation && target.representation.id ? target.representation.id : target.representationId || referenceId);
    return withTimeout(
      ensureSpaceUrl().then(function (spaceUrl) {
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
              blocker: files.length ? '' : 'No derived output available for this representation',
              requiredAdminAction: files.length
                ? ''
                : 'Enable/generate derived output for web visualization',
              error: res.ok ? (files.length ? '' : 'fileCount=0') : res.wafMessage || res.error,
              url: url,
              method: 'POST'
            };
          });
        });
      }),
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
              return {
                ok: true,
                status: 200,
                format: format,
                fileName: s(file.fileName),
                content: binRes.data,
                recommendation: 'Load content in Three.js viewer — blob URL must be created by caller',
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
    return '';
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
        return Promise.resolve({
          ok: false,
          success: false,
          verifiedByReread: false,
          stateBefore: stateBefore,
          stateAfter: stateBefore,
          blocker: 'No documented invoke succeeded',
          nextAction: 'Capture F12 Network on native maturity change and map invoke name/payload'
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
          var bar = byId('statusBar');
          if (bar && report) {
            bar.textContent = report.pass
              ? 'Diagnóstico 3DX PASS — expand ' + report.rowsDetected + ' linhas'
              : 'Diagnóstico 3DX: ' + (report.recommendation || 'ver painel');
            bar.className = 'bom-st ' + (report.pass ? 'bom-st-ok' : 'bom-st-err');
          }
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = prev;
        });
    });
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

  function ensureTopbarDiagnosticTrigger() {
    if (byId('btnWaf3dxDiagToggle')) return;
    var actions = uiRoot().querySelector && uiRoot().querySelector('.bom-topbar-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnWaf3dxDiagToggle';
    btn.className = 'bom-btn bom-btn-secondary bom-btn-compact bom-waf3dx-topbar-trigger';
    btn.textContent = 'Diagnóstico';
    btn.title = 'Abrir Diagnóstico 3DX (WAFData / dseng)';
    var anchor = actions.querySelector('.bom-build-pill') || actions.querySelector('#btnThemeToggle');
    if (anchor && anchor.parentNode === actions) {
      actions.insertBefore(btn, anchor);
    } else {
      actions.appendChild(btn);
    }
    btn.addEventListener('click', function (ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      var drawer = byId('waf3dxDiagnosticDrawer');
      if (!drawer) {
        installDiagnosticUi();
        drawer = byId('waf3dxDiagnosticDrawer');
      }
      if (!drawer) return;
      drawer.classList.toggle('bom-hidden');
      btn.setAttribute('aria-expanded', drawer.classList.contains('bom-hidden') ? 'false' : 'true');
    });
  }

  function ensureDiagnosticDrawer() {
    if (byId('waf3dxDiagnosticDrawer')) return byId('waf3dxDiagnosticDrawer');
    var topbar = uiRoot().querySelector && uiRoot().querySelector('.bom-topbar');
    if (!topbar) return null;
    var drawer = document.createElement('div');
    drawer.id = 'waf3dxDiagnosticDrawer';
    drawer.className = 'bom-waf3dx-drawer bom-hidden';
    drawer.setAttribute('role', 'region');
    drawer.setAttribute('aria-label', 'Diagnóstico 3DX');
    topbar.appendChild(drawer);
    return drawer;
  }

  function mountDiagnosticControls(container) {
    if (!container || container.querySelector('#waf3dxDiagnosticPanel')) return false;
    var wrap = document.createElement('div');
    wrap.id = 'waf3dxDiagnosticWrap';
    wrap.className = 'bom-waf3dx-diag-wrap';
    wrap.innerHTML =
      '<p style="margin:4px 0 6px;font-size:.68rem;font-weight:600">Diagnóstico 3DX</p>' +
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

  function installDiagnosticUi() {
    try {
      if (byId('waf3dxDiagnosticUiReady')) {
        ensureAdvancedVisible();
        ensureTopbarDiagnosticTrigger();
        return;
      }
      ensureAdvancedVisible();
      ensureTopbarDiagnosticTrigger();
      var drawer = ensureDiagnosticDrawer();
      var rules = byId('bomRulesPanel');
      var mounted = false;
      if (drawer) mounted = mountDiagnosticControls(drawer) || mounted;
      if (rules && !rules.querySelector('#waf3dxDiagnosticWrap')) {
        var hint = document.createElement('p');
        hint.className = 'bom-waf3dx-advanced-hint';
        hint.style.cssText = 'margin:0 0 6px;font-size:.62rem;color:#5c6b7a';
        hint.textContent = 'Diagnóstico 3DX: use o botão Diagnóstico no topo ou abra este painel.';
        rules.insertBefore(hint, rules.firstChild);
      }
      if (!mounted && drawer) mountDiagnosticControls(drawer);
      var ready = document.createElement('span');
      ready.id = 'waf3dxDiagnosticUiReady';
      ready.className = 'bom-hidden';
      (drawer || rules || uiRoot()).appendChild(ready);

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
    expandEngItem: expandEngItem,
    getEngItemRepresentations: getEngItemRepresentations,
    find3DShapeOrRep: find3DShapeOrRep,
    locateDerivedOutputs: locateDerivedOutputs,
    downloadDerivedOutput: downloadDerivedOutput,
    getMaturity: getMaturity,
    getAllowedMaturityTransitions: getAllowedMaturityTransitions,
    changeMaturity: changeMaturity,
    runFullDiagnostic: runFullDiagnostic,
    renderDiagnosticPanel: renderDiagnosticPanel,
    exportSanitizedDiagnostic: exportSanitizedDiagnostic,
    installDiagnosticUi: installDiagnosticUi,
    ensureAdvancedVisible: ensureAdvancedVisible,
    sanitizeReport: sanitizeReport,
    ensureSpaceUrl: ensureSpaceUrl,
    getSecurityContextValue: getSecurityContextValue,
    getLastDiagnostic: function () {
      return lastDiagnostic || w.__lastWaf3dxDiagnostic || null;
    },
    constants: {
      SPACE_URL: SPACE_URL,
      ROOT_ID: ROOT_ID,
      ROOT_TITLE: ROOT_TITLE,
      TAMPO_ID: TAMPO_ID,
      SECURITY_CONTEXT: SECURITY_CONTEXT
    }
  };

  w.__lastWaf3dxDiagnostic = null;

  if (typeof w.__bomWaf3dxClientInstall === 'function') {
    w.__bomWaf3dxClientInstall();
  } else {
    installDiagnosticUi();
  }
})(typeof window !== 'undefined' ? window : this);
