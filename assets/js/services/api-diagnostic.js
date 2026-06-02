/**
 * @file services/api-diagnostic.js
 * Spike API — prova WAF + dseng passo a passo (piloto 3DDashboard).
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
      return typeof WAFData !== 'undefined' && WAFData.authenticatedRequest;
    } catch (e) {
      return false;
    }
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
        return (r.ok ? 'OK' : 'FAIL') + '  ' + r.step + ' — ' + r.detail;
      })
      .join('\n');
  }

  function probeEngItem(physicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngItem) {
      return Promise.resolve(log('dseng:EngItem', false, 'EnoviaApi indisponível'));
    }
    var url = EnoviaApi.engItemUrl ? EnoviaApi.engItemUrl(physicalId) : physicalId;
    log('dseng:EngItem URL', true, url);
    return EnoviaApi.getEngItem(physicalId, null)
      .then(function (res) {
        var members =
          EnoviaApi.extractMembers && EnoviaApi.extractMembers(res);
        return log(
          'dseng:EngItem GET',
          true,
          'Resposta OK (' + (members ? members.length : 1) + ' member(s))'
        );
      })
      .catch(function (err) {
        return log('dseng:EngItem GET', false, err.message || String(err));
      });
  }

  function probeEngInstance(physicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngInstanceChildren) {
      return Promise.resolve(log('dseng:EngInstance', false, 'EnoviaApi indisponível'));
    }
    return EnoviaApi.getEngInstanceChildren(physicalId, 0, 5)
      .then(function (res) {
        var n =
          EnoviaApi.extractMembers && EnoviaApi.extractMembers(res);
        n = n ? n.length : 0;
        return log('dseng:EngInstance GET', true, 'Filhos visíveis: ' + n);
      })
      .catch(function (err) {
        return log('dseng:EngInstance GET', false, err.message || String(err));
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
   * Executa diagnóstico completo no piloto.
   * @returns {Promise<{ rows: object[], summary: string, physicalId: string }>}
   */
  function run(options) {
    options = options || {};
    window.__3DX_API_DIAG__ = [];
    var rows = [];
    function add(r) {
      rows.push(r);
      return r;
    }

    root.__3DX_ALLOW_API__ = true;
    root.__3DX_FORCE_API__ = true;

    add(log('WAFData', wafOk(), wafOk() ? 'authenticatedRequest disponível' : 'WAFData ausente'));

    var pCtx = PlatformContext.init ? PlatformContext.init() : Promise.resolve();
    return pCtx
      .then(function () {
        var st = PlatformContext.getState && PlatformContext.getState();
        add(
          log(
            'SecurityContext',
            !!(st && st.securityContext),
            (st && st.securityContext) || 'sem SecurityContext'
          )
        );
        try {
          var base = EnoviaApi.ensureRestBase();
          add(log('REST base', true, base));
        } catch (eBase) {
          add(log('REST base', false, eBase.message || String(eBase)));
        }
        var ctx = ctxSnapshot();
        if (!ctx) {
          add(log('ExplorerContext', false, 'ExplorerContext indisponível'));
          return null;
        }
        add(
          log(
            'Estrutura',
            !!(ctx.rootName || ctx.expectedCount),
            (ctx.rootName || '?') +
              ' — expected ' +
              (ctx.expectedCount || 0) +
              ' — physicalId ' +
              (ctx.physicalId || '(vazio)')
          )
        );
        return resolveId(ctx).then(function (pid) {
          if (!pid) {
            add(
              log(
                'physicalId',
                false,
                'Não resolvido — clique raiz no Explorer ou preencha ID em Avançado'
              )
            );
            return null;
          }
          add(log('physicalId', true, pid));
          return probeEngItem(pid).then(function () {
            return probeEngInstance(pid).then(function () {
              return pid;
            });
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
