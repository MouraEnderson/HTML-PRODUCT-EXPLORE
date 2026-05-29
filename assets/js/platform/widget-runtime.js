/**
 * @file platform/widget-runtime.js
 * Runtime UWA / Additional App — deve rodar inline após scripts (widget global).
 */
(function (global) {
  'use strict';

  function hasWidget() {
    try {
      return typeof widget !== 'undefined' && widget;
    } catch (e) {
      return false;
    }
  }

  function markTrusted() {
    if (!global.APP_CONFIG) return;
    global.APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    global.APP_CONFIG.WIDGET_MODE = 'additional_app';
    global.__3DX_WIDGET_RUNTIME__ = true;
  }

  function bindWidgetEvents() {
    if (!hasWidget()) return;
    markTrusted();
    try {
      widget.addEvent('onRefresh', function () {
        var btn = document.getElementById('btnRefresh');
        if (btn) btn.click();
      });
    } catch (e1) { /* */ }
    try {
      widget.addEvent('onLoad', function () {
        if (global.App && App.refreshUI) App.refreshUI();
      });
    } catch (e2) { /* */ }
  }

  global.WidgetRuntime = {
    hasWidget: hasWidget,
    markTrusted: markTrusted,
    bindWidgetEvents: bindWidgetEvents,
    isTrusted: function () {
      return !!global.__3DX_WIDGET_RUNTIME__ || hasWidget();
    }
  };

  if (hasWidget()) {
    markTrusted();
    bindWidgetEvents();
  }
})(typeof window !== 'undefined' ? window : this);
