/**
 * @file ui/part-image.js
 * Thumbnail 2D — URL getpicture + fallback visual (lista E-BOM e preview).
 */
var PartImage = (function () {
  'use strict';

  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isSyntheticId(pid) {
    var p = String(pid || '');
    return !p || p.indexOf('IMP_') === 0 || p.indexOf('grid_') === 0 || p.indexOf('snap_') === 0 ||
      p.indexOf('mont10_') === 0;
  }

  function platformBase() {
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost;
    }
    if (typeof location !== 'undefined' && location.hostname.indexOf('3dexperience') >= 0) {
      return location.protocol + '//' + location.hostname;
    }
    return '';
  }

  function spaceBase() {
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var v = CompassServices.getVerifiedSpaceUrl();
      if (v) return String(v).replace(/\/$/, '');
    }
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/3dspace';
    }
    return '';
  }

  function tenantId() {
    return (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId) || 'R1132100929518';
  }

  function buildGetPictureUrl(physicalId) {
    var pid = String(physicalId || '').trim();
    if (isSyntheticId(pid)) return '';

    var tenant = tenantId();
    var q = '?tenant=' + encodeURIComponent(tenant) + '&pid=' + encodeURIComponent(pid);
    var ifwe = platformBase();
    if (ifwe) return ifwe.replace(/\/$/, '') + '/enovia/resources/getpicture' + q;

    var space = spaceBase();
    if (space) return space + '/resources/getpicture' + q;
    return '';
  }

  function resolveUrl(node) {
    if (!node) return '';
    if (node.iconUrl) return String(node.iconUrl);
    return buildGetPictureUrl(node.physicalid);
  }

  function initialChar(node) {
    var n = String((node && (node.title || node.name)) || '?').trim();
    return n.charAt(0).toUpperCase() || '?';
  }

  /** HTML thumbnail — img com fallback para inicial se URL falhar. */
  function thumbHtml(node, sizeClass) {
    sizeClass = sizeClass || 'bom-thumb-md';
    var url = resolveUrl(node);
    var init = initialChar(node);
    var alt = escapeAttr(node && (node.title || node.name) || 'Peça');
    if (url) {
      return (
        '<span class="bom-thumb-wrap ' + sizeClass + '">' +
        '<img class="bom-thumb-img" src="' + escapeAttr(url) + '" alt="' + alt + '" ' +
        'onerror="this.style.display=\'none\';var s=this.nextElementSibling;if(s)s.style.display=\'flex\'" />' +
        '<span class="bom-thumb-fallback" style="display:none">' + escapeHtml(init) + '</span></span>'
      );
    }
    return (
      '<span class="bom-thumb-wrap ' + sizeClass + '">' +
      '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>'
    );
  }

  return {
    resolveUrl: resolveUrl,
    buildGetPictureUrl: buildGetPictureUrl,
    thumbHtml: thumbHtml,
    initialChar: initialChar
  };
})();
