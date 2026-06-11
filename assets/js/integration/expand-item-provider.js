/**
 * @file integration/expand-item-provider.js
 * DEC-015 — Expand Item Provider (dseng EngItem/expand + normalização Path).
 */
(function (global) {
  'use strict';

  var w = global;

  var LOG = '[ExpandItemProvider]';
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

  function getWafHeaders() {
    var h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    try {
      if (typeof w.PlatformContext !== 'undefined' && w.PlatformContext.getHeaders) {
        return Object.assign({}, w.PlatformContext.getHeaders(), h);
      }
      var st = w.PlatformContext && w.PlatformContext.getState && w.PlatformContext.getState();
      if (st && st.securityContext) h.SecurityContext = st.securityContext;
    } catch (e) {}
    return h;
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

  function wafRequest(method, url, body) {
    return new Promise(function (resolve, reject) {
      var WAF = getWafData();
      if (!WAF) {
        reject(new Error('WAFData indisponível'));
        return;
      }
      var opts = {
        method: method || 'GET',
        headers: getWafHeaders(),
        onComplete: function (data) {
          resolve({ ok: true, status: 200, data: data });
        },
        onFailure: function (err) {
          var msg = (err && (err.message || err.error || err.statusText)) || 'WAF request failed';
          resolve({ ok: false, status: (err && err.status) || 0, error: msg, data: err });
        }
      };
      if (method === 'POST' && body != null) {
        opts.type = 'json';
        opts.data = typeof body === 'string' ? body : JSON.stringify(body);
      } else {
        opts.type = 'json';
      }
      try {
        WAF.authenticatedRequest(url, opts);
      } catch (e) {
        reject(e);
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

  function searchEngItemId(term) {
    term = s(term);
    if (!term || typeof w.EnoviaApi === 'undefined') return Promise.resolve('');
    var url =
      w.EnoviaApi.engItemUqlSearchUrl &&
      w.EnoviaApi.engItemUqlSearchUrl('label:"' + term + '"', 20);
    if (!url && w.EnoviaApi.engItemSearchUrl) url = w.EnoviaApi.engItemSearchUrl(term, 20);
    if (!url) return Promise.resolve('');
    return wafRequest('GET', url).then(function (res) {
      if (!res.ok) return '';
      var members = extractMembers(res.data);
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        var id = s(m.id || m.physicalid || m.physicalId);
        if (isInternalVpmId(id)) return id;
      }
      return '';
    });
  }

  function resolveCurrentRootId() {
    if (isInternalVpmId(w.__EXPAND_ITEM_ROOT_ID__)) return Promise.resolve(s(w.__EXPAND_ITEM_ROOT_ID__));

    try {
      if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        if (ctx && isInternalVpmId(ctx.physicalId)) return Promise.resolve(s(ctx.physicalId));
        if (ctx && isInternalVpmId(ctx.resourceId)) return Promise.resolve(s(ctx.resourceId));
      }
    } catch (e) {}

    var prd = getExplorerPrdName();
    if (prd && KNOWN_ROOT_BY_PRD[prd]) return Promise.resolve(KNOWN_ROOT_BY_PRD[prd]);

    var rootName = getExplorerRootName();
    return ensureSpaceUrl().then(function () {
      if (prd && KNOWN_ROOT_BY_PRD[prd]) return KNOWN_ROOT_BY_PRD[prd];
      if (isInternalVpmId(prd)) return prd;
      var chain = Promise.resolve('');
      if (rootName) {
        chain = chain.then(function (id) {
          if (id) return id;
          return searchEngItemId(rootName);
        });
      }
      if (prd) {
        chain = chain.then(function (id) {
          if (id) return id;
          return searchEngItemId(prd);
        });
      }
      return chain;
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
    if (levels < 1) levels = 99;
    if (typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.engItemExpandBody) {
      return w.EnoviaApi.engItemExpandBody({ expandDepth: levels, withPath: true });
    }
    return {
      expandDepth: levels,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
  }

  function expand(rootId, levels) {
    rootId = s(rootId);
    levels = n(levels) || 99;
    if (!isInternalVpmId(rootId)) {
      return Promise.reject(new Error('rootId deve ser id interno VPMReference (32 hex), não prd-R...'));
    }
    log('rootId:', rootId);
    log('levels:', levels);
    return ensureSpaceUrl().then(function () {
      var url = expandUrl(rootId);
      return wafRequest('POST', url, expandBody(levels)).then(function (res) {
        if (!res.ok) {
          throw new Error(res.error || 'Expand Item falhou');
        }
        return res.data || {};
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

  function logPayloadStats(payload, normalized) {
    var members = extractMembers(payload);
    var firstPath = '';
    members.forEach(function (m) {
      if (!firstPath && m && Array.isArray(m.Path) && m.Path.length) firstPath = m.Path.join(' -> ');
    });
    log('raw member count:', members.length);
    log('reference count:', normalized.stats.referenceCount);
    log('instance count:', normalized.stats.instanceCount);
    log('path count:', normalized.stats.pathCount);
    log('normalized rows:', normalized.rows.length);
    log('first raw path:', firstPath || '(nenhum)');
    if (normalized.rows[0]) log('first normalized row:', normalized.rows[0]);
  }

  function loadCurrentStructure(levels) {
    levels = n(levels) || n(w.EXPAND_ITEM_LEVELS) || 99;
    return resolveCurrentRootId().then(function (rootId) {
      if (!rootId) throw new Error('Não foi possível resolver rootId interno VPMReference');
      return expand(rootId, levels).then(function (payload) {
        var normalized = normalizeExpandItemPayload(payload);
        logPayloadStats(payload, normalized);
        return {
          rootId: rootId,
          levels: levels,
          payload: payload,
          normalized: normalized
        };
      });
    });
  }

  function expandItemProbe(levels) {
    levels = n(levels) || 2;
    return loadCurrentStructure(levels).then(function (result) {
      w.__lastExpandItemPayload = result.payload;
      w.__lastExpandItemRows = result.normalized;
      log('probe saved __lastExpandItemPayload / __lastExpandItemRows');
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
