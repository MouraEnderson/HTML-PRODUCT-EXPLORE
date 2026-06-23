/*
 * BOM Analytics — inline root loader bom20260623d.
 * If auto-context cannot read the Product Explorer selection, expose an explicit
 * product-safe manual root path: dseng id, prd-R physical id, or exact title.
 */
(function (global) {
  'use strict';

  var timer = null;

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function ownRoot() {
    return global.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = ownRoot();
    return root && root.querySelector ? root.querySelector('#' + id) : null;
  }

  function getController() {
    return global.__bomWafSessionController;
  }

  function getState() {
    var controller = getController();
    if (!controller || !controller.getState) return null;
    try { return controller.getState(); } catch (e) { return null; }
  }

  function shouldShow(state) {
    if (!state) return true;
    var rows = Array.isArray(state.rows) ? state.rows : [];
    if (rows.length > 0) return false;
    if ((state.failures || []).length) return true;
    if (/indisponivel|nenhuma montagem|nao foi possivel|provider oficial/i.test(text(state.status))) return true;
    return true;
  }

  function getHost() {
    return byId('syncBanner') || byId('ebomMeta') || byId('tablePager') || byId('bomTable');
  }

  function ensurePanel() {
    var host = getHost();
    if (!host || !host.parentNode) return null;
    var panel = byId('bomInlineRootLoader');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'bomInlineRootLoader';
    panel.className = 'bom-sync-banner bom-sync-inline bom-sync-info';
    panel.style.margin = '4px 6px';
    panel.style.display = 'block';
    panel.innerHTML =
      '<div style="font-weight:600;margin-bottom:4px;">Carregar montagem raiz</div>' +
      '<div style="font-size:0.74rem;line-height:1.25;margin-bottom:6px;">Auto-contexto nao recebeu a selecao do Product Explorer. Cole o titulo exato, prd-R... ou ID dseng da montagem.</div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
      '<input id="bomInlineRootInput" class="bom-input" style="flex:1;min-width:0;" placeholder="Ex.: SKA_ENDERSW-BES-00009887 ou prd-R... ou dseng id" />' +
      '<button type="button" id="bomInlineRootBtn" class="bom-btn bom-btn-primary">Carregar E-BOM</button>' +
      '</div>';

    host.parentNode.insertBefore(panel, host.nextSibling);
    var btn = panel.querySelector('#bomInlineRootBtn');
    var input = panel.querySelector('#bomInlineRootInput');
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      var value = text(input && input.value);
      if (!value) {
        if (input) input.focus();
        return;
      }
      var existing = byId('explorerObjectId');
      if (existing) existing.value = value;
      var controller = getController();
      if (controller && controller.loadManualInput) {
        btn.disabled = true;
        btn.textContent = 'Carregando...';
        controller.loadManualInput()
          .catch(function () {})
          .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Carregar E-BOM';
          });
      }
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') btn.click();
    });
    return panel;
  }

  function updatePanel() {
    var state = getState();
    var panel = ensurePanel();
    if (!panel) return;
    panel.classList.toggle('bom-hidden', !shouldShow(state));
  }

  function boot() {
    updatePanel();
    if (!timer) timer = window.setInterval(updatePanel, 1200);
  }

  window.setTimeout(boot, 300);
})(window);
