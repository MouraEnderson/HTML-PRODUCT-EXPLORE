/**
 * @file ui/dashboard-theme.js
 * Alterna fundo branco / cinza com um único botão (mesmo estilo Visão Geral).
 */
var DashboardTheme = (function () {
  'use strict';

  var STORAGE_KEY = 'bom_dashboard_bg_theme';
  var onChange = null;

  function rootEl() {
    return document.querySelector('.bom-dashboard');
  }

  function getTheme() {
    var r = rootEl();
    if (r && r.classList.contains('bom-theme-white')) return 'white';
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === 'white' || s === 'gray') return s;
    } catch (e) { /* */ }
    return 'gray';
  }

  function getChartColors() {
    var t = getTheme();
    if (t === 'white') {
      return { text: '#37474f', title: '#263238', grid: '#e0e0e0', legend: '#546e7a' };
    }
    return { text: '#455a64', title: '#263238', grid: '#cfd8dc', legend: '#607d8b' };
  }

  function apply(theme) {
    theme = theme === 'white' ? 'white' : 'gray';
    var root = rootEl();
    if (!root) return;
    root.classList.remove('bom-theme-white', 'bom-theme-gray', 'bom-dark');
    root.classList.add(theme === 'white' ? 'bom-theme-white' : 'bom-theme-gray');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) { /* */ }
    window.__BOM_CHART_THEME__ = getChartColors();
    updateToggleButton(theme);
    if (typeof onChange === 'function') onChange(theme);
  }

  function toggle() {
    apply(getTheme() === 'white' ? 'gray' : 'white');
  }

  function updateToggleButton(theme) {
    var btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    btn.textContent = theme === 'white' ? 'Fundo: Branco' : 'Fundo: Cinza';
    btn.setAttribute('title', 'Clique para alternar branco / cinza');
  }

  function init(options) {
    options = options || {};
    onChange = options.onChange || null;
    var saved = 'gray';
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'gray';
    } catch (e) { /* */ }
    if (saved !== 'white') saved = 'gray';
    apply(saved);

    var btn = document.getElementById('btnThemeToggle');
    if (btn && !btn.__3DX_THEME_BOUND__) {
      btn.__3DX_THEME_BOUND__ = true;
      btn.addEventListener('click', function () {
        toggle();
      });
    }
  }

  return {
    init: init,
    apply: apply,
    toggle: toggle,
    getTheme: getTheme,
    getChartColors: getChartColors
  };
})();
