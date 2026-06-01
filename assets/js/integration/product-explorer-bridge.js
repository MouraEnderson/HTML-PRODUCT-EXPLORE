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

  function mergePrdCatalogFromText(text, catalog) {
    catalog = catalog || {};
    var lines = String(text || '').split('\n');
    var prdRe = /prd-R\d{10,}-[A-Za-z0-9]+/i;
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

  function lookupPrdByPartName(name) {
    if (!name) return '';
    var catalog = buildPrdCatalogFromExplorer();
    mergePrdCatalogFromText(harvestAllExplorerText(), catalog);
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
  var EXPLORER_NAME_LINE = /^(Mont\d+[A-Za-z0-9_.\-]{0,40}|01_SKA_[A-Za-z0-9_.\-]{2,80}|SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/i;

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
      /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_.]{4,80})\b/gi,
      /\b(Mont\d+[A-Za-z0-9_.]{0,40})\b/gi
    ];
    var p;
    for (p = 0; p < patterns.length; p++) {
      var re = patterns[p];
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(String(text || ''))) !== null) {
        var name = String(m[1]).replace(/\.{2,}$/, '').trim();
        if (name.length < 6) continue;
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
    s = String(s || '').trim();
    if (!s || s.length < 3 || s.length > 64) return false;
    if (isPartIdentifier(s)) return false;
    if (/^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|frozen|obsoleto|physical\s*product)/i.test(s)) {
      return false;
    }
    if (/^\d+[.,]\d+$/.test(s)) return false;
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
    var textMap = scrapeOwnerMapFromText(harvestAllExplorerText());
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
      if (owner) {
        it.owner = owner;
      } else if (isPartIdentifier(it.owner) || !isPersonName(it.owner)) {
        it.owner = '';
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
      if (/^physical product$/i.test(name)) return '';
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
    if (!name && colMap.name !== 0) name = readMirrorField(values[0], 'name');
    if (!name || isPersonName(name)) return null;
    var title = val('title', 'title') || name;
    var revision = val('revision', 'revision') || '—';
    var owner = val('owner', 'owner') || '';
    var type = val('type', 'type') || 'Physical Product';
    var maturity = val('maturity', 'maturity') || '—';
    var approved = /aprovado|released|frozen/i.test(maturity);
    return {
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
      if (row.querySelector('[role="columnheader"]')) continue;
      var cells = getRowCells(row);
      if (cells.length < 2) continue;
      var values = [];
      var ci;
      for (ci = 0; ci < cells.length; ci++) values.push(cells[ci]);
      var item = buildMirrorItemFromValues(values, colMap, items.length, items.length === 0 ? 0 : 1);
      if (!item) continue;
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
      if (!chunk[0] || /^t[ií]tulo$/i.test(chunk[0])) {
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
    var text = harvestAllExplorerText();
    var fromTitle = extractRootNameFromExplorerText(text);
    rootName = String(rootName || fromTitle || structureNameHint || '').trim();
    var items = [];
    var seen = {};
    var colMap = null;

    if (doc) {
      var headerTexts = getExplorerHeaderTexts(doc);
      colMap = mapExplorerColumnsFromHeaders(headerTexts);
      if (colMap.name === undefined) colMap = defaultExplorerColumnMap();
      scrapeMirrorRowsFromDom(doc, rootName, seen, items);
    }
    if (items.length < 2) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '\t');
    }
    if (items.length < 2) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '|');
    }
    if (items.length < 2) {
      scrapeMirrorRowsFromVerticalText(text, rootName, seen, items);
    }
    if (items.length < 1 && rootName) {
      pushGridItem(items, seen, buildRowFromName(rootName, 0, 0, { title: rootName }));
    }
    if (items.length < 2) return null;
    applyOwnersToItems(items);
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: 'explorer-mirror',
      columnMap: colMap || defaultExplorerColumnMap()
    };
  }

  function scrapeExplorerGrid(rootName) {
    var mirror = scrapeExplorerMirror(rootName);
    if (mirror && mirror.items && mirror.items.length >= 2) return mirror;

    pollDashboardExplorerChrome();
    var text = harvestAllExplorerText();
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
    var catalog = buildPrdCatalogFromExplorer();
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

  function getExplorerSelectionCount() {
    pollDashboardExplorerChrome();
    var text = harvestAllExplorerText();
    var m = String(text).match(/(\d+)\s*(?:de|of)\s*(\d+)\s*(?:selecionado|selected)/i);
    if (m) return parseInt(m[2], 10) || parseInt(m[1], 10) || 0;
    return getExplorerObjectCount();
  }

  function getExplorerObjectCount() {
    pollDashboardExplorerChrome();
    var text = harvestAllExplorerText();
    var m =
      String(text).match(/(\d+)\s*objetos?\b/i) ||
      String(text).match(/(\d+)\s*objects?\b/i) ||
      String(text).match(/(\d+)\s*itens?\b/i);
    if (m) return parseInt(m[1], 10) || 0;
    return 0;
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
    lookupPrdByPartName: lookupPrdByPartName,
    resolveFromExplorerCatalog: resolveFromExplorerCatalog,
    readExplorerIframeDocument: readExplorerIframeDocument,
    scrapeExplorerGrid: scrapeExplorerGrid,
    scrapeExplorerMirror: scrapeExplorerMirror,
    scrapeExplorerOwnerMap: scrapeExplorerOwnerMap,
    applyOwnersToItems: applyOwnersToItems,
    applyOwnersToIndex: applyOwnersToIndex,
    fetchPilotStructurePayload: fetchPilotStructurePayload,
    harvestAllExplorerText: harvestAllExplorerText,
    getExplorerSelectionCount: getExplorerSelectionCount,
    getExplorerObjectCount: getExplorerObjectCount
  };
})();
