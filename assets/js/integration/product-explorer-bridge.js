/**
 * @file integration/product-explorer-bridge.js
 * Ponte de seleção com Product Structure Explorer / widgets 3DDashboard.
 */
var ProductExplorerBridge = (function () {
  'use strict';

  var listeners = [];
  var structureListeners = [];
  var currentSelection = null;
  var structureNameHint = null;

  var MESSAGE_TYPES = [
    '3DX_SELECTION',
    '3DX_SELECTION_RESPONSE',
    'selectionChanged',
    'onSelectedObject',
    'productexplorer.selection',
    'DS/Selection/selected',
    'objectSelected',
    'selectedObjectChanged',
    'ENOSCEN_selection',
    'ENOPSTR_selection',
    '3DXContent',
    'selection',
    '3DX_STRUCTURE',
    'structureRoot',
    'getStructureRoot'
  ];

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return id;
  }

  function isValidId(id) {
    id = normalizeId(id);
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 8;
  }

  function labelText(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object') {
      return String(v.label || v.displayName || v.name || v.title || '').trim();
    }
    var s = String(v).trim();
    if (s.charAt(0) === '{' && s.indexOf('"label"') >= 0) {
      try {
        var o = JSON.parse(s);
        return String(o.label || o.name || '').trim();
      } catch (e) { /* */ }
    }
    return s;
  }

  function isPrdCloudId(id) {
    return /^prd-R\d{10,}-/i.test(String(id || ''));
  }

  function pickPrdId(id) {
    id = normalizeId(id);
    if (isPrdCloudId(id)) return id;
    return id;
  }

  function lookupRegistryIdExact(term) {
    if (!term) return null;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term).trim();
    var id = reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()];
    return id ? pickPrdId(id) : null;
  }

  function lookupRegistryId(term, allowFuzzy) {
    var exact = lookupRegistryIdExact(term);
    if (exact) return exact;
    if (!allowFuzzy) return null;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term).trim();
    var tLow = key.toLowerCase();
    var keys = Object.keys(reg);
    var i;
    var best = null;
    var bestLen = 0;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (/^prd-/i.test(k)) continue;
      var kLow = k.toLowerCase();
      if (tLow === kLow || tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
        if (k.length > bestLen) {
          bestLen = k.length;
          best = reg[k];
        }
      }
    }
    return best ? pickPrdId(best) : null;
  }

  function makeGridPhysicalId(name, idx, isRoot) {
    if (isRoot) return lookupRegistryId(name, true) || 'root_' + idx;
    var slug = String(name || 'item')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);
    return 'grid_' + idx + '_' + (slug || 'x');
  }

  function appendExplorerTextChunks(chunks, doc) {
    if (!doc || !doc.body) return;
    try {
      chunks.push(doc.body.innerText || doc.body.textContent || '');
    } catch (e) { /* */ }
    try {
      var frames = doc.querySelectorAll('iframe');
      var f;
      for (f = 0; f < frames.length; f++) {
        try {
          var inner = frames[f].contentDocument;
          if (inner && inner.body) {
            chunks.push(inner.body.innerText || inner.body.textContent || '');
          }
        } catch (e2) { /* cross-origin */ }
      }
    } catch (e3) { /* */ }
  }

  function harvestAllExplorerText() {
    var chunks = [];
    var doc = readExplorerIframeDocument();
    if (doc) appendExplorerTextChunks(chunks, doc);
    try {
      if (window.parent && window.parent.document) appendExplorerTextChunks(chunks, window.parent.document);
    } catch (eP) { /* */ }
    try {
      if (window.top && window.top.document) appendExplorerTextChunks(chunks, window.top.document);
    } catch (eT) { /* */ }
    return chunks.join('\n');
  }

  /** Só texto do iframe Explorer — evita ingerir BOM Analytics / filtros / gráficos. */
  function harvestExplorerTextOnly() {
    var doc = readExplorerIframeDocument();
    if (doc && doc.body) {
      try {
        return String(doc.body.innerText || doc.body.textContent || '').trim();
      } catch (e0) { /* */ }
    }
    return harvestExplorerWidgetTextFromDashboard();
  }

  /** Recorta painel do widget Product Structure Explorer no dashboard (sem iframe). */
  function harvestExplorerWidgetTextFromDashboard() {
    try {
      var doc = window.top && window.top.document;
      if (!doc || !doc.body) return '';
      var nodes = doc.querySelectorAll(
        'div, section, article, [class*="widget"], [class*="Widget"], [class*="dashboard-tab"]'
      );
      var i;
      var best = '';
      var bestScore = 0;
      for (i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var t = String(el.innerText || el.textContent || '').trim();
        if (t.length < 40 || t.length > 120000) continue;
        if (t.indexOf('Product Structure Explorer') < 0 && t.indexOf('Structure Explorer') < 0) continue;
        if (t.indexOf('BOM Analytics') >= 0) continue;
        var score = 0;
        if (/t[ií]tulo/i.test(t)) score += 3;
        if (/propriet/i.test(t)) score += 2;
        if (/revis/i.test(t)) score += 1;
        if (/\d+\s*objetos?\b/i.test(t)) score += 2;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
      return best;
    } catch (e) { /* */ }
    return '';
  }

  function readExplorerIframeDocument() {
    var docs = [];
    try {
      if (window.parent && window.parent.document) docs.push(window.parent.document);
    } catch (e) { /* */ }
    try {
      if (window.top && window.top.document && window.top.document !== docs[0]) {
        docs.push(window.top.document);
      }
    } catch (e2) { /* */ }
    var i;
    for (i = 0; i < docs.length; i++) {
      var frames = docs[i].querySelectorAll('iframe');
      var f;
      for (f = 0; f < frames.length; f++) {
        var frame = frames[f];
        var src = (frame.src || '').toLowerCase();
        var title = '';
        try {
          title = frame.contentDocument && frame.contentDocument.title ? frame.contentDocument.title : '';
        } catch (e3) { /* */ }
        if (
          title.indexOf('Product Structure') >= 0 ||
          title.indexOf('Structure Explorer') >= 0 ||
          src.indexOf('enxscene') >= 0 ||
          src.indexOf('enxsce') >= 0 ||
          src.indexOf('enopstr') >= 0 ||
          src.indexOf('productstructure') >= 0 ||
          src.indexOf('structure') >= 0 && src.indexOf('3dexperience') >= 0
        ) {
          try {
            return frame.contentDocument;
          } catch (e4) { /* */ }
        }
      }
    }
    return null;
  }

  /** Catálogo dinâmico nome → prd- lido do Explorer (Recentes / lista). */
  function buildPrdCatalogFromExplorer() {
    var catalog = {};
    var doc = readExplorerIframeDocument();
    if (!doc || !doc.body) return catalog;
    var text = doc.body.innerText || '';
    var lines = text.split('\n');
    var prdRe = /prd-R\d{10,}-[A-Za-z0-9]+/gi;
    var i;
    for (i = 0; i < lines.length; i++) {
      var prdMatch = lines[i].match(prdRe);
      if (!prdMatch || !prdMatch[0]) continue;
      var prdId = prdMatch[0];
      var j;
      for (j = i - 1; j >= Math.max(0, i - 5); j--) {
        var nameLine = String(lines[j] || '').trim();
        if (!nameLine || nameLine.length < 2 || nameLine.length > 120) continue;
        if (prdRe.test(nameLine)) continue;
        if (/^(recents|open |physical product|access your)/i.test(nameLine)) continue;
        if (nameLine.indexOf('|') >= 0) {
          nameLine = nameLine.split('|')[0].trim();
        }
        if (nameLine.length > 2) {
          catalog[nameLine] = prdId;
          var short = nameLine.length > 24 ? nameLine.slice(0, 24) : nameLine;
          catalog[short] = prdId;
        }
        break;
      }
    }
    return catalog;
  }

  var PRD_ID_RE = /prd-R\d{10,}-[A-Za-z0-9]+/i;

  function extractPrdFromText(text) {
    var m = String(text || '').match(PRD_ID_RE);
    return m ? m[0] : '';
  }

  function extractPrdFromDomRow(row) {
    if (!row) return '';
    var fromText = extractPrdFromText(row.innerText || row.textContent || '');
    if (fromText) return fromText;
    try {
      return extractPrdFromText(row.outerHTML || '');
    } catch (e) {
      return '';
    }
  }

  function mergePrdCatalogFromText(text, catalog) {
    catalog = catalog || {};
    var lines = String(text || '').split('\n');
    var prdRe = PRD_ID_RE;
    var nameRe = /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_ENDERSW-[A-Za-z0-9\-]{2,80})\b/i;
    var lastName = '';
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line) continue;
      var nm = line.match(nameRe);
      if (nm) lastName = nm[1] || nm[0];
      var prdM = line.match(prdRe);
      if (prdM && lastName) {
        catalog[lastName] = prdM[0];
        if (lastName.length > 24) catalog[lastName.slice(0, 24)] = prdM[0];
      }
    }
    return catalog;
  }

  /** Explorer: linha prd- logo após o título da peça (copy/grid). */
  function mergePrdCatalogFromAdjacentLines(text, catalog) {
    catalog = catalog || {};
    var lines = String(text || '').split('\n');
    var pendingPrd = '';
    var lastName = '';
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line) continue;
      var prdOnly = line.match(PRD_ID_RE);
      if (prdOnly && String(line).replace(prdOnly[0], '').trim().length < 4) {
        pendingPrd = prdOnly[0];
        continue;
      }
      if (isExplorerColumnHeaderLine(line) || isMirrorUiNoise(line)) continue;
      if (/^\d+\s*(?:of|de)\s*\d+\s*(?:selected|selecionado)/i.test(line)) continue;
      var partM = line.match(EXPLORER_PART_LINE) || line.match(EXPLORER_NAME_LINE);
      var displayName = '';
      if (partM) displayName = partM[1];
      else if (isValidMirrorPartName(line) && !isPersonName(line)) displayName = line;
      else if (
        line.length >= 4 && line.length <= 96 && !isPersonName(line) &&
        !/^\d+[.,]\d+/.test(line) && line.indexOf('|') < 0
      ) {
        displayName = line;
      }
      if (displayName) {
        lastName = displayName;
        var next = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
        var prdNext = extractPrdFromText(next);
        if (prdNext) {
          catalog[lastName] = prdNext;
          if (lastName.length > 24) catalog[lastName.slice(0, 24)] = prdNext;
          pendingPrd = '';
          continue;
        }
        if (pendingPrd) {
          catalog[lastName] = pendingPrd;
          if (lastName.length > 24) catalog[lastName.slice(0, 24)] = pendingPrd;
          pendingPrd = '';
        }
      }
    }
    return catalog;
  }

  function buildPrdCatalogFromExplorerHtml(doc) {
    var catalog = {};
    if (!doc) return catalog;
    try {
      var html = String(doc.documentElement && doc.documentElement.innerHTML || '');
      var maxHtml = (APP_CONFIG && APP_CONFIG.PRD_HTML_SCAN_MAX_CHARS) || 250000;
      if (html.length > maxHtml) html = html.slice(0, maxHtml);
      if (html.length < 80) return catalog;
      var re = /([\wÀ-ú][\wÀ-ú0-9 _.\-]{3,72})\D{0,48}(prd-R\d{10,}-[A-Za-z0-9]+)/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var name = String(m[1] || '').trim();
        var prd = m[2];
        if (!name || !prd || isPersonName(name)) continue;
        if (/^(physical|product|reference|title|revision)$/i.test(name)) continue;
        catalog[name] = prd;
        if (name.length > 24) catalog[name.slice(0, 24)] = prd;
      }
    } catch (eHtml) { /* */ }
    return catalog;
  }

  function buildPrdCatalogFull() {
    var catalog = buildPrdCatalogFromExplorer();
    if (!(APP_CONFIG && APP_CONFIG.SKIP_PRD_HTML_SCAN)) {
      var doc = readExplorerIframeDocument();
      if (doc) {
        var fromHtml = buildPrdCatalogFromExplorerHtml(doc);
        Object.keys(fromHtml).forEach(function (k) {
          catalog[k] = fromHtml[k];
        });
      }
    }
    var text = harvestExplorerTextOnly() || harvestExplorerWidgetTextFromDashboard() || harvestAllExplorerText();
    mergePrdCatalogFromText(text, catalog);
    mergePrdCatalogFromAdjacentLines(text, catalog);
    return catalog;
  }

  function catalogLookupPrd(catalog, name) {
    if (!name || !catalog) return '';
    var key = String(name).trim();
    if (catalog[key]) return catalog[key];
    var tLow = key.toLowerCase();
    var found = '';
    Object.keys(catalog).forEach(function (k) {
      if (found) return;
      var nLow = k.toLowerCase();
      if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
        found = catalog[k];
      }
    });
    return found;
  }

  function enrichItemWithPrd(item, catalog) {
    if (!item) return item;
    catalog = catalog || buildPrdCatalogFull();
    var names = [item.name, item.title, item.displayName].filter(Boolean);
    var prd = item.sourcePhysicalId && isPrdCloudId(item.sourcePhysicalId)
      ? item.sourcePhysicalId
      : '';
    var i;
    if (!prd) {
      for (i = 0; i < names.length; i++) {
        prd = catalogLookupPrd(catalog, names[i]) || lookupRegistryId(names[i], true) || '';
        if (prd) break;
      }
    }
    if (prd && isPrdCloudId(prd)) {
      item.sourcePhysicalId = prd;
    }
    return item;
  }

  function enrichItemsWithPrd(items) {
    if (!items || !items.length) return items;
    var catalog = buildPrdCatalogFull();
    items.forEach(function (it) {
      enrichItemWithPrd(it, catalog);
    });
    return items;
  }

  function applyPrdToIndex(index) {
    if (!index) return index;
    var catalog = buildPrdCatalogFull();
    Object.keys(index).forEach(function (k) {
      enrichItemWithPrd(index[k], catalog);
      if (typeof PartImage !== 'undefined' && PartImage.buildGetPictureUrl && index[k].sourcePhysicalId) {
        if (!index[k].iconUrl) {
          index[k].iconUrl = PartImage.buildGetPictureUrl(index[k].sourcePhysicalId);
        }
      }
    });
    return index;
  }

  function enrichNodeWithPrd(node) {
    if (!node) return node;
    enrichItemWithPrd(node, buildPrdCatalogFull());
    return node;
  }

  function lookupPrdByPartName(name) {
    if (!name) return '';
    var catalog = buildPrdCatalogFull();
    var key = String(name).trim();
    if (catalog[key]) return catalog[key];
    var tLow = key.toLowerCase();
    var found = '';
    Object.keys(catalog).forEach(function (k) {
      if (found) return;
      var nLow = k.toLowerCase();
      if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
        found = catalog[k];
      }
    });
    if (found) return found;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    return reg[key] || reg[tLow] || reg[key.toUpperCase()] || '';
  }

  var EXPLORER_SKIP_LINE =
    /^(physical product|em trabalho|aprovado|released|frozen|in work|approved|owner|organization|revision|type|maturity|enderson|moura|vplm|recents|open |product structure|enovia|access your|n\/d|—|-|login|user)$/i;
  var EXPLORER_PART_LINE = /^(\d{2}_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/;
  var EXPLORER_NAME_LINE = /^(Mont\d+[A-Za-z0-9_.\-]{0,40}|01_SKA_[A-Za-z0-9_.\-]{2,80}|SKA_ENDERSW-[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/i;

  function extractRootNameFromExplorerText(text) {
    var m =
      String(text || '').match(/Product Structure Explorer\s*[-–]\s*(.+?)(?:\n|$)/i) ||
      String(text || '').match(/Structure Explorer\s*[-–]\s*(.+?)(?:\n|$)/i);
    return m ? sanitizeStructureName(m[1].trim()) : null;
  }

  function pushGridItem(items, seen, row) {
    var key = String(row.name || '').toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    items.push(row);
  }

  function parsePartNamesFromText(text, rootName) {
    var found = {};
    var names = [];
    var rootLow = rootName ? String(rootName).toLowerCase() : '';
    var patterns = [
      /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_. \-]{2,80})\b/gi,
      /\b(SKA_ENDERSW-[A-Za-z0-9][A-Za-z0-9_. \-]{2,80})\b/gi,
      /\b(Mont\d+[A-Za-z0-9_.]{0,40})\b/gi
    ];
    var p;
    for (p = 0; p < patterns.length; p++) {
      var re = patterns[p];
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(String(text || ''))) !== null) {
        var name = String(m[1]).replace(/\.{2,}$/, '').trim();
        if (name.length < 5) continue;
        var key = name.toLowerCase();
        if (found[key]) continue;
        if (rootLow && key === rootLow) continue;
        if (rootLow && rootLow.indexOf(key) >= 0 && key.length < rootLow.length - 2) continue;
        found[key] = true;
        names.push(name);
      }
    }
    return names;
  }

  function scrapeDashboardLeafRows(rootName, items, seen) {
    var doc = null;
    try {
      doc = window.top && window.top.document;
    } catch (e0) { /* */ }
    if (!doc) return;
    var rootLow = rootName ? String(rootName).toLowerCase() : '';
    var nodes = doc.querySelectorAll(
      'span, div, td, li, a, p, [role="treeitem"], [role="row"], [role="gridcell"], [class*="tree"], [class*="Tree"], [class*="node"]'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children && el.children.length > 6) continue;
      var text = '';
      try {
        text = (el.innerText || el.textContent || '').trim();
      } catch (e1) { /* */ }
      if (!text || text.length > 90 || text.indexOf('\n') >= 0) continue;
      var partM = text.match(EXPLORER_PART_LINE) || text.match(EXPLORER_NAME_LINE);
      if (!partM && !/^(01_SKA_|Mont\d)/i.test(text)) continue;
      var name = partM ? partM[1] : text.replace(/\.{2,}$/, '').trim();
      if (!name || name.length < 6) continue;
      var key = name.toLowerCase();
      if (seen[key]) continue;
      if (rootLow && key === rootLow) continue;
      var revision = '—';
      var maturity = '—';
      var approved = false;
      try {
        var row = el.closest('[role="row"], tr, li, div');
        if (row) {
          var rowText = (row.innerText || '').toLowerCase();
          if (/aprovado|released|frozen/.test(rowText)) {
            maturity = 'Aprovado';
            approved = true;
          } else if (/em trabalho|in work/.test(rowText)) {
            maturity = 'Em Trabalho';
          }
          var revM = (row.innerText || '').match(/\b(\d+\.\d+)\b/);
          if (revM) revision = revM[1];
        }
      } catch (e2) { /* */ }
      pushGridItem(items, seen, {
        level: 1,
        name: name,
        title: name,
        type: 'Physical Product',
        displayType: 'Physical Product',
        revision: revision,
        state: maturity,
        maturity: maturity,
        approval: approved ? 'Approved' : 'Unknown',
        physicalid: makeGridPhysicalId(name, items.length, false)
      });
    }
  }

  function scrapeExplorerTreeItems(doc, rootName, items, seen, rootMeta) {
    if (!doc || !doc.querySelectorAll) return 0;
    function inExplorerPanel(el) {
      var p = el;
      var depth = 0;
      while (p && depth < 14) {
        var t = String(p.innerText || p.textContent || '').slice(0, 800);
        if (t.indexOf('BOM Analytics') >= 0) return false;
        if (/Product Structure Explorer|Structure Explorer/i.test(t)) return true;
        p = p.parentElement;
        depth++;
      }
      return false;
    }
    var nodes = doc.querySelectorAll('[role="treeitem"], [role="row"]');
    var added = 0;
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!inExplorerPanel(el)) continue;
      var raw = String(el.getAttribute && el.getAttribute('aria-label') || '').trim();
      if (!raw) raw = String(el.innerText || el.textContent || '').trim();
      if (!raw || raw.length > 140) continue;
      raw = raw.split('\n')[0].replace(/\.{2,}$/, '').trim();
      if (!raw || isMirrorUiNoise(raw)) continue;
      var name = partNameFromText(raw) || raw;
      if (!isValidMirrorPartName(name)) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var rowText = String(el.innerText || el.textContent || '');
      var revM = rowText.match(/\b(\d+\.\d+)\b/);
      var maturity = '—';
      if (/aprovado|released|frozen/i.test(rowText)) maturity = 'Aprovado';
      else if (/em\s*trabalh|in\s*work/i.test(rowText)) maturity = 'Em Trabalho';
      var before = items.length;
      pushGridItem(items, seen, buildMirrorRow(name, 1, items.length, {
        title: name,
        revision: revM ? revM[1] : ((rootMeta && rootMeta.revision) || '1.1'),
        owner: (rootMeta && rootMeta.owner) || '',
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: maturity
      }));
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected) {
    if (expected > 0 && items.length >= expected) return;
    var iframeText = harvestExplorerTextOnly() || '';
    var dashText = harvestExplorerWidgetTextFromDashboard() || '';
    var allText = iframeText + '\n' + dashText;
    var doc = readExplorerIframeDocument();
    var topDoc = null;
    try {
      topDoc = window.top && window.top.document;
    } catch (eTop) { /* */ }
    if (doc) scrapeExplorerTreeItems(doc, rootName, items, seen, rootMeta);
    if (topDoc) scrapeExplorerTreeItems(topDoc, rootName, items, seen, rootMeta);
    if (dashText) {
      scrapeExplorerTreeLines(dashText.split('\n'), rootName, items, seen);
    }
    if (allText) {
      scrapeExplorerTreeLines(allText.split('\n'), rootName, items, seen);
    }
    scrapeDashboardLeafRows(rootName, items, seen);
    var fromRegex = parsePartNamesFromText(allText, rootName);
    var ri;
    for (ri = 0; ri < fromRegex.length; ri++) {
      var nm = fromRegex[ri];
      pushGridItem(items, seen, buildMirrorRow(nm, 1, items.length, {
        title: nm,
        revision: (rootMeta && rootMeta.revision) || '1.1',
        owner: (rootMeta && rootMeta.owner) || '',
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: '—'
      }));
    }
  }

  function readExplorerIframeElement() {
    var docs = [];
    try {
      if (window.parent && window.parent.document) docs.push(window.parent.document);
    } catch (e) { /* */ }
    try {
      if (window.top && window.top.document && window.top.document !== docs[0]) {
        docs.push(window.top.document);
      }
    } catch (e2) { /* */ }
    var i;
    for (i = 0; i < docs.length; i++) {
      var frames = docs[i].querySelectorAll('iframe');
      var f;
      for (f = 0; f < frames.length; f++) {
        var frame = frames[f];
        var src = (frame.src || '').toLowerCase();
        var title = '';
        try {
          title = frame.contentDocument && frame.contentDocument.title ? frame.contentDocument.title : '';
        } catch (e3) { /* */ }
        if (
          title.indexOf('Product Structure') >= 0 ||
          title.indexOf('Structure Explorer') >= 0 ||
          src.indexOf('enxscene') >= 0 ||
          src.indexOf('enxsce') >= 0 ||
          src.indexOf('enopstr') >= 0 ||
          src.indexOf('productstructure') >= 0 ||
          src.indexOf('structure') >= 0 && src.indexOf('3dexperience') >= 0
        ) {
          return frame;
        }
      }
    }
    return null;
  }

  function focusExplorerGrid(doc, win) {
    if (!doc) return null;
    var grid =
      doc.querySelector('[role="grid"]') ||
      doc.querySelector('.wux-layouts-gridengine-poolcontainer-sync') ||
      doc.querySelector('.wux-layouts-gridengine-datagrid') ||
      doc.querySelector('.wux-scroller') ||
      doc.body;
    try {
      if (grid && grid.focus) grid.focus();
      if (grid && grid.click) grid.click();
    } catch (e0) { /* */ }
    try {
      if (win && win.focus) win.focus();
    } catch (e1) { /* */ }
    return grid;
  }

  function dispatchExplorerKeyCombo(win, doc, key, code, ctrlKey, metaKey) {
    if (!doc) return;
    var target = doc.activeElement || doc.body;
    var opts = {
      key: key,
      code: code,
      keyCode: key.charCodeAt(0),
      ctrlKey: !!ctrlKey,
      metaKey: !!metaKey,
      bubbles: true,
      cancelable: true
    };
    try {
      target.dispatchEvent(new win.KeyboardEvent('keydown', opts));
      target.dispatchEvent(new win.KeyboardEvent('keyup', opts));
    } catch (e0) { /* */ }
  }

  function buildMirrorPayloadFromItems(items, rootName, source, expected) {
    if (!items || !items.length) return null;
    items = sanitizeMirrorItems(items, rootName);
    applyDefaultOwnerFromRoot(items, parseExplorerRootMetaFromText(harvestExplorerTextOnly()));
    applyOwnersToItems(items);
    if (!items.length) return null;
    var quality = assessMirrorQuality(items);
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: source || 'explorer-scroll',
      mirrorQuality: quality,
      explorerExpected: expected || getExplorerObjectCount() || items.length
    };
  }

  function isInExplorerPanel(el) {
    if (!el) return false;
    var p = el;
    var hop = 0;
    while (p && hop < 16) {
      var label = String(p.innerText || p.textContent || '').slice(0, 2500);
      if (label.indexOf('BOM Analytics') >= 0) return false;
      if (/Product Structure Explorer|Structure Explorer/i.test(label)) return true;
      p = p.parentElement;
      hop++;
    }
    return false;
  }

  function resolveExplorerCaptureHost() {
    var diag = {
      readExplorerIframeDocument: 'fail',
      readExplorerIframeReason: '',
      readExplorerHost: 'fail',
      readExplorerHostReason: '',
      source: 'none'
    };
    var iframeDoc = null;
    try {
      iframeDoc = readExplorerIframeDocument();
      if (iframeDoc && iframeDoc.body) {
        diag.readExplorerIframeDocument = 'success';
        var frame = readExplorerIframeElement();
        return {
          diag: diag,
          doc: iframeDoc,
          win: iframeDoc.defaultView,
          frame: frame,
          grid: focusExplorerGrid(iframeDoc, iframeDoc.defaultView),
          source: 'iframe'
        };
      }
      diag.readExplorerIframeReason = 'iframe not found or cross-origin blocked';
    } catch (e) {
      diag.readExplorerIframeReason = e && e.message ? e.message : String(e);
    }

    try {
      var host = readExplorerHost();
      if (host && host.doc) {
        diag.readExplorerHost = 'success';
        return {
          diag: diag,
          doc: host.doc,
          win: host.win || (typeof window.top !== 'undefined' ? window.top : window),
          frame: host.frame || null,
          grid: host.grid || focusExplorerGrid(host.doc, host.win),
          source: 'dashboard-host'
        };
      }
      diag.readExplorerHostReason = 'no Explorer grid in top/parent document';
    } catch (e2) {
      diag.readExplorerHostReason = e2 && e2.message ? e2.message : String(e2);
    }

    return { diag: diag, doc: null, win: null, frame: null, grid: null, source: 'none' };
  }

  function findExplorerScroller(doc, gridRoot) {
    if (!doc || !doc.body) return { scroller: null, candidates: 0, meta: 'none' };
    var scope = gridRoot || doc.body;
    var scrollers = scope.querySelectorAll(
      '.wux-scroller, [class*="scroller"], [class*="Scroller"], [role="grid"], [role="tree"]'
    );
    var ranked = [];
    var si;
    for (si = 0; si < scrollers.length; si++) {
      var candidate = scrollers[si];
      if (!isInExplorerPanel(candidate)) continue;
      var sh = candidate.scrollHeight || 0;
      var ch = candidate.clientHeight || 0;
      var rowCount = candidate.querySelectorAll('[role="row"], [role="treeitem"]').length;
      if (sh <= ch + 5 && rowCount < 2) continue;
      var text = '';
      try {
        text = String(candidate.innerText || candidate.textContent || '');
      } catch (eText) { /* */ }
      var score = sh - ch;
      if (/t[ií]tulo|revis|propriet|em\s*trabalh|aprovado|in\s*work/i.test(text)) score += 5000;
      if (rowCount > 0) score += rowCount * 10;
      ranked.push({
        el: candidate,
        score: score,
        sh: sh,
        ch: ch,
        cls: String(candidate.className || candidate.getAttribute('role') || 'node')
      });
    }
    ranked.sort(function (a, b) { return b.score - a.score; });
    var best = ranked.length ? ranked[0] : null;
    return {
      scroller: best ? best.el : null,
      candidates: ranked.length,
      meta: best
        ? best.cls + ' scrollHeight=' + best.sh + ' clientHeight=' + best.ch
        : 'none'
    };
  }

  function collectMirrorRowsFromDoc(doc, rootName, seen, items, rootMeta) {
    if (!doc || !doc.body) return 0;
    var before = items.length;
    extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
    scrapeMirrorRowsFromDom(doc, rootName, seen, items);
    scrapeExplorerTreeItems(doc, rootName, items, seen, rootMeta);
    return items.length - before;
  }

  function probeExplorerMirrorCapture(rootName, options) {
    options = options || {};
    var log = options.log || function () {};
    var expected = getExplorerObjectCount();
    log('expected/count from Explorer', expected);

    var host = resolveExplorerCaptureHost();
    log(
      'readExplorerIframeDocument',
      host.diag.readExplorerIframeDocument +
        (host.diag.readExplorerIframeReason ? ' reason=' + host.diag.readExplorerIframeReason : '')
    );
    log(
      'readExplorerHost',
      host.diag.readExplorerHost +
        (host.diag.readExplorerHostReason ? ' reason=' + host.diag.readExplorerHostReason : '')
    );

    var text = harvestExplorerWidgetTextFromDashboard() || harvestExplorerTextOnly() || '';
    log('text harvest chars', text.length);

    var domRows = 0;
    var gridRows = 0;
    if (host.doc) {
      var probeItems = [];
      var probeSeen = {};
      var rootMeta = parseExplorerRootMetaFromText(text);
      collectMirrorRowsFromDoc(host.doc, rootName, probeSeen, probeItems, rootMeta);
      domRows = probeItems.length;
      gridRows = getExplorerDataRows(host.doc).length;
    }
    log('DOM direct rows', domRows);
    log('grid rows found', gridRows);

    var scrollerInfo = host.doc ? findExplorerScroller(host.doc, host.grid) : { candidates: 0, meta: 'none' };
    log('scroller candidates', scrollerInfo.candidates);
    log('selected scroller', scrollerInfo.meta);

    return {
      host: host,
      expected: expected,
      textLength: text.length,
      domRows: domRows,
      gridRows: gridRows,
      scrollerInfo: scrollerInfo
    };
  }

  function tryExplorerScrollHarvestAsync(rootName, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var onStep = options.onStep;
      var host = resolveExplorerCaptureHost();
      var doc = host.doc;
      var expected = Math.max(
        getExplorerObjectCount() || 0,
        getExplorerSelectionCount() || 0
      );
      var maxStepsCfg = options.maxSteps || (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_MAX_STEPS) || 36;
      var stepMs = options.stepMs || (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_STEP_MS) || 120;
      var panelText = harvestExplorerWidgetTextFromDashboard() || harvestExplorerTextOnly();
      var rootMeta = parseExplorerRootMetaFromText(panelText);
      rootName = String(rootName || structureNameHint || '').trim();
      var items = [];
      var seen = {};

      if (rootName && isValidMirrorPartName(rootName)) {
        pushGridItem(items, seen, buildMirrorRow(rootName, 0, 0, {
          title: rootName,
          revision: rootMeta.revision || '—',
          maturity: rootMeta.maturity || '—',
          owner: rootMeta.owner || '',
          type: rootMeta.type || 'Physical Product',
          approved: rootMeta.approved
        }));
      }

      function finish() {
        if (panelText && (items.length < 2 || (expected > 0 && items.length < expected))) {
          scrapeMirrorRowsFromNameRevisionPairs(panelText, rootName, seen, items, rootMeta);
        }
        scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);
        var payload = buildMirrorPayloadFromItems(items, rootName, 'explorer-scroll', expected);
        if (!payload) return resolve(null);
        payload.captureSource = host.source;
        payload.captureDiag = host.diag;
        if (expected > 0 && payload.items.length >= expected) return resolve(payload);
        if (expected > 0 && payload.items.length >= expected - 1) return resolve(payload);
        resolve(payload);
      }

      if (!doc || !doc.body) {
        if (panelText) {
          scrapeMirrorRowsFromNameRevisionPairs(panelText, rootName, seen, items, rootMeta);
        }
        scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);
        return resolve(buildMirrorPayloadFromItems(items, rootName, 'explorer-scroll', expected));
      }

      collectMirrorRowsFromDoc(doc, rootName, seen, items, rootMeta);
      var scrollerInfo = findExplorerScroller(doc, host.grid);
      var scroller = scrollerInfo.scroller;

      if (!scroller) {
        return finish();
      }

      var initialScroll = scroller.scrollTop;
      var stepPx = Math.max(80, Math.floor(scroller.clientHeight * 0.4));
      var step = 0;
      var maxSteps = Math.min(
        maxStepsCfg,
        expected > 0 ? Math.max(60, Math.ceil(expected * 1.5)) : maxStepsCfg
      );
      var stale = 0;
      var lastLen = items.length;
      var deadline = Date.now() + ((APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_MS) || 28000) - 2000;

      function tick() {
        if (Date.now() > deadline) {
          try { scroller.scrollTop = initialScroll; } catch (eDl) { /* */ }
          return finish();
        }
        collectMirrorRowsFromDoc(doc, rootName, seen, items, rootMeta);
        if (onStep) onStep(step, items.length);
        if (items.length > lastLen) stale = 0;
        else stale++;
        lastLen = items.length;
        if (expected > 0 && items.length >= expected) {
          try { scroller.scrollTop = initialScroll; } catch (eR) { /* */ }
          return finish();
        }
        if (step >= maxSteps || stale >= 12) {
          try { scroller.scrollTop = initialScroll; } catch (eR2) { /* */ }
          return finish();
        }
        scroller.scrollTop = Math.min(scroller.scrollTop + stepPx, scroller.scrollHeight);
        step++;
        window.setTimeout(tick, stepMs);
      }

      try { scroller.scrollTop = 0; } catch (e0) { /* */ }
      window.setTimeout(tick, stepMs);
    });
  }

  function scrapeExplorerTreeLines(lines, rootName, items, seen) {
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line || line.indexOf('|') >= 0 || EXPLORER_SKIP_LINE.test(line)) continue;
      var name = null;
      var partM = line.match(EXPLORER_PART_LINE) || line.match(EXPLORER_NAME_LINE);
      if (partM) name = partM[1];
      else if (/^(01_SKA_|Mont\d)/i.test(line) && line.length >= 4 && line.length <= 64) {
        name = line.replace(/\.{2,}$/, '').trim();
      }
      if (!name || name.length < 6) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var revision = '—';
      var maturity = '—';
      var j;
      for (j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        var L = String(lines[j] || '').trim();
        if (!L || L.indexOf('|') >= 0) break;
        if (EXPLORER_PART_LINE.test(L) && j > i + 1) break;
        if (/^\d+\.\d+$/.test(L)) revision = L;
        if (/em trabalho|aprovado|released|frozen|obsolete|in work/i.test(L)) maturity = L;
      }
      var approved = /aprovado|released|frozen/i.test(maturity);
      pushGridItem(items, seen, {
        level: 1,
        name: name,
        title: name,
        type: 'Physical Product',
        displayType: 'Physical Product',
        revision: revision,
        state: maturity,
        maturity: maturity,
        approval: approved ? 'Approved' : 'Unknown',
        physicalid: makeGridPhysicalId(name, items.length, false)
      });
    }
  }

  function buildRowFromName(name, level, idx, extra) {
    extra = extra || {};
    return {
      level: level,
      name: name,
      title: extra.title || extra.description || name,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: extra.revision || '—',
      state: extra.maturity || '—',
      maturity: extra.maturity || '—',
      owner: extra.owner || '',
      approval: extra.approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
  }

  function ownerFromExplorerCell(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    if (s.charAt(0) === '{') {
      try {
        var o = JSON.parse(s);
        return String(o.label || o.name || o.displayName || '').trim();
      } catch (e) {
        var m = s.match(/"label"\s*:\s*"([^"]+)"/i);
        return m ? m[1].trim() : '';
      }
    }
    if (/^\d+$/.test(s) || /^(aprovado|em\s*trabalh|released|physical\s*product)/i.test(s)) return '';
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(s)) return '';
    if (/[<>\(]/.test(s)) return '';
    return s;
  }

  function normalizePartKey(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s*\([^)]*\)\s*$/, '');
  }

  function isPartIdentifier(s) {
    s = String(s || '').trim();
    if (!s) return true;
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(s)) return true;
    if (/[<][0-9]+[>]/.test(s)) return true;
    if (/\(Peça|\(Parte|\(Part\b/i.test(s)) return true;
    if (/^physical\s*product$/i.test(s)) return true;
    return false;
  }

  function isPersonName(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    if (!s || s.length < 3 || s.length > 64) return false;
    if (isPartIdentifier(s)) return false;
    if (/^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|frozen|obsoleto|physical\s*product|vpmreference|3dshape)/i.test(s)) {
      return false;
    }
    if (/^\d+[.,]\d+$/.test(s)) return false;
    if (/^[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s.\-\/\"\'\(\)]{4,}$/.test(s) && s === s.toUpperCase()) return false;
    if (/^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+$/.test(s)) return true;
    return /^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]{2,}$/.test(s);
  }

  function extractOwnerFromDomCell(cell) {
    if (!cell) return '';
    var attrs = ['data-value', 'title', 'aria-label'];
    var ai;
    for (ai = 0; ai < attrs.length; ai++) {
      var av = labelText(cell.getAttribute(attrs[ai]));
      if (isPersonName(av)) return av;
    }
    try {
      var html = cell.innerHTML || '';
      var jsonM = html.match(/\{"icon"[\s\S]{0,400}?\}/);
      if (jsonM) {
        var fromJson = ownerFromExplorerCell(jsonM[0]);
        if (isPersonName(fromJson)) return fromJson;
      }
    } catch (e0) { /* */ }
    var text = (cell.innerText || cell.textContent || '').trim();
    if (isPersonName(text)) return text;
    var fromCell = ownerFromExplorerCell(text);
    if (isPersonName(fromCell)) return fromCell;
    return '';
  }

  function findOwnerColumnIndex(doc) {
    if (!doc) return -1;
    var headers = doc.querySelectorAll(
      '[role="columnheader"], th, .wux-controls-header-cell, [class*="HeaderCell"], [class*="header-cell"]'
    );
    var i;
    for (i = 0; i < headers.length; i++) {
      var t = (headers[i].innerText || headers[i].textContent || '').trim().toLowerCase();
      if (t.indexOf('propriet') >= 0 || t === 'owner' || /^owner\b/.test(t)) return i;
    }
    return -1;
  }

  function partNameFromText(text) {
    var s = String(text || '').trim().split('\n')[0];
    if (!s) return '';
    if (s.indexOf('|') >= 0) s = s.split('|')[0].trim();
    var m = s.match(EXPLORER_PART_LINE) || s.match(EXPLORER_NAME_LINE);
    if (m) return m[1] || m[0];
    if (/^(01_SKA_|SKA_|Mont\d)/i.test(s) && s.length >= 6 && s.length <= 96) {
      return s.replace(/<[^>]+>.*$/, '').trim();
    }
    return '';
  }

  function scrapeOwnerMapFromText(text) {
    var map = {};
    String(text || '').split('\n').forEach(function (line) {
      line = String(line || '').trim();
      if (!line) return;
      if (line.indexOf('|') >= 0) {
        var parts = line.split('|').map(function (p) { return p.trim(); });
        if (parts.length < 3) return;
        var partName = partNameFromText(parts[0]);
        if (!partName) return;
        var ownerName = '';
        var pi;
        for (pi = 1; pi < parts.length; pi++) {
          var fromJson = ownerFromExplorerCell(parts[pi]);
          if (isPersonName(fromJson)) {
            ownerName = fromJson;
            break;
          }
          if (isPersonName(parts[pi])) {
            ownerName = parts[pi];
            break;
          }
        }
        if (partName && ownerName) map[normalizePartKey(partName)] = ownerName;
        return;
      }
      var inline = line.match(/^((?:01_SKA_|SKA_|Mont\d)[^\|]{4,80})\s+([A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(?:\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+)/i);
      if (inline && isPersonName(inline[2])) {
        map[normalizePartKey(inline[1])] = inline[2].trim();
      }
    });
    return map;
  }

  function scrapeOwnerMapFromDom(doc) {
    var map = {};
    if (!doc || !doc.body) return map;
    var ownerCol = findOwnerColumnIndex(doc);
    var rows = doc.querySelectorAll(
      '[role="row"], tr.wux-controls-datagrid-row, .wux-layouts-datagrid-row, [class*="DataGridRow"]'
    );
    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (row.querySelector('[role="columnheader"]')) continue;
      var cells = row.querySelectorAll('[role="gridcell"], td, .wux-controls-datagrid-cell, [class*="DataGridCell"]');
      if (cells.length < 2) continue;
      var partName = partNameFromText(cells[0].innerText || cells[0].textContent || '');
      if (!partName && cells.length > 1) {
        partName = partNameFromText(cells[1].innerText || cells[1].textContent || '');
      }
      if (!partName) continue;
      var ownerName = '';
      if (ownerCol >= 0 && ownerCol < cells.length) {
        ownerName = extractOwnerFromDomCell(cells[ownerCol]);
      }
      if (!ownerName) {
        var ci;
        for (ci = 1; ci < cells.length; ci++) {
          if (ci === ownerCol) continue;
          var candidate = extractOwnerFromDomCell(cells[ci]);
          if (isPersonName(candidate)) {
            ownerName = candidate;
            break;
          }
        }
      }
      if (partName && ownerName) map[normalizePartKey(partName)] = ownerName;
    }
    return map;
  }

  function scrapeExplorerOwnerMap() {
    pollDashboardExplorerChrome();
    var map = {};
    var doc = readExplorerIframeDocument();
    if (doc) {
      var domMap = scrapeOwnerMapFromDom(doc);
      Object.keys(domMap).forEach(function (k) {
        map[k] = domMap[k];
      });
    }
    var textMap = scrapeOwnerMapFromText(harvestExplorerTextOnly() || harvestAllExplorerText());
    Object.keys(textMap).forEach(function (k) {
      if (!map[k]) map[k] = textMap[k];
    });
    return map;
  }

  function lookupOwnerForPart(ownerMap, partName) {
    if (!ownerMap || !partName) return '';
    var key = normalizePartKey(partName);
    if (ownerMap[key]) return ownerMap[key];
    var found = '';
    Object.keys(ownerMap).forEach(function (k) {
      if (found) return;
      if (k === key || k.indexOf(key) >= 0 || key.indexOf(k) >= 0) found = ownerMap[k];
    });
    return found;
  }

  function applyOwnersToItems(items) {
    if (!items || !items.length) return items;
    var ownerMap = scrapeExplorerOwnerMap();
    if (!Object.keys(ownerMap).length) return items;
    items.forEach(function (it) {
      var owner = lookupOwnerForPart(ownerMap, it.name || it.title);
      if (owner && isPersonName(owner)) {
        it.owner = owner;
      } else if (isPartIdentifier(it.owner) || !isPersonName(it.owner)) {
        it.owner = it.owner && isPersonName(it.owner) ? it.owner : '';
      }
    });
    return items;
  }

  function applyOwnersToIndex(index) {
    if (!index) return index;
    var items = Object.keys(index).map(function (k) { return index[k]; });
    applyOwnersToItems(items);
    return index;
  }

  function normExplorerHeader(h) {
    return String(h || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}$/, '')
      .replace(/[^\w\sà-ú]/gi, '');
  }

  function classifyExplorerHeader(h) {
    var n = normExplorerHeader(h);
    if (!n) return null;
    if (n.indexOf('titulo') >= 0 || n === 'title' || (n === 'nome' && n.indexOf('numero') < 0)) return 'name';
    if (n.indexOf('descr') >= 0 || n === 'description') return 'title';
    if (n.indexOf('revis') >= 0 || n === 'revision') return 'revision';
    if (n.indexOf('propriet') >= 0 || n === 'owner') return 'owner';
    if (n.indexOf('tipo') >= 0 || n === 'type') return 'type';
    if (n.indexOf('matur') >= 0 || n.indexOf('estado de mat') >= 0 || n === 'status' || n === 'state') {
      return 'maturity';
    }
    return null;
  }

  function mapExplorerColumnsFromHeaders(headerTexts) {
    var colMap = {};
    var i;
    for (i = 0; i < headerTexts.length; i++) {
      var key = classifyExplorerHeader(headerTexts[i]);
      if (key && colMap[key] === undefined) colMap[key] = i;
    }
    return colMap;
  }

  function defaultExplorerColumnMap() {
    return { name: 0, title: 1, revision: 2, owner: 3, type: 4, maturity: 5 };
  }

  function isMirrorUiNoise(s) {
    s = String(s || '').trim();
    if (!s) return true;
    if (EXPLORER_SKIP_LINE.test(s)) return true;
    if (/^\d+\s*objetos?\b/i.test(s)) return true;
    if (/^\d+\s*objects?\b/i.test(s)) return true;
    if (/^nenhum item selecionado$/i.test(s)) return true;
    if (/^loading\.{0,3}$/i.test(s)) return true;
    if (/^(aprovado|em\s*trabalh|released|frozen|in\s*work|obsolete)$/i.test(s)) return true;
    if (/^physical\s*product$/i.test(s)) return true;
    if (/^(t[ií]tulo|descri|revis|propriet|tipo|estado|maturidade|status)$/i.test(s)) return true;
    if (/^(todos|filtrar|pesquisar|search|filter)$/i.test(s)) return true;
    if (/^mont\d+\s*-\s*montagem$/i.test(s)) return false;
    return false;
  }

  function isRepresentationTypeLabel(name) {
    name = String(name || '').trim();
    if (!name) return true;
    if (/^physical\s*product$/i.test(name)) return true;
    if (/^produto\s*f[ií]sico$/i.test(name)) return true;
    if (/^3d\s*shape$/i.test(name)) return true;
    if (/^vpmreference$/i.test(name)) return true;
    if (/^reference$/i.test(name)) return true;
    return false;
  }

  function isValidMirrorPartName(name) {
    name = String(name || '').trim();
    if (!name || name.length < 2 || name.length > 120) return false;
    if (isMirrorUiNoise(name)) return false;
    if (isRepresentationTypeLabel(name)) return false;
    if (isPersonName(name)) return false;
    if (/^\d+[.,]\d+$/.test(name)) return false;
    if (partNameFromText(name)) return true;
    if (/^(Mont\d+[A-Za-z0-9_.\-]*|01_SKA_|SKA_)/i.test(name)) return true;
    if (/^[A-Za-z0-9][A-Za-z0-9_.\-\/]{2,}$/.test(name) && /[A-Za-z]/.test(name) && /\d/.test(name)) return true;
    if (/^Mont\d+$/i.test(name)) return true;
    if (/^[A-Z]\d+$/i.test(name)) return true;
    if (/^[A-Za-z]{1,4}\d{1,6}$/i.test(name)) return true;
    if (/^[A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9\s.\-\/\"\'\(\)]{2,118}$/.test(name)) return true;
    return false;
  }

  function isValidMirrorRevision(rev) {
    rev = String(rev || '').trim();
    if (!rev || rev === '—' || rev === '-') return true;
    if (isPersonName(rev)) return false;
    if (/^(aprovado|em\s*trabalh|physical\s*product)$/i.test(rev)) return false;
    return /^\d+[.,]\d+[A-Za-z]?$/.test(rev) || /^[A-Z]\d+$/i.test(rev) || /^Rev\.?\s*\d/i.test(rev);
  }

  function isValidMirrorType(type) {
    type = String(type || '').trim();
    if (!type) return true;
    if (isPersonName(type)) return false;
    if (/^(aprovado|em\s*trabalh|\d+[.,]\d+)$/i.test(type)) return false;
    return /product|assembly|part|component|reference|montagem|peça|parte/i.test(type);
  }

  function isValidMirrorMaturity(mat) {
    mat = String(mat || '').trim();
    if (!mat || mat === '—' || mat === '-') return true;
    if (/^physical\s*product$/i.test(mat)) return false;
    if (isPersonName(mat)) return false;
    return /aprovado|trabalh|released|frozen|work|obsolete|draft|rascunho|review|matur|estado/i.test(mat);
  }

  function validateMirrorItem(item) {
    if (!item || !item.name) return false;
    if (!isValidMirrorPartName(item.name)) return false;
    if (!isValidMirrorRevision(item.revision)) return false;
    if (!isValidMirrorType(item.type)) return false;
    if (!isValidMirrorMaturity(item.maturity)) return false;
    if (item.owner && !isPersonName(item.owner)) return false;
    if (isPersonName(item.title) && item.title !== item.name) return false;
    return true;
  }

  function mirrorItemScore(item) {
    var score = 0;
    if (/^\d+[.,]\d+/.test(String(item.revision || ''))) score += 4;
    if (isPersonName(item.owner)) score += 3;
    if (isValidMirrorMaturity(item.maturity) && item.maturity !== '—') score += 2;
    if (isValidMirrorType(item.type)) score += 1;
    if (partNameFromText(item.name)) score += 2;
    return score;
  }

  function sanitizeMirrorItems(items, rootName) {
    if (!items || !items.length) return [];
    var valid = [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (validateMirrorItem(items[i])) valid.push(items[i]);
    }
    var expected = getExplorerObjectCount();
    if (expected > 0 && valid.length > expected) {
      valid.sort(function (a, b) { return mirrorItemScore(b) - mirrorItemScore(a); });
      valid = valid.slice(0, expected);
    }
    return valid;
  }

  function isExplorerColumnHeaderLine(line) {
    return /^(title|description|revision|menu|t[ií]tulo|descri|revis|propriet|tipo|estado|maturidade|owner|type|state)$/i.test(
      String(line || '').trim()
    );
  }

  function isExplorerInternalIdLine(line) {
    line = String(line || '').trim();
    if (!line) return true;
    if (/^prd-R\d/i.test(line)) return true;
    if (/^SKA_ENDERxcadmodel/i.test(line)) return true;
    if (/^SKA_[A-Z0-9_\-]{10,}$/i.test(line) && line.indexOf(' ') < 0 && line.indexOf('(') < 0) return true;
    if (/^3D Shape\d/i.test(line)) return true;
    return false;
  }

  function parseExplorerRootPipeLine(line) {
    line = String(line || '').trim();
    if (line.indexOf('|') < 0) return null;
    var parts = line.split('|').map(function (p) { return p.trim(); });
    if (parts.length < 4) return null;
    if (!/product|reference|assembly|shape|part/i.test(parts[0])) return null;
    var owner = ownerFromExplorerCell(parts[3]);
    if (!isPersonName(owner)) owner = isPersonName(parts[3]) ? parts[3] : '';
    return {
      type: parts[0],
      revision: normalizeRevisionLabel(parts[1]),
      maturity: normalizeMaturityLabel(parts[2]),
      owner: owner,
      approved: /aprovado|released|frozen/i.test(parts[2])
    };
  }

  function parseExplorerRootMetaFromText(text) {
    var lines = String(text || '').split('\n');
    var i;
    for (i = 0; i < lines.length; i++) {
      var meta = parseExplorerRootPipeLine(lines[i]);
      if (meta) return meta;
    }
    return {};
  }

  function applyDefaultOwnerFromRoot(items, rootMeta) {
    if (!items || !items.length || !rootMeta) return items;
    var owner = rootMeta.owner || '';
    if (!isPersonName(owner)) return items;
    items.forEach(function (it) {
      if (!it.owner || /^sem\s*propriet|^—$|^-$/i.test(String(it.owner).trim())) {
        it.owner = owner;
      }
    });
    return items;
  }

  function buildMirrorRow(name, level, idx, extra) {
    extra = extra || {};
    var maturity = extra.maturity || '—';
    var approved = extra.approved || /aprovado|released|frozen/i.test(maturity);
    var row = {
      level: level,
      name: name,
      title: extra.title || name,
      type: extra.type || 'Physical Product',
      displayType: extra.type || 'Physical Product',
      revision: extra.revision || '—',
      state: maturity,
      maturity: maturity,
      owner: extra.owner || '',
      approval: approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
    if (extra.sourcePhysicalId && isPrdCloudId(extra.sourcePhysicalId)) {
      row.sourcePhysicalId = extra.sourcePhysicalId;
    }
    return row;
  }

  /**
   * Formato US/EN do Explorer: NOME\\n1.1\\nNOME\\n1.1 (após bloco de IDs internos).
   */
  function extractOwnerFromExplorerRow(row, rootMeta) {
    var owner = (rootMeta && rootMeta.owner) || '';
    if (!row) return owner;
    var ownerEl = row.querySelector(
      '.enx-tile-owner, .enx-tile-subLabel-owner-label, .wux-tweakers-urlobject .wux-tweakers-string-label'
    );
    if (ownerEl) {
      var ot = String(ownerEl.innerText || ownerEl.textContent || '').trim().replace(/\s+/g, ' ');
      if (isPersonName(ot)) return ot;
    }
    return owner;
  }

  function extractMaturityFromExplorerRow(row) {
    if (!row) return '—';
    var rowText = String(row.innerText || row.textContent || '');
    if (/aprovado|released|frozen/i.test(rowText)) return 'Aprovado';
    if (/em\s*trabalh|in\s*work/i.test(rowText)) return 'Em Trabalho';
    return '—';
  }

  function extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName) {
    if (!doc || !doc.body) return 0;
    var divs = doc.querySelectorAll('div');
    var added = 0;
    var di;
    for (di = 0; di < divs.length; di++) {
      var el = divs[di];
      if (el.children.length > 8) continue;
      var t = String(el.innerText || el.textContent || '').trim();
      var m = t.match(/^([^\n]{2,120})\n(\d+[.,]\d+[A-Za-z]?)$/);
      if (!m) continue;
      var name = m[1].trim();
      if (!isValidMirrorPartName(name)) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var row = el.closest('[role="row"]') || el.parentElement;
      var item = buildMirrorRow(name, 1, items.length, {
        title: name,
        revision: normalizeRevisionLabel(m[2]),
        owner: extractOwnerFromExplorerRow(row, rootMeta),
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: extractMaturityFromExplorerRow(row),
        sourcePhysicalId: extractPrdFromDomRow(row)
      });
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromExplorerDomScroll(doc, rootName, seen, items, rootMeta) {
    if (!doc || !doc.body) return 0;
    var expected = getExplorerObjectCount();
    var scrollers = doc.querySelectorAll(
      '.wux-scroller, [class*="scroller"], [class*="Scroller"], [role="grid"]'
    );
    var scroller = null;
    var si;
    for (si = 0; si < scrollers.length; si++) {
      var candidate = scrollers[si];
      if (candidate.scrollHeight <= candidate.clientHeight + 20) continue;
      var text = '';
      try {
        text = String(candidate.innerText || candidate.textContent || '');
      } catch (eText) { /* */ }
      var score = candidate.scrollHeight - candidate.clientHeight;
      if (/t[ií]tulo|revis|propriet|em\s*trabalh|aprovado|in\s*work/i.test(text)) score += 5000;
      if (!scroller || score > scroller.__bomScore) {
        try { candidate.__bomScore = score; } catch (eScore) { /* */ }
        scroller = candidate;
      }
    }
    if (!scroller) {
      return extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
    }
    var initialScroll = scroller.scrollTop;
    var totalAdded = 0;
    var maxSteps = Math.min(
      (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_MAX_STEPS) || 24,
      expected > 40 ? 48 : 36
    );
    var step = Math.max(100, Math.floor(scroller.clientHeight * 0.45));
    var stale = 0;
    var lastLen = items.length;
    var s;
    for (s = 0; s < maxSteps; s++) {
      totalAdded += extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
      if (items.length > lastLen) stale = 0;
      else stale++;
      lastLen = items.length;
      if (expected > 0 && items.length >= expected) break;
      if (stale >= 10) break;
      var nextTop = scroller.scrollTop + step;
      if (nextTop >= scroller.scrollHeight - 5) {
        extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
        break;
      }
      scroller.scrollTop = nextTop;
    }
    try {
      scroller.scrollTop = initialScroll;
    } catch (eScroll) { /* */ }
    return totalAdded;
  }

  function scrapeMirrorRowsFromNameRevisionPairs(text, rootName, seen, items, rootMeta) {
    rootMeta = rootMeta || {};
    var lines = String(text || '').split('\n').map(function (l) { return String(l || '').trim(); });
    var added = 0;
    var i;

    if (rootName && isValidMirrorPartName(rootName)) {
      var rootItem = buildMirrorRow(rootName, 0, 0, {
        title: rootName,
        revision: rootMeta.revision || '—',
        maturity: rootMeta.maturity || '—',
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        approved: rootMeta.approved
      });
      var beforeRoot = items.length;
      pushGridItem(items, seen, rootItem);
      if (items.length > beforeRoot) added++;
    }

    var pendingPrd = '';
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || isExplorerColumnHeaderLine(line) || isMirrorUiNoise(line)) continue;
      if (/^\d+\s*(?:of|de)\s*\d+\s*(?:selected|selecionado)/i.test(line)) continue;
      var prdLine = extractPrdFromText(line);
      if (prdLine && String(line).replace(prdLine, '').trim().length < 4) {
        pendingPrd = prdLine;
        continue;
      }
      if (isExplorerInternalIdLine(line) && !prdLine) continue;
      if (line.indexOf('|') >= 0) continue;
      var next = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
      var revLine = next;
      var srcPrd = pendingPrd;
      if (extractPrdFromText(next)) {
        srcPrd = extractPrdFromText(next);
        revLine = i + 2 < lines.length ? String(lines[i + 2] || '').trim() : '';
        if (!/^\d+[.,]\d+[A-Za-z]?$/.test(revLine)) continue;
      } else if (!/^\d+[.,]\d+[A-Za-z]?$/.test(next)) {
        continue;
      }
      if (!isValidMirrorPartName(line)) continue;
      if (rootName && line.toLowerCase() === String(rootName).toLowerCase()) {
        pendingPrd = '';
        i++;
        continue;
      }
      var item = buildMirrorRow(line, 1, items.length, {
        title: line,
        revision: normalizeRevisionLabel(revLine),
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        maturity: '—',
        sourcePhysicalId: srcPrd
      });
      pendingPrd = '';
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) {
        added++;
        i += extractPrdFromText(next) ? 2 : 1;
      }
    }
    return added;
  }

  function assessMirrorQuality(items) {
    var list = items || [];
    var bad = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (isPersonName(it.name) && !/^SKA_/i.test(it.name)) bad++;
      if (it.owner && !isPersonName(it.owner) && !/^sem\s*propriet/i.test(String(it.owner))) bad++;
      if (it.revision && isPersonName(it.revision)) bad++;
    }
    return { ok: bad === 0, badRows: bad, total: list.length };
  }

  function normalizeMaturityLabel(raw) {
    var s = String(raw || '').trim();
    if (!s) return '—';
    if (/aprovado|released|frozen/i.test(s)) return 'Aprovado';
    if (/em\s*trabalh|in\s*work/i.test(s)) return 'Em Trabalho';
    return s;
  }

  function normalizeRevisionLabel(raw) {
    var s = String(raw || '').trim();
    if (!s) return '—';
    if (/^\d+[.,]\d+$/.test(s)) return s.replace(',', '.');
    var m = s.match(/\b(\d+\.\d+)\b/);
    return m ? m[1] : (s === '—' || s === '-' ? '—' : s);
  }

  function readMirrorField(raw, fieldKey) {
    var s = String(raw == null ? '' : raw).trim();
    if (fieldKey === 'owner') {
      var fromOwner = ownerFromExplorerCell(s);
      return isPersonName(fromOwner) ? fromOwner : (isPersonName(s) ? s : '');
    }
    if (fieldKey === 'name') {
      var name = partNameFromText(s) || s.split('\n')[0].trim();
      if (!name || isPersonName(name)) return '';
      if (isRepresentationTypeLabel(name)) return '';
      return name;
    }
    if (fieldKey === 'revision') return normalizeRevisionLabel(s);
    if (fieldKey === 'maturity') return normalizeMaturityLabel(s);
    if (fieldKey === 'type') return s || 'Physical Product';
    if (fieldKey === 'title') return s || '';
    return s;
  }

  function readMirrorFieldFromCell(cell, fieldKey) {
    if (!cell) return '';
    if (fieldKey === 'owner') {
      var fromDom = extractOwnerFromDomCell(cell);
      if (isPersonName(fromDom)) return fromDom;
      return readMirrorField(cell.innerText || cell.textContent || '', 'owner');
    }
    return readMirrorField(cell.innerText || cell.textContent || '', fieldKey);
  }

  function buildMirrorItemFromValues(values, colMap, idx, level) {
    colMap = colMap || defaultExplorerColumnMap();
    function val(key, fieldKey) {
      var ci = colMap[key];
      if (ci === undefined || ci >= values.length) return '';
      if (values[ci] && values[ci].nodeType === 1) {
        return readMirrorFieldFromCell(values[ci], fieldKey || key);
      }
      return readMirrorField(values[ci], fieldKey || key);
    }
    var name = val('name', 'name');
    var typeCol = val('type', 'type');
    if (!name && colMap.name !== 0) name = readMirrorField(values[0], 'name');
    if (isRepresentationTypeLabel(name) || (typeCol && name && name.toLowerCase() === typeCol.toLowerCase())) {
      name = val('title', 'title') || '';
      if (isRepresentationTypeLabel(name)) name = '';
    }
    if (!name || isPersonName(name) || isRepresentationTypeLabel(name)) return null;
    var title = val('title', 'title') || name;
    if (isPersonName(title) && !isPersonName(name)) title = name;
    var revision = val('revision', 'revision') || '—';
    var owner = val('owner', 'owner') || '';
    var type = val('type', 'type') || 'Physical Product';
    var maturity = val('maturity', 'maturity') || '—';
    if (typeof FileImportService !== 'undefined' && FileImportService.extractFieldsFromExplorerRow) {
      var textCells = values.map(function (v) {
        if (v && v.nodeType === 1) return v.innerText || v.textContent || '';
        return v;
      });
      var fx = FileImportService.extractFieldsFromExplorerRow(textCells);
      if (fx.name && (fx.name === name || revision.length > 12 || isRevisionText(type))) {
        name = fx.name;
        title = fx.title || title;
        revision = fx.revision || revision;
        owner = fx.owner || owner;
        type = fx.type || type;
        maturity = fx.maturity || maturity;
      }
    }
    var approved = /aprovado|released|frozen/i.test(maturity);
    var item = {
      level: level,
      name: name,
      title: title,
      type: type,
      displayType: type,
      revision: revision,
      state: maturity,
      maturity: maturity,
      owner: owner,
      approval: approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
    return validateMirrorItem(item) ? item : null;
  }

  function getExplorerHeaderTexts(doc) {
    if (!doc) return [];
    var headers = doc.querySelectorAll(
      '[role="columnheader"], th, .wux-controls-header-cell, [class*="HeaderCell"], [class*="header-cell"]'
    );
    var texts = [];
    var i;
    for (i = 0; i < headers.length; i++) {
      texts.push((headers[i].innerText || headers[i].textContent || '').trim());
    }
    return texts;
  }

  function getExplorerDataRows(doc) {
    if (!doc) return [];
    return doc.querySelectorAll(
      '[role="row"], tr.wux-controls-datagrid-row, .wux-layouts-datagrid-row, [class*="DataGridRow"]'
    );
  }

  function getRowCells(row) {
    return row.querySelectorAll('[role="gridcell"], td, .wux-controls-datagrid-cell, [class*="DataGridCell"]');
  }

  function scrapeMirrorRowsFromDom(doc, rootName, seen, items) {
    if (!doc || !doc.body) return 0;
    var headerTexts = getExplorerHeaderTexts(doc);
    var colMap = mapExplorerColumnsFromHeaders(headerTexts);
    if (colMap.name === undefined) colMap = defaultExplorerColumnMap();
    var rows = getExplorerDataRows(doc);
    var added = 0;
    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (!isInExplorerPanel(row)) continue;
      if (row.querySelector('[role="columnheader"]')) continue;
      var cells = getRowCells(row);
      if (cells.length < 2) continue;
      var values = [];
      var ci;
      for (ci = 0; ci < cells.length; ci++) values.push(cells[ci]);
      var item = buildMirrorItemFromValues(values, colMap, items.length, items.length === 0 ? 0 : 1);
      if (!item) continue;
      var prdRow = extractPrdFromDomRow(row);
      if (prdRow) item.sourcePhysicalId = prdRow;
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, delimiter) {
    var lines = String(text || '').split('\n');
    var headerLineIdx = -1;
    var colMap = null;
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf(delimiter) < 0) continue;
      var parts = line.split(delimiter).map(function (p) { return p.trim(); });
      var map = mapExplorerColumnsFromHeaders(parts);
      if (map.name !== undefined && (map.revision !== undefined || map.owner !== undefined || map.maturity !== undefined)) {
        headerLineIdx = i;
        colMap = map;
        break;
      }
    }
    if (headerLineIdx < 0 || !colMap) return 0;
    var added = 0;
    for (i = headerLineIdx + 1; i < lines.length; i++) {
      var dl = String(lines[i] || '').trim();
      if (!dl || dl.indexOf(delimiter) < 0) continue;
      if (/^physical product\s/i.test(dl)) continue;
      if (/product structure explorer/i.test(dl)) continue;
      var cells = dl.split(delimiter).map(function (p) { return p.trim(); });
      if (cells.length < 3) continue;
      var item = buildMirrorItemFromValues(cells, colMap, items.length, 1);
      if (!item) continue;
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromVerticalText(text, rootName, seen, items) {
    var lines = String(text || '').split('\n').map(function (l) { return String(l || '').trim(); });
    var headerIdx = -1;
    var i;
    for (i = 0; i < lines.length - 5; i++) {
      if (/^t[ií]tulo$/i.test(lines[i]) && /descri/i.test(lines[i + 1]) && /revis/i.test(lines[i + 2]) && /propriet/i.test(lines[i + 3])) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) return 0;
    var colCount = 6;
    var added = 0;
    for (i = headerIdx + colCount; i + colCount - 1 < lines.length; ) {
      var chunk = lines.slice(i, i + colCount);
      if (!chunk[0] || /^t[ií]tulo$/i.test(chunk[0]) || isMirrorUiNoise(chunk[0])) {
        i++;
        continue;
      }
      if (!isValidMirrorPartName(chunk[0])) {
        i++;
        continue;
      }
      if (!/^\d+[.,]\d+/.test(String(chunk[2] || '')) && chunk[2] !== '—') {
        i++;
        continue;
      }
      var item = buildMirrorItemFromValues(chunk, defaultExplorerColumnMap(), items.length, 1);
      if (!item) {
        i++;
        continue;
      }
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) {
        i += colCount;
        continue;
      }
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) {
        added++;
        i += colCount;
      } else {
        i++;
      }
    }
    return added;
  }

  /**
   * Espelho literal do Product Structure Explorer — colunas por cabeçalho, célula a célula.
   */
  function scrapeExplorerMirror(rootName) {
    pollDashboardExplorerChrome();
    pollStructureHint();
    var doc = readExplorerIframeDocument();
    if (!doc) {
      var captureHost = resolveExplorerCaptureHost();
      if (captureHost && captureHost.doc) doc = captureHost.doc;
    }
    var text = harvestExplorerWidgetTextFromDashboard() || harvestExplorerTextOnly();
    var fromTitle = extractRootNameFromExplorerText(text) || extractRootNameFromExplorerText(harvestAllExplorerText());
    rootName = String(rootName || fromTitle || structureNameHint || '').trim();
    var items = [];
    var seen = {};
    var colMap = null;
    var expected = getExplorerObjectCount();
    var rootMeta = parseExplorerRootMetaFromText(text);

    if (rootName && isValidMirrorPartName(rootName)) {
      pushGridItem(items, seen, buildMirrorRow(rootName, 0, 0, {
        title: rootName,
        revision: rootMeta.revision || '—',
        maturity: rootMeta.maturity || '—',
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        approved: rootMeta.approved
      }));
    }

    if (doc) {
      scrapeMirrorRowsFromExplorerDomScroll(doc, rootName, seen, items, rootMeta);
      if (items.length < 2 || (expected > 0 && items.length < expected)) {
        collectMirrorRowsFromDoc(doc, rootName, seen, items, rootMeta);
      }
    }
    if (text && (items.length < 2 || (expected > 0 && items.length < expected))) {
      scrapeMirrorRowsFromNameRevisionPairs(text, rootName, seen, items, rootMeta);
    }
    if (doc && (items.length < 2 || (expected > 0 && items.length < expected))) {
      var headerTexts = getExplorerHeaderTexts(doc);
      colMap = mapExplorerColumnsFromHeaders(headerTexts);
      if (colMap.name === undefined) colMap = defaultExplorerColumnMap();
      scrapeMirrorRowsFromDom(doc, rootName, seen, items);
    }
    if (items.length < 2 && text) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '\t');
    }
    if (items.length < 2 && text) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '|');
    }

    scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);

    items = sanitizeMirrorItems(items, rootName);
    applyDefaultOwnerFromRoot(items, rootMeta);
    applyOwnersToItems(items);

    if (items.length < 1) return null;

    var quality = assessMirrorQuality(items);
    if (!quality.ok) return null;

    var expectedAfter = getExplorerObjectCount();
    if (expectedAfter > 0 && items.length > expectedAfter + 3) return null;

    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: 'explorer-mirror',
      columnMap: colMap || defaultExplorerColumnMap(),
      explorerExpected: expected || items.length,
      mirrorQuality: quality
    };
  }

  function scrapeExplorerGrid(rootName) {
    var mirror = scrapeExplorerMirror(rootName);
    if (mirror && mirror.items && mirror.items.length >= 1) {
      var expected = getExplorerObjectCount();
      if (!expected || mirror.items.length <= expected + 1) return mirror;
    }

    pollDashboardExplorerChrome();
    var text = harvestExplorerTextOnly() || harvestAllExplorerText();
    if (!text || text.length < 20) return null;
    var fromTitle = extractRootNameFromExplorerText(text);
    rootName = String(rootName || fromTitle || structureNameHint || '').trim();
    if (!rootName) return null;
    var lines = text.split('\n');
    var items = [];
    var seen = {};
    var i;

    pushGridItem(items, seen, buildRowFromName(rootName, 0, 0, {}));

    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line || line.indexOf('|') < 0) continue;
      if (/^physical product\s*\|/i.test(line)) continue;
      if (/product structure explorer/i.test(line)) continue;
      if (/^recents$/i.test(line)) continue;
      var parts = line.split('|').map(function (p) { return p.trim(); });
      if (parts.length < 3) continue;
      var name = parts[0];
      if (!name || name.length < 3 || name === rootName) continue;
      if (/^prd-R/i.test(name)) continue;
      var ownerText = '';
      var pi;
      for (pi = 1; pi < parts.length; pi++) {
        ownerText = ownerFromExplorerCell(parts[pi]);
        if (ownerText) break;
      }
      var maturity = parts[parts.length - 1] || parts[3] || parts[2] || '—';
      if (/^\d+[.,]\d+$/.test(String(maturity))) maturity = parts[parts.length - 1] || '—';
      var approved = /aprovado|released|frozen/i.test(maturity);
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {
        revision: parts[1] || '—',
        maturity: maturity,
        approved: approved,
        owner: ownerText
      }));
    }
    if (items.length < 2) scrapeExplorerTreeLines(lines, rootName, items, seen);
    if (items.length < 2) scrapeDashboardLeafRows(rootName, items, seen);

    var fromRegex = parsePartNamesFromText(text, rootName);
    fromRegex.forEach(function (name) {
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {}));
    });

    if (items.length < 2) return null;
    applyOwnersToItems(items);
    items = sanitizeMirrorItems(items, rootName);
    if (!items.length) return null;
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName, 0, true),
      items: items,
      scrapeSource: 'explorer-dom'
    };
  }

  function fetchPilotStructurePayload(rootName) {
    if (typeof BomSnapshot !== 'undefined' && BomSnapshot.getPilotPayloadForTerm) {
      var built = BomSnapshot.getPilotPayloadForTerm(rootName);
      if (built && built.items && built.items.length >= 2) return Promise.resolve(built);
    }
    var map = APP_CONFIG.PILOT_SNAPSHOT_BY_STRUCTURE || {};
    if (!rootName || typeof BomSnapshot === 'undefined') return Promise.resolve(null);
    var path = null;
    var keyName = String(rootName).trim();
    var keys = Object.keys(map);
    var i;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      var kLow = k.toLowerCase();
      var tLow = keyName.toLowerCase();
      if (tLow === kLow || tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
        path = map[k];
        break;
      }
    }
    if (!path) return Promise.resolve(null);
    var url = BomSnapshot.resolveUrl(path);
    return BomSnapshot.fetchJson(url).then(function (data) {
      return BomSnapshot.normalizePayload(data);
    }).catch(function () {
      return null;
    });
  }

  function resolveFromExplorerCatalog(term) {
    if (!term) return null;
    var catalog = buildPrdCatalogFull();
    var key = String(term).trim();
    var prd = catalog[key];
    if (!prd) {
      var tLow = key.toLowerCase();
      Object.keys(catalog).forEach(function (name) {
        if (prd) return;
        var nLow = name.toLowerCase();
        if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
          prd = catalog[name];
        }
      });
    }
    if (!prd || !isValidId(prd)) return null;
    return {
      physicalid: pickPrdId(prd),
      type: 'VPMReference',
      name: key,
      displayName: key,
      displayType: 'Physical Product',
      source: 'explorer-prd-catalog'
    };
  }

  function normalizeSelection(payload) {
    if (!payload) return null;
    var obj = payload.data || payload.object || payload.item || payload.selection || payload;
    if (obj.icon && obj.label && !obj.physicalid && !obj.objectId) return null;
    if (obj.items && obj.items.length && typeof ThreeDXContentParser !== 'undefined') {
      var fromItems = ThreeDXContentParser.toSelection({ data: { items: obj.items } });
      if (fromItems) return fromItems;
    }
    var physicalid = normalizeId(
      obj.physicalid || obj.objectId || obj.id || obj.resourceid || obj['dseno:physicalid']
    );
    var displayName = labelText(obj.displayName) || labelText(obj.title) || labelText(obj.name) || labelText(obj['dseno:name']);
    if (!isValidId(physicalid) && displayName) {
      setStructureNameHint(displayName);
      var reg = APP_CONFIG.STRUCTURE_IDS || {};
      var rid = reg[displayName] || reg[displayName.toLowerCase()] || reg[displayName.toUpperCase()];
      if (rid) physicalid = normalizeId(rid);
    }
    var nameForLookup = structureNameHint || displayName;
    if (nameForLookup) {
      var catSel = resolveFromExplorerCatalog(nameForLookup);
      if (catSel) return catSel;
      if (!isPrdCloudId(physicalid)) {
        var hintId = lookupRegistryId(nameForLookup, true);
        if (hintId) physicalid = hintId;
      }
    }
    if (!isValidId(physicalid)) return null;
    if (!displayName) {
      displayName = labelText(obj.title) || labelText(obj.name) || physicalid;
    }
    if (displayName.length <= 2 && !isNaN(displayName)) {
      displayName = labelText(obj.title) || labelText(obj.name) || physicalid;
    }
    if (!displayName || displayName.charAt(0) === '{') return null;
    return {
      physicalid: physicalid,
      type: obj.type || obj.objectType || obj['dseno:type'] || 'VPMReference',
      name: displayName || physicalid,
      displayName: displayName || physicalid,
      displayType: obj.displayType || 'Physical Product',
      source: obj.source || 'normalize'
    };
  }

  function isBadDashboardSelection(sel) {
    if (!sel) return true;
    var name = labelText(sel.displayName || sel.name || '');
    if (!name) return true;
    if (name.charAt(0) === '{' && name.indexOf('"icon"') >= 0) return true;
    if (name.indexOf('getpicture') >= 0) return true;
    if (/^(enderson|moura|login|user)/i.test(name)) return true;
    if (/moura/i.test(name) && !/mont|assembly|^m\d+$/i.test(name)) return true;
    return false;
  }

  function clearSelection() {
    currentSelection = null;
  }

  function sanitizeStructureName(name) {
    var n = String(name || '').trim();
    if (!n) return n;
    n = n.replace(/\s*BOM\s*Analytics.*$/i, '').trim();
    if (/^Mont10BOM$/i.test(n)) return 'Mont10';
    if (/BOM$/i.test(n) && n.length > 3) n = n.replace(/BOM$/i, '').trim();
    if (n.length > 80) n = n.slice(0, 80).trim();
    return n;
  }

  function extractStructureNameFromText(text) {
    var s = String(text || '');
    var m =
      s.match(/Product Structure Explorer\s*[-–]\s*(.+?)(?:\s*$|\s*BOM\s*Analytics|\s*ENOVIA)/i) ||
      s.match(/Structure Explorer\s*[-–]\s*(.+?)(?:\s*$|\s*BOM)/i) ||
      s.match(/Explorer\s*[-–]\s*([^\s<]+)/i);
    return m ? sanitizeStructureName(m[1].trim()) : null;
  }

  function notifyStructureChange(name) {
    structureListeners.forEach(function (fn) {
      try { fn(name); } catch (e) { console.error('[Bridge structure]', e); }
    });
  }

  function setStructureNameHint(name) {
    var n = String(name || '').trim();
    if (!n || n === '-') return;
    if (/^(enderson|moura|login|user)/i.test(n)) return;
    if (/BOM\s*Analytics|Varredura|Snapshot/i.test(n)) return;
    n = sanitizeStructureName(n);
    if (!n) return;
    if (n === structureNameHint) return;
    structureNameHint = n;
    notifyStructureChange(n);
  }

  function getStructureNameHint() {
    return structureNameHint;
  }

  function setSelection(sel, opts) {
    if (!sel || !sel.physicalid || isBadDashboardSelection(sel)) return;
    sel = Object.assign({}, sel, { physicalid: normalizeId(sel.physicalid) });
    if (!isValidId(sel.physicalid)) return;
    currentSelection = sel;
    if (opts && opts.silent) return;
    listeners.forEach(function (fn) {
      try { fn(sel); } catch (e) { console.error('[Bridge]', e); }
    });
  }

  function onMessage(event) {
    if (!event.data) return;
    var origin = event.origin || '';
    var okOrigin =
      !origin ||
      origin === location.origin ||
      origin.indexOf('3dexperience.3ds.com') >= 0 ||
      origin.indexOf('3ds.com') >= 0 ||
      origin.indexOf('github') >= 0;
    if (!okOrigin) return;

    var data = event.data;
    if (typeof data === 'string') {
      if (typeof ThreeDXContentParser !== 'undefined') {
        var loose = ThreeDXContentParser.parseJsonText(data);
        if (loose) {
          setSelection(loose);
          return;
        }
      }
      try { data = JSON.parse(data); } catch (e) { return; }
    }

    if (data.protocol === '3DXContent' && data.data && data.data.items) {
      var sel3dx = ThreeDXContentParser.toSelection(data);
      if (sel3dx) setSelection(sel3dx);
      return;
    }

    try {
      var officialArrays = [
        data.structureItems,
        data.loadedItems,
        data.loadedNodes,
        data.visibleRows,
        data.data && data.data.structureItems,
        data.data && data.data.loadedNodes
      ];
      var oi;
      for (oi = 0; oi < officialArrays.length; oi++) {
        if (Array.isArray(officialArrays[oi]) && officialArrays[oi].length > 0) {
          if (!data.scrapeSource || !/dom|mirror|clipboard|tsv/i.test(String(data.scrapeSource))) {
            window.__BOM_OFFICIAL_STRUCTURE_CACHE__ = data;
            break;
          }
        }
      }
    } catch (eStruct) {}

    if (data.structureName || data.rootName || data.structure || data.productName) {
      setStructureNameHint(data.structureName || data.rootName || data.structure || data.productName);
    }
    if (data.widgetTitle || data.title || data.caption) {
      var fromTitle = extractStructureNameFromText(data.widgetTitle || data.title || data.caption);
      if (fromTitle) setStructureNameHint(fromTitle);
    }

    if (data.rootPhysicalId || data.rootId) {
      var rootSel = normalizeSelection({
        physicalid: data.rootPhysicalId || data.rootId,
        displayName: data.rootName || data.structureName || data.name,
        type: data.type || 'VPMReference'
      });
      if (rootSel) setSelection(rootSel);
      return;
    }
    if (data.physicalid || data.objectId || data.resourceid) {
      var direct = normalizeSelection(data);
      if (direct) {
        setSelection(direct);
        return;
      }
    }
    if (data.items && data.items.length) {
      var selItems = normalizeSelection({ items: data.items });
      if (selItems) setSelection(selItems);
      return;
    }
    if (data.data && data.data.items) {
      var selData = ThreeDXContentParser.toSelection(data);
      if (selData) setSelection(selData);
      return;
    }
    var type = data.type || data.event || data.name || data.messageName;
    if (MESSAGE_TYPES.indexOf(type) === -1 && !data.physicalid && !data.object && !data.objectId) return;
    var sel = normalizeSelection(data);
    if (sel) setSelection(sel);
  }

  function subscribe(fn) {
    listeners.push(fn);
    if (currentSelection) fn(currentSelection);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function readHashSelection() {
    if (typeof ThreeDXContentParser === 'undefined') return null;
    var content = ThreeDXContentParser.parseLocations();
    return content ? ThreeDXContentParser.toSelection(content) : null;
  }

  function initFromQuery() {
    if (APP_QUERY.structure || APP_QUERY.rootName) {
      setStructureNameHint(APP_QUERY.structure || APP_QUERY.rootName);
    }
    if (APP_QUERY.physicalid && isValidId(APP_QUERY.physicalid)) {
      setSelection({
        physicalid: APP_QUERY.physicalid,
        type: APP_QUERY.type || 'VPMReference',
        name: APP_QUERY.name || APP_QUERY.physicalid,
        displayName: APP_QUERY.displayName || APP_QUERY.physicalid
      });
    }
  }

  function initFrom3DXDeepLink() {
    var sel = readHashSelection();
    if (sel) setSelection(sel);
  }

  function initPlatformSelection() {
    var req = typeof require !== 'undefined' ? require : null;
    if (!req) return;
    try {
      req(['DS/Selection/Selection'], function (Selection) {
        if (Selection && Selection.getSelection) {
          Selection.getSelection().then(function (items) {
            if (!items || !items.length) return;
            var sel = normalizeSelection(items[0]);
            if (sel) setSelection(sel);
          }).catch(function () { /* */ });
        }
      });
    } catch (e) { /* */ }
    try {
      req(['DS/PlatformAPI/PlatformAPI'], function (PlatformAPI) {
        if (PlatformAPI && PlatformAPI.getSelection) {
          PlatformAPI.getSelection().then(function (items) {
            if (!items || !items.length) return;
            var sel2 = normalizeSelection(items[0]);
            if (sel2) setSelection(sel2);
          }).catch(function () { /* */ });
        }
      });
    } catch (e2) { /* */ }
  }

  function pollDashboardExplorerChrome() {
    var found = null;
    try {
      var doc = window.top && window.top.document;
      if (!doc || !doc.body) return null;
      var nodes = doc.querySelectorAll('div, span, p, h1, h2, h3, td, th, a, li');
      for (var i = 0; i < nodes.length; i++) {
        var text = (nodes[i].textContent || '').trim();
        if (text.length < 12 || text.length > 120) continue;
        if (text.indexOf('Product Structure Explorer') < 0) continue;
        var n = extractStructureNameFromText(text);
        if (n && n.length > 1) {
          found = n;
          break;
        }
      }
    } catch (e) { /* */ }
    if (found) setStructureNameHint(found);
    return found;
  }

  function pollStructureHint() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
      PlatformBridge.requestExplorerStructure();
    }
    pollDashboardExplorerChrome();
    try {
      var titles = [document.title || ''];
      if (window.widget && window.widget.getTitle) {
        try { titles.push(String(window.widget.getTitle())); } catch (eW) { /* */ }
      }
      titles.forEach(function (t) {
        var n = extractStructureNameFromText(t);
        if (n) setStructureNameHint(n);
      });
    } catch (e) { /* */ }
  }

  function subscribeStructure(fn) {
    structureListeners.push(fn);
    if (structureNameHint) fn(structureNameHint);
  }

  function pollSelection() {
    var fromHash = readHashSelection();
    if (fromHash) setSelection(fromHash);
    pollStructureHint();
    initPlatformSelection();
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
  }

  function startContentPoll() {
    if (APP_CONFIG.PILOT_GRID_FIRST) return;
    window.setInterval(pollSelection, 2000);
  }

  function init() {
    window.addEventListener('message', onMessage, false);
    initFromQuery();
    initFrom3DXDeepLink();
    pollStructureHint();
    pollDashboardExplorerChrome();
    if (!APP_CONFIG.PILOT_GRID_FIRST) {
      pollSelection();
      startContentPoll();
    }
    return {
      getSelection: function () { return currentSelection; },
      subscribe: subscribe,
      setSelection: setSelection,
      pollSelection: pollSelection
    };
  }

  function itemsToMirrorPayload(items, rootName, source) {
    if (!items || !items.length) return null;
    var quality = assessMirrorQuality(items);
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: source || 'explorer-auto-copy',
      mirrorQuality: quality,
      explorerExpected: getExplorerObjectCount() || items.length
    };
  }

  function readExplorerHost() {
    var doc = readExplorerIframeDocument();
    if (doc) {
      return { doc: doc, win: doc.defaultView, frame: readExplorerIframeElement() };
    }
    try {
      var topDoc = window.top && window.top.document;
      if (!topDoc || !topDoc.body) return null;
      var nodes = topDoc.querySelectorAll('[role="grid"], .wux-layouts-gridengine-datagrid');
      var i;
      for (i = 0; i < nodes.length; i++) {
        var grid = nodes[i];
        var panel = grid;
        var hop = 0;
        while (panel && hop < 12) {
          var label = String(panel.innerText || panel.textContent || '').slice(0, 4000);
          if (label.indexOf('BOM Analytics') >= 0) break;
          if (
            label.indexOf('Product Structure Explorer') >= 0 ||
            label.indexOf('Structure Explorer') >= 0
          ) {
            return { doc: topDoc, win: window.top, grid: grid, frame: null };
          }
          panel = panel.parentElement;
          hop++;
        }
      }
    } catch (eTop) { /* */ }
    return null;
  }

  /** Captura TSV no evento copy do documento Explorer (não depende de clipboard async). */
  function captureExplorerCopyText(doc, win) {
    if (APP_CONFIG && APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED !== true) return '';
    if (!doc || !win) return '';
    var captured = '';
    function onCopy(ev) {
      try {
        if (ev && ev.clipboardData) {
          captured = ev.clipboardData.getData('text/plain') || '';
        }
      } catch (e0) { /* */ }
    }
    doc.addEventListener('copy', onCopy, true);
    try {
      doc.execCommand('copy');
    } catch (e1) { /* */ }
    if (!captured || captured.length < 20) {
      dispatchExplorerKeyCombo(win, doc, 'c', 'KeyC', true, false);
    }
    try {
      doc.removeEventListener('copy', onCopy, true);
    } catch (e2) { /* */ }
    captured = String(captured || readExplorerGridSelectionText(win) || '').trim();
    return captured;
  }

  function readExplorerGridSelectionText(win) {
    if (!win) return '';
    try {
      var sel = win.getSelection();
      if (!sel || sel.rangeCount < 1) return '';
      return String(sel.toString() || '').trim();
    } catch (e) {
      return '';
    }
  }

  function looksLikeExplorerGridTsv(text) {
    if (typeof FileImportService !== 'undefined' && FileImportService.looksLikeExplorerPaste) {
      return FileImportService.looksLikeExplorerPaste(text);
    }
    text = String(text || '').trim();
    if (text.length < 40) return false;
    if (text.indexOf('\t') >= 0) return true;
    var lines = text.split(/\r?\n/).filter(function (l) {
      return String(l || '').trim().length > 0;
    });
    return lines.length >= 3;
  }

  function parseAutoCopyGridText(text, rootName, expected) {
    text = String(text || '').trim();
    if (!looksLikeExplorerGridTsv(text)) return Promise.resolve(null);
    if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
      return Promise.resolve(null);
    }
    return FileImportService.parseTextAsync(text).then(function (items) {
      if (!items || items.length < 2) return null;
      var payload = itemsToMirrorPayload(items, rootName, 'explorer-auto-copy');
      if (!payload) return null;
      var exp = expected || getExplorerObjectCount() || 0;
      if (exp > 0 && payload.items.length >= exp - 1) return payload;
      if (exp > 0 && payload.items.length < exp - 1) return null;
      if (payload.items.length >= 3 && (!exp || exp < 4)) return payload;
      if (!payload.mirrorQuality || !payload.mirrorQuality.ok) return null;
      return payload;
    });
  }

  /** Lê clipboard via paste no widget (user-gesture do clique Atualizar). */
  function tryReadClipboardViaPasteTrap() {
    if (APP_CONFIG && APP_CONFIG.PASTE_TRAP_ENABLED !== true) {
      return Promise.resolve('');
    }
    return new Promise(function (resolve) {
      var target = document.getElementById('pasteArea');
      var external = false;
      if (!target) {
        target = document.createElement('textarea');
        target.style.cssText =
          'position:fixed;left:0;top:0;width:2px;height:2px;padding:0;margin:0;border:0;opacity:0.01';
        document.body.appendChild(target);
        external = true;
      }
      var done = false;
      function finish(text) {
        if (done) return;
        done = true;
        if (external) {
          try {
            document.body.removeChild(target);
          } catch (eR) { /* */ }
        }
        resolve(String(text || '').trim());
      }
      target.addEventListener(
        'paste',
        function (ev) {
          var t = ev.clipboardData ? ev.clipboardData.getData('text/plain') || '' : '';
          finish(t);
        },
        { once: true, capture: true }
      );
      try {
        target.focus({ preventScroll: true });
      } catch (eF) {
        try {
          target.focus();
        } catch (eF2) { /* */ }
      }
      try {
        document.execCommand('paste');
      } catch (eP) { /* */ }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard
          .readText()
          .then(function (clip) {
            if (clip && String(clip).trim()) finish(clip);
          })
          .catch(function () { /* */ });
      }
      window.setTimeout(function () {
        finish('');
      }, 80);
    });
  }

  function selectExplorerGridContents(doc, win, grid) {
    dispatchExplorerKeyCombo(win, doc, 'a', 'KeyA', true, false);
    try {
      var sel = win.getSelection();
      var range = doc.createRange();
      range.selectNodeContents(grid || doc.body);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (eSel) { /* */ }
  }

  function copyExplorerGridSelection(doc, win) {
    return captureExplorerCopyText(doc, win);
  }

  function tryExplorerAutoCopyParse(rootName) {
    if (APP_CONFIG && APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED !== true) {
      return Promise.resolve(null);
    }
    return new Promise(function (resolve) {
      var host = readExplorerHost();
      if (!host || !host.doc) return resolve(null);
      var doc = host.doc;
      var win = host.win;
      var frameEl = host.frame;
      var expected = Math.max(
        getExplorerObjectCount() || 0,
        getExplorerSelectionCount() || 0
      );
      var selCount = getExplorerSelectionCount() || 0;

      try {
        if (frameEl && frameEl.contentWindow) frameEl.contentWindow.focus();
        else if (win && win.focus) win.focus();
      } catch (eF) { /* */ }

      var grid = host.grid || focusExplorerGrid(doc, win);

      function parseCaptured(text) {
        return parseAutoCopyGridText(text, rootName, expected);
      }

      function tryCopyBundle() {
        var copied = copyExplorerGridSelection(doc, win);
        if (looksLikeExplorerGridTsv(copied)) {
          return parseCaptured(copied).then(function (payload) {
            if (payload) return payload;
            return tryReadClipboardViaPasteTrap().then(function (clip) {
              if (looksLikeExplorerGridTsv(clip)) return parseCaptured(clip);
              return null;
            });
          });
        }
        return tryReadClipboardViaPasteTrap().then(function (clip) {
          if (looksLikeExplorerGridTsv(clip)) return parseCaptured(clip);
          return null;
        });
      }

      var chain;
      if (expected > 0 && selCount >= expected - 1) {
        var preSel = readExplorerGridSelectionText(win);
        if (looksLikeExplorerGridTsv(preSel)) {
          chain = parseCaptured(preSel);
        } else {
          chain = tryCopyBundle();
        }
      } else {
        selectExplorerGridContents(doc, win, grid);
        var syncSel = readExplorerGridSelectionText(win);
        if (looksLikeExplorerGridTsv(syncSel)) {
          var lineN = syncSel.split(/\r?\n/).filter(function (l) {
            return String(l || '').trim().length > 0;
          }).length;
          if (!expected || lineN >= expected - 1 || lineN >= 3) {
            chain = parseCaptured(syncSel).then(function (payload) {
              return payload || tryCopyBundle();
            });
          } else {
            chain = tryCopyBundle();
          }
        } else {
          chain = tryCopyBundle();
        }
      }

      chain.then(resolve).catch(function () {
        resolve(null);
      });
    });
  }

  function getExplorerSelectionCount() {
    pollDashboardExplorerChrome();
    var text =
      harvestExplorerTextOnly() ||
      harvestExplorerWidgetTextFromDashboard() ||
      harvestAllExplorerText();
    var m = String(text).match(/(\d+)\s*(?:de|of)\s*(\d+)\s*(?:selecionado|selected)/i);
    if (m) return parseInt(m[2], 10) || parseInt(m[1], 10) || 0;
    return 0;
  }

  function getExplorerObjectCount() {
    pollDashboardExplorerChrome();
    var text =
      harvestExplorerTextOnly() ||
      harvestExplorerWidgetTextFromDashboard() ||
      harvestAllExplorerText();
    var m =
      String(text).match(/(\d+)\s*(?:of|de)\s*(\d+)\s*(?:selected|selecionado)/i) ||
      String(text).match(/(\d+)\s*de\s*(\d+)\s*selecionad/i) ||
      String(text).match(/(\d+)\s*objetos?\b/i) ||
      String(text).match(/(\d+)\s*objects?\b/i) ||
      String(text).match(/(\d+)\s*itens?\b/i);
    if (m) return parseInt(m[2] || m[1], 10) || parseInt(m[1], 10) || 0;
    return 0;
  }

  function assessDashboardMirrorQuality(items) {
    return assessMirrorQuality(items);
  }

  function technicalApiName(name) {
    name = String(name || '').trim();
    return !name || /^prd-/i.test(name) || /xcadmodel/i.test(name) || /^vpm/i.test(name);
  }

  function copyExplorerPresentation(target, source) {
    if (!target || !source) return;
    if (source.name && (!target.name || technicalApiName(target.name) || target.isUnresolvedInstance)) {
      target.name = source.name;
    }
    if (source.title && source.title !== source.name && (!target.title || technicalApiName(target.title) || target.isUnresolvedInstance)) {
      target.title = source.title;
    }
    if (source.revision && source.revision !== 'â€”') target.revision = source.revision;
    if (source.owner && isPersonName(source.owner)) target.owner = source.owner;
    if (source.maturity && source.maturity !== 'â€”') {
      target.maturity = source.maturity;
      target.state = source.maturity;
    }
  }

  function applyExplorerPresentationToIndex(index) {
    if (!index) return index;
    var mirror = scrapeExplorerMirror();
    if (!mirror || !mirror.items || !mirror.items.length) return index;
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    if (!nodes.length) return index;
    var items = mirror.items;
    var offset = 0;
    if (
      items.length > 1 &&
      nodes.length > 1 &&
      normalizePartKey(items[0].name || items[0].title) !== normalizePartKey(nodes[0].name || nodes[0].title)
    ) {
      offset = -1;
    }
    nodes.forEach(function (node, idx) {
      var item = items[idx + offset];
      if (item) copyExplorerPresentation(node, item);
    });
    return index;
  }

  return {
    init: init,
    subscribe: subscribe,
    setSelection: setSelection,
    getSelection: function () { return currentSelection; },
    getStructureNameHint: getStructureNameHint,
    setStructureNameHint: setStructureNameHint,
    extractStructureNameFromText: extractStructureNameFromText,
    clearSelection: clearSelection,
    isBadDashboardSelection: isBadDashboardSelection,
    normalizeSelection: normalizeSelection,
    pollSelection: pollSelection,
    pollStructureHint: pollStructureHint,
    pollDashboardExplorerChrome: pollDashboardExplorerChrome,
    subscribeStructure: subscribeStructure,
    readHashSelection: readHashSelection,
    buildPrdCatalogFromExplorer: buildPrdCatalogFromExplorer,
    buildPrdCatalogFull: buildPrdCatalogFull,
    lookupPrdByPartName: lookupPrdByPartName,
    enrichItemsWithPrd: enrichItemsWithPrd,
    applyPrdToIndex: applyPrdToIndex,
    enrichNodeWithPrd: enrichNodeWithPrd,
    resolveFromExplorerCatalog: resolveFromExplorerCatalog,
    readExplorerIframeDocument: readExplorerIframeDocument,
    scrapeExplorerGrid: scrapeExplorerGrid,
    scrapeExplorerMirror: scrapeExplorerMirror,
    scrapeExplorerOwnerMap: scrapeExplorerOwnerMap,
    applyOwnersToItems: applyOwnersToItems,
    applyOwnersToIndex: applyOwnersToIndex,
    applyExplorerPresentationToIndex: applyExplorerPresentationToIndex,
    fetchPilotStructurePayload: fetchPilotStructurePayload,
    harvestAllExplorerText: harvestAllExplorerText,
    harvestExplorerTextOnly: harvestExplorerTextOnly,
    getExplorerSelectionCount: getExplorerSelectionCount,
    getExplorerObjectCount: getExplorerObjectCount,
    assessMirrorQuality: assessMirrorQuality,
    assessDashboardMirrorQuality: assessDashboardMirrorQuality,
    tryExplorerAutoCopyParse: tryExplorerAutoCopyParse,
    tryExplorerScrollHarvestAsync: tryExplorerScrollHarvestAsync,
    tryReadClipboardViaPasteTrap: tryReadClipboardViaPasteTrap,
    probeExplorerMirrorCapture: probeExplorerMirrorCapture,
    resolveExplorerCaptureHost: resolveExplorerCaptureHost
  };
})();
