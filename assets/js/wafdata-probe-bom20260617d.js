/**
 * WAFData session probe — BOM Analytics bom20260617d
 * Validates: Widget → WAFData.authenticatedRequest → 3DSpace (user session)
 * No cookies manual, no Render CAS, no secrets persisted.
 */
(function (w) {
  'use strict';

  var BUILD = 'bom20260617d';
  var SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  var SECURITY_CONTEXT = 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO';
  var ROOT_ID = '63FC553465A62400699E0792000086AB';
  var ROOT_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var TAMPO_ID = '63FC553465A62400699DB56700005253';
  var EXPAND_DEPTH = 1;

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  function n(v) {
    return Number(v || 0);
  }

  function cleanUrl(url) {
    return s(url).replace(/\/+$/, '');
  }

  function getRequire() {
    if (typeof w.require === 'function') return w.require;
    if (typeof w.requirejs === 'function') return w.requirejs;
    return null;
  }

  function getWafDirect() {
    if (w.WAFData && w.WAFData.authenticatedRequest) {
      return { waf: w.WAFData, source: 'window.WAFData' };
    }
    try {
      if (w.widget && w.widget.WAFData && w.widget.WAFData.authenticatedRequest) {
        return { waf: w.widget.WAFData, source: 'widget.WAFData' };
      }
    } catch (e1) { /* */ }
    return null;
  }

  function getSecurityContext() {
    try {
      if (w.PlatformContext && w.PlatformContext.getState) {
        var st = w.PlatformContext.getState();
        if (st && st.securityContext) return s(st.securityContext);
      }
    } catch (e0) { /* */ }
    try {
      if (w.widget && w.widget.wafSecurityContext) return s(w.widget.wafSecurityContext);
    } catch (e1) { /* */ }
    return SECURITY_CONTEXT;
  }

  function parseJsonMaybe(data) {
    if (data == null) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(String(data));
    } catch (e) {
      return null;
    }
  }

  function parseWafStatus(err, msg) {
    var status = n(err && (err.status || err.statusCode || err.responseCode));
    msg = s(msg);
    if (!status && msg) {
      var m = msg.match(/ResponseCode[^0-9]*(\d{3})/i) || msg.match(/\bHTTP\s*(\d{3})\b/i);
      if (m) status = n(m[1]);
    }
    return status;
  }

  function extractResponseText(err, msg, backendresponse) {
    if (backendresponse != null) {
      return typeof backendresponse === 'string' ? backendresponse : JSON.stringify(backendresponse);
    }
    if (err) {
      if (typeof err === 'string') return err;
      if (err.responseText) return s(err.responseText);
      if (err.body) return typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
      if (err.response) return typeof err.response === 'string' ? err.response : JSON.stringify(err.response);
      if (err.data) return typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
    }
    return s(msg);
  }

  function wafRequest(waf, url, opts) {
    opts = opts || {};
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
        onComplete: function (data, responseHeaders) {
          finish({
            ok: true,
            status: 200,
            data: parseJsonMaybe(data),
            responseText: typeof data === 'string' ? data : JSON.stringify(data),
            responseJson: parseJsonMaybe(data),
            error: '',
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
            data: parseJsonMaybe(backendresponse),
            responseText: responseText,
            responseJson: parseJsonMaybe(backendresponse),
            error: s(msg),
            wafMessage: s(msg)
          });
        }
      };
      if (opts.type) reqOpts.type = opts.type;
      if (opts.contentType) reqOpts.contentType = opts.contentType;
      if (opts.data != null) reqOpts.data = opts.data;
      try {
        waf.authenticatedRequest(url, reqOpts);
      } catch (e) {
        resolve({
          ok: false,
          status: 0,
          data: null,
          responseText: s(e && e.message),
          responseJson: null,
          error: s(e && e.message),
          wafMessage: s(e && e.message)
        });
      }
    });
  }

  function loadWafModule() {
    var direct = getWafDirect();
    if (direct) {
      return Promise.resolve({
        wafAvailable: true,
        source: direct.source,
        waf: direct.waf
      });
    }
    var req = getRequire();
    if (!req) {
      return Promise.resolve({
        wafAvailable: false,
        error: 'WAFData module not available in Web Page Reader frame (require missing)'
      });
    }
    return new Promise(function (resolve) {
      req(
        ['DS/WAFData/WAFData'],
        function (WAF) {
          if (WAF && WAF.authenticatedRequest) {
            w.WAFData = WAF;
            resolve({ wafAvailable: true, source: 'DS/WAFData/WAFData', waf: WAF });
          } else {
            resolve({
              wafAvailable: false,
              error: 'WAFData module loaded but authenticatedRequest missing'
            });
          }
        },
        function () {
          resolve({
            wafAvailable: false,
            error: 'WAFData module not available in Web Page Reader frame'
          });
        }
      );
    });
  }

  function extractMembers(payload) {
    payload = payload || {};
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.member)) return payload.data.member;
    return [];
  }

  function countExpandRows(data) {
    var members = extractMembers(data);
    if (!members.length && data && data.totalItems != null) return n(data.totalItems);
    return members.length;
  }

  function extractTitleFromEngItem(data) {
    data = data || {};
    var member = Array.isArray(data.member) ? data.member[0] : data;
    return s(member && (member.title || member.name || member.label));
  }

  function extractStateFromEngItem(data) {
    data = data || {};
    var member = Array.isArray(data.member) ? data.member[0] : data;
    return s(member && (member.state || member.maturity || member.current));
  }

  function getCsrf(waf, spaceUrl, securityContext) {
    var url = cleanUrl(spaceUrl) + '/resources/v1/application/CSRF';
    return wafRequest(waf, url, {
      method: 'GET',
      type: 'json',
      headers: { Accept: 'application/json', SecurityContext: securityContext }
    }).then(function (res) {
      var parsed = parseJsonMaybe(res.data) || {};
      var csrf = parsed.csrf || parsed;
      var name = s(csrf.name) || 'ENO_CSRF_TOKEN';
      var value = s(csrf.value || parsed.token);
      return {
        ok: res.ok && !!value,
        status: res.status,
        name: name,
        value: value,
        valuePresent: !!value,
        error: res.ok ? (value ? '' : 'CSRF token missing in response') : res.error || res.wafMessage
      };
    });
  }

  function probeWafAvailability() {
    return loadWafModule().then(function (result) {
      return {
        wafAvailable: !!result.wafAvailable,
        source: result.source || '',
        error: result.error || '',
        waf: result.waf || null
      };
    });
  }

  function probeGetRoot(ctx) {
    ctx = ctx || {};
    var waf = ctx.waf;
    var spaceUrl = cleanUrl(ctx.spaceUrl || SPACE_URL);
    var securityContext = s(ctx.securityContext || getSecurityContext());
    var rootId = s(ctx.rootId || ROOT_ID);
    var url = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + encodeURIComponent(rootId);
    return wafRequest(waf, url, {
      method: 'GET',
      type: 'json',
      headers: { Accept: 'application/json', SecurityContext: securityContext }
    }).then(function (res) {
      var title = extractTitleFromEngItem(res.data);
      return {
        canReadRoot: res.ok,
        status: res.status,
        title: title || (res.ok ? '' : ''),
        expectedTitle: ROOT_TITLE,
        titleMatch: title ? title.indexOf('CJ MESA') >= 0 : false,
        error: res.ok ? '' : res.error || res.wafMessage,
        url: url
      };
    });
  }

  function probeExpand(ctx) {
    ctx = ctx || {};
    var waf = ctx.waf;
    var spaceUrl = cleanUrl(ctx.spaceUrl || SPACE_URL);
    var securityContext = s(ctx.securityContext || getSecurityContext());
    var rootId = s(ctx.rootId || ROOT_ID);
    var url = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + encodeURIComponent(rootId) + '/expand';
    var bodyObj = {
      expandDepth: EXPAND_DEPTH,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    };
    var bodyString = JSON.stringify(bodyObj);

    function postExpand(csrfInfo) {
      var headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        SecurityContext: securityContext
      };
      var csrfRequired = false;
      if (csrfInfo && csrfInfo.valuePresent && csrfInfo.value) {
        headers[csrfInfo.name || 'ENO_CSRF_TOKEN'] = csrfInfo.value;
        csrfRequired = true;
      }
      return wafRequest(waf, url, {
        method: 'POST',
        type: 'json',
        headers: headers,
        data: bodyString
      }).then(function (res) {
        var rows = countExpandRows(res.data);
        return {
          expandOk: res.ok && rows > 0,
          status: res.status,
          rowsDetected: rows,
          csrfUsed: csrfRequired,
          csrfStatus: csrfInfo ? csrfInfo.status : null,
          error: res.ok ? (rows > 0 ? '' : 'Expand returned empty member list') : res.error || res.wafMessage,
          url: url
        };
      });
    }

    return postExpand(null).then(function (first) {
      if (first.expandOk) return first;
      if (first.status === 401 || first.status === 403 || /csrf|CSRF|token/i.test(first.error)) {
        return getCsrf(waf, spaceUrl, securityContext).then(function (csrf) {
          if (!csrf.ok) {
            return {
              expandOk: false,
              status: first.status,
              rowsDetected: 0,
              csrfUsed: false,
              csrfStatus: csrf.status,
              csrfFetchOk: false,
              error: 'Expand blocked; CSRF fetch failed: ' + (csrf.error || 'unknown'),
              url: url
            };
          }
          return postExpand(csrf).then(function (second) {
            second.csrfFetchOk = true;
            second.csrfStatus = csrf.status;
            return second;
          });
        });
      }
      return first;
    });
  }

  function extractDerivedFiles(data) {
    data = data || {};
    var files = [];
    if (Array.isArray(data.data)) files = data.data;
    else if (Array.isArray(data.files)) files = data.files;
    else if (data.dataelements && Array.isArray(data.dataelements.files)) files = data.dataelements.files;
    var formats = [];
    files.forEach(function (f) {
      var fmt = s(f.format || f.fileFormat || f.type);
      if (fmt) formats.push(fmt.toUpperCase());
    });
    return { fileCount: files.length, formats: formats };
  }

  function buildLocatePayload(referenceId, type, spaceUrl) {
    var source = cleanUrl(spaceUrl);
    return {
      data: [
        {
          id: referenceId,
          identifier: referenceId,
          type: type || 'VPMReference',
          source: source,
          relativePath: '/resources/v1/modeler/dseng/dseng:EngItem/' + referenceId
        }
      ]
    };
  }

  function probeDerivedOutput(ctx) {
    ctx = ctx || {};
    var waf = ctx.waf;
    var spaceUrl = cleanUrl(ctx.spaceUrl || SPACE_URL);
    var securityContext = s(ctx.securityContext || getSecurityContext());
    var referenceId = s(ctx.referenceId || TAMPO_ID);
    var result = {
      tested: true,
      referenceId: referenceId,
      derivedOutputLocateOk: false,
      fileCount: 0,
      formats: [],
      steps: []
    };

    function locateDerived(type, id) {
      var url = spaceUrl + '/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/Locate';
      var bodyString = JSON.stringify(buildLocatePayload(id, type, spaceUrl));
      return getCsrf(waf, spaceUrl, securityContext).then(function (csrf) {
        var headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          SecurityContext: securityContext
        };
        if (csrf.ok && csrf.value) headers[csrf.name] = csrf.value;
        return wafRequest(waf, url, {
          method: 'POST',
          type: 'json',
          headers: headers,
          data: bodyString
        }).then(function (res) {
          var files = extractDerivedFiles(res.data);
          return {
            step: 'dsdo:Locate ' + type,
            status: res.status,
            ok: res.ok,
            fileCount: files.fileCount,
            formats: files.formats,
            error: res.ok ? '' : res.error || res.wafMessage
          };
        });
      });
    }

    var expandUrl =
      spaceUrl +
      '/resources/v1/modeler/dseng/dseng:EngItem/' +
      encodeURIComponent(referenceId) +
      '/expand';
    var expandBody = JSON.stringify({
      expandDepth: 2,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    });

    return getCsrf(waf, spaceUrl, securityContext)
      .then(function (csrf) {
        var headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          SecurityContext: securityContext
        };
        if (csrf.ok && csrf.value) headers[csrf.name] = csrf.value;
        return wafRequest(waf, expandUrl, {
          method: 'POST',
          type: 'json',
          headers: headers,
          data: expandBody
        });
      })
      .then(function (expandRes) {
        var shapes = [];
        extractMembers(expandRes.data).forEach(function (m) {
          if (m && /3DShape|ds3sh/i.test(s(m.type))) shapes.push(s(m.id || m.physicalid));
        });
        result.steps.push({
          step: 'dseng:expand 3DShape search',
          status: expandRes.status,
          ok: expandRes.ok,
          shapeCount: shapes.length
        });
        return locateDerived('VPMReference', referenceId).then(function (locateRef) {
          result.steps.push(locateRef);
          if (locateRef.ok) {
            result.derivedOutputLocateOk = true;
            result.fileCount = locateRef.fileCount;
            result.formats = locateRef.formats;
          }
          if (shapes.length) {
            return locateDerived('3DShape', shapes[0]).then(function (locateShape) {
              result.steps.push(locateShape);
              if (locateShape.ok && locateShape.fileCount > result.fileCount) {
                result.derivedOutputLocateOk = true;
                result.fileCount = locateShape.fileCount;
                result.formats = locateShape.formats;
              }
              return result;
            });
          }
          return result;
        });
      })
      .catch(function (err) {
        result.error = s(err && err.message);
        return result;
      });
  }

  function probeMaturityReadOnly(ctx) {
    ctx = ctx || {};
    var waf = ctx.waf;
    var spaceUrl = cleanUrl(ctx.spaceUrl || SPACE_URL);
    var securityContext = s(ctx.securityContext || getSecurityContext());
    var referenceId = s(ctx.referenceId || TAMPO_ID);
    var url = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem/' + encodeURIComponent(referenceId);
    var out = {
      tested: true,
      readOnly: true,
      maturityReadOk: false,
      current: '',
      transitions: [],
      steps: []
    };

    return wafRequest(waf, url, {
      method: 'GET',
      type: 'json',
      headers: { Accept: 'application/json', SecurityContext: securityContext }
    })
      .then(function (res) {
        out.steps.push({ step: 'GET EngItem state', status: res.status, ok: res.ok });
        if (res.ok) {
          out.current = extractStateFromEngItem(res.data);
          out.maturityReadOk = !!out.current;
        }
        var invokeUrl =
          spaceUrl +
          '/resources/v1/modeler/dseng/dseng:EngItem/' +
          encodeURIComponent(referenceId) +
          '/invoke/dseng:GetNextStates';
        var invokeBody = JSON.stringify({ currentState: out.current, state: out.current });
        return getCsrf(waf, spaceUrl, securityContext).then(function (csrf) {
          var headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            SecurityContext: securityContext
          };
          if (csrf.ok && csrf.value) headers[csrf.name] = csrf.value;
          return wafRequest(waf, invokeUrl, {
            method: 'POST',
            type: 'json',
            headers: headers,
            data: invokeBody
          }).then(function (invokeRes) {
            out.steps.push({
              step: 'invoke dseng:GetNextStates',
              status: invokeRes.status,
              ok: invokeRes.ok
            });
            if (invokeRes.ok && invokeRes.data) {
              var data = invokeRes.data;
              var list =
                (data.results && data.results[0] && data.results[0].states) ||
                data.states ||
                data.transitions ||
                [];
              if (Array.isArray(list)) {
                out.transitions = list.map(function (t) {
                  return typeof t === 'string' ? t : s(t.state || t.name || t.label);
                }).filter(Boolean);
              }
              if (out.transitions.length) out.maturityReadOk = true;
            } else if (out.current) {
              out.maturityReadOk = true;
            }
            out.error = invokeRes.ok ? '' : invokeRes.error || invokeRes.wafMessage;
            out.pending = !invokeRes.ok ? 'GetNextStates unavailable on tenant (read-only state from GET only)' : '';
            return out;
          });
        });
      })
      .catch(function (err) {
        out.error = s(err && err.message);
        return out;
      });
  }

  function runAll(options) {
    options = options || {};
    var startedAt = new Date().toISOString();
    var report = {
      build: BUILD,
      startedAt: startedAt,
      spaceUrlHost: 'r1132100929518-us1-space.3dexperience.3ds.com',
      securityContextConfigured: !!getSecurityContext(),
      wafAvailable: false,
      canReadRoot: false,
      expandOk: false,
      rowsDetected: 0,
      derivedOutput: { tested: false, fileCount: 0 },
      maturity: { tested: false, readOnly: true },
      pass: false,
      recommendation: ''
    };

    console.log('[__bomWafProbe] starting runAll…');

    return probeWafAvailability()
      .then(function (wafResult) {
        report.wafAvailable = !!wafResult.wafAvailable;
        report.wafSource = wafResult.source || '';
        if (!wafResult.wafAvailable) {
          report.error = wafResult.error || 'WAFData unavailable';
          report.recommendation = 'FAIL — WAFData not available in this frame. E-BOM cannot migrate to session path here.';
          report.finishedAt = new Date().toISOString();
          console.log('[__bomWafProbe] result:', report);
          return report;
        }
        var ctx = {
          waf: wafResult.waf,
          spaceUrl: options.spaceUrl || SPACE_URL,
          securityContext: options.securityContext || getSecurityContext(),
          rootId: options.rootId || ROOT_ID,
          referenceId: options.referenceId || TAMPO_ID
        };
        return probeGetRoot(ctx)
          .then(function (root) {
            report.canReadRoot = !!root.canReadRoot;
            report.root = root;
            return probeExpand(ctx);
          })
          .then(function (expand) {
            report.expandOk = !!expand.expandOk;
            report.rowsDetected = n(expand.rowsDetected);
            report.expand = expand;
            report.csrfRequiredForExpand = !!expand.csrfUsed || expand.csrfFetchOk === false;
            return probeDerivedOutput(ctx);
          })
          .then(function (derived) {
            report.derivedOutput = {
              tested: true,
              derivedOutputLocateOk: !!derived.derivedOutputLocateOk,
              fileCount: n(derived.fileCount),
              formats: derived.formats || [],
              steps: (derived.steps || []).map(function (step) {
                return {
                  step: step.step,
                  status: step.status,
                  ok: step.ok,
                  fileCount: step.fileCount,
                  shapeCount: step.shapeCount
                };
              })
            };
            return probeMaturityReadOnly(ctx);
          })
          .then(function (maturity) {
            report.maturity = {
              tested: true,
              readOnly: true,
              maturityReadOk: !!maturity.maturityReadOk,
              current: maturity.current || '',
              transitions: maturity.transitions || [],
              pending: maturity.pending || ''
            };
            report.pass =
              report.wafAvailable &&
              report.canReadRoot &&
              report.expandOk &&
              report.rowsDetected >= 5;
            if (report.pass) {
              report.recommendation =
                'PASS — WAFData session can load E-BOM (root + expand). Document migration path; keep Render for offline/CI only.';
            } else if (report.wafAvailable && report.canReadRoot && !report.expandOk) {
              report.recommendation =
                'PARTIAL — root readable but expand failed. Check CSRF/roles or expandDepth.';
            } else if (!report.wafAvailable) {
              report.recommendation = 'FAIL — WAFData unavailable in Web Page Reader frame.';
            } else {
              report.recommendation =
                'FAIL — WAFData present but dseng calls blocked. Keep Render path; open SR for server-side CAS.';
            }
            report.finishedAt = new Date().toISOString();
            console.log('[__bomWafProbe] result:', report);
            return report;
          });
      })
      .catch(function (err) {
        report.error = s(err && err.message);
        report.finishedAt = new Date().toISOString();
        report.recommendation = 'FAIL — probe exception: ' + report.error;
        console.log('[__bomWafProbe] result:', report);
        return report;
      });
  }

  function installUi() {
    try {
      if (w.__waf3dxClient && w.__waf3dxClient.installDiagnosticUi) return;
      var root = w.__3DX_UI_ROOT__ || (w.widget && w.widget.body) || document;
      if (!root || !root.querySelector) return;
      var panel = root.querySelector('#bomRulesPanel');
      if (!panel || root.querySelector('#btnWafProbe')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnWafProbe';
      btn.className = 'bom-btn bom-btn-secondary';
      btn.textContent = 'Testar sessão 3DX';
      btn.title = 'Probe WAFData — console: window.__bomWafProbe.runAll()';
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = 'Testando sessão 3DX…';
        runAll().then(function (report) {
          btn.disabled = false;
          btn.textContent = 'Testar sessão 3DX';
          var bar = root.querySelector('#statusBar');
          if (bar) {
            bar.textContent = report.pass
              ? 'WAFData OK — root + expand ' + report.rowsDetected + ' linhas'
              : 'WAFData probe: ' + (report.error || report.recommendation || 'ver console');
            bar.className = 'bom-st ' + (report.pass ? 'bom-st-ok' : 'bom-st-err');
          }
          try {
            var diag = root.querySelector('#skaBomDiagnostics');
            if (diag) {
              diag.classList.remove('bom-hidden');
              diag.textContent = 'WAFData probe: ' + JSON.stringify(report, null, 2);
            }
          } catch (e2) { /* */ }
        });
      });
      panel.appendChild(btn);
    } catch (e) { /* */ }
  }

  w.__bomWafProbe = {
    build: BUILD,
    runAll: runAll,
    probeWafAvailability: probeWafAvailability,
    probeGetRoot: function () {
      return probeWafAvailability().then(function (r) {
        if (!r.wafAvailable) return { canReadRoot: false, error: r.error };
        return probeGetRoot({ waf: r.waf });
      });
    },
    probeExpand: function () {
      return probeWafAvailability().then(function (r) {
        if (!r.wafAvailable) return { expandOk: false, error: r.error };
        return probeExpand({ waf: r.waf });
      });
    },
    probeDerivedOutput: function () {
      return probeWafAvailability().then(function (r) {
        if (!r.wafAvailable) return { tested: false, error: r.error };
        return probeDerivedOutput({ waf: r.waf });
      });
    },
    probeMaturityReadOnly: function () {
      return probeWafAvailability().then(function (r) {
        if (!r.wafAvailable) return { tested: false, error: r.error };
        return probeMaturityReadOnly({ waf: r.waf });
      });
    },
    installUi: installUi,
    constants: {
      SPACE_URL: SPACE_URL,
      ROOT_ID: ROOT_ID,
      TAMPO_ID: TAMPO_ID,
      SECURITY_CONTEXT: SECURITY_CONTEXT
    }
  };

  if (typeof w.__bomWafProbeInstall === 'function') {
    w.__bomWafProbeInstall();
  } else {
    installUi();
  }
})(typeof window !== 'undefined' ? window : this);
