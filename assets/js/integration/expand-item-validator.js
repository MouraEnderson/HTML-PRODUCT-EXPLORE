/**
 * @file integration/expand-item-validator.js
 * DEC-015 — Validação automática Expand Item (CSRF + POST oficial, host space-only).
 */
(function (global) {
  'use strict';

  var w = global;
  var LOG = '[ExpandItemValidator]';
  var BUILD = 'bom20260614j';
  var MANUAL_CSRF_HEADER_RE = /^x-csrf-token$/i;
  var lastReport = null;

  function s(v) {
    return String(v || '').trim();
  }

  function n(v) {
    return Number(v || 0);
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(LOG);
      console.log.apply(console, args);
    } catch (e) {}
  }

  function cfg() {
    return (w.APP_CONFIG && w.APP_CONFIG) || {};
  }

  function expandDepth(opt) {
    return n(opt && opt.expandDepth) || n(cfg().EXPAND_ITEM_LEVELS) || n(w.EXPAND_ITEM_LEVELS) || 2;
  }

  function getWafData() {
    if (w.WAFData && w.WAFData.authenticatedRequest) return w.WAFData;
    if (w.widget && w.widget.WAFData && w.widget.WAFData.authenticatedRequest) return w.widget.WAFData;
    return null;
  }

  function ensurePlatformContext() {
    if (typeof w.PlatformContext === 'undefined' || !w.PlatformContext.init) {
      return Promise.resolve();
    }
    return Promise.resolve(w.PlatformContext.init()).catch(function () {});
  }

  function getSecurityContextValue() {
    try {
      var st = w.PlatformContext && w.PlatformContext.getState && w.PlatformContext.getState();
      if (st && st.securityContext) return s(st.securityContext);
    } catch (e) {}
    try {
      if (w.widget && w.widget.wafSecurityContext) return s(w.widget.wafSecurityContext);
    } catch (e) {}
    return s(cfg().SECURITY_CONTEXT_DEFAULT || '');
  }

  function maskSc(sc) {
    sc = s(sc);
    if (!sc) return '(ausente)';
    if (sc.length <= 16) return sc;
    return sc.slice(0, 12) + '…';
  }

  function parseWafStatus(err, msg) {
    var status = n(err && (err.status || err.statusCode || err.responseCode));
    msg = s(msg);
    if (!status && msg) {
      var m = msg.match(/ResponseCode[^0-9]*(\d{3})/i) || msg.match(/\bHTTP\s*(\d{3})\b/i);
      if (m) status = n(m[1]);
    }
    if (!status && /NetworkError|ResponseCode.*0/i.test(msg)) return 0;
    return status;
  }

  function extractResponseText(err, msg, backend) {
    if (backend != null) {
      if (typeof backend === 'string') return backend;
      try {
        return JSON.stringify(backend);
      } catch (e) {
        return String(backend);
      }
    }
    if (err) {
      if (typeof err === 'string') return err;
      if (err.responseText) return s(err.responseText);
      if (err.body) return typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
      if (err.data) return typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
      if (err.response) return typeof err.response === 'string' ? err.response : JSON.stringify(err.response);
    }
    return s(msg);
  }

  function parseJsonMaybe(data) {
    if (data == null) return null;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return { raw: data };
      }
    }
    return data;
  }

  function forbiddenHeadersPresent(headers) {
    headers = headers || {};
    return Object.keys(headers).some(function (k) {
      return MANUAL_CSRF_HEADER_RE.test(k);
    });
  }

  function rejectIfweUrl(url) {
    url = s(url);
    if (/ifwe\.3dexperience/i.test(url)) {
      throw new Error('Host ifwe inválido para dseng — use 3DSpace *-space*');
    }
    return url;
  }

  function ensureSpaceUrl() {
    return ensurePlatformContext().then(function () {
      if (typeof w.CompassServices !== 'undefined' && w.CompassServices.ensureWorkingSpaceUrl) {
        return w.CompassServices.ensureWorkingSpaceUrl().then(function (url) {
          if (url && typeof w.EnoviaApi !== 'undefined' && w.EnoviaApi.init) w.EnoviaApi.init(url);
          return rejectIfweUrl(cleanUrl(url));
        });
      }
      if (typeof w.CompassServices !== 'undefined' && w.CompassServices.getVerifiedSpaceUrl) {
        var v = w.CompassServices.getVerifiedSpaceUrl();
        if (v) return rejectIfweUrl(cleanUrl(v));
      }
      var td = cfg().TENANT_DEFAULTS;
      if (td && td.spaceHost) return rejectIfweUrl('https://' + td.spaceHost + '/enovia');
      return '';
    });
  }

  function cleanUrl(v) {
    return s(v).replace(/\/+$/, '');
  }

  function wafRequest(url, opts) {
    url = rejectIfweUrl(url);
    opts = opts || {};
    var WAF = getWafData();
    if (!WAF) {
      return Promise.resolve({
        ok: false,
        status: 0,
        error: 'WAFData indisponível',
        url: url,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        responseText: 'WAFData indisponível',
        responseJson: null,
        wafMessage: 'WAFData indisponível'
      });
    }

    return new Promise(function (resolve) {
      var settled = false;
      function finish(res) {
        if (settled) return;
        settled = true;
        resolve(res);
      }

      var reqOpts = {
        method: opts.method || 'GET',
        headers: opts.headers || {},
        timeout: n(cfg().WAF_REQUEST_TIMEOUT_MS) || 60000,
        onComplete: function (data, responseHeaders) {
          finish({
            ok: true,
            status: 200,
            data: data,
            url: url,
            method: opts.method || 'GET',
            headers: opts.headers || {},
            responseHeaders: responseHeaders || {},
            responseText: typeof data === 'string' ? data : JSON.stringify(data),
            responseJson: parseJsonMaybe(data),
            wafMessage: ''
          });
        },
        onFailure: function (err, backendresponse, response_hdrs) {
          var msg = (err && (err.message || err.error || err.statusText)) || 'WAF request failed';
          var status = parseWafStatus(err, msg);
          var responseText = extractResponseText(err, msg, backendresponse);
          finish({
            ok: false,
            status: status,
            error: msg,
            err: err,
            url: url,
            method: opts.method || 'GET',
            headers: opts.headers || {},
            responseHeaders: response_hdrs || {},
            responseText: responseText,
            responseJson: parseJsonMaybe(backendresponse),
            wafMessage: msg
          });
        }
      };

      if (opts.type) reqOpts.type = opts.type;
      if (opts.contentType) reqOpts.contentType = opts.contentType;
      if (opts.data != null) reqOpts.data = opts.data;

      try {
        WAF.authenticatedRequest(url, reqOpts);
      } catch (e) {
        finish({
          ok: false,
          status: 0,
          error: e && e.message ? e.message : String(e),
          url: url,
          method: opts.method || 'GET',
          headers: opts.headers || {},
          responseText: e && e.message ? e.message : String(e),
          responseJson: null,
          wafMessage: e && e.message ? e.message : String(e)
        });
      }
    });
  }

  function parseCsrfPayload(data) {
    data = parseJsonMaybe(data) || {};
    var csrf = data.csrf || data;
    var name = s(csrf.name) || 'ENO_CSRF_TOKEN';
    var value = s(csrf.value || data.value || data.token);
    return { name: name, value: value, valuePresent: !!value, raw: data };
  }

  function getOfficialCsrf(spaceUrl) {
    spaceUrl = cleanUrl(spaceUrl);
    rejectIfweUrl(spaceUrl);
    var url = spaceUrl + '/resources/v1/application/CSRF';
    log('GET CSRF', url);
    return wafRequest(url, {
      method: 'GET',
      type: 'json',
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      var parsed = res.ok ? parseCsrfPayload(res.data) : { name: 'ENO_CSRF_TOKEN', value: '', valuePresent: false };
      log('CSRF status:', res.status);
      log('CSRF name:', parsed.name);
      log('CSRF value present:', parsed.valuePresent);
      return {
        url: url,
        status: res.status,
        ok: res.ok && parsed.valuePresent,
        name: parsed.name,
        value: parsed.value,
        valuePresent: parsed.valuePresent,
        response: res.responseJson || res.responseText,
        error: res.ok ? '' : res.wafMessage || res.error,
        transport: res
      };
    });
  }

  function postExpandOfficial(params) {
    params = params || {};
    var spaceUrl = cleanUrl(params.spaceUrl);
    var rootId = s(params.rootId);
    var securityContext = s(params.securityContext);
    var csrf = params.csrf || {};
    var depth = n(params.expandDepth) || 2;
    rejectIfweUrl(spaceUrl);

    var url = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + encodeURIComponent(rootId) + '/expand';
    var bodyObj = {
      expandDepth: depth,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
    var bodyString = JSON.stringify(bodyObj);
    var csrfName = s(csrf.name) || 'ENO_CSRF_TOKEN';
    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      SecurityContext: securityContext
    };
    if (csrf.valuePresent && csrf.value) {
      headers[csrfName] = csrf.value;
    }

    log('POST expand', url);
    log('headers planned:', Object.keys(headers).join(', '));
    log('forbidden headers:', forbiddenHeadersPresent(headers));

    return wafRequest(url, {
      method: 'POST',
      type: 'json',
      headers: headers,
      data: bodyString
    }).then(function (res) {
      return {
        url: url,
        host: (url.match(/^https:\/\/[^/]+/) || [''])[0],
        method: 'POST',
        headersPlanned: Object.keys(headers),
        forbiddenHeadersPresent: forbiddenHeadersPresent(headers),
        body: bodyObj,
        bodyString: bodyString,
        status: res.status,
        ok: res.ok,
        responseText: res.responseText,
        responseJson: res.responseJson,
        data: res.ok ? res.data : null,
        error: res.ok ? '' : res.wafMessage || res.error,
        wafMessage: res.wafMessage,
        transport: res
      };
    });
  }

  function validateRoot(spaceUrl, rootId, securityContext) {
    var url = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + encodeURIComponent(rootId);
    return wafRequest(url, {
      method: 'GET',
      type: 'json',
      headers: { Accept: 'application/json', SecurityContext: securityContext }
    }).then(function (res) {
      var member = res.ok && res.data ? (Array.isArray(res.data.member) ? res.data.member[0] : res.data) : null;
      return {
        status: res.status,
        ok: res.ok,
        url: url,
        title: member && (member.title || member.name),
        type: member && member.type,
        state: member && (member.state || member.maturity),
        id: member && member.id,
        error: res.ok ? '' : res.wafMessage || res.error,
        responseText: res.responseText
      };
    });
  }

  function resolveRootId() {
    if (w.ExpandItemProvider && w.ExpandItemProvider.resolveCurrentRootId) {
      return w.ExpandItemProvider.resolveCurrentRootId().then(function (r) {
        return {
          rootId: s(r && r.rootId),
          source: s(r && r.source) || 'ExpandItemProvider'
        };
      });
    }
    return Promise.resolve({ rootId: '', source: 'unavailable' });
  }

  function analyzePayload(data) {
    data = data || {};
    var members = Array.isArray(data.member) ? data.member : [];
    var ref = 0;
    var inst = 0;
    var pathCount = 0;
    var firstPath = '';
    var firstRef = null;
    var firstInst = null;
    members.forEach(function (m) {
      if (!m) return;
      if (m.type === 'VPMReference') {
        ref++;
        if (!firstRef) firstRef = m;
      }
      if (m.type === 'VPMInstance') {
        inst++;
        if (!firstInst) firstInst = m;
      }
      if (Array.isArray(m.Path) && m.Path.length) {
        pathCount++;
        if (!firstPath) firstPath = m.Path.join(' -> ');
      }
    });
    return {
      totalItems: data.totalItems,
      memberCount: members.length,
      referenceCount: ref,
      instanceCount: inst,
      pathCount: pathCount,
      firstPath: firstPath,
      firstReference: firstRef,
      firstInstance: firstInst
    };
  }

  function classify(report) {
    var csrfOk = report.csrf && report.csrf.valuePresent && (report.csrf.status === 200 || report.csrf.ok);
    var rootOk = report.root && report.root.validationStatus === 200;
    var expandStatus = n(report.expand && report.expand.status);
    var pathCount = n(report.payload && report.payload.pathCount);
    var normalizedRows = n(report.normalization && report.normalization.normalizedRows);

    if (n(report.csrf && report.csrf.status) === 0 || expandStatus === 0) return 'F';
    if (!report.environment || !report.environment.wafDataAvailable) return 'F';
    if (!csrfOk) {
      if (n(report.csrf && report.csrf.status) === 0) return 'F';
      return 'B';
    }
    if (!rootOk) {
      if (n(report.root && report.root.validationStatus) === 404) return 'C';
      if (n(report.root && report.root.validationStatus) === 403) return 'B';
      return 'C';
    }
    if (expandStatus === 200 && pathCount > 0 && normalizedRows > 0) return 'A';
    if (expandStatus === 403) return 'B';
    if (expandStatus === 404) return 'C';
    if (expandStatus === 405) return 'D';
    if (expandStatus === 400 || expandStatus === 415) return 'E';
    if (expandStatus === 0) return 'F';
    if (expandStatus === 200 && pathCount === 0) return 'E';
    return 'B';
  }

  function decisionFor(code) {
    var map = {
      A: 'API OK — Atualizar estrutura liberado (POST oficial space + ENO_CSRF_TOKEN)',
      B: 'Permissão/auth — resolver SecurityContext, CSRF ou role com admin antes do widget',
      C: 'RootId/URL — revalidar id interno VPMReference 32 hex',
      D: 'Método/URL errado — POST somente em host *-space*, nunca ifwe',
      E: 'Body/Content-Type — ajustar schema dseng_v1 ou payload vazio',
      F: 'Transporte/CORS — WAFData indisponível ou NetworkError/preflight'
    };
    return map[code] || 'Inconclusivo — repetir validação';
  }

  function userMessageFor(code) {
    var map = {
      A: 'Estrutura oficial carregada com sucesso.',
      B: 'Falha de permissão/autorização ao consultar Expand Item.',
      C: 'RootId inválido ou não encontrado.',
      D: 'Endpoint ou método inválido.',
      E: 'Body ou Content-Type inválido.',
      F: 'Falha de transporte/CORS.'
    };
    return map[code] || 'Validação Expand Item inconclusiva.';
  }

  function attachNormalizationReport(report, norm) {
    norm = norm || {};
    var rows = norm.rows || [];
    var visualRowsCount =
      n(norm.visualRowsCount) ||
      (w.getBomVisualRowsCount ? w.getBomVisualRowsCount(rows) : rows.length);
    report.normalization = {
      normalizedRows: visualRowsCount,
      visualRowsCount: visualRowsCount,
      includesRoot: !!norm.includesRoot,
      rootRowCount: n(norm.rootRowCount),
      firstRow: rows[0] || null,
      stats: norm.stats || {}
    };
    report.counts = {
      memberCount: n(report.payload && report.payload.memberCount),
      totalItems: n(report.payload && report.payload.totalItems) || n(norm.stats && norm.stats.totalItems),
      referenceCount: n(report.payload && report.payload.referenceCount),
      instanceCount: n(report.payload && report.payload.instanceCount),
      pathCount: n(report.payload && report.payload.pathCount),
      normalizedRows: visualRowsCount,
      includesRoot: !!norm.includesRoot,
      rootRowCount: n(norm.rootRowCount),
      visualRowsCount: visualRowsCount,
      tableRows: n(report.counts && report.counts.tableRows),
      kpiTotalPecas: n(report.counts && report.counts.kpiTotalPecas),
      validationRows: visualRowsCount,
      importRows: n(report.counts && report.counts.importRows),
      difference: n(report.counts && report.counts.difference),
      differenceReason: s(report.counts && report.counts.differenceReason)
    };
  }

  function buildReportObject(report) {
    return {
      build: BUILD,
      timestamp: report.timestamp,
      environment: report.environment,
      root: report.root,
      csrf: report.csrf,
      expand: report.expand,
      payload: report.payload,
      normalization: report.normalization,
      counts: report.counts || {},
      validatedPayload: report.validatedPayload || null,
      classification: report.classification,
      decision: report.decision,
      userMessage: report.userMessage || userMessageFor(report.classification),
      uiSummary: report.uiSummary,
      countConsistencyError: report.countConsistencyError || ''
    };
  }

  function run(options) {
    options = options || {};
    var depth = expandDepth(options);
    var report = {
      build: BUILD,
      timestamp: new Date().toISOString(),
      environment: {
        wafDataAvailable: !!getWafData(),
        securityContext: '',
        spaceUrl: '',
        origin: '',
        frameLocation: ''
      },
      root: {},
      csrf: {},
      expand: {},
      payload: {},
      normalization: {},
      classification: '',
      decision: '',
      uiSummary: {}
    };

    try {
      report.environment.origin = s(w.location && w.location.origin);
      report.environment.frameLocation = s(w.location && w.location.href);
    } catch (e) {}

    return ensurePlatformContext()
      .then(function () {
        report.environment.securityContext = getSecurityContextValue();
        return ensureSpaceUrl();
      })
      .then(function (spaceUrl) {
        report.environment.spaceUrl = spaceUrl;
        if (!getWafData()) {
          report.classification = 'F';
          report.decision = decisionFor('F');
          lastReport = buildReportObject(report);
          w.__lastExpandItemValidationReport = lastReport;
          return lastReport;
        }
        if (!spaceUrl) {
          report.classification = 'F';
          report.decision = '3DSpace URL não resolvida — Compass/indisponível';
          lastReport = buildReportObject(report);
          w.__lastExpandItemValidationReport = lastReport;
          return lastReport;
        }

        return getOfficialCsrf(spaceUrl).then(function (csrfRes) {
          report.csrf = {
            url: csrfRes.url,
            status: csrfRes.status,
            name: csrfRes.name,
            valuePresent: csrfRes.valuePresent,
            response: csrfRes.response,
            error: csrfRes.error
          };

          if (!csrfRes.ok) {
            report.classification = classify(report);
            report.decision = decisionFor(report.classification);
            lastReport = buildReportObject(report);
            w.__lastExpandItemValidationReport = lastReport;
            return lastReport;
          }

          return resolveRootId().then(function (rootMeta) {
            report.root.rootId = rootMeta.rootId;
            report.root.source = rootMeta.source;
            if (/KNOWN_ROOT fallback/i.test(rootMeta.source)) {
              report.root.knownRootFallback = true;
            }

            if (!rootMeta.rootId) {
              report.root.validationStatus = 0;
              report.classification = 'C';
              report.decision = decisionFor('C');
              lastReport = buildReportObject(report);
              w.__lastExpandItemValidationReport = lastReport;
              return lastReport;
            }

            return validateRoot(spaceUrl, rootMeta.rootId, report.environment.securityContext).then(function (rootVal) {
              report.root.validationStatus = rootVal.status;
              report.root.title = rootVal.title;
              report.root.type = rootVal.type;
              report.root.state = rootVal.state;
              report.root.id = rootVal.id;
              report.root.error = rootVal.error;

              if (!rootVal.ok) {
                report.classification = classify(report);
                report.decision = decisionFor(report.classification);
                lastReport = buildReportObject(report);
                w.__lastExpandItemValidationReport = lastReport;
                return lastReport;
              }

              return postExpandOfficial({
                spaceUrl: spaceUrl,
                rootId: rootMeta.rootId,
                securityContext: report.environment.securityContext,
                csrf: csrfRes,
                expandDepth: depth
              }).then(function (expandRes) {
                report.expand = {
                  url: expandRes.url,
                  host: expandRes.host,
                  method: expandRes.method,
                  headersPlanned: expandRes.headersPlanned,
                  forbiddenHeadersPresent: expandRes.forbiddenHeadersPresent,
                  body: expandRes.body,
                  status: expandRes.status,
                  responseText: expandRes.responseText,
                  responseJson: expandRes.responseJson,
                  error: expandRes.error,
                  wafMessage: expandRes.wafMessage
                };

                if (expandRes.ok && expandRes.data) {
                  report.payload = analyzePayload(expandRes.data);
                  report.payload.totalItems = n(expandRes.data.totalItems);
                  if (options.returnPayload) {
                    report.validatedPayload = expandRes.data;
                  }
                  if (typeof w.normalizeExpandItemPayload === 'function') {
                    attachNormalizationReport(report, w.normalizeExpandItemPayload(expandRes.data));
                  }
                } else {
                  report.payload = analyzePayload(expandRes.responseJson || {});
                }

                report.classification = classify(report);
                report.decision = decisionFor(report.classification);
                report.userMessage = userMessageFor(report.classification);
                report.uiSummary = {
                  wafOk: report.environment.wafDataAvailable,
                  csrfOk: !!report.csrf.valuePresent,
                  rootOk: report.root.validationStatus === 200,
                  expandOk: report.expand.status === 200,
                  pathCount: n(report.payload.pathCount),
                  normalizedRows: n(report.normalization && report.normalization.visualRowsCount)
                };

                lastReport = buildReportObject(report);
                w.__lastExpandItemValidationReport = lastReport;
                w.__expandItemValidationPassed = report.classification === 'A';
                if (report.classification === 'A' && report.validatedPayload) {
                  w.__lastValidatedExpandPayload = report.validatedPayload;
                }
                log('classification:', report.classification);
                log('decision:', report.decision);
                return lastReport;
              });
            });
          });
        });
      })
      .catch(function (err) {
        report.classification = 'F';
        report.decision = (err && err.message) || 'Erro inesperado na validação';
        report.expand.error = report.decision;
        lastReport = buildReportObject(report);
        w.__lastExpandItemValidationReport = lastReport;
        w.__expandItemValidationPassed = false;
        return lastReport;
      });
  }

  function uiRoot() {
    return w.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    try {
      var root = uiRoot();
      return (root.querySelector && root.querySelector('#' + id)) || document.getElementById(id);
    } catch (e) {
      return document.getElementById(id);
    }
  }

  function esc(v) {
    return s(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderReport(report) {
    report = report || lastReport || w.__lastExpandItemValidationReport;
    if (!report) return;

    var panel = byId('expandItemValidationPanel');
    if (!panel) return;

    var cls = report.classification || '?';
    var clsColor =
      cls === 'A' ? '#0a7a2f' : cls === 'F' ? '#b42318' : cls === 'B' ? '#b45309' : '#92400e';

    var rows = [
      ['Build', report.build],
      ['Data/hora', report.timestamp],
      ['WAFData', report.environment && report.environment.wafDataAvailable ? 'OK' : 'FAIL'],
      ['SecurityContext', maskSc(report.environment && report.environment.securityContext)],
      ['3DSpace URL', report.environment && report.environment.spaceUrl],
      ['RootId', report.root && report.root.rootId],
      ['Root resolution source', report.root && report.root.source],
      ['CSRF status', report.csrf && report.csrf.status],
      ['csrf.name', report.csrf && report.csrf.name],
      ['csrf.value present', report.csrf && report.csrf.valuePresent ? 'true' : 'false'],
      ['POST expand status', report.expand && report.expand.status],
      ['POST expand host', report.expand && report.expand.host],
      ['POST expand method', report.expand && report.expand.method],
      [
        'POST expand body',
        report.expand && report.expand.body ? JSON.stringify(report.expand.body) : ''
      ],
      [
        'Response body',
        report.expand && report.expand.responseText
          ? String(report.expand.responseText).slice(0, 1200)
          : ''
      ],
      ['member count', report.payload && report.payload.memberCount],
      ['VPMReference count', report.payload && report.payload.referenceCount],
      ['VPMInstance count', report.payload && report.payload.instanceCount],
      ['Path count', report.payload && report.payload.pathCount],
      ['totalItems (API)', report.payload && report.payload.totalItems],
      ['normalized rows', report.normalization && report.normalization.normalizedRows],
      ['includesRoot', report.normalization && report.normalization.includesRoot ? 'true' : 'false'],
      ['rootRowCount', report.normalization && report.normalization.rootRowCount],
      ['visualRowsCount', report.normalization && report.normalization.visualRowsCount],
      ['tableRows', report.counts && report.counts.tableRows],
      ['kpiTotalPecas', report.counts && report.counts.kpiTotalPecas],
      ['validationRows', report.counts && report.counts.validationRows],
      ['importRows', report.counts && report.counts.importRows],
      ['difference', report.counts && report.counts.difference],
      ['difference reason', report.counts && report.counts.differenceReason],
      ['first Path', report.payload && report.payload.firstPath],
      [
        'first normalized row',
        report.normalization && report.normalization.firstRow
          ? JSON.stringify(report.normalization.firstRow)
          : ''
      ],
      ['Classificação', cls],
      ['Decisão', report.decision]
    ];

    var table = rows
      .map(function (r) {
        return (
          '<tr><th style="text-align:left;padding:2px 6px;font-size:.62rem;color:#5c6b7a;width:42%">' +
          esc(r[0]) +
          '</th><td style="padding:2px 6px;font-size:.62rem;word-break:break-all">' +
          esc(r[1]) +
          '</td></tr>'
        );
      })
      .join('');

    panel.innerHTML =
      '<div style="border:1px solid #d8e0ea;border-radius:8px;padding:8px;margin:6px;background:#fff">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<strong style="font-size:.74rem">Validação Expand Item</strong>' +
      '<span style="font-size:.7rem;font-weight:700;color:' +
      clsColor +
      '">' +
      esc(cls) +
      '</span></div>' +
      '<table style="width:100%;border-collapse:collapse">' +
      table +
      '</table>' +
      (report.expand && report.expand.error
        ? '<pre style="margin:6px 0 0;font-size:.58rem;max-height:80px;overflow:auto;background:#fef2f2;padding:6px;border-radius:6px;color:#991b1b">' +
          esc(report.expand.error) +
          '</pre>'
        : '') +
      (report.expand && report.expand.responseText && report.expand.status !== 200
        ? '<pre style="margin:6px 0 0;font-size:.58rem;max-height:100px;overflow:auto;background:#f8fafc;padding:6px;border-radius:6px">' +
          esc(String(report.expand.responseText).slice(0, 2000)) +
          '</pre>'
        : '') +
      '</div>';
  }

  function copyReport() {
    var report = lastReport || w.__lastExpandItemValidationReport;
    if (!report) return Promise.reject(new Error('Nenhum relatório para copiar'));
    var text = JSON.stringify(report, null, 2);
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(text).then(function () {
        return text;
      });
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve(text);
      } catch (e) {
        reject(e);
      }
    });
  }

  function getLastReport() {
    return lastReport || w.__lastExpandItemValidationReport || null;
  }

  function isPassed() {
    return !!(w.__expandItemValidationPassed && getLastReport() && getLastReport().classification === 'A');
  }

  w.ExpandItemValidator = {
    run: run,
    renderReport: renderReport,
    copyReport: copyReport,
    getLastReport: getLastReport,
    isPassed: isPassed,
    userMessageFor: userMessageFor,
    attachLoadCounts: function (report, counts) {
      report = report || lastReport || w.__lastExpandItemValidationReport;
      if (!report) return null;
      report.counts = Object.assign({}, report.counts || {}, counts || {});
      if (n(report.counts.validationRows) && n(report.counts.importRows)) {
        report.counts.difference = report.counts.importRows - report.counts.validationRows;
        if (report.counts.difference !== 0 && !report.counts.differenceReason) {
          report.counts.differenceReason =
            'diferença entre rows validados e linhas importadas — verificar ensureContextRoot';
        }
      }
      if (report.counts.kpiTotalPecas !== report.counts.tableRows) {
        report.countConsistencyError =
          'Inconsistência de contagem: KPI Total Peças diferente da quantidade de linhas da tabela. Corrigir normalização antes de exibir como válido.';
      } else {
        report.countConsistencyError = '';
      }
      lastReport = buildReportObject(report);
      w.__lastExpandItemValidationReport = lastReport;
      return lastReport;
    },
    getOfficialCsrf: getOfficialCsrf,
    postExpandOfficial: postExpandOfficial,
    ensureSpaceUrl: ensureSpaceUrl,
    getSecurityContextValue: getSecurityContextValue,
    BUILD: BUILD
  };

  w.__lastExpandItemValidationReport = null;
  w.__expandItemValidationPassed = false;
})(typeof window !== 'undefined' ? window : global);
