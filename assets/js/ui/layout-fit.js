/**
 * @file ui/layout-fit.js
 * Ajuste dinâmico ao tamanho do iframe do 3DDashboard.
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;

  function hostEl() {
    return window.__3DX_UI_ROOT__ || document.body;
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var h = window.innerHeight || document.documentElement.clientHeight || 640;
    if (host.classList && host.classList.contains('bom-widget-body')) {
      host.style.height = h + 'px';
      host.style.maxHeight = h + 'px';
      host.style.overflow = 'hidden';
      host.style.boxSizing = 'border-box';
    }
    var root = host.querySelector ? host.querySelector('.bom-root') : null;
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.boxSizing = 'border-box';
    }
    var tableWrap = host.querySelector ? host.querySelector('.bom-table-wrap') : null;
    var ebom = host.querySelector ? host.querySelector('.bom-ebom-block') : null;
    if (tableWrap && ebom) {
      var ebomRect = ebom.getBoundingClientRect();
      var wrapTop = tableWrap.getBoundingClientRect().top;
      var pager = host.querySelector('.bom-table-pager');
      var pagerH = pager ? pager.offsetHeight : 36;
      var avail = h - wrapTop - pagerH - 12;
      if (avail > 120) {
        tableWrap.style.maxHeight = avail + 'px';
        tableWrap.style.height = avail + 'px';
      }
    }
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
  }

  return { init: init, apply: apply };
})();
