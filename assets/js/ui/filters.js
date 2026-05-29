/**
 * @file ui/filters.js
 */
var Filters = (function () {
  'use strict';

  var state = {
    search: '',
    maturity: 'all',
    type: 'all',
    approval: 'all',
    hasPP: 'all'
  };
  var onChange = null;
  var debounceTimer;

  function init(selectors, callback) {
    onChange = callback;
    var searchEl = document.querySelector(selectors.search);
    var maturityEl = document.querySelector(selectors.maturity);
    var typeEl = document.querySelector(selectors.type);
    var approvalEl = document.querySelector(selectors.approval);
    var ppEl = document.querySelector(selectors.hasPP);

    if (searchEl) {
      searchEl.addEventListener('input', function (e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          state.search = e.target.value.trim().toLowerCase();
          if (onChange) onChange(getState());
        }, APP_CONFIG.SEARCH_DEBOUNCE_MS);
      });
    }

    [maturityEl, typeEl, approvalEl, ppEl].forEach(function (el, idx) {
      if (!el) return;
      el.addEventListener('change', function (e) {
        var keys = ['maturity', 'type', 'approval', 'hasPP'];
        state[keys[idx]] = e.target.value;
        if (onChange) onChange(getState());
      });
    });
  }

  function getState() {
    return Object.assign({}, state);
  }

  function apply(nodes) {
    return nodes.filter(function (n) {
      if (state.search) {
        var blob = [
          n.name, n.title, n.description, n.physicalid,
          n.owner, n.type, n.revision, n.state
        ].join(' ').toLowerCase();
        if (blob.indexOf(state.search) < 0) return false;
      }
      if (state.maturity !== 'all') {
        if (AttributeService.classifyMaturity(n.maturity || n.state) !== state.maturity) return false;
      }
      if (state.type !== 'all' && String(n.type).indexOf(state.type) < 0) return false;
      if (state.approval === 'approved') {
        var a = String(n.approval || '').toLowerCase();
        if (a.indexOf('approv') < 0 || a.indexOf('pending') >= 0) return false;
      }
      if (state.approval === 'pending') {
        if (String(n.approval || '').toLowerCase().indexOf('pending') < 0) return false;
      }
      if (state.hasPP === 'yes' && !n.hasPhysicalProduct) return false;
      if (state.hasPP === 'no' && n.hasPhysicalProduct) return false;
      return true;
    });
  }

  function populateTypeOptions(nodes) {
    var sel = document.getElementById('filterType');
    if (!sel) return;
    var types = {};
    nodes.forEach(function (n) { types[n.type || 'Unknown'] = true; });
    var current = sel.value;
    sel.innerHTML = '<option value="all">Todos os tipos</option>';
    Object.keys(types).sort().forEach(function (t) {
      sel.innerHTML += '<option value="' + escapeAttr(t) + '">' + escapeHtml(t) + '</option>';
    });
    sel.value = current || 'all';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  return {
    init: init,
    getState: getState,
    apply: apply,
    populateTypeOptions: populateTypeOptions
  };
})();
