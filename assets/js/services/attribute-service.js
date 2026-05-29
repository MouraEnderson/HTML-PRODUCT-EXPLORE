/**
 * @file services/attribute-service.js
 * Extração de atributos de objetos ENOVIA.
 */
var AttributeService = (function () {
  'use strict';

  function pick(obj, keys, def) {
    def = def === undefined ? '' : def;
    if (!obj) return def;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
      if (obj[k.replace(':', '_')] !== undefined) return obj[k.replace(':', '_')];
    }
    return def;
  }

  function parseDate(val) {
    if (!val) return null;
    var d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  function normalizePid(id) {
    if (!id) return id;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return id;
  }

  function extractFromMember(member) {
    var ce = member['dseno:CustomerAttributes'] || member.customerAttributes || {};
    var eng = member['dseng:EnterpriseReference'] || member.enterpriseReference || {};

    return {
      physicalid: normalizePid(pick(member, ['physicalid', 'id'])),
      name: pick(member, ['name', 'dseno:name', 'title']),
      title: pick(member, ['title', 'dseno:title', 'name']),
      description: pick(member, ['description', 'dseno:description']),
      displayType: pick(member, ['displayType', 'dseno:displayType'], 'Physical Product'),
      type: pick(member, ['type', 'dseno:type', 'policy']),
      revision: pick(member, ['revision', 'dseno:revision', 'majorrevision']),
      state: pick(member, ['state', 'current', 'dseno:current', 'status']),
      maturity: pick(member, ['maturity', 'dseno:maturityState', 'state']),
      owner: pick(member, ['owner', 'dseno:owner', 'creator']),
      organization: pick(member, ['organization', 'dseno:organization']),
      collabSpace: pick(member, ['collabspace', 'dseno:collabspace', 'project']),
      policy: pick(member, ['policy', 'policyName']),
      modified: parseDate(pick(member, ['modified', 'dseno:modified', 'lastmodified'])),
      created: parseDate(pick(member, ['originated', 'created', 'dseno:created'])),
      approval: pick(ce, ['approval', 'dseno:approval', 'Approval Status'], pick(eng, ['approvalStatus'], 'Unknown')),
      engineeringState: pick(eng, ['engineeringState', 'state'], pick(member, ['state'], 'Unknown')),
      isAssembly: false,
      quantity: 1,
      level: 0,
      parentId: null,
      childrenIds: [],
      physicalProductIds: [],
      hasPhysicalProduct: false,
      duplicateKey: null
    };
  }

  function classifyMaturity(state) {
    var raw = String(state || '').trim();
    if (/^aprovado$/i.test(raw)) return 'released';
    var s = raw.toUpperCase();
    var cfg = APP_CONFIG.MATURITY_STATES;
    if (cfg.RELEASED.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'released';
    if (cfg.OBSOLETE.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'obsolete';
    if (cfg.IN_WORK.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'in_work';
    return 'other';
  }

  function isAssemblyType(type) {
    return APP_CONFIG.ASSEMBLY_TYPES.some(function (t) {
      return String(type || '').indexOf(t) >= 0;
    });
  }

  return {
    extractFromMember: extractFromMember,
    classifyMaturity: classifyMaturity,
    isAssemblyType: isAssemblyType
  };
})();
