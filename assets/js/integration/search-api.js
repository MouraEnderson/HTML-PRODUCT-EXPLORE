/**
 * @file integration/search-api.js
 * Busca federada 3DSpace / ENOVIA (Physical Product, VPMReference).
 */
var SearchApi = (function () {
  'use strict';

  var spaceUrl = null;

  function init(base3DSpaceUrl) {
    spaceUrl = base3DSpaceUrl.replace(/\/$/, '');
  }

  function searchUrls(term, top) {
    top = top || APP_CONFIG.SEARCH.TOP;
    var enc = encodeURIComponent(term);
    var modelerBase = CompassServices.buildRestBase(spaceUrl);
    var m = APP_CONFIG.MODELERS || {};
    var eng = m.ENG_ITEM || 'dseng';
    var engType = m.ENG_ITEM_TYPE || 'dseng:EngItem';
    var titleFilter = encodeURIComponent("title co '" + term.replace(/'/g, "''") + "'");
    var nameFilter = encodeURIComponent("name co '" + term.replace(/'/g, "''") + "'");
    return [
      modelerBase + '/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/search?q=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$searchStr=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$filter=' + titleFilter + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$filter=' + nameFilter + '&$top=' + top,
      modelerBase + '/dsxcad/dsxcad:VPMReference/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/dsxcad/dsxcad:VPMReference?$searchStr=' + enc + '&$top=' + top,
      modelerBase + '/dspfl/dspfl:PhysicalProduct/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/modeler/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/federated/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/federated/search?q=' + enc + '&$top=' + top
    ];
  }

  function responseHitCount(data) {
    if (!data) return 0;
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) {
      return EnoviaApi.extractMembers(data).length;
    }
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data.member)) return data.member.length;
    if (Array.isArray(data.infos)) return data.infos.length;
    if (Array.isArray(data.results)) return data.results.length;
    return 0;
  }

  function trySearch(urls, index) {
    index = index || 0;
    if (index >= urls.length) {
      return Promise.reject(new Error('Nenhum endpoint de busca respondeu no tenant.'));
    }
    return WafClient.get(urls[index]).then(function (data) {
      if (responseHitCount(data) === 0 && index + 1 < urls.length) {
        return trySearch(urls, index + 1);
      }
      return data;
    }).catch(function () {
      return trySearch(urls, index + 1);
    });
  }

  function search(term, options) {
    options = options || {};
    if (!spaceUrl) {
      return Promise.reject(new Error('3DSpace não inicializado.'));
    }
    return trySearch(searchUrls(term, options.top));
  }

  return {
    init: init,
    search: search
  };
})();
