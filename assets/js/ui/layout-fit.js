/**
 * @file ui/layout-fit.js
 * Layout 5 zonas: ① header · ②③ meio 50/50 · ④⑤ baixo 62/38.
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var COMPACT_H = 780;
  var MID_ROW_RATIO = 0.34;

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
    var narrow = vp.w < NARROW_W;
    var compact = vp.h < COMPACT_H || vp.w < 680;
    host.classList.toggle('bom-widget-narrow', narrow);
    host.classList.toggle('bom-widget-wide', !narrow);
    host.classList.toggle('bom-widget-compact', compact);
    host.classList.toggle('bom-widget-short', vp.h < 520);
  }

  function applyFiveZone(host, vp) {
    var main = host.querySelector('.bom-layout-five');
    var mid = host.querySelector('.bom-zone-mid');
    var bot = host.querySelector('.bom-zone-bot');
    if (!main || !mid || !bot) return;

    var hostBox = host.getBoundingClientRect();
    var viewportBottom = hostBox.top + vp.h;
    var top = main.getBoundingClientRect().top;
    var avail = Math.max(180, Math.floor(viewportBottom - top - 4));

    main.style.flex = '1 1 auto';
    main.style.minHeight = '0';
    main.style.height = avail + 'px';
    main.style.maxHeight = avail + 'px';
    main.style.overflow = 'hidden';

    var midH = Math.max(110, Math.min(Math.floor(avail * MID_ROW_RATIO), 200));
    var botH = Math.max(120, avail - midH - 6);

    mid.style.flex = '0 0 ' + midH + 'px';
    mid.style.height = midH + 'px';
    mid.style.maxHeight = midH + 'px';

    bot.style.flex = '1 1 auto';
    bot.style.height = botH + 'px';
    bot.style.maxHeight = botH + 'px';
    bot.style.minHeight = botH + 'px';

    applyEbom(host, botH);
    applyView3d(host, botH);
  }

  function applyEbom(host, rowH) {
    var block = host.querySelector('.bom-zone-4 .bom-ebom-block');
    var list = host.querySelector('.bom-zone-4 .bom-ebom-list');
    var tableWrap = host.querySelector('.bom-zone-4 .bom-table-wrap');
    var pager = host.querySelector('.bom-zone-4 .bom-table-pager');
    if (!block || !list || !tableWrap) return;

    var head = block.querySelector('.bom-ebom-head');
    var headH = head ? head.offsetHeight : 0;
    var listH = Math.max(72, rowH - headH - 10);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 26;
    var tableH = Math.max(56, listH - pagerH);
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
  }

  function applyView3d(host, rowH) {
    var body = host.querySelector('.bom-zone-5 .bom-preview-body');
    var image = host.querySelector('.bom-zone-5 .bom-preview-image');
    if (!body) return;
    var bodyH = Math.max(80, rowH - 8);
    body.style.height = bodyH + 'px';
    body.style.maxHeight = bodyH + 'px';
    if (image) {
      var imgH = Math.max(64, bodyH - 72);
      image.style.minHeight = imgH + 'px';
      image.style.maxHeight = imgH + 'px';
    }
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var vp = viewport();

    if (host.classList.contains('bom-widget-body')) {
      host.style.height = vp.h + 'px';
      host.style.maxHeight = vp.h + 'px';
      host.style.overflow = 'hidden';
      host.style.boxSizing = 'border-box';
    }

    var root = host.querySelector('.bom-root');
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
    }

    applyMode(host, vp);
    applyFiveZone(host, vp);

    if (typeof ChartsManager !== 'undefined' && ChartsManager.scheduleResize) {
      ChartsManager.scheduleResize();
    }
  }

  function init() {
    if (bound) {
      apply();
      return;
    }
    bound = true;
    apply();
    window.addEventListener('resize', apply);
    if (typeof ResizeObserver !== 'undefined') {
      try {
        var obs = new ResizeObserver(function () { apply(); });
        obs.observe(document.documentElement);
        var host = hostEl();
        if (host && host.parentElement) obs.observe(host.parentElement);
      } catch (e) { /* iframe */ }
    }
    window.setTimeout(apply, 200);
    window.setTimeout(apply, 800);
    window.setTimeout(apply, 1600);
  }

  return { init: init, apply: apply };
})();
