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
    return [
      modelerBase + '/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/search?q=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/modeler/search?searchStr=' + enc + '&$top=' + top
    ];
  }

  function trySearch(urls, index) {
    index = index || 0;
    if (index >= urls.length) {
      return Promise.reject(new Error('Nenhum endpoint de busca respondeu no tenant.'));
    }
    return WafClient.get(urls[index]).catch(function () {
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
