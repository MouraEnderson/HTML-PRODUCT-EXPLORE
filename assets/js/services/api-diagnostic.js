/**
 * @file services/api-diagnostic.js
 * Diagnostico isolado: WAFData, Compass, 3DSpace e dseng sem fallback de estrutura.
 */
var ApiDiagnostic = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : global;
  var lastReport = null;

  function push(entry) {
    if (!window.__3DX_API_DIAG__) window.__3DX_API_DIAG__ = [];
    window.__3DX_API_DIAG__.push(entry);
    return entry;
  }

  function parseStatus(text) {
    var s = String(text || '');
    var m = s.match(/\b(400|401|403|404|406|409|412|500|502|503)\b/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/ResponseCode[^0-9]*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function summarizeExtra(extra) {
    if (!extra) return '';
    var parts = [];
    if (extra.url) parts.push('url=' + extra.url);
    if (extra.status) parts.push('status=' + extra.status);
    if (extra.count != null) parts.push('count=' + extra.count);
    if (extra.total != null) parts.push('total=' + extra.total);
    if (extra.hasNext != null) parts.push('hasNext=' + extra.hasNext);
    return parts.length ? ' [' + parts.join(' | ') + ']' : '';
  }

  function log(step, ok, detail, extra) {
    var row = {
      ts: new Date().toISOString(),
      step: step,
      ok: !!ok,
      detail: String(detail || ''),
      extra: extra || null
    };
    push(row);
    return row;
  }

  function wafOk() {
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return true;
      }
    } catch (e) { /* */ }
    return false;
  }

  function getWAFData() {
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return widget.WAFData;
      }
    } catch (e) { /* */ }
    return null;
  }

  function ctxSnapshot() {
    if (typeof ExplorerContext === 'undefined' || !ExplorerContext.refresh) {
      return null;
    }
    return ExplorerContext.refresh(true);
  }

  function formatReport(rows) {
    return rows
      .map(function (r) {
        return (r.ok ? 'OK' : 'FAIL') + '  ' + r.step + ' - ' + r.detail + summarizeExtra(r.extra);
      })
      .join('\n');
  }

  function extractMembers(response) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) {
      return EnoviaApi.extractMembers(response);
    }
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    return [];
  }

  function shortJson(value) {
    if (value == null) return '';
    try {
      var s = typeof value === 'string' ? value : JSON.stringify(value);
      return s.length > 220 ? s.slice(0, 220) + '...' : s;
    } catch (e) {
      return String(value).slice(0, 220);
    }
  }

  function payloadShape(value) {
    if (value == null) return 'null';
    if (typeof value === 'string') return 'string(' + value.length + ')';
    if (Array.isArray(value)) return 'array(' + value.length + ')';
    if (typeof value === 'object') {
      var keys = Object.keys(value).slice(0, 8);
      return 'object{' + keys.join(',') + '}';
    }
    return typeof value;
  }

  function responseTotal(response, count) {
    if (!response) return count || 0;
    return response.totalItems || response.total || response.count || count || 0;
  }

  function requestStep(step, url, requestFn, inspectFn) {
    log(step + ' URL', true, url, { url: url });
    return requestFn()
      .then(function (res) {
        var extra = inspectFn ? inspectFn(res) : {};
        extra = extra || {};
        extra.url = url;
        extra.status = extra.status || 200;
        return log(step + ' GET', true, extra.detail || 'OK', extra);
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : String(err || 'erro');
        return log(step + ' GET', false, msg, { url: url, status: parseStatus(msg) });
      });
  }

  function rawWafCall(step, url, reqOptions) {
    reqOptions = reqOptions || {};
    var WAF = getWAFData();
    if (!WAF || !WAF.authenticatedRequest) {
      return Promise.resolve({
        row: log(step, false, 'WAFData indisponivel', { url: url }),
        data: null,
        error: null
      });
    }
    return new Promise(function (resolve) {
      var timeoutMs = reqOptions.timeoutMs || 12000;
      var settled = false;
      function finish(row, data, error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({ row: row, data: data || null, error: error || null });
      }
      var timer = window.setTimeout(function () {
        finish(log(step, false, 'timeout ' + timeoutMs + 'ms', { url: url }), null, 'timeout');
      }, timeoutMs);

      var opts = {
        method: reqOptions.method || 'GET',
        onComplete: function (data) {
          var row = log(
            step,
            true,
            'OK ' + payloadShape(data),
            {
              url: url,
              status: 200,
              type: reqOptions.type || '',
              responseType: reqOptions.responseType || '',
              sample: shortJson(data)
            }
          );
          finish(row, data);
        },
        onFailure: function (err) {
          var raw = shortJson(err);
          var msg =
            (err && (err.message || err.error || err.statusText || err.responseText)) ||
            raw ||
            'WAF request failed';
          var row = log(
            step,
            false,
            msg,
            {
              url: url,
              status: parseStatus(msg) || (err && (err.status || err.responseCode)) || null,
              type: reqOptions.type || '',
              responseType: reqOptions.responseType || '',
              raw: raw
            }
          );
          finish(row, null, err);
        }
      };
      if (reqOptions.headers) opts.headers = reqOptions.headers;
      if (reqOptions.type) opts.type = reqOptions.type;
      if (reqOptions.responseType) opts.responseType = reqOptions.responseType;
      if (reqOptions.data) opts.data = reqOptions.data;
      try {
        WAF.authenticatedRequest(url, opts);
      } catch (e) {
        finish(log(step, false, e.message || String(e), { url: url }), null, e);
      }
    });
  }

  function rawWafRequest(step, url, reqOptions) {
    return rawWafCall(step, url, reqOptions).then(function (result) {
      return result.row;
    });
  }

  function minimalHeaders() {
    var h = { Accept: 'application/json' };
    try {
      var st = typeof PlatformContext !== 'undefined' && PlatformContext.getState && PlatformContext.getState();
      if (st && st.securityContext) h.SecurityContext = st.securityContext;
    } catch (e) { /* */ }
    return h;
  }

  function fullHeaders() {
    if (typeof PlatformContext !== 'undefined' && PlatformContext.getHeaders) {
      return PlatformContext.getHeaders();
    }
    return minimalHeaders();
  }

  function probeCompass(rows) {
    if (typeof CompassServices === 'undefined') {
      rows.push(log('CompassServices', false, 'modulo indisponivel'));
      return Promise.resolve(null);
    }
    var platformState =
      typeof PlatformContext !== 'undefined' &&
      PlatformContext.getState &&
      PlatformContext.getState();
    var platformId = platformState && platformState.platformId;

    rows.push(log('platformId', !!platformId, platformId || 'sem platformId'));

    return CompassServices.get3DSpaceUrl(platformId)
      .then(function (raw) {
        rows.push(log('Compass getServiceUrl(3DSpace)', !!raw, raw || 'sem URL', { url: raw || '' }));
        return CompassServices.ensureWorkingSpaceUrl(platformId).then(function (space) {
          var isIfwe =
            space &&
            APP_CONFIG &&
            APP_CONFIG.TENANT_DEFAULTS &&
            APP_CONFIG.TENANT_DEFAULTS.platformHost &&
            String(space).indexOf(APP_CONFIG.TENANT_DEFAULTS.platformHost) >= 0;
          rows.push(
            log(
              '3DSpace verificado',
              !!space && !isIfwe,
              isIfwe ? 'URL aponta para IFWE; nao usar como 3DSpace' : (space || 'sem URL'),
              { url: space || '' }
            )
          );
          return space;
        });
      })
      .catch(function (err) {
        rows.push(log('Compass/3DSpace', false, err.message || String(err)));
        return null;
      });
  }

  function probeRawModelerVariants(rows, urls) {
    urls = urls || {};
    var jobs = [];
    if (urls.csrf) {
      jobs.push(function () { return rawWafRequest('RAW CSRF json minimal', urls.csrf, {
        type: 'json',
        headers: { Accept: 'application/json' }
      }); });
      jobs.push(function () { return rawWafRequest('RAW CSRF text minimal', urls.csrf, {
        type: 'text',
        responseType: 'text',
        headers: { Accept: 'text/plain,application/json,*/*' }
      }); });
    }
    if (urls.engItem) {
      jobs.push(function () { return rawWafRequest('RAW EngItem json minimal', urls.engItem, {
        type: 'json',
        headers: minimalHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngItem json full headers', urls.engItem, {
        type: 'json',
        headers: fullHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngItem text minimal', urls.engItem, {
        type: 'text',
        responseType: 'text',
        headers: minimalHeaders()
      }); });
    }
    if (urls.engInstance) {
      jobs.push(function () { return rawWafRequest('RAW EngInstance json minimal', urls.engInstance, {
        type: 'json',
        headers: minimalHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngInstance text minimal', urls.engInstance, {
        type: 'text',
        responseType: 'text',
        headers: minimalHeaders()
      }); });
    }
    if (!jobs.length) return Promise.resolve();
    rows.push(log('RAW WAF variants', true, jobs.length + ' request(s) controladas'));
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return job().then(function (row) {
          rows.push(row);
        });
      });
    }, Promise.resolve());
  }

  function modelerBaseUrl() {
    if (typeof CompassServices === 'undefined' || !CompassServices.getVerifiedSpaceUrl) return '';
    var space = CompassServices.getVerifiedSpaceUrl();
    return space ? String(space).replace(/\/$/, '') + '/resources/v1/modeler' : '';
  }

  function addPrdMatches(text, out, seen) {
    var re = /prd-R[0-9]+-[A-Za-z0-9._-]+/g;
    var m;
    while ((m = re.exec(String(text || '')))) {
      if (!seen[m[0]]) {
        seen[m[0]] = true;
        out.push({ id: m[0], type: '', name: '' });
      }
    }
  }

  function isUsableCandidateId(value) {
    if (value == null) return false;
    var s = String(value);
    if (!s || s.length < 8 || s.length > 180) return false;
    if (/^https?:\/\//i.test(s)) return false;
    if (/[{}[\]\s]/.test(s)) return false;
    if (s.indexOf('/') >= 0) return false;
    return true;
  }

  function candidateFromObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var id =
      obj.physicalid ||
      obj.physicalId ||
      obj.objectId ||
      obj.resourceid ||
      obj.resourceId ||
      obj.pid ||
      obj.id;
    if (!isUsableCandidateId(id)) return null;
    return {
      id: String(id),
      type: String(obj.type || obj.displayType || obj.kind || obj['@type'] || ''),
      name: String(obj.name || ''),
      title: String(obj.title || obj.label || ''),
      description: String(obj.description || '')
    };
  }

  function collectCandidates(value, out, seen, depth) {
    out = out || [];
    seen = seen || {};
    depth = depth || 0;
    if (value == null || depth > 5) return out;
    if (typeof value === 'string') {
      addPrdMatches(value, out, seen);
      return out;
    }
    if (Array.isArray(value)) {
      value.slice(0, 40).forEach(function (item) {
        collectCandidates(item, out, seen, depth + 1);
      });
      return out;
    }
    if (typeof value === 'object') {
      var direct = candidateFromObject(value);
      if (direct && !seen[direct.id]) {
        seen[direct.id] = true;
        out.push(direct);
      }
      Object.keys(value).slice(0, 80).forEach(function (key) {
        collectCandidates(value[key], out, seen, depth + 1);
      });
    }
    return out;
  }

  function mergeCandidates(target, candidates, seen) {
    candidates.forEach(function (candidate) {
      if (candidate && candidate.id && !seen[candidate.id]) {
        seen[candidate.id] = true;
        target.push(candidate);
      }
    });
  }

  function mergePriorityCandidates(primary, secondary) {
    var out = [];
    var seen = {};
    [primary || [], secondary || []].forEach(function (list) {
      list.forEach(function (candidate) {
        if (candidate && candidate.id && !seen[candidate.id]) {
          seen[candidate.id] = true;
          out.push(candidate);
        }
      });
    });
    return out;
  }

  function candidateSummary(candidates) {
    if (!candidates || !candidates.length) return 'nenhum ID candidato encontrado';
    return candidates.slice(0, 6).map(function (c) {
      var label = c.name || c.title || c.description || '';
      return c.id + (c.type ? ' (' + c.type + ')' : '') + (label ? ' ' + label : '');
    }).join('; ');
  }

  function memberSummary(data) {
    var members = extractMembers(data);
    if (!members.length) return 'member=0; sample=' + shortJson(data);
    return 'member=' + members.length + '; sample=' + shortJson(members.slice(0, 2));
  }

  function lc(value) {
    return String(value || '').toLowerCase();
  }

  function candidateMatches(candidate, terms) {
    var fields = [
      candidate.id,
      candidate.name,
      candidate.title,
      candidate.description,
      candidate.type
    ].map(lc);
    return terms.some(function (term) {
      var t = lc(term);
      if (!t) return false;
      return fields.some(function (field) {
        return field === t || field.indexOf(t) >= 0;
      });
    });
  }

  function collectExactCandidates(data, terms) {
    var out = [];
    var seen = {};
    extractMembers(data).forEach(function (member) {
      var candidate = candidateFromObject(member);
      if (candidate && !seen[candidate.id] && candidateMatches(candidate, terms)) {
        seen[candidate.id] = true;
        out.push(candidate);
      }
    });
    return out;
  }

  function buildResolutionJobs(spaceBase, term, physicalId) {
    var jobs = [];
    var encodedTerm = encodeURIComponent(term || '');
    if (physicalId) {
      jobs.push({
        step: 'RAW PhysicalProduct direct',
        url: spaceBase + '/dspfl/dspfl:PhysicalProduct/' + encodeURIComponent(physicalId)
      });
      jobs.push({
        step: 'RAW VPMReference direct',
        url: spaceBase + '/dsxcad/dsxcad:VPMReference/' + encodeURIComponent(physicalId)
      });
    }
    if (encodedTerm) {
      jobs.push({
        step: 'RAW modeler search searchStr',
        url: spaceBase + '/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW modeler search q',
        url: spaceBase + '/search?q=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW PhysicalProduct search',
        url: spaceBase + '/dspfl/dspfl:PhysicalProduct/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem search',
        url: spaceBase + '/dseng/dseng:EngItem/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem UQL label root',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('label:"' + term + '"') + '&$top=20'
      });
      jobs.push({
        step: 'RAW EngItem UQL name root',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('name:"' + term + '"') + '&$top=20'
      });
      jobs.push({
        step: 'RAW VPMReference search',
        url: spaceBase + '/dsxcad/dsxcad:VPMReference/search?searchStr=' + encodedTerm + '&$top=10'
      });
    }
    if (physicalId) {
      jobs.push({
        step: 'RAW EngItem search physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?searchStr=' + encodeURIComponent(physicalId) + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem $searchStr physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' + encodeURIComponent(physicalId) + '&$top=20'
      });
      jobs.push({
        step: 'RAW EngItem UQL name physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('name:' + physicalId) + '&$top=20'
      });
    }
    return jobs;
  }

  function probeCandidateEngItems(rows, candidates, originalPhysicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.engItemUrl) return Promise.resolve();
    var seen = {};
    var ids = candidates
      .map(function (candidate) { return candidate.id; })
      .filter(function (id) {
        if (!id || id === originalPhysicalId || seen[id]) return false;
        seen[id] = true;
        return true;
      })
      .slice(0, 3);
    if (!ids.length) {
      rows.push(log('RAW Candidate EngItem', false, 'nenhum candidato alternativo para testar'));
      return Promise.resolve();
    }
    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        return rawWafCall('RAW Candidate EngItem ' + id, EnoviaApi.engItemUrl(id), {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          rows.push(result.row);
          if (result.row.ok) {
            rows.push(log('RAW Candidate EngItem ' + id + ' payload', true, memberSummary(result.data), {
              url: EnoviaApi.engItemUrl(id),
              count: extractMembers(result.data).length
            }));
          }
          if (!EnoviaApi.engInstanceChildrenUrl) return null;
          var childUrl = EnoviaApi.engInstanceChildrenUrl(id, 0, 5);
          return rawWafCall('RAW Candidate EngInstance ' + id, childUrl, {
            type: 'json',
            headers: minimalHeaders()
          }).then(function (childResult) {
            rows.push(childResult.row);
            if (childResult.row.ok) {
              rows.push(log('RAW Candidate EngInstance ' + id + ' payload', true, memberSummary(childResult.data), {
                url: childUrl,
                count: extractMembers(childResult.data).length,
                total: responseTotal(childResult.data, extractMembers(childResult.data).length)
              }));
            }
          });
        });
      });
    }, Promise.resolve());
  }

  function probeObjectResolution(rows, ctx, physicalId) {
    var base = modelerBaseUrl();
    if (!base) {
      rows.push(log('RAW object resolution', false, '3DSpace/modeler base indisponivel'));
      return Promise.resolve();
    }
    var term = (ctx && (ctx.rootName || ctx.title || ctx.name)) || '';
    var jobs = buildResolutionJobs(base, term, physicalId);
    var candidates = [];
    var exactCandidates = [];
    var seen = {};
    var exactSeen = {};
    var exactTerms = [physicalId, term].filter(function (v) { return !!v; });
    rows.push(log('RAW object resolution', true, jobs.length + ' request(s) de resolucao'));
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return rawWafCall(job.step, job.url, {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          var found = collectCandidates(result.data);
          rows.push(result.row);
          if (result.row.ok) {
            var exact = collectExactCandidates(result.data, exactTerms);
            mergeCandidates(exactCandidates, exact, exactSeen);
            mergeCandidates(candidates, exact, seen);
            mergeCandidates(candidates, found, seen);
            rows.push(log(job.step + ' payload', true, memberSummary(result.data), {
              url: job.url,
              count: extractMembers(result.data).length
            }));
            rows.push(log(job.step + ' exact matches', !!exact.length, candidateSummary(exact), {
              url: job.url,
              count: exact.length
            }));
            rows.push(log(job.step + ' candidates', !!found.length, candidateSummary(found), {
              url: job.url,
              count: found.length
            }));
          }
        });
      });
    }, Promise.resolve()).then(function () {
      var prioritized = mergePriorityCandidates(exactCandidates, candidates);
      rows.push(log('RAW object exact candidates total', !!exactCandidates.length, candidateSummary(exactCandidates), {
        count: exactCandidates.length
      }));
      rows.push(log('RAW object candidates total', !!candidates.length, candidateSummary(candidates), {
        count: candidates.length
      }));
      rows.push(log('RAW object prioritized candidates', !!prioritized.length, candidateSummary(prioritized), {
        count: prioritized.length
      }));
      return probeCandidateEngItems(rows, prioritized, physicalId);
    });
  }

  function probeCsrf(rows, spaceUrl) {
    if (!spaceUrl || typeof CompassServices === 'undefined' || !CompassServices.fetchCsrfToken) {
      rows.push(log('CSRF', false, 'sem 3DSpace verificado'));
      return Promise.resolve();
    }
    var url = String(spaceUrl).replace(/\/$/, '') + '/resources/v1/application/CSRF';
    rows.push(log('CSRF URL', true, url, { url: url }));
    return CompassServices.fetchCsrfToken(spaceUrl)
      .then(function (token) {
        rows.push(log('CSRF GET', !!token, token ? 'token recebido' : 'sem token', { url: url, status: 200 }));
      })
      .catch(function (err) {
        var msg = err.message || String(err);
        rows.push(log('CSRF GET', false, msg, { url: url, status: parseStatus(msg) }));
      });
  }

  function probeEngItem(rows, physicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngItem) {
      rows.push(log('dseng:EngItem', false, 'EnoviaApi indisponivel'));
      return Promise.resolve();
    }
    var url = EnoviaApi.engItemUrl ? EnoviaApi.engItemUrl(physicalId) : physicalId;
    return requestStep('dseng:EngItem', url, function () {
      return EnoviaApi.getEngItem(physicalId, null);
    }, function (res) {
      var members = extractMembers(res);
      return {
        detail: 'OK (' + (members.length || 1) + ' member(s))',
        count: members.length || 1
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function probeEngInstance(rows, physicalId, top) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngInstanceChildren) {
      rows.push(log('dseng:EngInstance', false, 'EnoviaApi indisponivel'));
      return Promise.resolve();
    }
    top = top || 5;
    var url = EnoviaApi.engInstanceChildrenUrl
      ? EnoviaApi.engInstanceChildrenUrl(physicalId, 0, top)
      : physicalId;
    return requestStep('dseng:EngInstance page 0', url, function () {
      return EnoviaApi.getEngInstanceChildren(physicalId, 0, top);
    }, function (res) {
      var members = extractMembers(res);
      var total = responseTotal(res, members.length);
      return {
        detail: 'filhos=' + members.length + ', total=' + total,
        count: members.length,
        total: total,
        hasNext: members.length === top && members.length < total
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function probePhysicalProductResolver(rows, physicalId) {
    if (
      typeof EnoviaApi === 'undefined' ||
      !EnoviaApi.isCloudPrdId ||
      !EnoviaApi.isCloudPrdId(physicalId) ||
      !EnoviaApi.getPhysicalProduct
    ) {
      return Promise.resolve();
    }
    var url = EnoviaApi.physicalProductUrl ? EnoviaApi.physicalProductUrl(physicalId) : physicalId;
    return requestStep('dspfl:PhysicalProduct resolver', url, function () {
      return EnoviaApi.getPhysicalProduct(physicalId, null);
    }, function (res) {
      var eng =
        EnoviaApi.extractEngItemIdFromResponse &&
        EnoviaApi.extractEngItemIdFromResponse(res);
      return {
        detail: eng ? 'engItem=' + eng : 'OK, sem engItem extraido',
        resolvedEngItem: eng || ''
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function resolveId(ctx) {
    ctx = ctx || ctxSnapshot();
    if (!ctx) return Promise.resolve(null);
    if (ctx.physicalId) return Promise.resolve(ctx.physicalId);
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.resolvePhysicalId) {
      return ApiBomLoader.resolvePhysicalId(ctx, null);
    }
    return Promise.resolve(null);
  }

  /**
   * Executa diagnostico isolado no Additional App.
   * @returns {Promise<{ rows: object[], summary: string, physicalId: string }>}
   */
  function run(options) {
    options = options || {};
    window.__3DX_API_DIAG__ = [];
    var rows = [];
    root.__3DX_ALLOW_API__ = true;
    root.__3DX_FORCE_API__ = true;

    rows.push(log('WAFData', wafOk(), wafOk() ? 'authenticatedRequest disponivel' : 'WAFData ausente'));

    var pCtx =
      typeof PlatformContext !== 'undefined' && PlatformContext.init
        ? PlatformContext.init()
        : Promise.resolve();

    return pCtx
      .then(function () {
        var st =
          typeof PlatformContext !== 'undefined' &&
          PlatformContext.getState &&
          PlatformContext.getState();
        rows.push(
          log(
            'SecurityContext',
            !!(st && st.securityContext),
            (st && st.securityContext) || 'sem SecurityContext'
          )
        );
        return probeCompass(rows);
      })
      .then(function (spaceUrl) {
        if (spaceUrl && typeof EnoviaApi !== 'undefined' && EnoviaApi.init) {
          EnoviaApi.init(spaceUrl);
        }
        return probeCsrf(rows, spaceUrl);
      })
      .then(function () {
        var ctx = ctxSnapshot();
        if (!ctx) {
          rows.push(log('ExplorerContext', false, 'ExplorerContext indisponivel'));
          return null;
        }
        rows.push(
          log(
            'Estrutura',
            !!(ctx.rootName || ctx.expectedCount || ctx.physicalId),
            (ctx.rootName || '?') +
              ' - expected ' +
              (ctx.expectedCount || 0) +
              ' - physicalId ' +
              (ctx.physicalId || '(vazio)'),
            {
              expectedCount: ctx.expectedCount || 0,
              selectionCount: ctx.selectionCount || 0,
              source: ctx.source || ''
            }
          )
        );
        return resolveId(ctx).then(function (pid) {
          if (!pid) {
            rows.push(
              log(
                'physicalId',
                false,
                'nao resolvido - clique raiz no Explorer ou preencha ID em Avancado'
              )
            );
            return null;
        }
        rows.push(log('physicalId', true, pid));
          var urls = {};
          try {
            var spaceState =
              typeof CompassServices !== 'undefined' &&
              CompassServices.getVerifiedSpaceUrl &&
              CompassServices.getVerifiedSpaceUrl();
            if (spaceState) urls.csrf = String(spaceState).replace(/\/$/, '') + '/resources/v1/application/CSRF';
            if (typeof EnoviaApi !== 'undefined' && EnoviaApi.engItemUrl) urls.engItem = EnoviaApi.engItemUrl(pid);
            if (typeof EnoviaApi !== 'undefined' && EnoviaApi.engInstanceChildrenUrl) {
              urls.engInstance = EnoviaApi.engInstanceChildrenUrl(pid, 0, options.top || 5);
            }
          } catch (eUrls) { /* */ }
          return probeRawModelerVariants(rows, urls)
            .then(function () {
              return probeObjectResolution(rows, ctx, pid);
            })
            .then(function () {
              return probeEngItem(rows, pid);
            })
            .then(function () {
              return probeEngInstance(rows, pid, options.top || 5);
            })
            .then(function () {
              return probePhysicalProductResolver(rows, pid);
            })
            .then(function () {
              return pid;
            });
        });
      })
      .finally(function () {
        root.__3DX_ALLOW_API__ = false;
        root.__3DX_FORCE_API__ = false;
      })
      .then(function (physicalId) {
        var summary = formatReport(rows);
        lastReport = { rows: rows, summary: summary, physicalId: physicalId || '' };
        return lastReport;
      });
  }

  function getLastReport() {
    return lastReport;
  }

  return {
    run: run,
    getLastReport: getLastReport,
    formatReport: formatReport
  };
})();
