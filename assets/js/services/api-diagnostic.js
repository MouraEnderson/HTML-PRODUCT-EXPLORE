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
          return probeEngItem(rows, pid)
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
