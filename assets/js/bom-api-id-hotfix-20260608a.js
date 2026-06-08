/* BOM API ID hotfix - 20260608a
 * Resolve prd-* / title para ID interno VPMReference antes de chamar dseng:EngItem.
 * Usa dseng:EngInstance para filhos; não depende de /expand.
 */
(function (global) {
  'use strict';

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim().replace(/^prd::/i, 'prd-');
  }

  function isCloudPrdId(id) {
    return /^prd-R\d{10,}-/i.test(normalizeId(id));
  }

  function isInternalVpmId(id) {
    return /^[0-9A-Fa-f]{16,}$/.test(String(id || '').trim());
  }

  function extractMembers(res) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(res);
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.member)) return res.member;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    return [];
  }

  function getRestBase() {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.engItemUrl) throw new Error('EnoviaApi indisponível');
    var probe = EnoviaApi.engItemUrl('__probe__');
    return String(probe).replace(/\/dseng\/dseng:EngItem\/__probe__.*/i, '');
  }

  function searchUrl(q, top, mode) {
    var p = mode === 'basic' ? 'searchStr=' : '$searchStr=';
    return getRestBase() + '/dseng/dseng:EngItem/search?' + p + encodeURIComponent(q) + '&$top=' + (top || 20);
  }

  function scoreCandidate(x, input, titleHint) {
    if (!x) return -1;
    input = normalizeId(input).toLowerCase();
    titleHint = String(titleHint || '').trim().toLowerCase();
    var id = String(x.id || x.physicalid || '').trim();
    var name = String(x.name || '').trim();
    var title = String(x.title || x.displayName || '').trim();
    var type = String(x.type || x.objectType || '').trim();
    var s = 0;
    if (isInternalVpmId(id)) s += 20;
    if (/VPMReference/i.test(type)) s += 10;
    if (name && name.toLowerCase() === input) s += 60;
    if (id && id.toLowerCase() === input) s += 45;
    if (titleHint && title.toLowerCase() === titleHint) s += 40;
    if (titleHint && title.toLowerCase().indexOf(titleHint) >= 0) s += 15;
    if (isCloudPrdId(name)) s += 8;
    return s;
  }

  function pickBest(list, input, titleHint) {
    var best = null;
    var bestScore = -1;
    (list || []).forEach(function (x) {
      var s = scoreCandidate(x, input, titleHint);
      if (s > bestScore) {
        best = x;
        bestScore = s;
      }
    });
    return best;
  }

  var cache = {};
  function resolveEngItemId(input, titleHint) {
    input = normalizeId(input);
    if (!input || isInternalVpmId(input)) return Promise.resolve(input);
    var key = input + '|' + (titleHint || '');
    if (cache[key]) return Promise.resolve(cache[key]);

    var queries = [];
    if (isCloudPrdId(input)) queries.push({ q: 'name:' + input, mode: 'uql' });
    if (titleHint) queries.push({ q: 'label:"' + String(titleHint).replace(/"/g, '\\"') + '"', mode: 'uql' });
    queries.push({ q: input, mode: 'basic' });

    function run(i, found) {
      found = found || [];
      if (i >= queries.length) {
        var best = pickBest(found, input, titleHint);
        if (best && best.id) {
          cache[key] = String(best.id);
          return cache[key];
        }
        return input;
      }
      var item = queries[i];
      return WafClient.get(searchUrl(item.q, 20, item.mode === 'basic' ? 'basic' : 'uql'))
        .then(function (res) { return run(i + 1, found.concat(extractMembers(res))); })
        .catch(function () { return run(i + 1, found); });
    }

    return Promise.resolve(run(0, []));
  }

  if (typeof APP_CONFIG !== 'undefined') {
    APP_CONFIG.BUILD = 'bom20260608a';
    APP_CONFIG.API_ENG_BOM_FIRST = true;
    APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
    APP_CONFIG.PRIMARY_LOADER = 'api';
    APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = true;
    APP_CONFIG.PILOT_API_TREE_DEPTH = Math.max(APP_CONFIG.PILOT_API_TREE_DEPTH || 0, 8);
    APP_CONFIG.BOM_FAST_DEPTH = Math.max(APP_CONFIG.BOM_FAST_DEPTH || 0, 8);
    APP_CONFIG.BOM_INITIAL_DEPTH = Math.max(APP_CONFIG.BOM_INITIAL_DEPTH || 0, 8);
  }

  if (typeof EnoviaApi !== 'undefined' && !EnoviaApi.__ID_HOTFIX_20260608A__) {
    var originalGetProductRoot = EnoviaApi.getProductRoot;
    var originalGetEngItem = EnoviaApi.getEngItem;
    var originalGetEngInstanceChildren = EnoviaApi.getEngInstanceChildren;

    EnoviaApi.resolveEngItemId = resolveEngItemId;

    EnoviaApi.getProductRoot = function (physicalId, expand) {
      var titleHint = '';
      try {
        if (typeof ExplorerContext !== 'undefined' && ExplorerContext.get) {
          var ctx = ExplorerContext.get();
          titleHint = ctx && (ctx.rootName || ctx.structureName || ctx.productName || ctx.selectionLabel || '');
        }
      } catch (e) { /* noop */ }
      return resolveEngItemId(physicalId, titleHint).then(function (internalId) {
        return originalGetEngItem.call(EnoviaApi, internalId, null)
          .then(function (res) { return { member: res.member || res, bomRootId: internalId }; })
          .catch(function () { return originalGetProductRoot.call(EnoviaApi, physicalId, expand); });
      });
    };

    EnoviaApi.getEngItem = function (id, expand) {
      return resolveEngItemId(id, '').then(function (internalId) {
        return originalGetEngItem.call(EnoviaApi, internalId, expand);
      });
    };

    EnoviaApi.getEngInstanceChildren = function (parentId, skip, top) {
      return resolveEngItemId(parentId, '').then(function (internalId) {
        return originalGetEngInstanceChildren.call(EnoviaApi, internalId, skip, top);
      });
    };

    EnoviaApi.__ID_HOTFIX_20260608A__ = true;
  }

  global.__BOM_HOTFIX_20260608A__ = true;
})(typeof window !== 'undefined' ? window : this);
