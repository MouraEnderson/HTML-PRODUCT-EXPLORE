/* PR 4 — Frontend consume SKA BOM Service (dseng via Render) */
(function () {
  'use strict';

  var w = window;
  var BUILD = 'bom20260615a';
  var SKA_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure';
  var DATA_SOURCE = 'ska-bom-service';
  var DEFAULT_ROOT = '63FC553465A62400699E0792000086AB';
  var DEFAULT_DEPTH = 1;

  w.__BOM_BUILD_ID__ = BUILD;
  w.BOM_BUILD_ID = BUILD;
  w.__BOM_DATA_SOURCE__ = DATA_SOURCE;
  w.__BOM_LOADER_MODE__ = DATA_SOURCE;
  w.__BOM_HOTFIX_MODE__ = DATA_SOURCE;

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  function n(v) {
    var x = Number(v);
    return isFinite(x) ? x : 0;
  }

  function uiRoot() {
    return w.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = uiRoot();
    return root.querySelector ? root.querySelector('#' + id) : document.getElementById(id);
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syncBuild() {
    try {
      if (typeof w.APP_CONFIG !== 'undefined') w.APP_CONFIG.BUILD = BUILD;
      var pill = byId('buildTag') || (uiRoot().querySelector && uiRoot().querySelector('.bom-build-pill'));
      if (pill) {
        var m = BUILD.match(/^bom(\d{8})([a-z])$/i);
        pill.textContent = m ? m[1].slice(-2) + m[2] : BUILD;
        pill.title = BUILD;
      }
    } catch (e) {}
  }

  function setStatus(msg, kind) {
    if (w.App && w.App.setStatus) w.App.setStatus(msg, kind);
    else {
      var el = byId('statusBar');
      if (el) {
        el.textContent = msg;
        el.className = 'bom-st' + (kind === 'ok' ? ' bom-st-ok' : kind === 'error' ? ' bom-st-err' : '');
      }
    }
  }

  function mapErrorMessage(code, fallback) {
    var map = {
      UPSTREAM_NOT_CONFIGURED: 'SKA BOM Service não está configurado para dseng real no Render.',
      UPSTREAM_AUTH_FAILED: 'Falha de autenticação no 3DEXPERIENCE. Validar credenciais no Render.',
      UPSTREAM_AUTH_NOT_IMPLEMENTED:
        'Modo de autenticação 3DEXPERIENCE não configurado explicitamente.',
      ROOT_NOT_FOUND: 'RootId não encontrado ou não acessível para o usuário/security context configurado.',
      UPSTREAM_DSENG_ERROR: 'Falha na chamada dseng. Ver detalhes técnicos abaixo.',
      INTERNAL_ERROR: 'Erro interno no SKA BOM Service.',
      ROOT_ID_REQUIRED: 'Informe o Root Physical ID.',
      INVALID_DEPTH: 'Profundidade inválida.',
      DEPTH_LIMIT_EXCEEDED: 'Profundidade acima do limite dseng v1.'
    };
    if (code === 'HTTP_0' || code === 'TypeError' || code === 'Failed to fetch') {
      return 'Falha de rede ou CORS ao chamar o SKA BOM Service.';
    }
    return map[code] || fallback || 'Falha ao carregar BOM via SKA BOM Service.';
  }

  function normalizeSkaError(err) {
    if (!err) {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'Falha ao carregar BOM via SKA BOM Service.',
        payload: null
      };
    }

    var rawMessage = String(err.message || '');
    var rawName = String(err.name || '');
    var code = err.code || '';

    if (
      code === 'HTTP_0' ||
      rawName === 'TypeError' ||
      rawMessage.indexOf('Failed to fetch') >= 0 ||
      rawMessage.indexOf('NetworkError') >= 0
    ) {
      return {
        code: 'HTTP_0',
        message: 'Falha de rede ou CORS ao chamar o SKA BOM Service.',
        payload: err.payload || null
      };
    }

    return {
      code: code || 'UNKNOWN_ERROR',
      message: mapErrorMessage(code, rawMessage || 'Falha ao carregar BOM via SKA BOM Service.'),
      payload: err.payload || null
    };
  }

  async function fetchBomStructureFromSkaService(opts) {
    opts = opts || {};
    var response = await fetch(SKA_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rootId: opts.rootId,
        depth: opts.depth == null ? DEFAULT_DEPTH : opts.depth,
        includeRoot: opts.includeRoot !== false,
        mode: 'dseng-official'
      })
    });

    var text = await response.text();
    var payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (e) {
      payload = null;
    }

    if (!response.ok || !payload || payload.ok === false) {
      var code =
        payload && payload.error && payload.error.code ? payload.error.code : 'HTTP_' + response.status;
      var message =
        payload && payload.error && payload.error.message
          ? payload.error.message
          : mapErrorMessage(code, 'Falha ao carregar BOM via SKA BOM Service.');
      var err = new Error(mapErrorMessage(code, message));
      err.code = code;
      err.status = response.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  }

  function mapSkaRowsToImportItems(rows) {
    return (rows || []).map(function (row, idx) {
      return {
        level: Number(row.level || 0),
        physicalid: row.physicalId || row.instanceId || row.rowKey || 'ska_' + idx,
        name: row.instanceName || row.name || row.title || 'Item ' + idx,
        title: row.title || row.name || row.instanceName || 'Item ' + idx,
        type: row.format || row.type || 'VPMReference',
        displayType: row.format || row.type || 'VPMReference',
        revision: row.revision || '',
        state: row.maturity || '',
        maturity: row.maturity || '',
        owner: row.owner || '',
        approval: 'Unknown',
        quantity: row.quantity || 1,
        sourcePhysicalId: row.physicalId || '',
        parentId: row.parentId || '',
        instanceName: row.instanceName || '',
        referenceId: row.physicalId || '',
        description: row.description || '',
        rowKey: row.rowKey || ''
      };
    });
  }

  function renderSkaDiagnostics(payload) {
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var diag = (payload && payload.diagnostics) || {};
    var endpoints = (diag.endpointsUsed || [])
      .map(function (ep) {
        return (ep.method || 'GET') + ' ' + (ep.endpoint || '?') + ' (' + (ep.status || '?') + ')';
      })
      .join('; ');
    var warnings = (diag.warnings || []).join(' · ');
    var errors = (diag.errors || []).join(' · ');
    panel.classList.remove('bom-hidden');
    panel.innerHTML =
      '<strong>SKA BOM Service Diagnostics</strong><br/>' +
      'source: ' +
      escapeHtml(payload.source || 'RENDER_BOM_SERVICE') +
      ' · mode: ' +
      escapeHtml(payload.mode || 'dseng-official') +
      ' · status: ' +
      escapeHtml(diag.status || 'OK') +
      ' · durationMs: ' +
      escapeHtml(String(diag.durationMs != null ? diag.durationMs : 0)) +
      '<br/>endpointsUsed: ' +
      escapeHtml(endpoints || '(none)') +
      (warnings ? '<br/>warnings: ' + escapeHtml(warnings) : '') +
      (errors ? '<br/>errors: ' + escapeHtml(errors) : '');
  }

  function renderSkaKpiSummary(payload) {
    var grid = byId('kpiGrid');
    if (!grid || !payload) return;
    var counts = payload.counts || {};
    var level1 = (counts.levelCounts && counts.levelCounts['1']) || 0;
    var markers = [
      { tone: 'blue', label: 'Root', value: (payload.root && payload.root.title) || (payload.root && payload.root.id) || '-' },
      { tone: 'green', label: 'Total linhas', value: counts.totalRows || (payload.rows && payload.rows.length) || 0 },
      { tone: 'purple', label: 'Profundidade', value: counts.depth != null ? counts.depth : DEFAULT_DEPTH },
      { tone: 'red', label: 'Nível 1', value: level1 },
      { tone: 'blue', label: 'Status', value: (payload.diagnostics && payload.diagnostics.status) || 'OK' },
      { tone: 'green', label: 'Fonte', value: 'SKA BOM Service' }
    ];
    grid.innerHTML = markers
      .map(function (m) {
        return (
          '<div class="stat-marker stat-marker-' +
          m.tone +
          '"><span class="stat-marker-label">' +
          escapeHtml(String(m.label)) +
          '</span><span class="stat-marker-value">' +
          escapeHtml(String(m.value)) +
          '</span></div>'
        );
      })
      .join('');
  }

  function updateSyncBanner(payload) {
    var banner = byId('syncBanner');
    if (!banner) return;
    banner.classList.remove('bom-hidden');
    banner.innerHTML =
      'Fonte oficial: <strong>SKA BOM Service</strong> (dseng). ' +
      'O Product Structure Explorer visual não é a fonte de dados desta tela. ' +
      'Root: <strong>' +
      escapeHtml((payload.root && payload.root.title) || '') +
      '</strong> · linhas: <strong>' +
      escapeHtml(String((payload.counts && payload.counts.totalRows) || 0)) +
      '</strong>.';
  }

  function applySkaPayloadToUI(payload) {
    var items = mapSkaRowsToImportItems(payload.rows || []);
    if (!items.length) {
      return Promise.reject(new Error('SKA BOM Service retornou 0 linhas.'));
    }
    var rootName = (payload.root && payload.root.title) || (payload.root && payload.root.id) || 'E-BOM';

    if (typeof w.APP_CONFIG !== 'undefined') {
      w.APP_CONFIG.IMPORT_MODE = true;
      w.APP_CONFIG.DEMO_MODE = false;
      w.APP_CONFIG.DATA_SOURCE = DATA_SOURCE;
    }

    var applyChain;
    if (w.BomSnapshot && w.BomSnapshot.buildFromImported && w.BomSnapshot.applyPayload) {
      var snap = w.BomSnapshot.buildFromImported(items, rootName);
      if (snap) snap.scrapeSource = DATA_SOURCE;
      applyChain = w.BomSnapshot.applyPayload(snap);
    } else if (w.BomService && w.BomService.loadFromImportedItems) {
      if (w.BomService.reset) w.BomService.reset();
      applyChain = Promise.resolve(w.BomService.loadFromImportedItems(items));
    } else {
      return Promise.reject(new Error('Pipeline de importação indisponível (BomSnapshot/BomService).'));
    }

    return applyChain.then(function () {
      var lbl = byId('selectionLabel');
      if (lbl) lbl.textContent = rootName;
      var tableLbl = byId('tableProductLabel');
      if (tableLbl) tableLbl.textContent = rootName;
      if (w.App && w.App.refreshUI) w.App.refreshUI();
      renderSkaKpiSummary(payload);
      renderSkaDiagnostics(payload);
      updateSyncBanner(payload);
      var total = (payload.counts && payload.counts.totalRows) || items.length;
      setStatus(
        'SKA BOM Service: ' + total + ' linhas · ' + rootName + ' · diagnostics ' + ((payload.diagnostics && payload.diagnostics.status) || 'OK'),
        'ok'
      );
      w.__bomSkaLastPayload = payload;
      return payload;
    });
  }

  function getRootIdFromInput() {
    var el = byId('explorerObjectId');
    return s(el && el.value);
  }

  function loadViaSkaService() {
    var rootId = getRootIdFromInput();
    if (!rootId) {
      setStatus('Informe o Root Physical ID.', 'error');
      return Promise.reject(new Error('ROOT_ID_REQUIRED'));
    }

    var btn = byId('btnImportPaste');
    if (btn) btn.disabled = true;
    setStatus('Carregando BOM via SKA BOM Service…', 'info');

    return fetchBomStructureFromSkaService({
      rootId: rootId,
      depth: DEFAULT_DEPTH,
      includeRoot: true
    })
      .then(function (payload) {
        return applySkaPayloadToUI(payload);
      })
      .catch(function (err) {
        var normalized = normalizeSkaError(err);
        renderSkaDiagnostics(
          normalized.payload || {
            source: 'RENDER_BOM_SERVICE',
            mode: 'dseng-official',
            diagnostics: {
              status: 'ERROR',
              endpointsUsed: [],
              errors: [normalized.message],
              warnings: []
            }
          }
        );
        setStatus(normalized.message, 'error');
        throw err;
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function patchUiLabels() {
    var btn = byId('btnImportPaste');
    if (btn) btn.textContent = 'Carregar BOM via SKA Service';
    var idEl = byId('explorerObjectId');
    if (idEl) {
      idEl.placeholder = 'Root Physical ID';
      idEl.setAttribute('aria-label', 'Root Physical ID');
      idEl.setAttribute('title', 'Root Physical ID');
      if (!s(idEl.value)) idEl.value = DEFAULT_ROOT;
    }
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML =
        'A fonte oficial deste dashboard é o <strong>SKA BOM Service</strong> via dseng. ' +
        'O Product Structure Explorer visual não é a fonte de dados desta tela.';
    }
  }

  function bindPrimaryButton() {
    var btn = byId('btnImportPaste');
    if (!btn) return;
    if (btn.__BOM_SKA_BOUND__ && btn.__BOM_SKA_NODE__ === btn) return;
    var clone = btn.cloneNode(true);
    clone.textContent = 'Carregar BOM via SKA Service';
    clone.className = btn.className;
    clone.id = 'btnImportPaste';
    btn.parentNode.replaceChild(clone, btn);
    clone.__BOM_SKA_BOUND__ = true;
    clone.__BOM_SKA_NODE__ = clone;
    clone.addEventListener(
      'click',
      function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }
        loadViaSkaService().catch(function () {});
      },
      true
    );
  }

  function patchOrchestrator() {
    if (!w.BomOrchestrator || !w.BomOrchestrator.refreshStructure) return;
    w.BomOrchestrator.refreshStructure = function (options) {
      options = options || {};
      if (options.source === 'manual') return loadViaSkaService();
      return loadViaSkaService();
    };
    w.BomOrchestrator.__BOM_SKA_PATCHED__ = true;
  }

  function patchScanner() {
    if (!w.ExplorerScanner || !w.ExplorerScanner.scan) return;
    w.ExplorerScanner.scan = function () {
      return loadViaSkaService();
    };
    w.ExplorerScanner.__BOM_SKA_PATCHED__ = true;
  }

  function disableLegacyOperationalBlockers() {
    try {
      if (typeof w.APP_CONFIG !== 'undefined') {
        w.APP_CONFIG.ALLOW_PASTE_FALLBACK = false;
        w.APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = false;
        w.APP_CONFIG.PASTE_TRAP_ENABLED = false;
        w.APP_CONFIG.DATA_SOURCE = DATA_SOURCE;
        w.APP_CONFIG.PRIMARY_LOADER = DATA_SOURCE;
      }
      w.__BOM_MIRROR_EXPLORER_MODE__ = false;
      w.__BOM_CLIPBOARD_RUNTIME_DISABLED__ = true;
    } catch (e) {}
  }

  function install() {
    syncBuild();
    disableLegacyOperationalBlockers();
    patchUiLabels();
    bindPrimaryButton();
    patchOrchestrator();
    patchScanner();
    if (w.App && w.App.rebindImportButton) {
      w.App.rebindImportButton = function () {
        bindPrimaryButton();
      };
    }
    setTimeout(function () {
      bindPrimaryButton();
    }, 500);
    setTimeout(function () {
      bindPrimaryButton();
    }, 2000);
    setStatus('Build ' + BUILD + ' | SKA BOM Service', 'ok');
  }

  w.__bomSkaServiceInstall = install;
  w.fetchBomStructureFromSkaService = fetchBomStructureFromSkaService;
  w.mapSkaRowsToImportItems = mapSkaRowsToImportItems;
  w.loadViaSkaService = loadViaSkaService;

  install();
})();
