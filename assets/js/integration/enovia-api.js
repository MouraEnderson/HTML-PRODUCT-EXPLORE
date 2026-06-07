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

  function dsengCfg() {
    return (APP_CONFIG && APP_CONFIG.DSENG) || {};
  }

  function normalizeEngInstanceOptions(options) {
    if (typeof options === 'string') return { expand: options };
    return options || {};
  }

  function appendParam(params, key, value) {
    if (value === undefined || value === null || value === '') return;
    params.push(key + '=' + encodeURIComponent(value));
  }

  function engInstanceChildrenUrl(parentPhysicalId, skip, top, options) {
    ensureRestBase();
    options = normalizeEngInstanceOptions(options);
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var cfg = dsengCfg();
    var params = [];
    appendParam(params, '$mva', 'true');
    appendParam(params, '$skip', skip);
    appendParam(params, '$top', top);
    if (options.mask !== false) {
      appendParam(params, '$mask', options.mask || cfg.ENG_INSTANCE_MASK || 'dsmveng:EngInstanceMask.Details');
    }
    if (options.fields !== false) {
      appendParam(params, '$fields', options.fields || cfg.ENG_INSTANCE_FIELDS || 'dsmvcfg:attribute.hasConfiguredInstance');
    }
    if (options.expand) appendParam(params, '$expand', options.expand);
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?' + params.join('&')
    );
  }

  function engInstanceDetailUrl(parentPhysicalId, instanceId, options) {
    ensureRestBase();
    options = normalizeEngInstanceOptions(options);
    var m = APP_CONFIG.MODELERS;
    var cfg = dsengCfg();
    var params = [];
    appendParam(params, '$mva', 'true');
    if (options.mask !== false) {
      appendParam(params, '$mask', options.mask || cfg.ENG_INSTANCE_MASK || 'dsmveng:EngInstanceMask.Details');
    }
    if (options.fields !== false) {
      appendParam(params, '$fields', options.fields || cfg.ENG_INSTANCE_FIELDS || 'dsmvcfg:attribute.hasConfiguredInstance');
    }
    if (options.expand) appendParam(params, '$expand', options.expand);
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance/' + encodeURIComponent(apiId(instanceId))
    );
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  function engItemExpandUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(physicalId)) +
      '/expand'
    );
  }

  function engItemExpandBody(options) {
    options = options || {};
    var cfg = dsengCfg();
    var body = {
      expandDepth: options.expandDepth == null ? (cfg.EXPAND_DEPTH == null ? -1 : cfg.EXPAND_DEPTH) : options.expandDepth,
      withPath: options.withPath !== false,
      type_filter_bo: options.type_filter_bo || options.typeFilterBo || ['VPMReference', 'VPMRepReference'],
      type_filter_rel: options.type_filter_rel || options.typeFilterRel || ['VPMInstance', 'VPMRepInstance']
    };
    if (options.filter) body.filter = options.filter;
    return body;
  }

  function expandEngItem(physicalId, options) {
    return WafClient.post(engItemExpandUrl(physicalId), JSON.stringify(engItemExpandBody(options)), {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });
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

  function lowerText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeDateMs(value) {
    if (!value) return 0;
    var d = value instanceof Date ? value : new Date(value);
    var t = d.getTime();
    return isNaN(t) ? 0 : t;
  }

  function scoreEngItemCandidate(item, expected, hints) {
    hints = hints || {};
    var score = 0;
    var exp = lowerText(expected);
    var expectedName = lowerText(hints.expectedName);
    var titleHint = lowerText(hints.titleHint);
    var id = textOf(item, 'id');
    var physical = textOf(item, 'physicalid');
    var name = textOf(item, 'name');
    var title = textOf(item, 'title');
    var desc = textOf(item, 'description');
    var nameLow = lowerText(name);
    var titleLow = lowerText(title);
    var descLow = lowerText(desc);

    if (id === expected || physical === expected || name === expected || title === expected) score += 1000;
    if (expectedName && nameLow === expectedName) score += 850;
    if (titleHint && titleLow === titleHint) score += 920;
    if (exp && titleLow === exp) score += 220;
    if (exp && nameLow === exp) score += 180;
    if (exp && descLow === exp) score += 80;
    /*
     * Product Structure Explorer exposes cloud physical objects as prd-R...
     * When dseng search returns several VPMReference candidates with the same
     * label, prefer the candidate whose name is the actual cloud physical id.
     */
    if (/^prd-/i.test(name)) score += 180;
    if (expectedName && /^prd-/i.test(expectedName) && nameLow === expectedName) score += 420;
    if (/^\d{6,}$/i.test(name)) score -= 20;
    if (
      titleHint &&
      titleLow !== titleHint &&
      (titleLow.indexOf('sellable') >= 0 ||
        titleLow.indexOf('edition') >= 0 ||
        titleLow.indexOf('fog') >= 0)
    ) {
      score -= 160;
    }

    var hintOwner = lowerText(hints.owner);
    var hintCollab = lowerText(hints.collabspace || hints.collabSpace);
    var hintOrg = lowerText(hints.organization);
    var hintRevision = lowerText(hints.revision);
    var hintCestamp = lowerText(hints.cestamp);

    if (hintOwner && lowerText(item.owner) === hintOwner) score += 30;
    if (hintCollab && lowerText(item.collabspace || item.collabSpace) === hintCollab) score += 30;
    if (hintOrg && lowerText(item.organization) === hintOrg) score += 12;
    if (hintRevision && lowerText(item.revision) === hintRevision) score += 12;
    if (hintCestamp && lowerText(item.cestamp) === hintCestamp) score += 25;

    var parentCreated = normalizeDateMs(hints.created);
    var itemCreated = normalizeDateMs(item.created || item.originated);
    if (parentCreated && itemCreated) {
      var days = Math.abs(parentCreated - itemCreated) / 86400000;
      if (days <= 1) score += 35;
      else if (days <= 14) score += 18;
      else if (days <= 60) score += 8;
    }

    var parentModified = normalizeDateMs(hints.modified);
    var itemModified = normalizeDateMs(item.modified);
    if (parentModified && itemModified) {
      var modDays = Math.abs(parentModified - itemModified) / 86400000;
      if (modDays <= 1) score += 20;
      else if (modDays <= 14) score += 10;
    }

    return score;
  }

  function chooseExactEngItem(res, expected, hints) {
    expected = String(expected || '').trim();
    var members = extractMembers(res);
    if (!members.length) return null;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (
        textOf(m, 'id') === expected ||
        textOf(m, 'physicalid') === expected ||
        textOf(m, 'name') === expected ||
        textOf(m, 'title') === expected
      ) {
        var score = scoreEngItemCandidate(m, expected, hints);
        if (score > bestScore) {
          best = m;
          bestScore = score;
        }
      }
    }
    if (best) return best;
    if (members.length === 1) return members[0];
    for (var j = 0; j < members.length; j++) {
      var candidateScore = scoreEngItemCandidate(members[j], expected, hints);
      if (candidateScore > bestScore) {
        best = members[j];
        bestScore = candidateScore;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function quoteUql(value) {
    return '"' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function getEngItemUqlSearch(query, top) {
    return WafClient.get(engItemUqlSearchUrl(query, top));
  }

  function findEngItemByLabel(label, top, hints) {
    var expected = String(label || '').trim();
    if (!expected) return Promise.reject(new Error('Label vazio para resolver EngItem.'));
    return getEngItemUqlSearch('label:' + quoteUql(expected), top || 20)
      .then(function (res) {
        var exact = chooseExactEngItem(res, expected, hints);
        if (!exact) throw new Error('EngItem nao encontrado por label: ' + expected);
        return exact;
      });
  }

  function resolveEngItemMember(input, titleHint) {
    input = String(input || '').trim();
    titleHint = String(titleHint || '').trim();
    if (!input && !titleHint) return Promise.reject(new Error('Raiz vazia para resolver EngItem.'));

    function pickFromUql(query, expected) {
      return getEngItemUqlSearch(query, 20).then(function (res) {
        var exact = chooseExactEngItem(res, expected || input, { expectedName: input, titleHint: titleHint });
        if (exact) return exact;
        throw new Error('Sem match UQL: ' + query);
      });
    }

    function byPrdName() {
      if (!input || !/^prd-/i.test(input)) {
        return Promise.reject(new Error('Sem physicalId prd- para UQL name.'));
      }
      return pickFromUql('name:' + input, input);
    }

    function byInput() {
      if (!input) return Promise.reject(new Error('Sem physicalId para busca UQL.'));
      if (/^prd-/i.test(input)) return byPrdName();
      return pickFromUql('name:' + input, input).catch(function () {
        return pickFromUql(input, input);
      });
    }

    function byTitle() {
      if (!titleHint) return Promise.reject(new Error('Sem titulo para busca UQL.'));
      return findEngItemByLabel(titleHint, 20, { expectedName: input, titleHint: titleHint });
    }

    if (/^prd-/i.test(input) && titleHint) {
      return byTitle().catch(byPrdName).catch(byInput);
    }
    if (/^prd-/i.test(input)) {
      return byPrdName().catch(byInput).catch(byTitle);
    }
    return byInput().catch(byTitle);
  }

  function resolveEngItemBomParentId(idOrMember) {
    var id =
      typeof idOrMember === 'object'
        ? apiId(idOrMember.id || idOrMember.physicalid || idOrMember.identifier)
        : apiId(idOrMember);
    if (!id) return Promise.resolve('');

    function pickCanonicalFromPrdName(prdName) {
      prdName = String(prdName || '').trim();
      if (!/^prd-/i.test(prdName)) return Promise.resolve(id);
      return getEngItemUqlSearch('name:' + prdName, 10)
        .then(function (res) {
          var exact = chooseExactEngItem(res, prdName, { expectedName: prdName });
          if (exact && (exact.id || exact.physicalid)) {
            return apiId(exact.id || exact.physicalid);
          }
          return id;
        })
        .catch(function () {
          return id;
        });
    }

    function probeEngInstance(parentId) {
      return getEngInstanceChildren(parentId, 0, 1).then(function (res) {
        var total =
          res && typeof res.totalItems === 'number'
            ? res.totalItems
            : extractMembers(res).length;
        if (total > 0) return parentId;
        return getEngItem(parentId)
          .then(function (itemRes) {
            var member = extractMembers(itemRes)[0] || itemRes;
            return pickCanonicalFromPrdName(member && member.name);
          })
          .catch(function () {
            return id;
          });
      });
    }

    return probeEngInstance(id).catch(function () {
      return getEngItem(id)
        .then(function (itemRes) {
          var member = extractMembers(itemRes)[0] || itemRes;
          var prdName = member && member.name;
          if (/^prd-/i.test(prdName)) return pickCanonicalFromPrdName(prdName);
          return id;
        })
        .catch(function () {
          return id;
        });
    });
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
  function getProductRoot(physicalId, expand, titleHint) {
    titleHint = String(titleHint || '').trim();
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
      return resolveEngItemMember(ids[i], titleHint || null)
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
    resolveEngItemMember: resolveEngItemMember,
    resolveEngItemBomParentId: resolveEngItemBomParentId,
    getProductRoot: getProductRoot,
    engItemUrl: engItemUrl,
    engInstanceChildrenUrl: engInstanceChildrenUrl,
    engInstanceDetailUrl: engInstanceDetailUrl,
    engItemExpandUrl: engItemExpandUrl,
    engItemExpandBody: engItemExpandBody,
    physicalProductUrl: physicalProductUrl,
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    preferEngBomApi: preferEngBomApi,
    preferEngChildrenForParent: preferEngChildrenForParent,
    isCloudPrdId: isCloudPrdId,
    expandEngItem: expandEngItem,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductChildren: getPhysicalProductChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemSearchUrl: engItemSearchUrl,
    engItemUqlSearchUrl: engItemUqlSearchUrl,
    getEngItemUqlSearch: getEngItemUqlSearch,
    findEngItemByLabel: findEngItemByLabel
  };
})();
