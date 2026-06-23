/*
 * BOM Analytics — Fase 3 Geometry Resolver real.
 * No 3DPlay, no placeholder success, no hardcoded geometry.
 */
var BomGeometryResolver = (function (global) {
  'use strict';

  var ACCEPTED_FORMATS = ['glb', 'gltf', 'obj', 'stl', 'step', 'stp'];

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 4) return '[max-depth]';
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length > 500 ? value.slice(0, 500) + '...' : value;
    if (Array.isArray(value)) return value.slice(0, 50).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return String(value);
    var out = {};
    Object.keys(value).slice(0, 60).forEach(function (key) {
      if (!/cookie|token|authorization|password|secret|bearer|csrf/i.test(key)) out[key] = sanitize(value[key], depth + 1);
    });
    return out;
  }

  function record(step, ok, detail, evidence) {
    evidence.push({
      step: step,
      ok: !!ok,
      detail: sanitize(detail || {})
    });
  }

  function restBase() {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.ensureRestBase) return EnoviaApi.ensureRestBase();
    throw new Error('EnoviaApi.ensureRestBase indisponivel.');
  }

  function apiGet(url) {
    if (typeof WafClient === 'undefined' || !WafClient.get) {
      return Promise.reject(new Error('WafClient indisponivel para Geometry Resolver.'));
    }
    return WafClient.get(url);
  }

  function membersOf(response) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(response);
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.items)) return response.items;
    return [];
  }

  function idOf(object) {
    return text(object && (object.id || object.physicalid || object.physicalId || object.identifier));
  }

  function extOf(value) {
    var v = lower(value);
    var m = v.match(/\.([a-z0-9]+)(?:[?#].*)?$/);
    return m ? m[1] : '';
  }

  function looksLikeGeometryFile(object) {
    var name = text(object && (object.name || object.title || object.fileName || object.filename || object.label));
    var href = text(object && (object.href || object.url || object.downloadUrl || object.ticketURL || object.ticketUrl));
    var format = lower(object && (object.format || object.fileType || object.extension || object.mimeType || object.type));
    var ext = extOf(name) || extOf(href) || format.replace(/^\./, '');
    return ACCEPTED_FORMATS.indexOf(ext) >= 0 || /model\/gltf|mesh|stl|obj|step|stp/i.test(format);
  }

  function walkObjects(value, visit, seen, depth) {
    seen = seen || [];
    depth = depth || 0;
    if (!value || typeof value !== 'object' || depth > 8 || seen.indexOf(value) >= 0) return;
    seen.push(value);
    if (!Array.isArray(value)) visit(value);
    if (Array.isArray(value)) {
      value.forEach(function (item) { walkObjects(item, visit, seen, depth + 1); });
      return;
    }
    Object.keys(value).forEach(function (key) {
      if (!/cookie|token|authorization|password|secret|bearer|csrf/i.test(key)) {
        walkObjects(value[key], visit, seen, depth + 1);
      }
    });
  }

  function collectRepresentationCandidates(payload) {
    var out = [];
    var seen = {};
    function add(obj, source) {
      var id = idOf(obj);
      var type = text(obj && (obj.type || obj.displayType || obj.objectType));
      var label = text(obj && (obj.name || obj.title || obj.label || obj.displayName));
      if (!id && !label && !type) return;
      if (!/3DShape|VPMRepReference|EngRep|RepReference|Representation|CAD|Shape/i.test(type + ' ' + label)) return;
      var key = id || source + ':' + label + ':' + type;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ id: id, type: type, label: label, source: source, raw: sanitize(obj) });
    }
    walkObjects(payload, function (obj) { add(obj, 'payload-walk'); });
    return out;
  }

  function collectGeometryFiles(payload) {
    var out = [];
    var seen = {};
    walkObjects(payload, function (obj) {
      if (!looksLikeGeometryFile(obj)) return;
      var name = text(obj.name || obj.title || obj.fileName || obj.filename || obj.label || obj.id || 'geometry');
      var href = text(obj.href || obj.url || obj.downloadUrl || obj.ticketURL || obj.ticketUrl);
      var id = idOf(obj);
      var ext = extOf(name) || extOf(href) || lower(obj.format || obj.fileType || obj.extension || '');
      var key = id || href || name + ':' + ext;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ id: id, name: name, href: href, format: ext, raw: sanitize(obj) });
    });
    return out;
  }

  function tryUrl(url, label, evidence) {
    record(label + ':request', true, { url: url }, evidence);
    return apiGet(url)
      .then(function (payload) {
        record(label + ':response', true, { candidates: collectRepresentationCandidates(payload).length, files: collectGeometryFiles(payload).length }, evidence);
        return payload;
      })
      .catch(function (error) {
        record(label + ':response', false, { message: text(error && error.message), url: url }, evidence);
        return null;
      });
  }

  function candidateProbeUrls(referenceId, instanceId) {
    var base = restBase();
    var id = encodeURIComponent(referenceId);
    var urls = [];
    function push(url, label) { urls.push({ url: url, label: label }); }

    push(base + '/dseng/dseng:EngItem/' + id + '?$expand=dseng:EngRepInstance', 'engitem-expand-EngRepInstance');
    push(base + '/dseng/dseng:EngItem/' + id + '?$expand=dseng:EnterpriseReference', 'engitem-expand-EnterpriseReference');
    push(base + '/dsxcad/dsxcad:VPMReference/' + id + '?$expand=dsxcad:VPMRepReference', 'vpmreference-expand-VPMRepReference');
    push(base + '/dsxcad/dsxcad:VPMReference/' + id + '?$expand=dsxcad:3DShape', 'vpmreference-expand-3DShape');
    push(base + '/dsdo/dsdo:DerivedOutputs/Locate?referencedObject=' + id, 'dsdo-locate-referencedObject');
    push(base + '/dsdo/dsdo:DerivedOutputs/Locate?physicalid=' + id, 'dsdo-locate-physicalid');
    if (instanceId) push(base + '/dsdo/dsdo:DerivedOutputs/Locate?instance=' + encodeURIComponent(instanceId), 'dsdo-locate-instance');
    return urls;
  }

  function find3DGeometrySource(row) {
    row = row || {};
    var referenceId = text(row.referenceId || row.physicalid);
    var instanceId = text(row.instanceId);
    var evidence = [];
    var result = {
      lineClickReal: !!referenceId,
      referenceId: referenceId,
      instanceId: instanceId,
      representationFound: false,
      geometrySourceFound: false,
      viewerRenderedRealModel: false,
      format: '',
      blocker: '',
      candidates: [],
      files: [],
      evidence: evidence
    };

    if (!referenceId) {
      result.blocker = 'Selected row has no referenceId/physicalid.';
      record('input', false, { row: sanitize(row) }, evidence);
      return Promise.resolve(result);
    }
    record('input', true, { referenceId: referenceId, instanceId: instanceId }, evidence);

    var urls = candidateProbeUrls(referenceId, instanceId);
    var chain = Promise.resolve();
    urls.forEach(function (probe) {
      chain = chain.then(function () {
        if (result.geometrySourceFound) return null;
        return tryUrl(probe.url, probe.label, evidence).then(function (payload) {
          if (!payload) return;
          var reps = collectRepresentationCandidates(payload);
          var files = collectGeometryFiles(payload);
          result.candidates = result.candidates.concat(reps);
          result.files = result.files.concat(files);
          if (reps.length) result.representationFound = true;
          if (files.length) {
            result.geometrySourceFound = true;
            result.format = files[0].format || 'unknown';
          }
        });
      });
    });

    return chain.then(function () {
      if (!result.representationFound && result.candidates.length) result.representationFound = true;
      if (!result.geometrySourceFound) {
        result.blocker = 'No downloadable or convertible geometry source found';
        record('decision', false, {
          representationCandidates: result.candidates.length,
          geometryFiles: result.files.length,
          acceptedFormats: ACCEPTED_FORMATS
        }, evidence);
      } else {
        record('decision', true, {
          representationCandidates: result.candidates.length,
          geometryFiles: result.files.length,
          firstFile: result.files[0]
        }, evidence);
      }
      return result;
    });
  }

  return {
    find3DGeometrySource: find3DGeometrySource,
    collectRepresentationCandidates: collectRepresentationCandidates,
    collectGeometryFiles: collectGeometryFiles,
    __test: {
      looksLikeGeometryFile: looksLikeGeometryFile,
      candidateProbeUrls: candidateProbeUrls
    }
  };
})(window);
