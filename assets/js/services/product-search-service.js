/**
 * @file services/product-search-service.js
 * Normaliza resultados de busca → Physical Product / VPMReference.
 */
var ProductSearchService = (function () {
  'use strict';

  var PHYSICAL_HINTS = [
    'VPMReference',
    'Physical Product',
    'PhysicalProduct',
    'dspfl:PhysicalProduct',
    'i3dx:Physical',
    'dseng:EngItem',
    'EngItem',
    'Provide',
    'Product',
    'Assembly',
    'Part'
  ];

  function isPhysicalProductHit(item) {
    var blob = [
      item.type,
      item.objectType,
      item.displayType,
      item.policy,
      item['dseno:type'],
      item.i3dx,
      (item.objectTaxonomies || []).join(' ')
    ].join(' ').toLowerCase();
    return PHYSICAL_HINTS.some(function (h) {
      return blob.indexOf(h.toLowerCase()) >= 0;
    });
  }

  function normalizeHit(raw) {
    var id =
      raw.physicalid || raw.physicalId || raw.objectId || raw.id ||
      raw.resourceid || raw.resourceId || raw.pid ||
      (raw.resource && (raw.resource.id || raw.resource.resourceid)) ||
      (raw.info && (raw.info.id || raw.info.physicalid));
    if (!id) return null;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      id = ThreeDXContentParser.normalizePhysicalId(id);
    }
    return {
      physicalid: id,
      type: raw.type || raw.objectType || 'VPMReference',
      name: raw.name || raw.title || raw.displayName || id,
      displayName: raw.displayName || raw.title || raw.name || id,
      displayType: raw.displayType || raw['dseno:displayType'] || '',
      revision: raw.revision || raw['dseno:revision'] || '',
      state: raw.state || raw.current || raw.status || '',
      owner: raw.owner || raw.creator || '',
      organization: raw.organization || '',
      collabSpace: raw.collabspace || raw.project || '',
      description: raw.description || '',
      i3dx: raw.i3dx || null
    };
  }

  function nameMatchesTerm(hit, term) {
    if (!term || !hit) return false;
    var t = String(term).toLowerCase();
    var n = (hit.name || hit.displayName || '').toLowerCase();
    return n === t || n.indexOf(t) === 0 || t.indexOf(n) === 0;
  }

  function parseResponse(response, term) {
    var members = EnoviaApi.extractMembers(response);
    if (!members.length && response && response.results) {
      members = response.results;
    }
    var all = members.map(normalizeHit).filter(Boolean);
    var physical = all.filter(isPhysicalProductHit);
    if (term) {
      var exact = all.filter(function (h) { return nameMatchesTerm(h, term); });
      if (exact.length) return exact;
    }
    return physical.length ? physical : all;
  }

  function search(term, options) {
    options = options || {};
    var t = String(term || '').trim();
    return SearchApi.search(t, options).then(function (res) {
      return parseResponse(res, t);
    });
  }

  function getDemoResults(term) {
    var all = [
      {
        physicalid: '132FB3CE26D70E006A18D1870000316D',
        type: 'VPMReference',
        name: '01_SKA_Drone Assembly_130520206',
        displayName: '01_SKA_Drone Assembly_130520206',
        displayType: 'Physical Product',
        revision: 'A',
        state: 'RELEASED',
        owner: 'demo.owner',
        organization: 'Company Name',
        collabSpace: 'CS_IMPLANTACAO'
      },
      {
        physicalid: 'DEMO_PP_002',
        type: 'VPMReference',
        name: '02_Motor_Assembly',
        displayName: '02_Motor_Assembly',
        displayType: 'Physical Product',
        revision: 'B',
        state: 'IN_WORK',
        owner: 'demo.owner',
        organization: 'Company Name',
        collabSpace: 'CS_IMPLANTACAO'
      }
    ];
    if (!term) return all;
    var t = term.toLowerCase();
    return all.filter(function (x) {
      return (x.name + x.displayName).toLowerCase().indexOf(t) >= 0;
    });
  }

  return {
    search: search,
    parseResponse: parseResponse,
    getDemoResults: getDemoResults,
    isPhysicalProductHit: isPhysicalProductHit,
    normalizeHit: normalizeHit
  };
})();
