/**
 * @file integration/expand-item-provider.js
 * DEC-015 — Expand Item Provider (dseng EngItem/expand + normalização Path).
 */
(function (global) {
  'use strict';

  var w = global;

  var LOG = '[ExpandItemProvider]';
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

  /** Headers mínimos — NUNCA PlatformContext.getHeaders() (injeta x-csrf-token → CORS preflight). */
  function getMinimalWafHeaders() {
    var h = { Accept: 'application/json' };
    try {
      var st =
        typeof w.PlatformContext !== 'undefined' &&
        w.PlatformContext.getState &&
        w.PlatformContext.getState();
      if (st && st.securityContext) h.SecurityContext = st.securityContext;
    } catch (e) {}
    try {
      if (w.widget && w.widget.wafSecurityContext) {
        h.SecurityContext = w.widget.wafSecurityContext;
      }
    } catch (e) {}
    return h;
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

  function expand(rootId, levels) {
    rootId = s(rootId);
    levels = n(levels);
    if (levels === 0) levels = n(w.EXPAND_ITEM_LEVELS) || 1;
    if (!isInternalVpmId(rootId)) {
      return Promise.reject(new Error('rootId deve ser id interno VPMReference (32 hex), não prd-R...'));
    }
    log('rootId:', rootId);
    log('levels:', levels);
    return ensureSpaceUrl().then(function () {
      var url = expandUrl(rootId);
      var body = expandBody(levels);
      var headers = getMinimalWafHeaders();
      log('transport: direct-wafdata');
      log('method: POST');
      log('url:', url);
      log('custom headers:', headerKeysList(headers));
      return cleanWafRequest('POST', url, body, 'direct-wafdata').then(function (res) {
        log('status:', res.status);
        lastTransportStats = {
          transport: 'direct-wafdata',
          method: 'POST',
          url: url,
          customHeaders: res.customHeaders || headerKeysList(headers),
          status: res.status,
          expandDepth: body.expandDepth,
          contentType: 'application/json'
        };
        w.__lastExpandItemStats = lastTransportStats;
        if (!res.ok) {
          var err = new Error(res.error || 'Expand Item POST falhou (HTTP ' + res.status + ')');
          err.status = res.status;
          throw err;
        }
        if (!hasExpandMemberPayload(res.data)) {
          throw new Error('Expand Item POST retornou member vazio');
        }
        return res.data;
      });
    });
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
    return loadCurrentStructure(levels).then(function (result) {
      w.__lastExpandItemPayload = result.payload;
      w.__lastExpandItemRows = result.normalized;
      w.__lastExpandItemStats = result.transportStats || w.__lastExpandItemStats;
      log('probe saved __lastExpandItemPayload / __lastExpandItemRows / __lastExpandItemStats');
      return result;
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
