/**
 * @file integration/expand-item-provider.js
 * DEC-015 — Expand Item Provider (dseng EngItem/expand + normalização Path).
 */
(function (global) {
  'use strict';

  var w = global;

  var LOG = '[ExpandItemProvider]';
  var BUILD = s(w.__BOM_BUILD_ID__ || (w.APP_CONFIG && w.APP_CONFIG.BUILD) || 'bom20260614g');
  var FORBIDDEN_HEADER_RE = /csrf|x-csrf-token/i;
  /** Fallback temporário de teste — último recurso após contexto/UQL/EnoviaApi */
  var KNOWN_ROOT_BY_PRD = {
    'prd-R1132100929518-01103695': '63FC553465A62400699E0792000086AB'
  };

  function s(v) {
    return String(v || '').trim();
  }

  function n(v) {
    return Number(v || 0);
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(LOG);
      console.log.apply(console, args);
    } catch (e) {}
  }

  function isInternalVpmId(id) {
    id = s(id);
    if (!id || id.indexOf('prd-') === 0) return false;
    return /^[0-9A-F]{24,32}$/i.test(id);
  }

  function getWafData() {
    if (w.WAFData && w.WAFData.authenticatedRequest) return w.WAFData;
    if (w.widget && w.widget.WAFData && w.widget.WAFData.authenticatedRequest) return w.widget.WAFData;
    return null;
  }

  var lastTransportStats = {};

  /** Headers GET — sem Content-Type, sem CSRF. */
  function getMinimalWafHeaders() {
    var h = { Accept: 'application/json' };
    var sc = getSecurityContextValue();
    if (sc) h.SecurityContext = sc;
    return h;
  }

  function getSecurityContextValue() {
    try {
      var st =
        typeof w.PlatformContext !== 'undefined' &&
        w.PlatformContext.getState &&
        w.PlatformContext.getState();
      if (st && st.securityContext) return s(st.securityContext);
    } catch (e) {}
    try {
      if (w.widget && w.widget.wafSecurityContext) return s(w.widget.wafSecurityContext);
    } catch (e) {}
    return '';
  }

  function maskSecurityContext(sc) {
    sc = s(sc);
    if (!sc) return '(ausente)';
    if (sc.length <= 12) return sc;
    return sc.slice(0, 8) + '…' + sc.slice(-4);
  }

  function ensurePlatformContext() {
    if (typeof w.PlatformContext === 'undefined' || !w.PlatformContext.init) {
      return Promise.resolve(getSecurityContextValue());
    }
    return Promise.resolve(w.PlatformContext.init())
      .catch(function () {
        return null;
      })
      .then(function () {
        return getSecurityContextValue();
      });
  }

  /** Headers POST oficial dseng_v1 — nunca PlatformContext.getHeaders(). */
  function getOfficialPostHeaders(includeContentType) {
    var headers = { Accept: 'application/json' };
    if (includeContentType !== false) {
      headers['Content-Type'] = 'application/json';
    }
    var sc = getSecurityContextValue();
    if (sc) headers.SecurityContext = sc;
    return headers;
  }

  function forbiddenHeadersPresent(headers) {
    headers = headers || {};
    return Object.keys(headers).some(function (k) {
      return FORBIDDEN_HEADER_RE.test(k) || FORBIDDEN_HEADER_RE.test(s(headers[k]));
    });
  }

  function parseWafStatus(err, msg) {
    var status = n(err && (err.status || err.statusCode || err.responseCode));
    msg = s(msg);
    if (!status && msg) {
      var m = msg.match(/ResponseCode[^0-9]*(\d{3})/i) || msg.match(/\bHTTP\s*(\d{3})\b/i);
      if (m) status = n(m[1]);
    }
    return status;
  }

  function extractResponseText(err, msg) {
    if (err) {
      if (typeof err === 'string') return err;
      if (err.responseText) return s(err.responseText);
      if (err.body) return typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
      if (err.response) return typeof err.response === 'string' ? err.response : JSON.stringify(err.response);
      if (err.data) return typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
    }
    return s(msg);
  }

  function responseKeys(data) {
    if (!data || typeof data !== 'object') return '(not an object)';
    return Object.keys(data).join(', ');
  }

  function logExpandPostAttempt(url, headers, contentTypeOption, bodyString, formLabel) {
    log('build:', BUILD);
    log('method: POST');
    log('url:', url);
    log('request headers planned:', JSON.stringify(headers));
    log('request contentType option:', contentTypeOption || '(none)');
    log('forbidden headers present:', forbiddenHeadersPresent(headers));
    log('request body string:', bodyString);
    log('serialization form:', formLabel);
  }

  function logExpandPostResult(res) {
    log('status:', res.status);
    if (res.securityContext) log('SecurityContext:', maskSecurityContext(res.securityContext));
    if (res.status === 403) {
      log('403 transport:', res.transport || res.form || '(unknown)');
      log('403 SecurityContext sent:', res.securityContext ? 'sim' : 'nao');
      log('403 responseText:', res.responseText || '(n/a)');
    }
    if (res.status === 415) {
      log('415 Content-Type header:', (res.headers && res.headers['Content-Type']) || '(missing)');
      log('415 contentType option:', res.contentTypeOption || '(none)');
      log('415 body empty:', !res.bodyString || res.bodyString.length === 0);
      log('415 responseText:', res.responseText || '(n/a)');
    }
    if (res.status === 400) {
      log('400 responseText:', res.responseText || '(n/a)');
    }
    if (res.ok && res.data) {
      log('response keys:', responseKeys(res.data));
      log('response raw:', res.data);
    } else if (!res.ok) {
      log('response raw:', res.responseText || res.error || '(n/a)');
    }
  }

  function swapExpandUrlHost(url) {
    url = s(url);
    if (!url || !w.APP_CONFIG || !w.APP_CONFIG.TENANT_DEFAULTS) return '';
    var sh = w.APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = w.APP_CONFIG.TENANT_DEFAULTS.platformHost;
    if (typeof w.CompassServices !== 'undefined' && w.CompassServices.swapUrlHost) {
      if (sh && url.indexOf(sh) >= 0) return w.CompassServices.swapUrlHost(url, sh, ih);
      if (ih && url.indexOf(ih) >= 0) return w.CompassServices.swapUrlHost(url, ih, sh);
    }
    if (sh && ih) {
      if (url.indexOf(sh) >= 0) return url.replace(sh, ih);
      if (url.indexOf(ih) >= 0) return url.replace(ih, sh);
    }
    return '';
  }

  function runWafExpandPost(url, bodyString, formLabel, transportMode, useContentTypeOption) {
    formLabel = formLabel || 'A';
    transportMode = transportMode || 'authenticatedRequest';
    var headers = getOfficialPostHeaders(!useContentTypeOption);
    var contentTypeOption = useContentTypeOption ? 'application/json' : '(header Content-Type only)';
    var securityContext = getSecurityContextValue();

    logExpandPostAttempt(url, headers, contentTypeOption, bodyString, formLabel);
    log('transport mode:', transportMode);
    log('SecurityContext:', maskSecurityContext(securityContext));

    return new Promise(function (resolve) {
      var WAF = getWafData();
      if (!WAF) {
        resolve({
          ok: false,
          status: 0,
          error: 'WAFData indisponível',
          form: formLabel,
          transport: transportMode,
          headers: headers,
          contentTypeOption: contentTypeOption,
          bodyString: bodyString,
          securityContext: securityContext
        });
        return;
      }

      var requestFn =
        transportMode === 'proxifiedRequest' && WAF.proxifiedRequest
          ? WAF.proxifiedRequest.bind(WAF)
          : WAF.authenticatedRequest.bind(WAF);

      var opts = {
        method: 'POST',
        headers: headers,
        data: bodyString,
        timeout: n(w.APP_CONFIG && w.APP_CONFIG.WAF_REQUEST_TIMEOUT_MS) || 60000,
        onComplete: function (data) {
          resolve({
            ok: true,
            status: 200,
            data: data,
            form: formLabel,
            transport: transportMode,
            url: url,
            headers: headers,
            contentTypeOption: contentTypeOption,
            bodyString: bodyString,
            securityContext: securityContext
          });
        },
        onFailure: function (err) {
          var msg = (err && (err.message || err.error || err.statusText)) || 'WAF request failed';
          resolve({
            ok: false,
            status: parseWafStatus(err, msg),
            error: msg,
            responseText: extractResponseText(err, msg),
            err: err,
            form: formLabel,
            transport: transportMode,
            url: url,
            headers: headers,
            contentTypeOption: contentTypeOption,
            bodyString: bodyString,
            securityContext: securityContext
          });
        }
      };

      if (transportMode === 'proxifiedRequest') {
        opts.proxy = 'passport';
      }

      if (useContentTypeOption) {
        opts.contentType = 'application/json';
      } else {
        opts.type = 'json';
      }

      try {
        requestFn(url, opts);
      } catch (e) {
        resolve({
          ok: false,
          status: 0,
          error: e && e.message ? e.message : String(e),
          form: formLabel,
          transport: transportMode,
          url: url,
          headers: headers,
          contentTypeOption: contentTypeOption,
          bodyString: bodyString,
          securityContext: securityContext
        });
      }
    });
  }

  /**
   * Forma A: authenticatedRequest + Content-Type no header + type json
   * Forma B: authenticatedRequest + contentType option (415)
   * Forma C: proxifiedRequest passport proxy (403 / CSRF cross-origin)
   */
  function runExpandPostForm(url, bodyString, formLabel, transportMode, useContentTypeOption) {
    return runWafExpandPost(url, bodyString, formLabel, transportMode, useContentTypeOption);
  }

  function runExpandPostWithFallbacks(url, bodyString) {
    return runExpandPostForm(url, bodyString, 'A', 'authenticatedRequest', false).then(function (resA) {
      if (resA.ok && hasExpandMemberPayload(resA.data)) return resA;

      if (resA.status === 415) {
        log('Form A retornou 415 — tentando Form B (contentType option)');
        return runExpandPostForm(url, bodyString, 'B', 'authenticatedRequest', true);
      }

      if (resA.status === 403) {
        var altUrl = swapExpandUrlHost(url);
        if (altUrl && altUrl !== url) {
          log('Form A retornou 403 — tentando host alternativo:', altUrl);
          return runExpandPostForm(altUrl, bodyString, 'A-alt', 'authenticatedRequest', false).then(function (resAlt) {
            if (resAlt.ok && hasExpandMemberPayload(resAlt.data)) return resAlt;
            if (resAlt.status !== 403) return resAlt;
            log('Host alternativo ainda 403 — tentando Form C (proxifiedRequest passport)');
            return runExpandPostForm(altUrl, bodyString, 'C', 'proxifiedRequest', false);
          });
        }
        log('Form A retornou 403 — tentando Form C (proxifiedRequest passport)');
        return runExpandPostForm(url, bodyString, 'C', 'proxifiedRequest', false);
      }

      return resA;
    });
  }

  function expandPostError(res) {
    logExpandPostResult(res);
    var msg =
      res.error ||
      'Expand Item POST falhou (HTTP ' + (res.status || '?') + ', form ' + (res.form || '?') + ')';
    if (res.status === 415) {
      msg +=
        ' | Content-Type=' +
        ((res.headers && res.headers['Content-Type']) || 'missing') +
        ' | contentTypeOption=' +
        (res.contentTypeOption || 'none') +
        ' | bodyLen=' +
        (res.bodyString ? res.bodyString.length : 0);
    }
    if (res.status === 400 && res.responseText) {
      msg += ' | responseText=' + res.responseText;
    }
    if (res.status === 403) {
      msg +=
        ' | transport=' +
        (res.transport || '?') +
        ' | SecurityContext=' +
        (res.securityContext ? 'sim' : 'nao');
      if (res.responseText) msg += ' | responseText=' + res.responseText;
    }
    var err = new Error(msg);
    err.status = res.status;
    err.expandPostResult = res;
    return err;
  }

  function finishExpandSuccess(res, url, bodyObj) {
    logExpandPostResult(res);
    lastTransportStats = {
      build: BUILD,
      transport: res.transport || 'direct-wafdata',
      method: 'POST',
      url: url,
      form: res.form,
      requestHeaders: res.headers,
      contentTypeOption: res.contentTypeOption,
      forbiddenHeaders: forbiddenHeadersPresent(res.headers),
      bodyString: res.bodyString,
      status: res.status,
      securityContext: res.securityContext ? maskSecurityContext(res.securityContext) : '(ausente)',
      expandDepth: bodyObj.expandDepth
    };
    w.__lastExpandItemStats = lastTransportStats;
    return res.data;
  }

  function headerKeysList(headers) {
    headers = headers || {};
    return Object.keys(headers)
      .filter(function (k) {
        return headers[k] != null && headers[k] !== '';
      })
      .join(', ');
  }

  function hasExpandMemberPayload(data) {
    return extractMembers(data).length > 0;
  }

  function ensureSpaceUrl() {
    if (typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.init) {
      try {
        if (typeof w.CompassServices !== 'undefined' && w.CompassServices.getVerifiedSpaceUrl) {
          var space = w.CompassServices.getVerifiedSpaceUrl();
          if (space) w.EnoviaApi.init(space);
        }
      } catch (e) {}
    }
    if (typeof w.CompassServices !== 'undefined' && w.CompassServices.ensureWorkingSpaceUrl) {
      return w.CompassServices.ensureWorkingSpaceUrl().then(function (url) {
        if (url && typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.init) w.EnoviaApi.init(url);
        return url;
      });
    }
    return Promise.resolve(null);
  }

  function cleanWafRequest(method, url, body, transportLabel) {
    method = s(method || 'GET').toUpperCase();
    transportLabel = transportLabel || 'direct-wafdata';
    var headers = getMinimalWafHeaders();
    return new Promise(function (resolve) {
      var WAF = getWafData();
      if (!WAF) {
        resolve({
          ok: false,
          status: 0,
          error: 'WAFData indisponível',
          transport: transportLabel,
          method: method,
          url: url,
          customHeaders: headerKeysList(headers)
        });
        return;
      }
      var opts = {
        method: method,
        type: 'json',
        headers: headers,
        timeout: 60000,
        onComplete: function (data) {
          resolve({
            ok: true,
            status: 200,
            data: data,
            transport: transportLabel,
            method: method,
            url: url,
            customHeaders: headerKeysList(headers)
          });
        },
        onFailure: function (err) {
          var status = n(err && (err.status || err.statusCode || err.responseCode));
          var msg =
            (err && (err.message || err.error || err.statusText)) || 'WAF request failed';
          resolve({
            ok: false,
            status: status,
            error: msg,
            data: err,
            transport: transportLabel,
            method: method,
            url: url,
            customHeaders: headerKeysList(headers)
          });
        }
      };
      if (method === 'POST' && body != null) {
        opts.data = typeof body === 'string' ? body : JSON.stringify(body);
      }
      try {
        WAF.authenticatedRequest(url, opts);
      } catch (e) {
        resolve({
          ok: false,
          status: 0,
          error: e && e.message ? e.message : String(e),
          transport: transportLabel,
          method: method,
          url: url,
          customHeaders: headerKeysList(headers)
        });
      }
    });
  }

  function extractMembers(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  function getExplorerRootName() {
    try {
      if (typeof w.ProductExplorerBridge !== 'undefined') {
        if (w.ProductExplorerBridge.pollStructureHint) w.ProductExplorerBridge.pollStructureHint();
        if (w.ProductExplorerBridge.getStructureNameHint) {
          var hint = s(w.ProductExplorerBridge.getStructureNameHint());
          if (hint) return hint;
        }
      }
    } catch (e) {}
    try {
      if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        if (ctx && (ctx.rootName || ctx.title || ctx.name)) return s(ctx.rootName || ctx.title || ctx.name);
      }
    } catch (e) {}
    return '';
  }

  function getExplorerPrdName() {
    try {
      if (typeof w.ProductExplorerBridge !== 'undefined' && w.ProductExplorerBridge.getSelection) {
        var sel = w.ProductExplorerBridge.getSelection();
        if (sel && sel.name && String(sel.name).indexOf('prd-') === 0) return s(sel.name);
        if (sel && sel.physicalid && String(sel.physicalid).indexOf('prd-') === 0) return s(sel.physicalid);
      }
    } catch (e) {}
    return '';
  }

  function memberToInternalId(member) {
    if (!member) return '';
    var id = s(member.id || member.physicalid || member.physicalId);
    return isInternalVpmId(id) ? id : '';
  }

  function resolveEngItemMemberId(input, titleHint) {
    input = s(input);
    titleHint = s(titleHint);
    if (!input && !titleHint) return Promise.resolve('');
    if (isInternalVpmId(input)) return Promise.resolve(input);
    if (typeof w.EnoviaApi === 'undefined' || !w.EnoviaApi.resolveEngItemMember) {
      return Promise.resolve('');
    }
    return ensureSpaceUrl()
      .then(function () {
        return w.EnoviaApi.resolveEngItemMember(input, titleHint);
      })
      .then(function (member) {
        var id = memberToInternalId(member);
        if (id) log('root resolved via EnoviaApi.resolveEngItemMember:', id);
        return id;
      })
      .catch(function () {
        return '';
      });
  }

  function searchEngItemId(term) {
    term = s(term);
    if (!term || typeof w.EnoviaApi === 'undefined') return Promise.resolve('');
    if (typeof w.EnoviaApi.findEngItemByLabel === 'function') {
      return ensureSpaceUrl()
        .then(function () {
          return w.EnoviaApi.findEngItemByLabel(term, 20);
        })
        .then(function (member) {
          var id = memberToInternalId(member);
          if (id) log('root resolved via findEngItemByLabel:', id);
          return id;
        })
        .catch(function () {
          return '';
        });
    }
    var url =
      w.EnoviaApi.engItemUqlSearchUrl &&
      w.EnoviaApi.engItemUqlSearchUrl('label:"' + term + '"', 20);
    if (!url && w.EnoviaApi.engItemSearchUrl) url = w.EnoviaApi.engItemSearchUrl(term, 20);
    if (!url) return Promise.resolve('');
    return cleanWafRequest('GET', url, null, 'direct-wafdata').then(function (res) {
      if (!res.ok) return '';
      var members = extractMembers(res.data);
      for (var i = 0; i < members.length; i++) {
        var id = memberToInternalId(members[i]);
        if (id) {
          log('root resolved via UQL search:', id);
          return id;
        }
      }
      return '';
    });
  }

  function readExplorerContextIds() {
    var out = { physicalId: '', prdName: '', rootName: '', source: '' };
    try {
      if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        if (ctx) {
          out.physicalId = s(ctx.physicalId || ctx.resourceId);
          out.rootName = s(ctx.rootName || ctx.productName || ctx.displayName);
          out.source = s(ctx.source);
          if (out.physicalId.indexOf('prd-') === 0) out.prdName = out.physicalId;
        }
      }
    } catch (e) {}
    if (!out.prdName) out.prdName = getExplorerPrdName();
    if (!out.rootName) out.rootName = getExplorerRootName();
    return out;
  }

  function resolveCurrentRootId() {
    if (isInternalVpmId(w.__EXPAND_ITEM_ROOT_ID__)) {
      return Promise.resolve({
        rootId: s(w.__EXPAND_ITEM_ROOT_ID__),
        source: '__EXPAND_ITEM_ROOT_ID__ override'
      });
    }

    var ctxIds = readExplorerContextIds();
    if (isInternalVpmId(ctxIds.physicalId)) {
      return Promise.resolve({
        rootId: ctxIds.physicalId,
        source: 'explorer-context-internal-id (' + (ctxIds.source || 'context') + ')'
      });
    }

    var prd = ctxIds.prdName;
    var rootName = ctxIds.rootName;

    return ensureSpaceUrl().then(function () {
      var chain = Promise.resolve({ rootId: '', source: '' });

      if (ctxIds.physicalId || prd) {
        chain = chain.then(function (prev) {
          if (prev.rootId) return prev;
          return resolveEngItemMemberId(ctxIds.physicalId || prd, rootName).then(function (id) {
            if (id) {
              return { rootId: id, source: 'EnoviaApi.resolveEngItemMember(name:' + (ctxIds.physicalId || prd) + ')' };
            }
            return prev;
          });
        });
      }
      if (rootName) {
        chain = chain.then(function (prev) {
          if (prev.rootId) return prev;
          return searchEngItemId(rootName).then(function (id) {
            if (id) return { rootId: id, source: 'UQL label/título: ' + rootName };
            return prev;
          });
        });
      }
      if (prd && prd !== ctxIds.physicalId) {
        chain = chain.then(function (prev) {
          if (prev.rootId) return prev;
          return resolveEngItemMemberId(prd, rootName).then(function (id) {
            if (id) return { rootId: id, source: 'EnoviaApi.resolveEngItemMember(prd:' + prd + ')' };
            return prev;
          });
        });
      }
      return chain.then(function (prev) {
        if (prev.rootId) return prev;
        if (prd && KNOWN_ROOT_BY_PRD[prd]) {
          log('KNOWN_ROOT fallback usado — não válido para release genérico');
          return {
            rootId: KNOWN_ROOT_BY_PRD[prd],
            source: 'KNOWN_ROOT fallback temporário (' + prd + ')'
          };
        }
        return { rootId: '', source: 'unresolved' };
      });
    });
  }

  function expandUrl(rootId) {
    if (typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.engItemExpandUrl) {
      return w.EnoviaApi.engItemExpandUrl(rootId);
    }
    var base = '';
    try {
      if (w.CompassServices && w.CompassServices.getVerifiedSpaceUrl) {
        base = String(w.CompassServices.getVerifiedSpaceUrl() || '').replace(/\/+$/, '');
      }
    } catch (e) {}
    if (!base && w.APP_CONFIG && w.APP_CONFIG.TENANT_DEFAULTS && w.APP_CONFIG.TENANT_DEFAULTS.spaceHost) {
      base = 'https://' + w.APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia';
    }
    return (
      base +
      '/resources/v1/modeler/dseng/dseng:EngItem/' +
      encodeURIComponent(rootId) +
      '/expand'
    );
  }

  function expandBody(levels) {
    levels = n(levels);
    if (levels === 0) levels = n(w.EXPAND_ITEM_LEVELS) || 1;
    /** dseng_v1 / ws3dx.dseng IExpand — POST body oficial */
    return {
      expandDepth: levels,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
  }

  function expandViaOfficialTransport(rootId, levels) {
    var V = w.ExpandItemValidator;
    if (!V || !V.ensureSpaceUrl || !V.getOfficialCsrf || !V.postExpandOfficial) {
      return Promise.reject(new Error('ExpandItemValidator indisponível — carregue expand-item-validator.js'));
    }
    log('transport: official-csrf-space-only');
    return ensurePlatformContext()
      .then(function (sc) {
        log('SecurityContext ready:', maskSecurityContext(sc));
        return V.ensureSpaceUrl();
      })
      .then(function (spaceUrl) {
        var sc = V.getSecurityContextValue ? V.getSecurityContextValue() : getSecurityContextValue();
        return V.getOfficialCsrf(spaceUrl).then(function (csrf) {
          if (!csrf.ok) {
            var err = new Error('CSRF falhou (HTTP ' + (csrf.status || '?') + ') — rode Validação Expand Item');
            err.status = csrf.status;
            throw err;
          }
          return V.postExpandOfficial({
            spaceUrl: spaceUrl,
            rootId: rootId,
            securityContext: sc,
            csrf: csrf,
            expandDepth: levels
          });
        });
      })
      .then(function (res) {
        if (res.ok && hasExpandMemberPayload(res.data)) {
          lastTransportStats = {
            build: BUILD,
            transport: 'official-csrf-space-only',
            method: 'POST',
            url: res.url,
            form: 'official',
            requestHeaders: res.headersPlanned,
            forbiddenHeaders: res.forbiddenHeadersPresent,
            bodyString: res.bodyString,
            status: res.status,
            securityContext: maskSecurityContext(
              w.ExpandItemValidator.getSecurityContextValue && w.ExpandItemValidator.getSecurityContextValue()
            ),
            expandDepth: levels
          };
          w.__lastExpandItemStats = lastTransportStats;
          return res.data;
        }
        throw expandPostError({
          ok: false,
          status: res.status,
          error: res.error || res.wafMessage || 'Expand Item POST falhou',
          form: 'official',
          transport: 'official-csrf-space-only',
          headers: res.headersPlanned,
          bodyString: res.bodyString,
          responseText: res.responseText,
          securityContext: ''
        });
      });
  }

  function expand(rootId, levels) {
    rootId = s(rootId);
    levels = n(levels);
    if (levels === 0) levels = n(w.EXPAND_ITEM_LEVELS) || 1;
    if (!isInternalVpmId(rootId)) {
      return Promise.reject(new Error('rootId deve ser id interno VPMReference (32 hex), não prd-R...'));
    }
    log('rootId:', rootId);
    log('levels:', levels);
    return expandViaOfficialTransport(rootId, levels);
  }

  function isVpmReference(obj) {
    return obj && s(obj.type) === 'VPMReference';
  }

  function isVpmInstance(obj) {
    return obj && s(obj.type) === 'VPMInstance';
  }

  function pickField(obj, keys) {
    if (!obj) return '';
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] != null && obj[keys[i]] !== '') return s(obj[keys[i]]);
    }
    return '';
  }

  function normalizeExpandItemPayload(payload) {
    payload = payload || {};
    var members = extractMembers(payload);
    var refs = {};
    var instances = {};
    var pathObjects = [];
    var referenceCount = 0;
    var instanceCount = 0;
    var pathCount = 0;

    members.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      if (Array.isArray(item.Path) && item.Path.length) {
        pathObjects.push(item);
        pathCount += 1;
        return;
      }
      var id = s(item.id);
      if (!id) return;
      if (isVpmReference(item)) {
        refs[id] = item;
        referenceCount += 1;
      } else if (isVpmInstance(item)) {
        instances[id] = item;
        instanceCount += 1;
      }
    });

    var rows = [];
    var rowKeys = {};
    var rootIncluded = false;
    var rowIndex = 0;

    function enrichReference(refId) {
      var ref = refs[refId] || {};
      return {
        title: pickField(ref, ['title', 'name']),
        name: pickField(ref, ['name', 'title']),
        revision: pickField(ref, ['revision']),
        owner: pickField(ref, ['owner']),
        maturity: pickField(ref, ['state', 'maturity']),
        state: pickField(ref, ['state', 'maturity']),
        organization: pickField(ref, ['organization', 'organizationName']),
        collabspace: pickField(ref, ['collabspace', 'collabSpace', 'collaborativeSpace']),
        physicalId: pickField(ref, ['name', 'physicalid', 'physicalId']) || refId,
        type: pickField(ref, ['type']) || 'VPMReference'
      };
    }

    function enrichInstance(instId) {
      var inst = instances[instId] || {};
      return {
        instanceName: pickField(inst, ['name', 'title']),
        cestamp: pickField(inst, ['cestamp', 'CEStamp', 'modified'])
      };
    }

    function pushRow(row) {
      if (!row || !row.rowKey || rowKeys[row.rowKey]) return;
      rowKeys[row.rowKey] = true;
      row.rowIndex = rowIndex;
      rowIndex += 1;
      row.source = 'expand-item';
      rows.push(row);
    }

    pathObjects.forEach(function (pathObj) {
      var path = pathObj.Path || pathObj.path || [];
      if (!Array.isArray(path) || !path.length) return;

      if (!rootIncluded) {
        var rootId = s(path[0]);
        var rootMeta = enrichReference(rootId);
        pushRow({
          rowKey: rootId,
          level: 0,
          parentReferenceId: '',
          parentKey: '',
          instanceId: '',
          instanceName: '',
          referenceId: rootId,
          title: rootMeta.title,
          name: rootMeta.name,
          revision: rootMeta.revision,
          owner: rootMeta.owner,
          maturity: rootMeta.maturity,
          state: rootMeta.state,
          type: rootMeta.type,
          organization: rootMeta.organization,
          collabspace: rootMeta.collabspace,
          physicalId: rootMeta.physicalId
        });
        rootIncluded = true;
      }

      for (var i = 2; i < path.length; i += 2) {
        var parentReferenceId = s(path[i - 2]);
        var instanceId = s(path[i - 1]);
        var referenceId = s(path[i]);
        var level = i / 2;
        var rowKey = path.slice(0, i + 1).join('/');
        var refMeta = enrichReference(referenceId);
        var instMeta = enrichInstance(instanceId);
        pushRow({
          rowKey: rowKey,
          level: level,
          parentReferenceId: parentReferenceId,
          parentKey: path.slice(0, i - 1).join('/'),
          instanceId: instanceId,
          instanceName: instMeta.instanceName,
          referenceId: referenceId,
          title: refMeta.title,
          name: refMeta.name || instMeta.instanceName,
          revision: refMeta.revision,
          owner: refMeta.owner,
          maturity: refMeta.maturity,
          state: refMeta.state,
          type: refMeta.type,
          organization: refMeta.organization,
          collabspace: refMeta.collabspace,
          physicalId: refMeta.physicalId
        });
      }
    });

    return {
      source: 'expand-item',
      rows: rows,
      stats: {
        rawMemberCount: members.length,
        referenceCount: referenceCount,
        instanceCount: instanceCount,
        pathCount: pathCount,
        normalizedRows: rows.length,
        totalItems: n(payload.totalItems)
      }
    };
  }

  function normalize(payload) {
    return normalizeExpandItemPayload(payload);
  }

  function logPayloadStats(payload, normalized, rootMeta) {
    rootMeta = rootMeta || {};
    var members = extractMembers(payload);
    var firstPath = '';
    members.forEach(function (m) {
      if (!firstPath && m && Array.isArray(m.Path) && m.Path.length) firstPath = m.Path.join(' -> ');
    });
    if (rootMeta.source) log('root resolution source:', rootMeta.source);
    if (lastTransportStats.transport) log('transport:', lastTransportStats.transport);
    if (lastTransportStats.method) log('method:', lastTransportStats.method);
    if (lastTransportStats.url) log('url:', lastTransportStats.url);
    if (lastTransportStats.customHeaders) log('custom headers:', lastTransportStats.customHeaders);
    if (lastTransportStats.status != null) log('status:', lastTransportStats.status);
    log('raw member count:', members.length);
    log('reference count:', normalized.stats.referenceCount);
    log('instance count:', normalized.stats.instanceCount);
    log('path count:', normalized.stats.pathCount);
    log('normalized rows:', normalized.rows.length);
    log('first raw path:', firstPath || '(nenhum)');
    if (normalized.rows[0]) log('first normalized row:', normalized.rows[0]);
  }

  function loadCurrentStructure(levels) {
    levels = n(levels) || n(w.EXPAND_ITEM_LEVELS) || 2;
    var rootMeta = { rootId: '', source: '' };
    return resolveCurrentRootId()
      .then(function (resolved) {
        rootMeta = resolved || {};
        var rootId = s(rootMeta.rootId);
        if (!rootId) throw new Error('Não foi possível resolver rootId interno VPMReference');
        log('root resolution source:', rootMeta.source || '(unknown)');
        return expand(rootId, levels).then(function (payload) {
          var normalized = normalizeExpandItemPayload(payload);
          logPayloadStats(payload, normalized, rootMeta);
          w.__lastExpandItemStats = Object.assign({}, lastTransportStats, {
            rootId: rootId,
            rootResolutionSource: rootMeta.source,
            levels: levels,
            pathCount: normalized.stats.pathCount,
            normalizedRows: normalized.stats.normalizedRows
          });
          return {
            rootId: rootId,
            rootResolutionSource: rootMeta.source,
            levels: levels,
            payload: payload,
            normalized: normalized,
            transportStats: w.__lastExpandItemStats
          };
        });
      });
  }

  function expandItemProbe(levels) {
    levels = n(levels) || 2;
    log('build:', BUILD);
    return loadCurrentStructure(levels)
      .then(function (result) {
        w.__lastExpandItemPayload = result.payload;
        w.__lastExpandItemRows = result.normalized;
        w.__lastExpandItemStats = result.transportStats || w.__lastExpandItemStats;
        log('path count:', (result.normalized && result.normalized.stats && result.normalized.stats.pathCount) || 0);
        log('normalized rows:', (result.normalized && result.normalized.rows && result.normalized.rows.length) || 0);
        log('probe saved __lastExpandItemPayload / __lastExpandItemRows / __lastExpandItemStats');
        return result;
      })
      .catch(function (err) {
        log('probe failed:', err && err.message ? err.message : err);
        if (err && err.expandPostResult) {
          logExpandPostResult(err.expandPostResult);
        }
        throw err;
      });
  }

  w.normalizeExpandItemPayload = normalizeExpandItemPayload;
  w.__expandItemProbe = expandItemProbe;

  w.ExpandItemProvider = {
    expand: expand,
    normalize: normalize,
    normalizeExpandItemPayload: normalizeExpandItemPayload,
    loadCurrentStructure: loadCurrentStructure,
    resolveCurrentRootId: resolveCurrentRootId
  };
})(typeof window !== 'undefined' ? window : global);
