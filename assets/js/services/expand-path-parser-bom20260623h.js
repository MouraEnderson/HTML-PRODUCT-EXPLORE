/*
 * Expand Item Path parser for 3DEXPERIENCE dseng payloads.
 * Converts flat member[] + Path[] payloads into occurrence rows before the
 * official session controller normalizes/render them.
 *
 * Contract:
 *   Path = [rootReferenceId, instanceId, childReferenceId, ..., instanceId, referenceId]
 *   referenceId       = last Path item
 *   instanceId        = penultimate Path item
 *   parentReferenceId = item before instanceId
 *   level             = (Path.length - 1) / 2
 *
 * This is not a fallback source, not DOM scraping, and not a parallel finalizer.
 */
(function (global) {
  'use strict';

  var PATCHED = '__BOM_EXPAND_PATH_PARSER_20260623H__';
  if (global[PATCHED]) return;
  global[PATCHED] = true;

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function typeOf(member) {
    return text(member && (member.type || member.displayType || member.objectType));
  }

  function idOf(member) {
    return text(member && (member.id || member.physicalid || member.physicalId || member.identifier));
  }

  function isReference(member) {
    var type = typeOf(member);
    return /VPMReference|EngItem|dseng:EngItem|Reference/i.test(type) && !!idOf(member);
  }

  function isInstance(member) {
    var type = typeOf(member);
    return /VPMInstance|EngInstance|Instance/i.test(type) && !!idOf(member);
  }

  function normalizeState(value) {
    var raw = text(value);
    if (!raw) return '';
    var key = raw.replace(/[\s_-]+/g, '').toLowerCase();
    if (/^(released|approved|frozen|aprovado)$/.test(key)) return 'Aprovado';
    if (/^(inwork|working|work|emtrabalho)$/.test(key)) return 'Em Trabalho';
    if (/^(obsolete|obsoleto)$/.test(key)) return 'Obsoleto';
    return raw;
  }

  function indexMembers(members, predicate) {
    var out = {};
    (members || []).forEach(function (member) {
      if (!predicate(member)) return;
      var id = idOf(member);
      if (id && !out[id]) out[id] = member;
    });
    return out;
  }

  function pathOf(member) {
    if (!isObject(member)) return null;
    var p = member.Path || member.path || member.PATH;
    return Array.isArray(p) ? p.map(text).filter(Boolean) : null;
  }

  function extractPaths(members) {
    var paths = [];
    (members || []).forEach(function (member, index) {
      var p = pathOf(member);
      if (!p || p.length < 3) return;
      paths.push({ path: p, index: index, raw: member });
    });
    return paths;
  }

  function firstOf() {
    for (var i = 0; i < arguments.length; i++) {
      var v = text(arguments[i]);
      if (v) return v;
    }
    return '';
  }

  function cloneReference(reference, referenceId) {
    reference = reference || {};
    var title = firstOf(reference.title, reference.label, reference.displayName, reference.name, referenceId);
    var state = firstOf(reference.state, reference.current, reference.status, reference.maturity);
    var maturity = normalizeState(firstOf(reference.maturity, reference.maturityState, state));
    return {
      id: referenceId,
      physicalid: referenceId,
      physicalId: referenceId,
      name: firstOf(reference.name, title, referenceId),
      title: title,
      label: firstOf(reference.label, title),
      displayName: firstOf(reference.displayName, title),
      revision: firstOf(reference.revision, reference.majorrevision, reference.majorRevision, reference.version),
      owner: firstOf(reference.owner, reference.responsible, reference.creator, reference.createdBy),
      state: maturity || state,
      maturity: maturity || state,
      description: firstOf(reference.description, reference.subtitle, reference.comment),
      type: firstOf(reference.type, 'VPMReference'),
      displayType: firstOf(reference.displayType, reference.type, 'VPMReference'),
      rawReference: reference
    };
  }

  function makeOccurrence(pathEntry, refsById, instById) {
    var path = pathEntry.path;
    var referenceId = text(path[path.length - 1]);
    var instanceId = text(path[path.length - 2]);
    var parentReferenceId = text(path[path.length - 3]);
    var level = Math.max(1, Math.floor((path.length - 1) / 2));
    var reference = refsById[referenceId] || {};
    var instance = instById[instanceId] || {};
    var refMeta = cloneReference(reference, referenceId);
    var instanceName = firstOf(instance.name, instance.title, refMeta.title, referenceId);

    return {
      id: instanceId,
      physicalid: instanceId,
      physicalId: instanceId,
      type: 'VPMInstance',
      displayType: firstOf(instance.displayType, instance.type, 'VPMInstance'),
      objectType: 'VPMInstance',
      name: instanceName,
      title: refMeta.title,
      label: refMeta.label,
      instanceId: instanceId,
      relationshipId: instanceId,
      relId: instanceId,
      instancePhysicalId: instanceId,
      referenceId: referenceId,
      referencePhysicalId: referenceId,
      parentReferenceId: parentReferenceId,
      parentId: parentReferenceId,
      parentPhysicalId: parentReferenceId,
      level: level,
      depth: level,
      path: path.join('/'),
      instancePath: path.join('/'),
      treePath: path.join('/'),
      revision: refMeta.revision,
      owner: refMeta.owner,
      state: refMeta.state,
      maturity: refMeta.maturity || refMeta.state,
      description: refMeta.description,
      quantity: 1,
      referencedObject: refMeta,
      referredObject: refMeta,
      reference: refMeta,
      _bomPathIndex: pathEntry.index,
      _bomPath: path,
      _bomInstanceRaw: instance,
      _bomReferenceRaw: reference
    };
  }

  function normalizePayload(payload) {
    if (!payload || !Array.isArray(payload.member)) return payload;
    var members = payload.member;
    var paths = extractPaths(members);
    if (!paths.length) return payload;

    var refsById = indexMembers(members, isReference);
    var instById = indexMembers(members, isInstance);
    var generated = [];
    var seenOccurrence = {};

    paths.forEach(function (entry) {
      var path = entry.path;
      var referenceId = text(path[path.length - 1]);
      var instanceId = text(path[path.length - 2]);
      if (!referenceId || !instanceId) return;
      var occurrenceKey = path.join('>');
      if (seenOccurrence[occurrenceKey]) return;
      seenOccurrence[occurrenceKey] = true;
      generated.push(makeOccurrence(entry, refsById, instById));
    });

    if (!generated.length) return payload;

    return {
      member: generated,
      totalItems: generated.length,
      nlsLabel: payload.nlsLabel || {},
      _bomPathParser: {
        version: 'bom20260623h',
        strategy: 'member.Path -> occurrence rows',
        originalTotalItems: payload.totalItems || members.length,
        originalMemberCount: members.length,
        pathCount: paths.length,
        generatedOccurrenceCount: generated.length,
        maxLevel: generated.reduce(function (max, item) { return Math.max(max, Number(item.level) || 0); }, 0)
      }
    };
  }

  function install() {
    if (!global.EnoviaApi || !global.EnoviaApi.expandEngItem || global.EnoviaApi.__BOM_PATH_PARSER_PATCHED__) return false;
    var original = global.EnoviaApi.expandEngItem.bind(global.EnoviaApi);
    global.EnoviaApi.expandEngItem = function () {
      return original.apply(global.EnoviaApi, arguments).then(function (payload) {
        var normalized = normalizePayload(payload);
        if (global.console && console.info && normalized && normalized._bomPathParser) {
          console.info('[BOM Path Parser]', normalized._bomPathParser);
        }
        return normalized;
      });
    };
    global.EnoviaApi.__BOM_PATH_PARSER_PATCHED__ = true;
    return true;
  }

  install();

  global.BomExpandPathParser = {
    install: install,
    normalizePayload: normalizePayload,
    extractPaths: extractPaths
  };
})(window);
