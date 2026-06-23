/* BOM Analytics MVP depth guard: force expand depth >= 3. */
(function (global) {
  'use strict';
  var MIN_DEPTH = 3;

  function applyDepthGuard() {
    try {
      var r = global.__3DX_UI_ROOT__ || document;
      var input = r && r.querySelector ? r.querySelector('#skaDepthInput') : null;
      if (!input) return;
      var current = parseInt(String(input.value || '').trim(), 10);
      if (isNaN(current) || current < MIN_DEPTH) input.value = String(MIN_DEPTH);
      input.min = String(MIN_DEPTH);
      input.max = input.max || '20';
      input.setAttribute('data-bom-depth-guard', 'min-3');
    } catch (e) {}
  }

  function install() {
    applyDepthGuard();
    global.setTimeout(applyDepthGuard, 100);
    global.setTimeout(applyDepthGuard, 500);
    global.setTimeout(applyDepthGuard, 1500);
  }

  global.BomDepthGuard = { MIN_DEPTH: MIN_DEPTH, apply: applyDepthGuard, install: install };
  install();
})(window);
