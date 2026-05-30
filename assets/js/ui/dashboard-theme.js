/**
 * @file ui/dashboard-theme.js
 * Tema de fundo do dashboard: branco ou cinza (persistido em localStorage).
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
    if (r && r.classList.contains('bom-theme-gray')) return 'gray';
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === 'white' || s === 'gray') return s;
    } catch (e) { /* */ }
    return 'gray';
  }

  function getChartColors() {
    var t = getTheme();
    if (t === 'white') {
      return {
        text: '#37474f',
        title: '#263238',
        grid: '#e0e0e0',
        legend: '#546e7a'
      };
    }
    return {
      text: '#455a64',
      title: '#263238',
      grid: '#cfd8dc',
      legend: '#607d8b'
    };
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
    updateToggleButtons(theme);
    if (typeof onChange === 'function') onChange(theme);
  }

  function updateToggleButtons(theme) {
    var w = document.getElementById('btnThemeWhite');
    var g = document.getElementById('btnThemeGray');
    if (w) w.classList.toggle('bom-theme-active', theme === 'white');
    if (g) g.classList.toggle('bom-theme-active', theme === 'gray');
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

    var btnW = document.getElementById('btnThemeWhite');
    var btnG = document.getElementById('btnThemeGray');
    if (btnW && !btnW.__3DX_THEME_BOUND__) {
      btnW.__3DX_THEME_BOUND__ = true;
      btnW.addEventListener('click', function () { apply('white'); });
    }
    if (btnG && !btnG.__3DX_THEME_BOUND__) {
      btnG.__3DX_THEME_BOUND__ = true;
      btnG.addEventListener('click', function () { apply('gray'); });
    }
  }

  return {
    init: init,
    apply: apply,
    getTheme: getTheme,
    getChartColors: getChartColors
  };
})();
