/* BOM hybrid hotfix - 20260608l */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608l';
      APP_CONFIG.PRIMARY_LOADER = 'tsv';
      APP_CONFIG.PILOT_GRID_FIRST = true;
      APP_CONFIG.EXPLORER_ONLY = true;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = true;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY = true;
      APP_CONFIG.DOM_MIRROR_FALLBACK = true;
      APP_CONFIG.SKIP_MIRROR_ON_TSV = false;
      APP_CONFIG.CAN_USE_ENOVIA_API = true;
      APP_CONFIG.USE_API_SCAN_FIRST = false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = false;
      APP_CONFIG.MANUAL_API_FALLBACK = true;
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PILOT_API_TREE_DEPTH = 4;
      APP_CONFIG.BOM_INITIAL_DEPTH = 4;
      APP_CONFIG.BOM_FAST_DEPTH = 4;
      APP_CONFIG.SKIP_PP_ENRICH = true;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS = true;
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 1000000);
      APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED = Math.max(APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED || 0, 1000000);
      APP_CONFIG.SCROLL_HARVEST_MAX_STEPS = Math.max(APP_CONFIG.SCROLL_HARVEST_MAX_STEPS || 0, 240);
      APP_CONFIG.FAST_TSV_MAX = Math.max(APP_CONFIG.FAST_TSV_MAX || 0, 1000000);
      APP_CONFIG.SCAN_TIMEOUT_MS = Math.max(APP_CONFIG.SCAN_TIMEOUT_MS || 0, 120000);
    }

    function members(res) {
      try { if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(res) || []; } catch (e) { }
      if (!res) return [];
      if (Array.isArray(res.member)) return res.member;
      if (Array.isArray(res.members)) return res.members;
      if (Array.isArray(res.data)) return res.data;
      return [];
    }

    function cleanLabel(s) {
      return String(s || '').replace(/<[^>]*>/g, '').replace(/\.\d+\s*$/g, '').replace(/^prd-R\d+-[A-Za-z0-9._-]+$/i, '').trim();
    }

    function firstMember(res) {
      var list = members(res);
      return list && list.length ? list[0] : null;
    }

    function engItemLabel(id) {
      if (!id || !EnoviaApi || !EnoviaApi.getEngItem) return Promise.resolve('');
      return EnoviaApi.getEngItem(id).then(function (res) {
        var m = firstMember(res) || {};
        return cleanLabel(m.title || m.name || m.description || '');
      }).catch(function () { return ''; });
    }

    function childCountWithOriginal(originalGetChildren, id) {
      if (!id) return Promise.resolve(0);
      return originalGetChildren(id, 0, 5).then(function (res) {
        return members(res).length || res.totalItems || 0;
      }).catch(function () { return 0; });
    }

    function idOf(obj) {
      return String((obj && (obj.id || obj.physicalid || obj.physicalId || obj.identifier)) || '').trim();
    }

    function searchCandidatesByLabel(label) {
      label = cleanLabel(label);
      if (!label || !EnoviaApi) return Promise.resolve([]);
      if (EnoviaApi.findEngItemByLabel) {
        return EnoviaApi.findEngItemByLabel(label, 20).then(function (candidate) {
          return candidate ? [candidate] : [];
        }).catch(function () { return []; });
      }
      return Promise.resolve([]);
    }

    function pickNavigableByLabel(label, originalGetChildren, currentId) {
      return searchCandidatesByLabel(label).then(function (cands) {
        if (!cands || !cands.length) return null;
        var best = null;
        var bestCount = 0;
        return cands.reduce(function (chain, cand) {
          return chain.then(function () {
            var cid = idOf(cand);
            if (!cid || cid === currentId) return null;
            return childCountWithOriginal(originalGetChildren, cid).then(function (cnt) {
              if (cnt > bestCount) {
                bestCount = cnt;
                best = cid;
              }
            });
          });
        }, Promise.resolve()).then(function () {
          return bestCount > 0 ? best : null;
        });
      });
    }

    function patchEnoviaChildrenResolver() {
      if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngInstanceChildren) return;
      if (EnoviaApi.__BOM20260608L_CHILD_LABEL_PATCHED__) return;
      var originalGetChildren = EnoviaApi.getEngInstanceChildren.bind(EnoviaApi);
      var aliasCache = {};

      function retryByLabel(parentId, skip, top, originalResult) {
        if ((skip || 0) > 0) return Promise.resolve(originalResult || { totalItems: 0, member: [] });
        return engItemLabel(parentId).then(function (label) {
          if (!label) return originalResult || { totalItems: 0, member: [] };
          return pickNavigableByLabel(label, originalGetChildren, parentId).then(function (navId) {
            if (!navId || navId === parentId) return originalResult || { totalItems: 0, member: [] };
            aliasCache[parentId] = navId;
            return originalGetChildren(navId, skip, top).then(function (retry) {
              var list = members(retry);
              if (list.length || (retry && retry.totalItems > 0)) return retry;
              return originalResult || retry;
            }).catch(function () { return originalResult || { totalItems: 0, member: [] }; });
          });
        });
      }

      EnoviaApi.getEngInstanceChildren = function (parentId, skip, top) {
        parentId = String(parentId || '');
        var alias = aliasCache[parentId];
        if (alias) return originalGetChildren(alias, skip, top);
        return originalGetChildren(parentId, skip, top).then(function (res) {
          var list = members(res);
          if ((skip || 0) > 0 || list.length || (res && res.totalItems > 0)) return res;
          return retryByLabel(parentId, skip, top, res);
        }).catch(function () {
          return retryByLabel(parentId, skip, top, { totalItems: 0, member: [] });
        });
      };
      EnoviaApi.__BOM20260608L_CHILD_LABEL_PATCHED__ = true;
    }

    function expectedExplorerCount() {
      try { if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) return ProductExplorerBridge.getExplorerObjectCount() || 0; } catch (e) { }
      try { if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) { var ctx = ExplorerContext.refresh(true); return (ctx && ctx.expectedCount) || 0; } } catch (e2) { }
      return 0;
    }

    function resultCount(result) {
      if (!result) return 0;
      if (result.meta && result.meta.itemCount) return result.meta.itemCount || 0;
      if (typeof BomService !== 'undefined' && BomService.getNodeCount) return BomService.getNodeCount() || 0;
      return 0;
    }

    function isUsefulExplorerResult(result) {
      var count = resultCount(result);
      var expected = expectedExplorerCount();
      if (!count) return false;
      if (expected > 0 && count < Math.max(1, expected - 1)) return false;
      return true;
    }

    function scanByApiFallback(reason) {
      patchEnoviaChildrenResolver();
      if (!ExplorerScanner || !ExplorerScanner.resolveSelection || !ExplorerScanner.scanViaApi) return Promise.reject(new Error('Fallback API indisponivel.'));
      if (typeof App !== 'undefined' && App.setStatus) App.setStatus('Explorer não entregou linhas; usando API ENOVIA controlada…', 'info');
      return ExplorerScanner.resolveSelection().then(function (sel) {
        return ExplorerScanner.scanViaApi(sel).then(function (apiResult) {
          if (apiResult) {
            apiResult.mode = 'api-fallback';
            apiResult.loaderMode = 'api-fallback';
            apiResult.fallbackReason = reason || 'explorer-grid-empty';
          }
          return apiResult;
        });
      });
    }

    if (typeof ExplorerContext !== 'undefined') ExplorerContext.suggestLoaderMode = function () { return 'tsv'; };
    patchEnoviaChildrenResolver();

    if (typeof ExplorerScanner !== 'undefined' && !ExplorerScanner.__BOM20260608L_PATCHED__) {
      ExplorerScanner.scan = function () {
        patchEnoviaChildrenResolver();
        var primary;
        if (ExplorerScanner.scanViaExplorerGrid) primary = ExplorerScanner.scanViaExplorerGrid({ allowAutoCopy: true });
        else if (ExplorerScanner.scanViaPilotGeneric) primary = ExplorerScanner.scanViaPilotGeneric();
        else primary = Promise.reject(new Error('Scanner do Product Explorer indisponivel.'));
        return Promise.resolve(primary).then(function (result) {
          if (isUsefulExplorerResult(result)) {
            result.mode = result.mode || 'explorer-current';
            result.loaderMode = 'explorer-current';
            return result;
          }
          return scanByApiFallback('explorer-result-empty-or-partial');
        }).catch(function (err) {
          return scanByApiFallback(err && err.message ? err.message : 'explorer-scan-error');
        });
      };
      ExplorerScanner.__BOM20260608L_PATCHED__ = true;
    }

    global.__BOM_BUILD_ID__ = 'bom20260608l';
    global.__BOM_HOTFIX_MODE__ = 'api-label-retry-on-empty-or-error';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
