/**
 * @file aier-widget-app.js
 * UI do Additional App Documentação 2D (3DDashboard).
 */
var AierWidgetApp = (function () {
  'use strict';

  var state = {
    apiOk: false,
    summary: null,
    lastJobId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, kind) {
    var el = $('aierStatusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'aier-status aier-status-' + (kind || 'info');
  }

  function badge(label, value, cls) {
    return '<div class="aier-kpi ' + cls + '"><span class="aier-kpi-label">' + label + '</span>' +
      '<span class="aier-kpi-value">' + value + '</span></div>';
  }

  function renderSummary(data) {
    var host = $('aierHealthPanel');
    if (!host) return;
    if (!data || !data.summary) {
      host.innerHTML = '<p class="aier-muted">Nenhum Collect piloto na API. Use Scan montagem.</p>';
      return;
    }
    state.summary = data;
    var s = data.summary;
    var link = (data.links && data.links.dashboardAnalysis) ||
      AierApiService.analysisUrl(data.collectId);
    var issues = (data.topIssues || [])
      .map(function (i) {
        return '<li><strong>' + i.name + '</strong> — ' + i.drawingStatus + '</li>';
      })
      .join('');

    host.innerHTML =
      '<div class="aier-kpi-row">' +
      badge('OK', s.present, 'aier-kpi-ok') +
      badge('Desat.', s.outdated, 'aier-kpi-warn') +
      badge('Falta', s.missing, 'aier-kpi-bad') +
      badge('Total', s.total, 'aier-kpi-neutral') +
      '</div>' +
      '<p class="aier-meta">Collect: <code>' + data.collectId + '</code></p>' +
      (issues ? '<ul class="aier-issues">' + issues + '</ul>' : '<p class="aier-muted">Sem pendências críticas.</p>') +
      '<a class="aier-link" href="' + link + '" target="_blank" rel="noopener">Abrir no dashboard de revisão</a>';
  }

  function checkApi() {
    setStatus('Verificando API…', 'info');
    return AierApiService.health()
      .then(function (h) {
        state.apiOk = h && h.status === 'healthy';
        var pill = $('aierApiPill');
        if (pill) {
          pill.textContent = state.apiOk ? 'API online' : 'API erro';
          pill.className = 'aier-pill ' + (state.apiOk ? 'aier-pill-ok' : 'aier-pill-err');
        }
        setStatus(state.apiOk ? 'API conectada.' : 'API indisponível.', state.apiOk ? 'ok' : 'error');
        return state.apiOk;
      })
      .catch(function (err) {
        state.apiOk = false;
        var pill = $('aierApiPill');
        if (pill) {
          pill.textContent = 'API offline';
          pill.className = 'aier-pill aier-pill-err';
        }
        setStatus(err.message || 'API offline (CORS ou URL)', 'error');
        return false;
      });
  }

  function refreshHealth() {
    if (!state.apiOk) {
      return checkApi().then(function (ok) {
        if (!ok) return;
        return refreshHealth();
      });
    }
    setStatus('Carregando saúde 2D…', 'info');
    return AierApiService.drawingHealthSummary()
      .then(function (data) {
        renderSummary(data);
        setStatus('Saúde 2D atualizada.', 'ok');
      })
      .catch(function (err) {
        renderSummary(null);
        setStatus(err.message || 'Falha ao ler saúde', 'error');
      });
  }

  function enqueue(label, promise) {
    setStatus(label + '…', 'info');
    return promise
      .then(function (res) {
        state.lastJobId = res && res.id ? res.id : null;
        var jobEl = $('aierLastJob');
        if (jobEl && state.lastJobId) {
          jobEl.innerHTML = 'Último job: <a href="' + AierApiService.analysisUrl(state.lastJobId) +
            '" target="_blank" rel="noopener">' + state.lastJobId + '</a>';
        }
        setStatus(label + ' enfileirado. Execute o worker SW (poll).', 'ok');
        return res;
      })
      .catch(function (err) {
        setStatus(err.message || label + ' falhou', 'error');
      });
  }

  function bindActions() {
    var btnHealth = $('btnAierRefreshHealth');
    var btnCollect = $('btnAierCollect');
    var btnDetail = $('btnAierDetailA');
    var btnRefresh = $('btnAierRefreshOutdated');
    var btnOpenDash = $('btnAierOpenDashboard');

    if (btnHealth) btnHealth.addEventListener('click', refreshHealth);
    if (btnCollect) {
      btnCollect.addEventListener('click', function () {
        enqueue('Collect montagem', AierApiService.collectAssembly());
      });
    }
    if (btnDetail) {
      btnDetail.addEventListener('click', function () {
        enqueue('Detail peça A', AierApiService.detailPartA());
      });
    }
    if (btnRefresh) {
      btnRefresh.addEventListener('click', function () {
        enqueue('Refresh desatualizados', AierApiService.refreshOutdated());
      });
    }
    if (btnOpenDash) {
      btnOpenDash.addEventListener('click', function () {
        var url = state.summary && state.summary.collectId
          ? AierApiService.analysisUrl(state.summary.collectId)
          : AierApiService.webBase();
        window.open(url, '_blank', 'noopener');
      });
    }
  }

  function run() {
    var cfg = typeof AIER_CONFIG !== 'undefined' ? AIER_CONFIG : {};
    var title = $('aierAppTitle');
    var sub = $('aierAppSubtitle');
    var build = $('aierBuildTag');
    if (title) title.textContent = cfg.APP_TITLE || 'Documentação 2D';
    if (sub) sub.textContent = cfg.APP_SUBTITLE || 'AI Engineering Reviewer';
    if (build) build.textContent = cfg.BUILD || '-';
    var apiHint = $('aierApiHint');
    if (apiHint) apiHint.textContent = AierApiService.apiBase();

    bindActions();
    checkApi().then(function () {
      if (state.apiOk) refreshHealth();
    });
  }

  return { run: run, refreshHealth: refreshHealth };
})();
