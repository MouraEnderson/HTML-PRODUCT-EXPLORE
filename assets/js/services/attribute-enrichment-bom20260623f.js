/*
 * BOM attribute enrichment for real dseng expand payloads.
 * Scope: enrich rows already loaded by the official WAFData controller.
 * Does not create new flows, does not use DOM scraping, does not use 3DPlay.
 */
(function (global) {
  'use strict';

  var PATCHED = '__BOM_ATTRIBUTE_ENRICHMENT_20260623F__';
  if (global[PATCHED]) return;
  global[PATCHED] = true;

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function lowerKey(key) {
    return String(key || '').replace(/[\s_:-]+/g, '').toLowerCase();
  }

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function isSecretKey(key) {
    return /cookie|token|authorization|password|secret|bearer|csrf/i.test(String(key || ''));
  }

  function isMissing(value) {
    var v = text(value);
    return !v || v === '-' || v === '—' || /^sem\s+/i.test(v) || /^unknown$/i.test(v) || /^n\/a$/i.test(v);
  }

  function normalizePerson(value) {
    if (value == null) return '';
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var one = normalizePerson(value[i]);
        if (one) return one;
      }
      return '';
    }
    if (isObject(value)) {
      var firstLast = text(value.firstName || value.firstname) + ' ' + text(value.lastName || value.lastname);
      return text(value.displayName || value.fullName || value.label || value.name || value.title || firstLast);
    }
    var raw = text(value);
    if (!raw) return '';
    if (raw.charAt(0) === '{') {
      try { return normalizePerson(JSON.parse(raw)); } catch (e) { /* ignore */ }
    }
    if (/^[0-9A-F]{24,64}$/i.test(raw) || /^prd-R/i.test(raw)) return '';
    return raw;
  }

  function normalizeRevision(value) {
    if (value == null) return '';
    if (isObject(value)) return text(value.value || value.displayValue || value.label || value.name || value.revision || value.majorrevision);
    return text(value);
  }

  function normalizeMaturity(value) {
    if (value == null) return '';
    if (isObject(value)) {
      return normalizeMaturity(value.displayValue || value.label || value.title || value.name || value.current || value.state || value.value);
    }
    var raw = text(value);
    if (!raw) return '';
    var key = raw.replace(/[\s_-]+/g, '').toLowerCase();
    if (/^(approved|released|frozen|aprovado)$/.test(key)) return 'Aprovado';
    if (/^(inwork|emtrabalho|working|work)$/.test(key)) return 'Em Trabalho';
    if (/^(obsolete|obsoleto)$/.test(key)) return 'Obsoleto';
    return raw;
  }

  function normalizeDescription(value) {
    if (value == null) return '';
    if (isObject(value)) return text(value.value || value.displayValue || value.label || value.description || value.title || value.name);
    return text(value);
  }

  function findByKeys(root, keys, normalizer) {
    var wanted = {};
    keys.forEach(function (k) { wanted[lowerKey(k)] = true; });
    var seen = [];
    var found = '';

    function visit(value, depth) {
      if (found || value == null || depth > 8) return;
      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) visit(value[i], depth + 1);
        return;
      }
      if (!isObject(value)) return;
      if (seen.indexOf(value) >= 0) return;
      seen.push(value);

      var nameKey = text(value.name || value.key || value.attributeName || value.property || value.label);
      if (nameKey && wanted[lowerKey(nameKey)]) {
        found = normalizer(value.value || value.displayValue || value.label || value.title || value.name);
        if (found) return;
      }

      var objectKeys = Object.keys(value);
      for (var j = 0; j < objectKeys.length; j++) {
        var key = objectKeys[j];
        if (isSecretKey(key)) continue;
        if (wanted[lowerKey(key)]) {
          found = normalizer(value[key]);
          if (found) return;
        }
      }
      for (var z = 0; z < objectKeys.length; z++) {
        var childKey = objectKeys[z];
        if (!isSecretKey(childKey)) visit(value[childKey], depth + 1);
        if (found) return;
      }
    }

    visit(root, 0);
    return found;
  }

  function firstFromRoots(roots, keys, normalizer) {
    for (var i = 0; i < roots.length; i++) {
      var value = findByKeys(roots[i], keys, normalizer);
      if (value) return value;
    }
    return '';
  }

  function referencedObject(raw) {
    raw = raw || {};
    return raw.referencedObject || raw.referredObject || raw.reference || raw['dseng:EngItem'] || raw.member || null;
  }

  function enrichRow(row) {
    if (!row || typeof row !== 'object') return row;
    var raw = row.raw || {};
    var refObj = referencedObject(raw);
    var roots = [refObj, raw, raw.member, row].filter(Boolean);

    var refId = firstFromRoots([refObj, raw], [
      'referenceId', 'referencedObjectId', 'referencePhysicalId', 'physicalid', 'physicalId', 'id', 'identifier'
    ], text);
    if (isMissing(row.referenceId) && refId && refId !== row.instanceId) {
      row.referenceId = refId;
      if (isMissing(row.physicalid)) row.physicalid = refId;
    }

    var title = firstFromRoots(roots, ['title', 'label', 'displayName', 'name'], text);
    if (isMissing(row.title) && title) row.title = title;
    if (isMissing(row.name) && title) row.name = title;

    var revision = firstFromRoots(roots, [
      'revision', 'majorrevision', 'majorRevision', 'dseno:revision', 'dseng:revision', 'rev', 'version'
    ], normalizeRevision);
    if (isMissing(row.revision) && revision) row.revision = revision;

    var owner = firstFromRoots(roots, [
      'owner', 'dseno:owner', 'ownedBy', 'ownerInfo', 'responsible', 'creator', 'createdBy', 'originator'
    ], normalizePerson);
    if (isMissing(row.owner) && owner) row.owner = owner;

    var maturity = firstFromRoots(roots, [
      'maturity', 'maturityState', 'dseno:maturityState', 'state', 'current', 'currentState', 'dseno:current', 'status', 'lifecycleState'
    ], normalizeMaturity);
    if (isMissing(row.maturity) && maturity) row.maturity = maturity;
    if (isMissing(row.state) && maturity) row.state = maturity;

    var description = firstFromRoots(roots, [
      'description', 'dseno:description', 'subtitle', 'comment', 'comments'
    ], normalizeDescription);
    if (isMissing(row.description) && description) row.description = description;

    var type = firstFromRoots(roots, ['type', 'displayType', 'objectType'], text);
    if (isMissing(row.type) && type) row.type = type;

    return row;
  }

  function enrichRowsSync(rows) {
    (rows || []).forEach(enrichRow);
    return rows;
  }

  function isEngItemId(id) {
    return /^[0-9A-F]{24,64}$/i.test(text(id));
  }

  function uniqueReferenceIds(rows) {
    var seen = {};
    var ids = [];
    (rows || []).forEach(function (row) {
      var id = text(row && row.referenceId);
      if (!isEngItemId(id) || seen[id]) return;
      if (!isMissing(row.owner) && !isMissing(row.maturity) && !isMissing(row.revision)) return;
      seen[id] = true;
      ids.push(id);
    });
    return ids.slice(0, 120);
  }

  function memberFromPayload(payload) {
    if (!payload) return null;
    if (Array.isArray(payload.member) && payload.member.length) return payload.member[0];
    if (payload.member && typeof payload.member === 'object') return payload.member;
    if (payload.id || payload.physicalid || payload.physicalId) return payload;
    return null;
  }

  function applyEngItemAttributes(rows, id, payload) {
    var member = memberFromPayload(payload);
    if (!member) return;
    var tmp = { raw: member };
    enrichRow(tmp);
    (rows || []).forEach(function (row) {
      if (text(row.referenceId) !== id) return;
      if (isMissing(row.owner) && tmp.owner) row.owner = tmp.owner;
      if (isMissing(row.maturity) && tmp.maturity) row.maturity = tmp.maturity;
      if (isMissing(row.state) && tmp.state) row.state = tmp.state;
      if (isMissing(row.revision) && tmp.revision) row.revision = tmp.revision;
      if (isMissing(row.description) && tmp.description) row.description = tmp.description;
      if (isMissing(row.title) && tmp.title) row.title = tmp.title;
      if (isMissing(row.name) && tmp.name) row.name = tmp.name;
    });
  }

  function refreshAnalytics(rows) {
    try {
      if (global.DataTable && global.DataTable.setData && global.DataTable.__BOM_ORIGINAL_SETDATA__) {
        global.DataTable.__BOM_ORIGINAL_SETDATA__(rows);
      }
      var metrics = global.MetricsEngine && global.MetricsEngine.computeFromFlat
        ? global.MetricsEngine.computeFromFlat(rows || [])
        : null;
      if (metrics && global.KpiCards) {
        global.KpiCards.init('#kpiGrid');
        global.KpiCards.render(metrics, []);
      }
      if (metrics && global.ChartsManager) global.ChartsManager.render(metrics);
    } catch (e) {
      if (global.console && console.warn) console.warn('[BOM attributes] refresh failed', e);
    }
  }

  function enrichRowsAsync(rows) {
    if (!global.EnoviaApi || !global.EnoviaApi.getEngItem) return;
    var ids = uniqueReferenceIds(rows);
    if (!ids.length) return;
    var idx = 0;
    var changed = false;
    function next() {
      if (idx >= ids.length) {
        if (changed) refreshAnalytics(rows);
        return Promise.resolve();
      }
      var id = ids[idx++];
      return Promise.resolve(global.EnoviaApi.getEngItem(id))
        .then(function (payload) {
          applyEngItemAttributes(rows, id, payload);
          changed = true;
        })
        .catch(function () { /* attribute enrichment is best-effort, not a data-source fallback */ })
        .then(next);
    }
    next();
  }

  function patchAttributeService() {
    if (!global.AttributeService || !global.AttributeService.extractFromMember || global.AttributeService.__BOM_ENRICH_PATCHED__) return;
    var original = global.AttributeService.extractFromMember;
    global.AttributeService.extractFromMember = function (member) {
      var base = original(member) || {};
      base.raw = member;
      enrichRow(base);
      delete base.raw;
      return base;
    };
    global.AttributeService.__BOM_ENRICH_PATCHED__ = true;
  }

  function patchDataTable() {
    if (!global.DataTable || !global.DataTable.setData || global.DataTable.__BOM_ENRICH_PATCHED__) return;
    var originalSetData = global.DataTable.setData.bind(global.DataTable);
    global.DataTable.__BOM_ORIGINAL_SETDATA__ = originalSetData;
    global.DataTable.setData = function (rows) {
      enrichRowsSync(rows || []);
      originalSetData(rows || []);
      global.setTimeout(function () { enrichRowsAsync(rows || []); }, 0);
    };
    global.DataTable.__BOM_ENRICH_PATCHED__ = true;
  }

  function install() {
    patchAttributeService();
    patchDataTable();
  }

  install();

  global.BomAttributeEnrichment = {
    install: install,
    enrichRow: enrichRow,
    enrichRowsSync: enrichRowsSync,
    enrichRowsAsync: enrichRowsAsync
  };
})(window);
