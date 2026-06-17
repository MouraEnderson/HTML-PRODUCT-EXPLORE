/* BOM Analytics runtime UX hotfix — removes the wrong side-panel toggle, restores charts/preview visibility and gives E-BOM priority inside 3DDashboard. */
(function () {
  'use strict';

  var w = window;
  var d = document;
  var STYLE_ID = 'bomUxRuntimeFix20260617d';
  var APPLY_COUNT = 0;
  var MAX_APPLY_COUNT = 40;

  function uiRoot() {
    return w.__3DX_UI_ROOT__ || d;
  }

  function queryAll(selector) {
    var root = uiRoot();
    var out = [];
    try {
      if (root && root.querySelectorAll) {
        out = Array.prototype.slice.call(root.querySelectorAll(selector));
      }
    } catch (e) {}
    try {
      if (d && d.querySelectorAll && root !== d) {
        Array.prototype.slice.call(d.querySelectorAll(selector)).forEach(function (node) {
          if (out.indexOf(node) < 0) out.push(node);
        });
      }
    } catch (e2) {}
    return out;
  }

  function byId(id) {
    var root = uiRoot();
    var el = null;
    try {
      if (root && root.querySelector) el = root.querySelector('#' + id);
    } catch (e) {}
    if (!el) {
      try { el = d.getElementById(id); } catch (e2) {}
    }
    return el;
  }

  function injectCss() {
    if (d.getElementById(STYLE_ID)) return;
    var css = [
      'html body #btnToggleRightPanel{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard{grid-template-columns:minmax(0,1fr) clamp(150px,18vw,230px)!important;grid-template-rows:auto minmax(0,1fr)!important;gap:4px!important;padding:2px!important;align-items:stretch!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard>.bom-zone-2{grid-column:1!important;grid-row:1!important;min-height:0!important;max-height:100px!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard>.bom-zone-3{display:flex!important;grid-column:2!important;grid-row:1!important;min-width:0!important;min-height:0!important;max-height:150px!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard>.bom-zone-4{grid-column:1!important;grid-row:2!important;min-width:0!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard>.bom-zone-5{display:flex!important;grid-column:2!important;grid-row:2!important;min-width:0!important;min-height:0!important;overflow:hidden auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard #syncBanner,html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard #kpiGrid{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-zone-2-scroll{gap:2px!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-ska-diagnostics{min-height:20px!important;max-height:30px!important;padding:2px 5px!important;line-height:1.15!important;overflow:hidden!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-ska-diag-summary{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-filter-bar-quad{padding:2px 4px!important;gap:2px 4px!important;align-items:end!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-filter-bar-quad .bom-filter-item span{font-size:.58rem!important;margin-bottom:0!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-filter-bar-quad select,html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-filter-bar-quad input{min-height:22px!important;padding:2px 5px!important;font-size:.67rem!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-filter-bar-quad .bom-btn{min-height:22px!important;padding:3px 7px!important;font-size:.67rem!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-zone-4 .bom-ebom-head{padding:4px 8px!important;flex:0 0 auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-zone-4 .bom-table-wrap{flex:1 1 auto!important;min-height:250px!important;max-height:none!important;overflow:auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-table-pager{flex:0 0 auto!important;padding:5px 8px!important;font-size:.78rem!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-charts-unified-scroll{padding:2px 4px!important;overflow:hidden auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-charts-row-quad{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:4px!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-chart-canvas-box{height:clamp(70px,10vh,92px)!important;min-height:70px!important;max-height:92px!important;flex-basis:clamp(70px,10vh,92px)!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .cf-pie.cf-pie-quad{width:74px!important;height:74px!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-chart-heading{font-size:.66rem!important;line-height:1.05!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-chart-legend-list,html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-chart-legend-list .owners-legend-item{font-size:.58rem!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-zone-5 .bom-preview-body{padding:5px 6px!important;overflow:auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-zone-5 #partPreviewImage{min-height:80px!important;max-height:125px!important;flex:0 0 auto!important}',
      'html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-3dplay-host,html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard .bom-3dplay-2d-panel{min-height:80px!important}',
      '@media (max-width:820px){html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard{grid-template-columns:minmax(0,1fr) 150px!important}html body .bom-root.bom-dashboard.bom-layout-page.bom-3dx-product-dashboard>.bom-zone-5{display:none!important}}'
    ].join('\n');
    var style = d.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.appendChild(d.createTextNode(css));
    (d.head || d.documentElement).appendChild(style);
  }

  function removeCollapseState() {
    try { if (w.localStorage) w.localStorage.removeItem('bomAnalyticsRightPanel'); } catch (e) {}
    try { if (d.body) d.body.classList.remove('bom-side-collapsed'); } catch (e2) {}
    queryAll('.bom-side-collapsed').forEach(function (node) {
      try { node.classList.remove('bom-side-collapsed'); } catch (e3) {}
    });
  }

  function removePanelButton() {
    queryAll('#btnToggleRightPanel').forEach(function (btn) {
      try { if (btn.parentNode) btn.parentNode.removeChild(btn); } catch (e) {}
    });
  }

  function hideNonOperationalStrips() {
    ['syncBanner', 'kpiGrid'].forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      try {
        el.classList.add('bom-hidden');
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
        el.style.height = '0';
        el.style.minHeight = '0';
        el.style.maxHeight = '0';
        el.style.padding = '0';
        el.style.margin = '0';
        el.style.border = '0';
        el.style.overflow = 'hidden';
      } catch (e) {}
    });
  }

  function forceRightRailVisible() {
    ['.bom-zone-3', '.bom-zone-5'].forEach(function (selector) {
      queryAll(selector).forEach(function (el) {
        try {
          el.style.display = 'flex';
          el.style.visibility = 'visible';
        } catch (e) {}
      });
    });
  }

  function apply() {
    APPLY_COUNT += 1;
    injectCss();
    removeCollapseState();
    removePanelButton();
    hideNonOperationalStrips();
    forceRightRailVisible();
  }

  function schedule() {
    [0, 150, 500, 1000, 2000, 3500].forEach(function (delay) {
      w.setTimeout(apply, delay);
    });
    var interval = w.setInterval(function () {
      apply();
      if (APPLY_COUNT >= MAX_APPLY_COUNT) w.clearInterval(interval);
    }, 1000);
    try {
      var observer = new MutationObserver(function () { apply(); });
      observer.observe(d.documentElement || d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
      w.setTimeout(function () { try { observer.disconnect(); } catch (e) {} }, 45000);
    } catch (e2) {}
  }

  w.__BOM_UX_RUNTIME_FIX__ = { apply: apply };
  schedule();
})();
