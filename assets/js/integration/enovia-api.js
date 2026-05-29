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
    if (
      (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD ||
        (typeof CompassServices !== 'undefined' &&
          CompassServices.isDashboardOnIfwe &&
          CompassServices.isDashboardOnIfwe())) &&
      typeof CompassServices !== 'undefined' &&
      CompassServices.ifweSpaceUrl
    ) {
      return CompassServices.ifweSpaceUrl();
    }
    try {
      if ((location.hostname || '').toLowerCase().indexOf('ifwe') >= 0) {
        if (typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
          return CompassServices.ifweSpaceUrl();
        }
        var ih = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost;
        if (ih) return 'https://' + ih + '/enovia';
      }
    } catch (e) { /* */ }
    if (typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl && APP_CONFIG.PREFER_IFWE_FIRST !== false) {
      return CompassServices.ifweSpaceUrl();
    }
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

  function engInstanceChildrenUrl(parentPhysicalId, skip, top) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?$skip=' + skip + '&$top=' + top
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
    var eng = member['dseng:engItem'] || member.reference;
    if (eng && typeof eng === 'object') {
      return eng.physicalid || eng.id || null;
    }
    return member.physicalid || null;
  }

  /** Cloud: Physical Product / VPM — EngItem costuma retornar 400. */
  function getProductRoot(physicalId, expand) {
    var id = apiId(physicalId);
    return getPhysicalProduct(id, null)
      .catch(function () { return getVpmReference(id, null); });
  }

  function getPhysicalProductChildren(parentPhysicalId, skip, top) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var id = encodeURIComponent(apiId(parentPhysicalId));
    var base = restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + id;
    var urls = [
      base + '/dspfl:Part?$skip=' + skip + '&$top=' + top,
      base + '/dspfl:Instance?$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Part&$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Instance&$skip=' + skip + '&$top=' + top
    ];
    function tryUrl(i) {
      if (i >= urls.length) {
        return Promise.reject(new Error('Sem filhos dspfl para ' + parentPhysicalId));
      }
      return WafClient.get(urls[i]).catch(function () { return tryUrl(i + 1); });
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
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductChildren: getPhysicalProductChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemUrl: engItemUrl
  };
})();
