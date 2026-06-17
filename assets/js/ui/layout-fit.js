/**
 * @file ui/layout-fit.js
 * Layout 5 zonas — grid no .bom-layout-page (inline CSS no widget-v2).
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var MID_ROW_RATIO = 0.22;

  function hostEl() {
    return window.__3DX_UI_ROOT__ || document.body;
  }

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 640,
      h: window.innerHeight || document.documentElement.clientHeight || 640
    };
  }

  function applyMode(host, vp) {
    host.classList.toggle('bom-widget-narrow', vp.w < 620);
    host.classList.toggle('bom-widget-wide', vp.w >= 620);
    host.classList.toggle('bom-widget-compact', vp.h < 780 || vp.w < 680);
  }

  function applyPageGrid(host, vp) {
    var page = host.querySelector('.bom-layout-page');
    if (!page) return;

    var hostBox = host.getBoundingClientRect();
    var avail = Math.max(160, Math.floor(hostBox.top + vp.h - hostBox.top - 2));
    var header = page.querySelector('.bom-zone-1');
    var headerBtn = header && header.querySelector('#btnImportPaste');
    var headerH = headerBtn ? headerBtn.offsetHeight + 6 : (header ? header.offsetHeight : 32);
    headerH = Math.max(28, Math.min(headerH, 40));
    if (header) {
      header.style.minHeight = '0';
      page.style.gridTemplateRows = headerH + 'px auto 1fr';
    }

    var bodyH = Math.max(120, avail - headerH - 4);
    var zone2 = page.querySelector('.bom-zone-2-scroll');
    var zone3row = page.querySelector('.bom-charts-row-quad');
    var zone3scroll = page.querySelector('.bom-charts-unified-scroll');
    var needMid = 64;
    if (zone2) needMid = Math.max(needMid, zone2.scrollHeight + 6);
    if (zone3row) needMid = Math.max(needMid, zone3row.offsetHeight + 8);
    else if (zone3scroll) needMid = Math.max(needMid, zone3scroll.offsetHeight + 8);
    var midCap = Math.max(78, Math.floor(bodyH * MID_ROW_RATIO));
    var midH = Math.max(58, Math.min(midCap, needMid));
    var botH = Math.max(80, bodyH - midH - 4);

    page.style.display = 'grid';
    page.style.height = avail + 'px';
    page.style.maxHeight = avail + 'px';
    page.style.gridTemplateRows = headerH + 'px ' + midH + 'px ' + botH + 'px';

    if (zone3scroll) zone3scroll.scrollTop = 0;

    applyEbom(host, botH);
    applyView3d(host, botH);
  }

  function applyEbom(host, rowH) {
    var list = host.querySelector('.bom-zone-4 .bom-ebom-list');
    var tableWrap = host.querySelector('.bom-zone-4 .bom-table-wrap');
    var pager = host.querySelector('.bom-zone-4 .bom-table-pager');
    var head = host.querySelector('.bom-zone-4 .bom-ebom-head');
    if (!list || !tableWrap) return;
    var headH = head ? head.offsetHeight : 0;
    var listH = Math.max(48, rowH - headH - 4);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';
    var pagerH = pager ? pager.offsetHeight : 22;
    tableWrap.style.height = Math.max(40, listH - pagerH) + 'px';
    tableWrap.style.maxHeight = tableWrap.style.height;
  }

  function applyView3d(host, rowH) {
    var body = host.querySelector('.bom-zone-5 .bom-preview-body');
    if (!body) return;
    body.style.height = Math.max(56, rowH - 4) + 'px';
    body.style.maxHeight = body.style.height;
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var vp = viewport();

    host.style.height = vp.h + 'px';
    host.style.maxHeight = vp.h + 'px';
    host.style.overflow = 'hidden';
    host.style.padding = '0';
    host.style.margin = '0';

    applyMode(host, vp);
    applyPageGrid(host, vp);

    if (typeof ChartsManager !== 'undefined' && ChartsManager.scheduleResize) {
      ChartsManager.scheduleResize();
    }
  }

  function init() {
    if (bound) { apply(); return; }
    bound = true;
    apply();
    window.addEventListener('resize', apply);
    window.setTimeout(apply, 200);
    window.setTimeout(apply, 800);
  }

  return { init: init, apply: apply };
})();
