/**
 * @file ui/part-image.js
 * Thumbnail 2D — getpicture + WAF autenticado + fallback visual.
 */
var PartImage = (function () {
  'use strict';

  var blobCache = {};

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
    try {
      if (window.parent && window.parent.location && window.parent.location.hostname.indexOf('3dexperience') >= 0) {
        return window.parent.location.protocol + '//' + window.parent.location.hostname;
      }
    } catch (eP) { /* cross-origin */ }
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
    if (!pid || isSyntheticId(pid)) return '';

    var tenant = tenantId();
    var q = '?tenant=' + encodeURIComponent(tenant) + '&pid=' + encodeURIComponent(pid);
    var ifwe = platformBase();
    if (ifwe) return ifwe.replace(/\/$/, '') + '/enovia/resources/getpicture' + q;

    var space = spaceBase();
    if (space) return space + '/resources/getpicture' + q;
    return '';
  }

  function lookupPrdId(node) {
    if (!node) return '';
    var pid = String(node.sourcePhysicalId || node.physicalid || '').trim();
    if (pid && !isSyntheticId(pid)) return pid;

    var names = [node.name, node.title, node.displayName].filter(Boolean);
    var i;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.lookupPrdByPartName) {
      for (i = 0; i < names.length; i++) {
        var hit = ProductExplorerBridge.lookupPrdByPartName(names[i]);
        if (hit) return hit;
      }
    }

    var reg = (APP_CONFIG && APP_CONFIG.STRUCTURE_IDS) || {};
    for (i = 0; i < names.length; i++) {
      if (reg[names[i]]) return reg[names[i]];
      var low = String(names[i]).toLowerCase();
      if (reg[low]) return reg[low];
    }
    return '';
  }

  function resolveUrl(node) {
    if (!node) return '';
    if (node.iconUrl && /https?:|getpicture/i.test(String(node.iconUrl))) {
      return String(node.iconUrl);
    }
    return buildGetPictureUrl(lookupPrdId(node));
  }

  function initialChar(node) {
    var n = String((node && (node.title || node.name)) || '?').trim();
    var m = n.match(/[A-Za-zÀ-ú]/);
    if (m) return m[0].toUpperCase();
    return n.charAt(0).toUpperCase() || '?';
  }

  function getWaf() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
    try {
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return widget.WAFData;
      }
    } catch (e) { /* */ }
    return null;
  }

  function fetchViaWaf(url, callback) {
    if (blobCache[url]) {
      callback(blobCache[url]);
      return;
    }
    var WAF = getWaf();
    if (!WAF) {
      callback(null);
      return;
    }
    WAF.authenticatedRequest(url, {
      method: 'GET',
      headers: { Accept: 'image/png,image/jpeg,image/gif,image/*,*/*' },
      type: 'json',
      onComplete: function (data, status, headers, xhr) {
        try {
          var buf = xhr && xhr.response;
          if (buf instanceof ArrayBuffer && buf.byteLength > 32) {
            var blobUrl = URL.createObjectURL(new Blob([buf], { type: 'image/png' }));
            blobCache[url] = blobUrl;
            callback(blobUrl);
            return;
          }
        } catch (e) { /* */ }
        callback(null);
      },
      onFailure: function () {
        callback(null);
      }
    });
  }

  function loadIntoImg(img, url, fallbackEl, callback) {
    if (!img || !url) {
      if (callback) callback(false);
      return;
    }
    function ok(src) {
      img.src = src;
      img.style.display = '';
      img.classList.remove('bom-thumb-hidden');
      if (fallbackEl) fallbackEl.style.display = 'none';
      if (callback) callback(true);
    }
    img.onload = function () { ok(url); };
    img.onerror = function () {
      fetchViaWaf(url, function (blobUrl) {
        if (blobUrl) {
          img.onload = function () { ok(blobUrl); };
          img.onerror = function () { if (callback) callback(false); };
          img.src = blobUrl;
        } else if (callback) {
          callback(false);
        }
      });
    };
    img.style.display = 'none';
    img.classList.add('bom-thumb-hidden');
    img.src = url;
  }

  /** Preenche container com thumbnail (preview grande). */
  function mountThumb(container, node, sizeClass, callback) {
    if (!container) return;
    sizeClass = sizeClass || 'bom-thumb-lg';
    var init = initialChar(node);
    var url = resolveUrl(node);
    container.innerHTML =
      '<span class="bom-thumb-wrap ' + sizeClass + '">' +
      (url
        ? '<img class="bom-thumb-img bom-thumb-hidden" alt="' + escapeAttr(node.title || node.name || 'Peça') + '" />'
        : '') +
      '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>';
    if (!url) {
      if (callback) callback(false);
      return;
    }
    var img = container.querySelector('.bom-thumb-img');
    var fb = container.querySelector('.bom-thumb-fallback');
    loadIntoImg(img, url, fb, callback);
  }

  /** HTML thumbnail estático — use hydrateThumbs após render da tabela. */
  function thumbHtml(node, sizeClass) {
    sizeClass = sizeClass || 'bom-thumb-md';
    var url = resolveUrl(node);
    var init = initialChar(node);
    var alt = escapeAttr(node && (node.title || node.name) || 'Peça');
    if (url) {
      return (
        '<span class="bom-thumb-wrap ' + sizeClass + '" data-picture-url="' + escapeAttr(url) + '">' +
        '<img class="bom-thumb-img bom-thumb-hidden" alt="' + alt + '" />' +
        '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>'
      );
    }
    return (
      '<span class="bom-thumb-wrap ' + sizeClass + '">' +
      '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>'
    );
  }

  function hydrateThumbs(root) {
    var scope = root || document;
    var wraps = scope.querySelectorAll ? scope.querySelectorAll('.bom-thumb-wrap[data-picture-url]') : [];
    var i;
    for (i = 0; i < wraps.length; i++) {
      (function (wrap) {
        if (wrap.__3DX_HYDRATED__) return;
        wrap.__3DX_HYDRATED__ = true;
        var url = wrap.getAttribute('data-picture-url');
        var img = wrap.querySelector('.bom-thumb-img');
        var fb = wrap.querySelector('.bom-thumb-fallback');
        loadIntoImg(img, url, fb);
      })(wraps[i]);
    }
  }

  return {
    resolveUrl: resolveUrl,
    lookupPrdId: lookupPrdId,
    buildGetPictureUrl: buildGetPictureUrl,
    isSyntheticId: isSyntheticId,
    thumbHtml: thumbHtml,
    mountThumb: mountThumb,
    hydrateThumbs: hydrateThumbs,
    initialChar: initialChar
  };
})();
