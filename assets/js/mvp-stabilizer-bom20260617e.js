/* MVP Stabilizer — 17d visual/labels only
 * Scope: UX compact, friendly labels, partial-count clarity.
 * Does NOT change E-BOM loader, parser, 3D resolver, lifecycle write or root resolution.
 */
(function () {
  'use strict';
  var w = window;
  var BUILD = 'bom20260617e';

  function root() {
    return w.__3DX_UI_ROOT__ || document;
  }

  function q(sel) {
    var r = root();
    return r && r.querySelector ? r.querySelector(sel) : document.querySelector(sel);
  }

  function qa(sel) {
    var r = root();
    return r && r.querySelectorAll ? Array.prototype.slice.call(r.querySelectorAll(sel)) : [];
  }

  function txt(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function isFunctionText(value) {
    return /^\s*function\s*\(/i.test(String(value || '')) || /\[native code\]/i.test(String(value || ''));
  }

  function friendlyMaturity(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw || raw === '—' || isFunctionText(raw)) return raw || '—';
    var key = raw.toUpperCase().replace(/\s+/g, '_');
    if (key === 'IN_WORK' || key === 'INWORK' || key === 'EM_TRABALHO') return 'Em Trabalho';
    if (key === 'RELEASED' || key === 'APPROVED' || key === 'APROVADO') return 'Aprovado';
    if (key === 'OBSOLETE' || key === 'OBSOLETO') return 'Obsoleto';
    return raw;
  }

  function friendlyOwner(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw || raw === '—' || isFunctionText(raw)) return raw || '—';
    var key = raw.toLowerCase();
    if (key === 'rafael.ruiz' || key === 'rafael tenorio ruiz') return 'Rafael Tenorio Ruiz';
    if (key === 'enderso.moura' || key === 'enderson.moura' || key === 'enderson moura') return 'Enderson Moura';
    return raw;
  }

  function friendlyTitle(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw || isFunctionText(raw)) return raw || '—';
    // The Product Explorer usually displays the reference title; dashboard rows may use instance labels like Tampo.1.
    return raw.replace(/\.\d+$/g, '');
  }

  function injectCss() {
    if (document.getElementById('bomMvpStabilizerCss')) return;
    var css = document.createElement('style');
    css.id = 'bomMvpStabilizerCss';
    css.textContent = [
      '.bom-dashboard{font-size:11px!important;line-height:1.25!important;}',
      '.bom-layout-page{gap:3px!important;padding:2px!important;grid-template-rows:32px minmax(86px,25%) minmax(0,1fr)!important;}',
      '.bom-topbar{min-height:28px!important;height:30px!important;padding:2px 6px!important;gap:4px!important;overflow:hidden!important;}',
      '.bom-topbar-left,.bom-topbar-center,.bom-topbar-actions{gap:4px!important;min-width:0!important;}',
      '.bom-topbar-product,#selectionLabel{max-width:180px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}',
      '.bom-topbar-clock,#lastUpdateClock,.bom-waf3dx-topbar-trigger,#btnWaf3dxDiagToggle,#explorerSourceBadge{display:none!important;}',
      '.bom-topbar-more{font-size:10px!important;max-width:56px!important;}',
      '.bom-btn{min-height:22px!important;padding:3px 8px!important;font-size:10px!important;border-radius:8px!important;}',
      '.bom-btn-primary{font-weight:700!important;}',
      '.bom-build-pill,.bom-source-badge,.bom-explorer-context-status{font-size:9px!important;padding:1px 5px!important;white-space:nowrap!important;}',
      '.bom-zone-2-scroll{overflow:hidden!important;}',
      '.bom-filter-bar-quad{padding:3px 5px!important;gap:4px!important;grid-template-columns:80px 70px 80px minmax(120px,1fr) 56px!important;}',
      '.bom-filter-item{font-size:9px!important;gap:1px!important;}',
      '.bom-filter-item select,.bom-filter-item input{height:24px!important;padding:2px 6px!important;font-size:10px!important;}',
      '.bom-charts-row{gap:4px!important;padding:3px!important;}',
      '.bom-chart-panel{min-height:0!important;overflow:hidden!important;}',
      '.bom-chart-heading{font-size:10px!important;margin:0 0 2px!important;}',
      '.bom-chart-canvas-box{height:82px!important;max-height:82px!important;}',
      '.bom-chart-legend-list{font-size:9px!important;max-height:28px!important;overflow:auto!important;padding:0 4px!important;}',
      '.bom-ebom-head{padding:4px 8px!important;}',
      '.bom-ebom-head h2{font-size:12px!important;margin:0!important;}',
      '.bom-ebom-meta{font-size:10px!important;margin:1px 0 0!important;}',
      '.bom-table{font-size:10.5px!important;}',
      '.bom-table th,.bom-table td{padding:4px 6px!important;vertical-align:middle!important;}',
      '.bom-table-pager{height:22px!important;min-height:22px!important;padding:3px 6px!important;font-size:10px!important;text-align:right!important;color:#5f7384!important;}',
      '.bom-preview-quad{padding:6px!important;}',
      '.bom-preview-hint{font-size:10px!important;margin:0 0 4px!important;}',
      '.bom-preview-image{min-height:72px!important;max-height:120px!important;padding:6px!important;}',
      '.bom-preview-placeholder{font-size:10px!important;}',
      '.bom-preview-meta{font-size:10.5px!important;line-height:1.35!important;}',
      '.bom-preview-dl{display:grid!important;grid-template-columns:82px minmax(0,1fr)!important;column-gap:8px!important;row-gap:4px!important;margin:0!important;}',
      '.bom-preview-dl dt{font-weight:700!important;color:#47657d!important;}',
      '.bom-preview-dl dd{margin:0!important;min-width:0!important;overflow-wrap:anywhere!important;}',
      '.bom-preview-id{font-size:9px!important;color:#38566b!important;}',
      '.bom-maturity-actions{margin-top:6px!important;border:0!important;background:transparent!important;padding:0!important;min-height:0!important;}',
      '#btnChangeMaturity{display:inline-block!important;width:auto!important;height:22px!important;min-height:22px!important;padding:2px 8px!important;font-size:10px!important;opacity:.75!important;}',
      '.bom-maturity-hint{font-size:9px!important;margin:3px 0 0!important;color:#6b7f90!important;}',
      '.bom-ska-diagnostics{font-size:10px!important;line-height:1.2!important;padding:2px 6px!important;max-height:22px!important;overflow:hidden!important;}',
      '.bom-ska-diag-chip{display:none!important;}',
      '.bom-sync-banner{font-size:10px!important;padding:4px 8px!important;margin:3px!important;}',
      '.bom-root .bom-st{font-size:10px!important;padding:3px 6px!important;min-height:18px!important;}'
    ].join('\n');
    document.head.appendChild(css);
  }

  function normalizeTextNodes() {
    var nodes = qa('#bomTable td, #bomTable th, #partPreviewMeta dd, #partPreviewMeta dt, #maturityLegendScroll *, #ownersLegendScroll *');
    nodes.forEach(function (el) {
      var value = el.textContent || '';
      if (!value) return;
      if (isFunctionText(value)) {
        txt(el, '—');
        return;
      }
      var next = value;
      next = next.replace(/\bIN_WORK\b/g, 'Em Trabalho');
      next = next.replace(/\bRELEASED\b/g, 'Aprovado');
      next = next.replace(/\bAPPROVED\b/g, 'Aprovado');
      next = next.replace(/\brafael\.ruiz\b/gi, 'Rafael Tenorio Ruiz');
      next = next.replace(/\benderso?n\.moura\b/gi, 'Enderson Moura');
      if (next !== value) txt(el, next);
    });
  }

  function normalizeTableRows() {
    qa('#bomTable tbody tr').forEach(function (tr) {
      var cells = Array.prototype.slice.call(tr.children || []);
      cells.forEach(function (td) {
        var text = td.textContent || '';
        if (isFunctionText(text)) td.textContent = '—';
      });
      // First text/title column often contains instance labels. Normalize only visible text suffix, not IDs.
      var first = cells[0];
      if (first && first.textContent && !/^[0-9A-F]{16,}$/i.test(first.textContent.trim())) {
        first.textContent = friendlyTitle(first.textContent);
      }
    });
  }

  function compactTopbar() {
    var refresh = q('#btnRefreshBom');
    if (refresh) refresh.textContent = 'Atualizar';
    var sync = q('#btnSyncExplorer');
    if (sync) sync.textContent = 'Sincronizar';
    var ctx = q('#explorerContextStatus');
    if (ctx && /contexto/i.test(ctx.textContent || '')) ctx.textContent = 'Contexto detectado';
    var adv = q('.bom-topbar-more summary');
    if (adv) adv.textContent = 'Avançado';
  }

  function compactPagerAndCount() {
    var pager = q('#tablePager');
    var payload = w.__bomSkaLastPayload || null;
    if (!pager) return;
    if (!payload || !payload.rows) {
      return;
    }
    var rows = payload.rows.length;
    var counts = payload.counts || {};
    var occ = counts.occurrenceCount != null ? counts.occurrenceCount : Math.max(rows - 1, 0);
    var refs = counts.uniqueReferenceCount || counts.referenceCount || '';
    var partial = payload.partial !== false || (payload.scope && payload.scope.isPartial !== false);
    var label = rows + ' linhas' + (occ !== '' ? ' · ' + occ + ' ocorr.' : '') + (refs ? ' · ' + refs + ' refs' : '');
    if (partial) label += ' · recorte dseng parcial';
    pager.textContent = label;
    pager.title = 'A contagem do Product Explorer é visual/expandida. A dashboard mostra o recorte dseng retornado pelo serviço atual.';
    var diag = q('#skaBomDiagnostics .bom-ska-diag-summary');
    if (diag && partial && diag.textContent.indexOf('recorte dseng parcial') < 0) {
      diag.textContent = diag.textContent.replace(/estrutura parcial|parcial/g, 'recorte dseng parcial');
    }
  }

  function normalizePreview() {
    var meta = q('#partPreviewMeta');
    if (!meta) return;
    normalizeTextNodes();
    var dds = qa('#partPreviewMeta dd');
    dds.forEach(function (dd) {
      var value = dd.textContent || '';
      if (isFunctionText(value)) dd.textContent = '—';
      else if (/^IN_WORK$/i.test(value.trim())) dd.textContent = 'Em Trabalho';
      else if (/^RELEASED$|^APPROVED$/i.test(value.trim())) dd.textContent = 'Aprovado';
      else if (/^rafael\.ruiz$/i.test(value.trim())) dd.textContent = 'Rafael Tenorio Ruiz';
    });
  }

  function apply() {
    injectCss();
    compactTopbar();
    normalizeTableRows();
    normalizeTextNodes();
    compactPagerAndCount();
    normalizePreview();
    w.__BOM_MVP_STABILIZER__ = { build: BUILD, appliedAt: new Date().toISOString() };
  }

  function boot() {
    apply();
    setTimeout(apply, 250);
    setTimeout(apply, 750);
    setTimeout(apply, 1500);
    setInterval(apply, 2000);
    try {
      var obs = new MutationObserver(function () {
        if (boot.__pending) return;
        boot.__pending = true;
        setTimeout(function () {
          boot.__pending = false;
          apply();
        }, 100);
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
