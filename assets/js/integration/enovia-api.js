/**
 * @file integration/enovia-api.js
 * Endpoints REST ENOVIA — Engineering Item, BOM, Physical Product.
 */
var EnoviaApi = (function () {
  'use strict';

  var restBase = null;

  function defaultSpaceUrl() {
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var verified = CompassServices.getVerifiedSpaceUrl();
      if (verified) return verified;
    }
    try {
      if ((location.hostname || '').toLowerCase().indexOf('ifwe') >= 0) {
        if (typeof CompassServices !== 'undefined' && CompassServices.tenantSpaceUrl) {
          return CompassServices.tenantSpaceUrl();
        }
      }
    } catch (e) { /* */ }
    var h = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return h ? 'https://' + h + '/enovia' : null;
  }

  function ensureRestBase() {
    if (restBase && String(restBase).indexOf('null') < 0) return restBase;
    restBase = null;
    var space = defaultSpaceUrl();
    if (space) init(space);
    if (!restBase || String(restBase).indexOf('null') >= 0) {
      throw new Error('3DSpace não conectado (URL inválida). Use os dados do snapshot Mont10.');
    }
    return restBase;
  }

  function init(spaceUrl) {
    if (!spaceUrl || spaceUrl === 'demo') {
      restBase = null;
      return null;
    }
    restBase = CompassServices.buildRestBase(spaceUrl);
    return restBase;
  }

  function apiId(physicalId) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(physicalId);
    }
    return physicalId;
  }

  function engItemUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(physicalId));
  }

  function engInstanceChildrenUrl(parentPhysicalId, skip, top, expand) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?$skip=' + skip + '&$top=' + top
    );
    if (expand) url += '&$expand=' + encodeURIComponent(expand);
    return url;
  }

  function engInstanceDetailUrl(parentPhysicalId, instanceId, expand) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance/' + encodeURIComponent(apiId(instanceId))
    );
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return url;
  }

  function engItemSearchUrl(term, top) {
    ensureRestBase();
    top = top || (APP_CONFIG.SEARCH && APP_CONFIG.SEARCH.TOP) || 40;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/search?searchStr=' +
      encodeURIComponent(term) + '&$top=' + top
    );
  }

  function engItemUqlSearchUrl(query, top) {
    ensureRestBase();
    top = top || (APP_CONFIG.SEARCH && APP_CONFIG.SEARCH.TOP) || 40;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/search?$searchStr=' +
      encodeURIComponent(query) + '&$top=' + top
    );
  }

  function physicalProductSearchUrl(relatedEngId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE +
      '?$filter=dseng:engItem.physicalid eq \'' + relatedEngId + '\''
    );
  }

  function vpmReferenceUrl(physicalId) {
    ensureRestBase();
    return restBase + '/dsxcad/dsxcad:VPMReference/' + encodeURIComponent(apiId(physicalId));
  }

  function physicalProductUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + encodeURIComponent(apiId(physicalId));
  }

  function getEngItem(physicalId, expand) {
    var url = engItemUrl(physicalId);
    if (expand) {
      url += '?$expand=' + encodeURIComponent(expand);
    }
    return WafClient.get(url);
  }

  function getVpmReference(physicalId, expand) {
    var url = vpmReferenceUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  function getPhysicalProduct(physicalId, expand) {
    var url = physicalProductUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  function extractEngItemIdFromResponse(res) {
    if (!res) return null;
    var member = res.member || res;
    if (Array.isArray(member)) member = member[0];
    if (!member) return null;
    var eng = member['dseng:engItem'] || member['dseng:EngItem'] || member.reference;
    if (eng && typeof eng === 'object') {
      return eng.physicalid || eng.id || null;
    }
    return member.physicalid || member.id || null;
  }

  function textOf(obj, key) {
    return String((obj && obj[key]) || '').trim();
  }

  function chooseExactEngItem(res, expected) {
    expected = String(expected || '').trim();
    var members = extractMembers(res);
    if (!members.length) return null;
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (
        textOf(m, 'id') === expected ||
        textOf(m, 'physicalid') === expected ||
        textOf(m, 'name') === expected ||
        textOf(m, 'title') === expected
      ) {
        return m;
      }
    }
    return members.length === 1 ? members[0] : null;
  }

  function quoteUql(value) {
    return '"' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function getEngItemUqlSearch(query, top) {
    return WafClient.get(engItemUqlSearchUrl(query, top));
  }

  function findEngItemByLabel(label, top) {
    var expected = String(label || '').trim();
    if (!expected) return Promise.reject(new Error('Label vazio para resolver EngItem.'));
    return getEngItemUqlSearch('label:' + quoteUql(expected), top || 20)
      .then(function (res) {
        var exact = chooseExactEngItem(res, expected);
        if (!exact) throw new Error('EngItem nao encontrado por label: ' + expected);
        return exact;
      });
  }

  function resolveEngItemMember(input, titleHint) {
    input = String(input || '').trim();
    titleHint = String(titleHint || '').trim();
    if (!input && !titleHint) return Promise.reject(new Error('Raiz vazia para resolver EngItem.'));

    function byInput() {
      if (!input) return Promise.reject(new Error('Sem physicalId para busca UQL.'));
      return getEngItemUqlSearch('name:' + input, 20)
        .then(function (res) {
          var exact = chooseExactEngItem(res, input);
          if (exact) return exact;
          throw new Error('Sem match exato por name.');
        })
        .catch(function () {
          return getEngItemUqlSearch(input, 20).then(function (res) {
            var exact = chooseExactEngItem(res, input);
            if (exact) return exact;
            throw new Error('Sem match exato por physicalId.');
          });
        });
    }

    function byTitle() {
      if (!titleHint) return Promise.reject(new Error('Sem titulo para busca UQL.'));
      return findEngItemByLabel(titleHint, 20);
    }

    return byInput().catch(byTitle);
  }

  function candidateRootIds(physicalId) {
    var seen = {};
    var list = [];
    function add(id) {
      id = apiId(id);
      if (!id || seen[id]) return;
      seen[id] = true;
      list.push(id);
    }
    add(physicalId);
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    Object.keys(reg).forEach(function (k) {
      if (/^prd-/i.test(k) && reg[k] && apiId(reg[k]) === apiId(physicalId)) {
        add(k);
      }
    });
    return list;
  }

  function isCloudPrdId(id) {
    return /^prd-R\d{10,}-/i.test(String(id || ''));
  }

  function preferEngChildrenForParent(parentId) {
    if (APP_CONFIG.API_ENG_BOM_FIRST === false) return false;
    return true;
  }

  function preferEngBomApi() {
    return APP_CONFIG.API_ENG_BOM_FIRST !== false;
  }

  /** Cloud FD02 — dseng EngItem primeiro; Physical Product só para resolver bomRootId. */
  function getProductRoot(physicalId, expand) {
    var ids = candidateRootIds(physicalId);

    function pack(res, bomRootId) {
      return { member: res.member || res, bomRootId: bomRootId || null };
    }

    function packResolved(member) {
      var id = member && (member.id || member.physicalid);
      if (!id) return Promise.reject(new Error('EngItem resolvido sem id.'));
      return getEngItem(id, expand).then(function (res) {
        return pack(res, id);
      });
    }

    function tryResolved(i) {
      if (i >= ids.length) return Promise.reject(new Error('Raiz nao resolvida por UQL.'));
      return resolveEngItemMember(ids[i], null)
        .then(packResolved)
        .catch(function () {
          return tryResolved(i + 1);
        });
    }

    function tryEng(i) {
      if (i >= ids.length) return tryPrd(0);
      var id = ids[i];
      return getEngItem(id, expand)
        .then(function (res) {
          return pack(res, id);
        })
        .catch(function () {
          return tryEng(i + 1);
        });
    }

    function tryPrd(i) {
      if (i >= ids.length) {
        return Promise.reject(new Error('Raiz não encontrada para ' + physicalId));
      }
      var id = ids[i];
      return getPhysicalProduct(id, null)
        .then(function (res) {
          var engId = extractEngItemIdFromResponse(res) || id;
          return pack(res, engId);
        })
        .catch(function () {
          return getVpmReference(id, null)
            .then(function (res) {
              return pack(res, id);
            })
            .catch(function () {
              return tryPrd(i + 1);
            });
        });
    }

    if (isCloudPrdId(physicalId)) {
      return tryResolved(0).catch(function () {
        return tryPrd(0).catch(function () {
          return tryEng(0);
        });
      });
    }
    for (var ci = 0; ci < ids.length; ci++) {
      if (isCloudPrdId(ids[ci])) {
        return tryResolved(0).catch(function () {
          return tryPrd(0).catch(function () {
            return tryEng(0);
          });
        });
      }
    }
    if (preferEngBomApi()) return tryEng(0);
    return tryPrd(0).catch(function () {
      return tryEng(0);
    });
  }

  function getPhysicalProductChildren(parentPhysicalId, skip, top) {
    if (APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK !== true) {
      return Promise.reject(new Error('Fallback PhysicalProduct desabilitado; use dseng EngInstance.'));
    }
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var id = encodeURIComponent(apiId(parentPhysicalId));
    var base = restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + id;
    var urls = [
      base + '/dspfl:Part?$skip=' + skip + '&$top=' + top,
      base + '/dspfl:Instance?$skip=' + skip + '&$top=' + top,
      base + '/boM?$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Part&$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Instance&$skip=' + skip + '&$top=' + top,
      base + '?$expand=boM&$skip=' + skip + '&$top=' + top,
      base + '?$expand=boM,dspfl:Part&$skip=' + skip + '&$top=' + top
    ];
    function tryUrl(i) {
      if (i >= urls.length) {
        return Promise.reject(new Error('Filhos indisponíveis (406) para ' + parentPhysicalId));
      }
      return WafClient.get(urls[i]).catch(function () {
        return tryUrl(i + 1);
      });
    }
    return tryUrl(0);
  }

  function getEngItemBomExpand(physicalId) {
    return getEngItem(physicalId, APP_CONFIG.EXPAND.BOM_CHILDREN);
  }

  function getEngInstanceChildren(parentPhysicalId, skip, top) {
    return WafClient.get(engInstanceChildrenUrl(parentPhysicalId, skip, top));
  }

  function getPhysicalProductsForEngItem(engPhysicalId) {
    return WafClient.get(physicalProductSearchUrl(engPhysicalId));
  }

  function extractMembers(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.infos)) return response.infos;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.items)) return response.items;
    if (response.member && Array.isArray(response.member.member)) return response.member.member;
    if (response.data && Array.isArray(response.data.items)) return response.data.items;
    if (response.data && Array.isArray(response.data.member)) return response.data.member;
    return [];
  }

  return {
    init: init,
    ensureRestBase: ensureRestBase,
    defaultSpaceUrl: defaultSpaceUrl,
    getEngItem: getEngItem,
    getVpmReference: getVpmReference,
    getPhysicalProduct: getPhysicalProduct,
    getProductRoot: getProductRoot,
    engItemUrl: engItemUrl,
    engInstanceChildrenUrl: engInstanceChildrenUrl,
    engInstanceDetailUrl: engInstanceDetailUrl,
    physicalProductUrl: physicalProductUrl,
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    preferEngBomApi: preferEngBomApi,
    preferEngChildrenForParent: preferEngChildrenForParent,
    isCloudPrdId: isCloudPrdId,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductChildren: getPhysicalProductChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemSearchUrl: engItemSearchUrl,
    engItemUqlSearchUrl: engItemUqlSearchUrl,
    getEngItemUqlSearch: getEngItemUqlSearch,
    findEngItemByLabel: findEngItemByLabel,
    resolveEngItemMember: resolveEngItemMember
  };
})();
