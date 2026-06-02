/**
 * @file services/file-import-service.js
 * Importa estrutura Product Explorer via colar (Ctrl+C) ou arquivo opcional.
 */
var FileImportService = (function () {
  'use strict';

  var COLUMN_ALIASES = {
    level: ['nivel', 'nível', 'level', 'depth', 'profundidade'],
    name: ['name', 'nome', 'titulo', 'título', 'display name', 'displayname'],
    title: ['title', 'description', 'descricao', 'descrição', 'descr', 'subtitle'],
    type: ['type', 'tipo', 'display type', 'policy', 'tipologia', 'physical product'],
    revision: ['revision', 'revisao', 'revisão', 'rev', 'revis', 'majorrevision'],
    state: ['state', 'estado', 'current', 'status'],
    maturity: ['maturity', 'maturidade', 'estado de maturidade', 'estado maturidade', 'maturity state', 'lifecycle'],
    quantity: ['quantity', 'quantidade', 'qty', 'qtd', 'amount'],
    owner: ['owner', 'proprietario', 'proprietário', 'propriet', 'creator'],
    organization: ['organization', 'organizacao', 'organização', 'org'],
    collabSpace: ['collabspace', 'collaborative space', 'espaco', 'espaço', 'project'],
    approval: ['approval', 'aprovacao', 'aprovação', 'approval status'],
    physicalid: ['physicalid', 'physical id', 'id', 'objectid', 'object id'],
    parent: ['parent', 'pai', 'parentid', 'parent id', 'parent name']
  };

  var STATUS_LABELS = [
    'crítico', 'critico', 'atenção', 'atencao', 'ok', 'alerta', 'warning', 'info',
    'released', 'in work', 'aprovado', 'pendente', 'bloqueado', 'normal'
  ];

  var lastImportReport = {
    parsed: 0,
    skipped: [],
    lineCount: 0,
    explorerExpected: null
  };

  function resetImportReport(lineCount) {
    lastImportReport = { parsed: 0, skipped: [], lineCount: lineCount || 0, explorerExpected: null };
  }

  function getLastImportReport() {
    return lastImportReport;
  }

  function getImportReport() {
    return {
      parsed: lastImportReport.parsed,
      skippedCount: lastImportReport.skipped.length,
      skipped: lastImportReport.skipped.slice(0, 12),
      lineCount: lastImportReport.lineCount,
      explorerExpected: lastImportReport.explorerExpected
    };
  }

  function captureExplorerExpected(pasteLineCount, hasHeader) {
    var expected = null;
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.getExplorerObjectCount) {
        var objCount = ProductExplorerBridge.getExplorerObjectCount();
        if (objCount > 0) expected = objCount;
      }
      var hint =
        ProductExplorerBridge.getStructureNameHint &&
        ProductExplorerBridge.getStructureNameHint();
      var grid = null;
      if (ProductExplorerBridge.scrapeExplorerMirror) {
        grid = ProductExplorerBridge.scrapeExplorerMirror(hint);
      }
      if ((!grid || !grid.items || !grid.items.length) && ProductExplorerBridge.scrapeExplorerGrid) {
        grid = ProductExplorerBridge.scrapeExplorerGrid(hint);
      }
      if (grid && grid.items && grid.items.length) {
        if (!expected || grid.items.length > expected) expected = grid.items.length;
      }
    }
    if (!expected && pasteLineCount > 0) {
      expected = hasHeader ? Math.max(0, pasteLineCount - 1) : pasteLineCount;
    }
    lastImportReport.explorerExpected = expected;
    return expected;
  }

  function mergeMissingGridItems(items) {
    if (!items || !items.length) return items;
    if (APP_CONFIG && APP_CONFIG.SKIP_MIRROR_ON_TSV) return items;
    if (typeof ProductExplorerBridge === 'undefined') {
      return items;
    }
    var expected = lastImportReport.explorerExpected;
    if (expected && items.length >= expected - 1) return items;
    var hint =
      ProductExplorerBridge.getStructureNameHint &&
      ProductExplorerBridge.getStructureNameHint();
    var grid = null;
    if (ProductExplorerBridge.scrapeExplorerMirror) {
      grid = ProductExplorerBridge.scrapeExplorerMirror(hint);
    }
    if ((!grid || !grid.items || !grid.items.length) && ProductExplorerBridge.scrapeExplorerGrid) {
      grid = ProductExplorerBridge.scrapeExplorerGrid(hint);
    }
    if (!grid || !grid.items || grid.items.length <= items.length) return items;
    var have = {};
    items.forEach(function (it) {
      var k = String(it.name || it.title || '').toLowerCase();
      if (k) have[k] = true;
    });
    grid.items.forEach(function (git) {
      var k = String(git.name || git.title || '').toLowerCase();
      if (!k || have[k]) return;
      have[k] = true;
      items.push(git);
    });
    return items;
  }

  function finalizeImportReport(items) {
    items = repairImportedItems(items);
    items = ensureRootItem(items);
    items = mergeMissingGridItems(items);
    items = repairImportedItems(items);
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyOwnersToItems) {
      items = ProductExplorerBridge.applyOwnersToItems(items);
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.enrichItemsWithPrd) {
      items = ProductExplorerBridge.enrichItemsWithPrd(items);
    }
    lastImportReport.parsed = items ? items.length : 0;
    return items;
  }

  function ensureRootItem(items) {
    if (!items || !items.length) return items || [];
    var rootName = '';
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      rootName = ProductExplorerBridge.getStructureNameHint() || '';
    }
    if (!rootName) rootName = items[0].name || items[0].title || '';
    rootName = cleanCell(rootName);
    if (!rootName) return items;
    var rootLow = rootName.toLowerCase();
    var hasRoot = items.some(function (it) {
      var n = cleanCell(it.name || it.title || '').toLowerCase();
      return n === rootLow;
    });
    if (hasRoot) return items;
    items.unshift({
      level: 0,
      physicalid: 'IMP_root_' + rootName.replace(/\W/g, '_').slice(0, 40),
      name: rootName,
      title: rootName,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: '',
      state: '',
      maturity: '',
      owner: '',
      approval: 'Unknown',
      quantity: 1
    });
    return items;
  }

  function skipRow(reason, name, rowNum) {
    lastImportReport.skipped.push({ reason: reason, name: name || '', row: rowNum });
  }

  /** Corrige MÃ¡quinas → Máquinas (UTF-8 lido como Latin-1). */
  function fixMojibake(s) {
    var str = String(s == null ? '' : s);
    if (!str || str.indexOf('Ã') < 0) return str;
    var pass;
    for (pass = 0; pass < 3; pass++) {
      if (str.indexOf('Ã') < 0) break;
      try {
        var bytes = new Uint8Array(str.length);
        var i;
        for (i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
        var fixed = new TextDecoder('utf-8').decode(bytes);
        if (fixed && fixed !== str && fixed.indexOf('\uFFFD') < 0) {
          str = fixed;
          continue;
        }
      } catch (e) { /* ignore */ }
      break;
    }
    if (str.indexOf('Ã') < 0) return str;
    return str
      .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ').replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç').replace(/Ãƒ/g, 'ã').replace(/Ã"/g, 'Ó')
      .replace(/Ã¢â‚¬â€œ/g, '—').replace(/Ã¢â‚¬Â¦/g, '…');
  }

  function cleanCell(v) {
    return fixMojibake(String(v == null ? '' : v)).trim();
  }

  function isJsonBlob(s) {
    var t = cleanCell(s);
    return t.length > 2 && t.charAt(0) === '{' && t.indexOf('"') >= 0;
  }

  /** Ícone/thumbnail 2D — getpicture ou JSON icon em qualquer célula da linha. */
  function extractIconFromRow(row) {
    if (!row || !row.length) return '';
    for (var i = 0; i < row.length; i++) {
      var raw = String(row[i] || '');
      if (!raw) continue;
      var urlMatch = raw.match(/https?:[^"\s]+getpicture[^"\s]*/i);
      if (urlMatch) return cleanCell(urlMatch[0]);
      if (isJsonBlob(raw)) {
        try {
          var o = JSON.parse(raw);
          if (o.icon && /https?|getpicture/i.test(String(o.icon))) return cleanCell(o.icon);
        } catch (e) { /* ignore */ }
      }
      if (/getpicture/i.test(raw)) {
        var m2 = raw.match(/https?:\/\/[^\s"']+/i);
        if (m2) return cleanCell(m2[0]);
      }
    }
    return '';
  }

  /** prd- em qualquer célula ou texto multi-linha da linha (copy Explorer). */
  function extractPrdFromRow(row) {
    if (!row || !row.length) return '';
    var joined = '';
    var i;
    for (i = 0; i < row.length; i++) {
      joined += ' ' + String(row[i] || '');
    }
    var m = joined.match(/prd-R\d{10,}-[A-Za-z0-9]+/i);
    return m ? m[0] : '';
  }

  /** Explorer copia proprietário como JSON { icon, label }. */
  function parseOwnerCell(raw) {
    var s = String(raw == null ? '' : raw);
    if (!isJsonBlob(s)) {
      return { label: cleanCell(s), iconUrl: '' };
    }
    try {
      var o = JSON.parse(s);
      return {
        label: cleanCell(o.label || o.name || o.displayName || ''),
        iconUrl: o.icon && /https?|getpicture/i.test(String(o.icon)) ? cleanCell(o.icon) : ''
      };
    } catch (e) {
      var iconM = s.match(/"icon"\s*:\s*"([^"]+)"/i);
      var labelM = s.match(/"label"\s*:\s*"([^"]+)"/i);
      return {
        label: labelM ? cleanCell(labelM[1]) : '',
        iconUrl: iconM ? cleanCell(iconM[1].replace(/\\\//g, '/')) : ''
      };
    }
  }

  /** JSON de proprietário tem label; JSON só de ícone da peça não. */
  function ownerJsonHasLabel(raw) {
    var s = String(raw == null ? '' : raw);
    if (!isJsonBlob(s)) return false;
    try {
      var o = JSON.parse(s);
      return !!(o.label || o.name || o.displayName);
    } catch (e) {
      return /"label"\s*:\s*"[^"]+"/i.test(s);
    }
  }

  function headerMatchesAlias(nh, alias) {
    if (!nh || !alias) return false;
    if (nh === alias) return true;
    if (alias.length < 3) return false;
    return nh.indexOf(alias) >= 0;
  }

  function isMaturityText(v) {
    v = cleanCell(unwrapJsonCell(v));
    if (!v || v.length > 48) return false;
    return /^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|in_work|frozen|obsoleto|obsolete|wip|private|on\s*hold)/i.test(v) ||
      (/aprovado/i.test(v) && !/desaprovado/i.test(v));
  }

  function isRevisionText(v) {
    v = cleanCell(v);
    return /^\d+[.,]\d+$/.test(v);
  }

  function isTypeText(v) {
    v = cleanCell(v);
    return /^physical\s*product|^produto\s*f[ií]sico|^vpm/i.test(v) || /^3d\s*shape$/i.test(v);
  }

  function isGenericRowLabel(v) {
    v = cleanCell(v);
    if (!v) return true;
    return isTypeText(v) || /^shape$/i.test(v) || /^reference$/i.test(v);
  }

  function looksLikePartIdentifier(v) {
    v = cleanCell(unwrapJsonCell(v));
    if (!v || v.length < 2) return false;
    if (isGenericRowLabel(v)) return false;
    if (looksLikePersonName(v)) return false;
    if (isRevisionText(v) || isMaturityText(v)) return false;
    if (isJsonBlob(v)) return false;
    return true;
  }

  function sanitizeOwnerValue(raw) {
    var t = cleanCell(unwrapJsonCell(raw));
    if (!t || t === '[]' || /^\[\s*\]$/.test(t)) return '';
    if (/^\d+$/.test(t)) return '';
    if (isRevisionText(t)) return '';
    if (isMaturityText(t)) return '';
    if (/^physical\s*product$/i.test(t)) return '';
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(t)) return '';
    if (/[<][0-9]+[>]/.test(t) || /\(Peça/i.test(t)) return '';
    if (t.length > 64) return t.slice(0, 64);
    return t;
  }

  function extractOwnerFromRow(row, colMap) {
    if (!row || !row.length) return { text: '', raw: '' };
    var tryCell = function (idx) {
      if (idx === undefined || idx < 0 || idx >= row.length) return null;
      if (colMap.level !== undefined && idx === colMap.level) return null;
      if (colMap.maturity !== undefined && idx === colMap.maturity) return null;
      if (colMap.state !== undefined && idx === colMap.state) return null;
      if (colMap.name !== undefined && idx === colMap.name) return null;
      if (colMap.revision !== undefined && idx === colMap.revision) return null;
      if (colMap.type !== undefined && idx === colMap.type) return null;
      var meta = parseOwnerCell(row[idx]);
      var text = sanitizeOwnerValue(meta.label || row[idx]);
      if (!text) return null;
      return { text: text, raw: row[idx] };
    };
    var primary = tryCell(colMap.owner);
    if (primary) return primary;
    var i;
    for (i = 0; i < row.length; i++) {
      if (!isJsonBlob(row[i]) && !ownerJsonHasLabel(row[i])) continue;
      var hit = tryCell(i);
      if (hit) return hit;
    }
    for (i = 0; i < row.length; i++) {
      var v = cleanCell(String(row[i] || ''));
      if (!v || v.length > 48 || isJsonBlob(row[i])) continue;
      if (isMaturityText(v) || isRevisionText(v) || isTypeText(v) || /^\d+$/.test(v)) continue;
      if (/^\S+\s+\S+/.test(v)) {
        return { text: sanitizeOwnerValue(v), raw: row[i] };
      }
    }
    return { text: '', raw: '' };
  }

  function inferColumnMapFromRows(rows) {
    var sample = (rows || []).slice(0, Math.min(12, rows.length));
    if (!sample.length) return { name: 0 };
    var colCount = 0;
    sample.forEach(function (r) {
      if (r && r.length > colCount) colCount = r.length;
    });
    var map = {};
    var allLevelFirst = sample.every(function (r) {
      return r && r.length && /^\d+$/.test(cleanCell(r[0]));
    });
    if (allLevelFirst) {
      map.level = 0;
      map.name = colCount > 1 ? 1 : 0;
    } else {
      map.name = 0;
    }
    var scores = [];
    var c;
    for (c = 0; c < colCount; c++) {
      scores[c] = { rev: 0, type: 0, mat: 0, owner: 0, jsonOwner: 0 };
      sample.forEach(function (r) {
        if (!r || c >= r.length) return;
        var v = r[c];
        var t = cleanCell(unwrapJsonCell(v));
        if (!t) return;
        if (isRevisionText(t)) scores[c].rev++;
        if (isTypeText(t)) scores[c].type++;
        if (isMaturityText(t)) scores[c].mat++;
        if (isJsonBlob(v) && ownerJsonHasLabel(v)) scores[c].jsonOwner++;
        if (/^\S+\s+\S+/.test(t) && !isMaturityText(t) && !isRevisionText(t) && !isTypeText(t) && !/^\d+$/.test(t)) {
          scores[c].owner++;
        }
      });
    }
    function bestScore(key, minScore, skipIdx) {
      var best = -1;
      var idx = undefined;
      for (c = 0; c < colCount; c++) {
        if (skipIdx && skipIdx.indexOf(c) >= 0) continue;
        if (scores[c][key] > best && scores[c][key] >= minScore) {
          best = scores[c][key];
          idx = c;
        }
      }
      return idx;
    }
    var used = [];
    if (map.level !== undefined) used.push(map.level);
    if (map.name !== undefined) used.push(map.name);
    var revIdx = bestScore('rev', 2, used);
    if (revIdx !== undefined) { map.revision = revIdx; used.push(revIdx); }
    var typeIdx = bestScore('type', 2, used);
    if (typeIdx !== undefined) { map.type = typeIdx; used.push(typeIdx); }
    var ownerIdx = bestScore('jsonOwner', 1, used);
    if (ownerIdx === undefined) ownerIdx = bestScore('owner', 2, used);
    if (ownerIdx !== undefined) { map.owner = ownerIdx; used.push(ownerIdx); }
    var matIdx = bestScore('mat', 2, used);
    if (matIdx === undefined && colCount > 0) matIdx = colCount - 1;
    if (matIdx !== undefined && used.indexOf(matIdx) < 0) {
      map.maturity = matIdx;
      map.state = matIdx;
    }
    if (map.title === undefined && map.name !== undefined) {
      var titleIdx = map.name + 1;
      if (
        titleIdx < colCount &&
        used.indexOf(titleIdx) < 0 &&
        titleIdx !== map.owner
      ) {
        var titleLooksOwner = sample.some(function (r) {
          return r && r.length > titleIdx && looksLikePersonName(unwrapJsonCell(r[titleIdx]));
        });
        if (!titleLooksOwner) map.title = titleIdx;
      }
    }
    return map;
  }

  /** Corrige TSV Explorer: coluna Descrição com nome do proprietário em vez de M1/M2. */
  function repairImportedItems(items) {
    if (!items || !items.length) return items;
    items.forEach(function (it) {
      var nm = cleanCell(it.name || '');
      var tl = cleanCell(it.title || '');
      if (looksLikePersonName(nm) && !looksLikePersonName(tl) && tl.length >= 1) {
        it.owner = sanitizeOwnerValue(nm) || nm;
        it.name = tl;
        it.title = tl;
      } else if (looksLikePersonName(tl) && !looksLikePersonName(nm) && nm.length >= 1) {
        if (!it.owner || /^sem\s*propriet|^-$|^—$/i.test(String(it.owner).trim())) {
          it.owner = sanitizeOwnerValue(tl) || tl;
        }
        it.title = nm;
      } else if (looksLikePersonName(tl) && looksLikePersonName(nm)) {
        it.owner = sanitizeOwnerValue(tl) || tl;
        it.title = nm.split(/\s+/)[0] || nm;
      }
      if (it.name && !it.title) it.title = it.name;
      if (it.title && !it.name) it.name = it.title;
    });
    return items;
  }

  function pickOwnerColumnIndex(row, headerMap) {
    if (headerMap && headerMap.owner !== undefined) return headerMap.owner;
    if (!row || !row.length) return undefined;
    var i;
    for (i = row.length - 1; i >= 0; i--) {
      if (ownerJsonHasLabel(row[i])) return i;
    }
    for (i = 0; i < row.length; i++) {
      var v = cleanCell(String(row[i] || ''));
      if (!v || v.length > 48 || isJsonBlob(row[i])) continue;
      if (/^(aprovado|em\s*trabalh|em\s*esper|released|obsoleto|physical\s*product)/i.test(v)) continue;
      if (/^\S+\s+\S+/.test(v)) return i;
    }
    return undefined;
  }

  function isSyntheticImportId(pid) {
    var p = String(pid || '');
    return !p || p.indexOf('IMP_') === 0 || p.indexOf('grid_') === 0;
  }

  function enrichItemsWithExplorerIds(items) {
    if (!items || !items.length) return items;
    items.forEach(function (it) {
      var ownerRaw = it._ownerRaw != null ? it._ownerRaw : it.owner || '';
      if (ownerRaw) {
        var om = parseOwnerCell(ownerRaw);
        if (om.label) it.owner = sanitizeOwnerValue(om.label) || om.label;
        if (om.iconUrl && !it.iconUrl) it.iconUrl = om.iconUrl;
      }
      if ((!it.owner || /^sem\s*propriet|^-$|^—$/i.test(String(it.owner).trim())) && it._ownerRaw) {
        var om2 = parseOwnerCell(it._ownerRaw);
        if (om2.label) it.owner = sanitizeOwnerValue(om2.label) || om2.label;
      }
      if (!it.sourcePhysicalId || isSyntheticImportId(it.sourcePhysicalId)) {
        var prd = '';
        var reg = (APP_CONFIG && APP_CONFIG.STRUCTURE_IDS) || {};
        var nm = String(it.name || it.title || '').trim();
        prd = reg[nm] || reg[nm.toLowerCase()] || reg[nm.toUpperCase()] || '';
        if (!prd && typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.lookupPrdByPartName) {
          prd = ProductExplorerBridge.lookupPrdByPartName(nm);
        }
        if (prd) it.sourcePhysicalId = String(prd).replace(/^prd::/i, 'prd-');
      }
      if (!it.iconUrl && it.sourcePhysicalId && typeof PartImage !== 'undefined' && PartImage.buildGetPictureUrl) {
        it.iconUrl = PartImage.buildGetPictureUrl(it.sourcePhysicalId);
      }
    });
    return items;
  }

  function unwrapJsonCell(s) {
    if (!isJsonBlob(s)) return cleanCell(s);
    try {
      var o = JSON.parse(s);
      return cleanCell(o.label || o.name || o.displayName || o.title || '');
    } catch (e) {
      var m = String(s).match(/"label"\s*:\s*"([^"]+)"/i);
      return m ? cleanCell(m[1]) : '';
    }
  }

  function looksLikePersonName(n) {
    n = cleanCell(n);
    if (!n || n.length < 3 || n.length > 64) return false;
    if (/^(01_SKA_|SKA_|Mont\d|M\d{1,4}|prd-R)/i.test(n)) return false;
    if (/^\d+[.,]\d+$/.test(n)) return false;
    if (/^(aprovado|em\s*trabalh|released|physical\s*product|vpmreference)/i.test(n)) return false;
    if (/\s/.test(n) && !/[a-zà-ú]/.test(n)) return false;
    if (/^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+$/.test(n) && !/\d/.test(n)) {
      return true;
    }
    return false;
  }

  function isProductName(name) {
    var n = cleanCell(name);
    if (!n || n.length < 2) return false;
    if (isJsonBlob(n)) return false;
    if (isGenericRowLabel(n)) return false;
    if (looksLikePersonName(n)) return false;
    return true;
  }

  function normalizeImportedState(state, approval) {
    var s = cleanCell(state);
    var a = cleanCell(approval);
    if (/aprovado|released|frozen|approved/i.test(s)) {
      return { state: s || 'Aprovado', maturity: s || 'Aprovado', approval: a && a !== 'Unknown' ? a : 'Approved' };
    }
    if (/^em\s*trabalh|^in\s*wor|em\s*trabalh|em\s*trabalho|in\s*work|in_work|wip|private|desenvolvimento/i.test(s)) {
      return { state: s || 'Em Trabalho', maturity: s || 'Em Trabalho', approval: a || 'Unknown' };
    }
    if (/^em\s*esper|on\s*hold|hold|waiting|aguardando/i.test(s)) {
      return { state: s || 'Em Espera', maturity: s || 'Em Espera', approval: a || 'Unknown' };
    }
    if (/obsoleto|obsolete|abandoned/i.test(s)) {
      return { state: s || 'Obsoleto', maturity: s || 'Obsoleto', approval: a || 'Unknown' };
    }
    return { state: s, maturity: s, approval: a || 'Unknown' };
  }

  /** Varre células da linha Explorer à procura de Aprovado / Em Trabalho / etc. */
  function findMaturityInCells(row) {
    if (!row || !row.length) return '';
    for (var i = row.length - 1; i >= 0; i--) {
      var v = cleanCell(unwrapJsonCell(row[i]));
      if (!v || v.length > 40) continue;
      if (/^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|in_work|frozen|obsoleto|obsolete|wip|private|on\s*hold)/i.test(v)) {
        if (/^em\s*trabalh/i.test(v)) return 'Em Trabalho';
        if (/^em\s*esper/i.test(v)) return 'Em Espera';
        if (/^in\s*wor/i.test(v)) return 'In Work';
        return v;
      }
      if (/aprovado/i.test(v) && !/desaprovado/i.test(v)) return v;
      if (/em\s*trabalh/i.test(v)) return 'Em Trabalho';
      if (/em\s*esper/i.test(v)) return 'Em Espera';
    }
    return '';
  }

  function resolveMaturityFields(row, colMap) {
    var stateRaw = cleanCell(cell(row, colMap, 'state', ''));
    var matRaw = colMap.maturity !== undefined ? cleanCell(cell(row, colMap, 'maturity', '')) : '';
    var scanned = findMaturityInCells(row);
    if (!stateRaw && matRaw) stateRaw = matRaw;
    if (!matRaw && stateRaw) matRaw = stateRaw;
    if (!stateRaw && scanned) {
      stateRaw = scanned;
      matRaw = scanned;
    }
    return normalizeImportedState(stateRaw || matRaw, cell(row, colMap, 'approval', 'Unknown'));
  }

  function normHeader(h) {
    return cleanCell(h)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function standardExplorerColumnMap(offset) {
    offset = offset || 0;
    return {
      name: 0 + offset,
      title: 1 + offset,
      revision: 2 + offset,
      owner: 3 + offset,
      type: 4 + offset,
      maturity: 5 + offset,
      state: 5 + offset
    };
  }

  function leadingIconColumnOffset(rows) {
    var sample = (rows || []).slice(0, Math.min(10, rows.length));
    if (!sample.length) return 0;
    var jsonFirst = 0;
    var revAt2 = 0;
    sample.forEach(function (row) {
      if (!row || !row.length) return;
      if (isJsonBlob(row[0]) || ownerJsonHasLabel(row[0])) jsonFirst++;
      if (row.length > 2 && isRevisionText(unwrapJsonCell(row[2]))) revAt2++;
    });
    if (jsonFirst >= Math.max(1, Math.ceil(sample.length * 0.5))) return 1;
    if (revAt2 >= Math.max(2, Math.ceil(sample.length * 0.35))) return 0;
    return 0;
  }

  function offsetColumnMap(colMap, shift) {
    if (!shift || !colMap) return colMap;
    var out = {};
    Object.keys(colMap).forEach(function (k) {
      if (colMap[k] !== undefined && colMap[k] >= 0) out[k] = colMap[k] + shift;
    });
    return out;
  }

  /** Explorer: só a raiz traz JSON de ícone; filhos (M1/M2) começam no Título. */
  function rowLeadingIconOffset(row) {
    if (!row || !row.length) return 0;
    if (isJsonBlob(row[0]) || ownerJsonHasLabel(row[0])) return 1;
    return 0;
  }

  function colMapForRow(baseMap, row) {
    return offsetColumnMap(baseMap, rowLeadingIconOffset(row));
  }

  /** Explorer PT: Título, Descrição, Revisão, Proprietário, Tipo, Maturidade (+ coluna ícone JSON). */
  function extractFieldsFromExplorerRow(row) {
    var cells = (row || []).map(function (c) {
      return cleanCell(unwrapJsonCell(c));
    });
    var out = {
      name: '',
      title: '',
      revision: '',
      owner: '',
      type: 'Physical Product',
      maturity: ''
    };
    var partNames = [];
    var descriptions = [];
    var i;
    var v;
    for (i = 0; i < cells.length; i++) {
      v = cells[i];
      if (!v) continue;
      if (isJsonBlob(row[i]) || ownerJsonHasLabel(row[i])) {
        var om = parseOwnerCell(row[i]);
        if (om.label && !out.owner) out.owner = sanitizeOwnerValue(om.label) || om.label;
        continue;
      }
      if (isRevisionText(v)) {
        if (!out.revision) out.revision = v.replace(',', '.');
        continue;
      }
      if (isTypeText(v)) {
        if (!out.type) out.type = v;
        continue;
      }
      if (isMaturityText(v)) {
        if (!out.maturity) out.maturity = v;
        continue;
      }
      if (looksLikePersonName(v)) {
        if (!out.owner) out.owner = sanitizeOwnerValue(v) || v;
        continue;
      }
      if (looksLikePartIdentifier(v) && v.length <= 120) {
        partNames.push(v);
        continue;
      }
      if (v.length >= 4 && /[A-Za-zÀ-ú]{2,}/.test(v) && !isRevisionText(v) && !isTypeText(v) && !looksLikePersonName(v)) {
        descriptions.push(v);
      }
    }
    out.name = partNames[0] || '';
    out.title = descriptions[0] || '';
    if (!out.title || out.title === out.name) {
      out.title = descriptions[0] || partNames[1] || out.name;
    }
    if (!out.maturity) out.maturity = findMaturityInCells(row) || '';
    if (!out.revision) {
      for (i = 0; i < cells.length; i++) {
        var rm = String(cells[i]).match(/\b(\d+[.,]\d+[A-Za-z]?)\b/);
        if (rm) {
          out.revision = rm[1].replace(',', '.');
          break;
        }
      }
    }
    return out;
  }

  function fieldsNeedContentRepair(fields) {
    if (!fields || !fields.name) return true;
    if (fields.revision && !isRevisionText(fields.revision) && fields.revision.length > 10) return true;
    if (fields.type && isRevisionText(fields.type)) return true;
    if (fields.maturity && isTypeText(fields.maturity)) return true;
    return false;
  }

  function mapColumns(headers) {
    var map = {};
    var i;
    for (i = 0; i < headers.length; i++) {
      var nh = normHeader(headers[i]);
      if (!nh) continue;
      if (nh.indexOf('titulo') >= 0) map.name = i;
      else if (nh.indexOf('descr') >= 0) map.title = i;
      else if (nh.indexOf('revis') >= 0) map.revision = i;
      else if (nh.indexOf('propriet') >= 0) map.owner = i;
      else if (nh.indexOf('tipo') >= 0 || nh === 'type') map.type = i;
      else if (nh.indexOf('matur') >= 0 || nh.indexOf('estado') >= 0) {
        map.maturity = i;
        map.state = i;
      }
    }
    if (map.name !== undefined) return map;
    headers.forEach(function (h, idx) {
      var nh = normHeader(h);
      if (!nh) return;
      if (nh.indexOf('matur') >= 0 || nh.indexOf('lifecycle') >= 0 || nh === 'status') {
        map.maturity = idx;
        map.state = idx;
      }
    });
    headers.forEach(function (h, idx) {
      var nh = normHeader(h);
      if (!nh) return;
      Object.keys(COLUMN_ALIASES).forEach(function (key) {
        if (map[key] !== undefined) return;
        if (COLUMN_ALIASES[key].some(function (a) { return headerMatchesAlias(nh, a); })) {
          map[key] = idx;
        }
      });
    });
    return map;
  }

  function guessExplorerColumnMap(row) {
    return inferColumnMapFromRows([row]);
  }

  function isStatusLabel(name) {
    var t = cleanCell(name).toLowerCase();
    if (!t || t.length > 48) return false;
    if (t.indexOf('|') >= 0 || t.indexOf('3dexperience') >= 0) return false;
    if (STATUS_LABELS.indexOf(t) >= 0) return true;
    return /^(cr[ií]tico|aten[cç][aã]o|alerta)$/i.test(t);
  }

  function cell(row, colMap, key, def) {
    if (colMap[key] === undefined) return def;
    var v = row[colMap[key]];
    return v === undefined || v === null || v === '' ? def : v;
  }

  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    var joined = row.map(function (c) { return normHeader(c); }).join(' ');
    return COLUMN_ALIASES.name.some(function (a) { return joined.indexOf(a) >= 0; }) ||
      COLUMN_ALIASES.level.some(function (a) { return joined.indexOf(a) >= 0; }) ||
      joined.indexOf('nome') >= 0 ||
      joined.indexOf('title') >= 0 ||
      joined.indexOf('título') >= 0 ||
      joined.indexOf('titulo') >= 0 ||
      joined.indexOf('propriet') >= 0 ||
      joined.indexOf('matur') >= 0;
  }

  function leadingDepth(str) {
    var s = String(str || '');
    var tabs = (s.match(/^\t*/) || [''])[0].length;
    if (tabs > 0) return { depth: tabs, text: s.replace(/^\t+/, '').trim() };
    var spaces = (s.match(/^ */) || [''])[0].length;
    return { depth: Math.floor(spaces / 2), text: s.trim() };
  }

  function splitLineRaw(line) {
    function trimCell(c) {
      return String(c == null ? '' : c).replace(/^"|"$/g, '').trim();
    }
    if (line.indexOf('\t') >= 0) return line.split('\t').map(trimCell);
    if (line.indexOf(';') >= 0) return line.split(';').map(trimCell);
    return line.split(',').map(trimCell);
  }

  function splitLine(line) {
    return splitLineRaw(line).map(function (c) { return unwrapJsonCell(c); });
  }

  /** Linha Explorer com JSON embutido (ícone do proprietário). */
  function parseExplorerGridLine(line) {
    var raw = cleanCell(line);
    if (!raw) return null;
    if (raw.indexOf('\t') >= 0) {
      var cells = splitLine(raw);
      if (cells.length >= 2) {
        var colMap = { name: 0, title: 1, type: 2, revision: 3, state: 4 };
        if (/^\d+$/.test(String(cells[0]).trim())) {
          colMap = { level: 0, name: 1, title: 2, type: 3, revision: 4, state: 5 };
        } else if (cells.length >= 6) {
          colMap = standardExplorerColumnMap(leadingIconColumnOffset([cells]));
        } else if (cells.length >= 5) {
          colMap = standardExplorerColumnMap(0);
        }
        try {
          var built = buildItemsFromRows([cells], colMap, true);
          if (built && built[0]) return built[0];
        } catch (e2) { /* legacy */ }
      }
    }
    var nameM = raw.match(/^(Mont\d*|M\d+|01_SKA_[A-Za-z0-9_.\-]+)\b/i);
    if (!nameM) return null;
    var name = nameM[1];
    var revM = raw.match(/([\d]+[.,][\d]+)/);
    var revision = revM ? revM[1].replace(',', '.') : '';
    var state = /Aprovado/i.test(raw) ? 'Aprovado' : '';
    var st = normalizeImportedState(state, 'Unknown');
    return {
      physicalid: 'IMP_' + name.replace(/\W/g, '_'),
      name: name,
      title: name,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: revision,
      state: st.state,
      maturity: st.maturity,
      approval: st.approval,
      quantity: 1,
      owner: unwrapJsonCell(raw),
      level: /^mont/i.test(name) ? 0 : 1
    };
  }

  function textToRows(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) throw new Error('Nada colado. Copie linhas no Product Explorer (Ctrl+C) e cole de novo.');
    return lines.map(splitLineRaw);
  }

  function normalizeSheetRows(rows) {
    return rows
      .map(function (row) {
        return row.map(function (c) { return cleanCell(c); });
      })
      .filter(function (row) {
        return row.some(function (c) { return c; });
      });
  }

  /** Lista vertical (1 coluna): empresa na linha N, status na N+1. */
  function buildItemsFromSingleColumn(lines) {
    var items = [];
    var start = 0;
    if (lines.length && looksLikeHeader([lines[0]])) start = 1;

    for (var i = start; i < lines.length; i++) {
      var name = cleanCell(lines[i]);
      if (!name) continue;
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      items.push({
        physicalid: 'IMP_' + (items.length + 1) + '_' + name.replace(/\W/g, '_').slice(0, 36),
        name: name,
        title: name,
        type: '',
        displayType: '',
        revision: '',
        state: '',
        maturity: '',
        quantity: 1,
        owner: '',
        organization: '',
        collabSpace: '',
        approval: 'Unknown',
        level: 0,
        parentKey: '',
        rowIndex: items.length + 1
      });
    }
    if (!items.length) {
      throw new Error('Nenhuma linha reconhecida no arquivo.');
    }
    return items;
  }

  function isMostlySingleColumn(rows) {
    if (!rows.length) return false;
    var oneCol = 0;
    rows.forEach(function (row) {
      var filled = row.filter(function (c) { return c; });
      if (filled.length <= 1) oneCol++;
    });
    return oneCol >= rows.length * 0.85;
  }

  function smartParseRows(rows) {
    rows = normalizeSheetRows(rows);
    if (!rows.length) throw new Error('Arquivo vazio.');

    if (isMostlySingleColumn(rows)) {
      var lines = rows.map(function (row) {
        var filled = row.filter(function (c) { return c; });
        return filled[0] || '';
      });
      return buildItemsFromSingleColumn(lines);
    }

    if (looksLikeHeader(rows[0])) return parseRows(rows);
    return parseRowsWithoutHeader(rows);
  }

  /** Colar da grade/árvore do Explorer (TSV, com ou sem cabeçalho). */
  function stripIconNoise(name) {
    var n = cleanCell(name);
    if (!n) return '';
    if (/^physical\s*product$/i.test(n)) return '';
    if (/^vpm/i.test(n) && n.length < 12) return '';
    return n;
  }

  /** Explorer: várias linhas no nível 0 → primeira raiz, demais filhos. */
  function inferAssemblyLevels(items) {
    if (!items || items.length < 2) return items;
    var allZero = items.every(function (it) { return !it.level || it.level === 0; });
    if (!allZero) return items;
    items[0].level = 0;
    for (var i = 1; i < items.length; i++) items[i].level = 1;
    return items;
  }

  function looksLikeExplorerPaste(text) {
    var t = String(text || '').trim();
    if (!t || t.length < 4) return false;
    if (t.indexOf('\t') >= 0) return true;
    if (/mont10|\tm1\t|\tm2\t|^m1\t|^m2\t/i.test(t)) return true;
    if (t.indexOf('Physical Product') >= 0 || t.indexOf('Produto físico') >= 0) return true;
    if (isJsonBlob(t) && t.indexOf('getpicture') >= 0 && t.indexOf('Mont') < 0) return false;
    var lines = t.split(/\r?\n/).filter(function (l) { return l.trim(); });
    return lines.length >= 2;
  }

  function validateImportedItems(items) {
    if (!items || !items.length) return;
    var names = items.map(function (it) {
      return cleanCell(it.name || it.title || '').toLowerCase();
    }).filter(Boolean);
    var hasStructure = items.some(function (it) {
      return !!(it.revision || it.type || it.state || it.maturity);
    });
    var hasProduct = names.some(function (n) {
      if (n.length < 2) return false;
      if (n.indexOf('enderson') >= 0 && n.indexOf('moura') >= 0) return false;
      return true;
    });
    var onlyOwner = names.length > 0 && names.every(function (n) {
      return n.indexOf('enderson') >= 0 || n.indexOf('moura') >= 0 || n.indexOf('propriet') >= 0;
    });
    if (!hasStructure && !hasProduct && (onlyOwner || names.length <= 2)) {
      throw new Error(
        'Parece coluna Proprietário, não a estrutura. No Explorer: Ctrl+A na grade → Ctrl+C → Importar.'
      );
    }
  }

  function parseTextFromGridLines(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return null;
    try {
      var rows = lines.map(splitLineRaw);
      if (rows.length >= 2) {
        var parsed = smartParseRows(rows);
        if (parsed && parsed.length >= 2) {
          validateImportedItems(parsed);
          return inferAssemblyLevels(parsed);
        }
      }
    } catch (e) { /* tenta linha a linha */ }
    var items = [];
    var start = 0;
    if (lines.length && looksLikeHeader([splitLine(lines[0])])) start = 1;
    for (var i = start; i < lines.length; i++) {
      var row = parseExplorerGridLine(lines[i]);
      if (row) items.push(row);
      else skipRow('linha_nao_parseada', lines[i].slice(0, 48), i + 1);
    }
    if (items.length >= 2) {
      validateImportedItems(items);
      return inferAssemblyLevels(items);
    }
    return null;
  }

  function parseText(text) {
    var pasteLines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    resetImportReport(pasteLines.length);
    var rowsPreview = pasteLines.length ? pasteLines.map(splitLineRaw) : [];
    var hasHeader = rowsPreview.length && looksLikeHeader(rowsPreview[0]);
    captureExplorerExpected(pasteLines.length, hasHeader);
    if (!looksLikeExplorerPaste(text)) {
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.scrapeExplorerMirror) {
        var term =
          ProductExplorerBridge.getStructureNameHint &&
          ProductExplorerBridge.getStructureNameHint();
        var mirror = ProductExplorerBridge.scrapeExplorerMirror(term || '');
        if (mirror && mirror.items && mirror.items.length >= 2) {
          return finalizeImportReport(mirror.items);
        }
      }
      throw new Error(
        'Clipboard não tem a grade do Explorer. No Explorer: clique na tabela → Ctrl+A → Ctrl+C → cole na caixa azul → Varrer.'
      );
    }
    var gridItems = parseTextFromGridLines(text);
    if (gridItems && gridItems.length) {
      validateImportedItems(gridItems);
      return finalizeImportReport(enrichItemsWithExplorerIds(inferAssemblyLevels(gridItems)));
    }

    var rows = textToRows(text).map(function (row) {
      return row.map(function (c) { return cleanCell(c); });
    });
    if (rows.length === 1 && rows[0].length === 1) {
      return finalizeImportReport(buildItemsFromSingleColumn([rows[0][0]]));
    }
    var items = smartParseRows(rows);
    items.forEach(function (it) {
      it.name = stripIconNoise(it.name) || it.name;
      it.title = stripIconNoise(it.title) || it.title;
    });
    items = inferAssemblyLevels(items.filter(function (it) {
      if (!it.name || !it.name.length) {
        skipRow('nome_vazio', it.title || '', it.rowIndex || 0);
        return false;
      }
      return true;
    }));
    items.forEach(function (it) {
      if (!it.maturity && !it.state) {
        var scan = findMaturityInCells([
          it.name, it.title, it.type, it.revision, it.owner, it.state, it.maturity
        ]);
        if (scan) {
          it.state = scan;
          it.maturity = scan;
        }
      } else if (it.state && !it.maturity) {
        it.maturity = it.state;
      } else if (it.maturity && !it.state) {
        it.state = it.maturity;
      }
    });
    validateImportedItems(items);
    return finalizeImportReport(enrichItemsWithExplorerIds(items));
  }

  function parseRowsWithoutHeader(rows) {
    if (rows.length && looksLikeHeader(rows[0])) {
      return parseRows(rows);
    }
    var iconOff = leadingIconColumnOffset(rows);
    var colMap = offsetColumnMap(inferColumnMapFromRows(rows), iconOff);
    if (!colMap.name && colMap.name !== 0) colMap.name = 0 + iconOff;
    if (rows[0] && rows[0].length >= 5) {
      colMap = standardExplorerColumnMap(iconOff);
    }
    return buildItemsFromRows(rows, colMap, colMap.level === undefined);
  }

  function parseRows(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Dados insuficientes. Copie pelo menos o cabeçalho e uma linha do Explorer.');
    }
    var headers = rows[0].map(function (c) { return String(c || ''); });
    var dataRows = rows.slice(1);
    var colMap = mapColumns(headers);
    if (colMap.name === undefined && colMap.title === undefined) {
      colMap = standardExplorerColumnMap(0);
    }
    return buildItemsFromRows(dataRows, colMap, false);
  }

  function buildItemsFromRows(dataRows, colMap, inferIndent) {
    var items = [];
    var usedIds = {};
    var stackLevel = 0;
    for (var r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      if (!row || !row.length) continue;

      var rowMap = colMapForRow(colMap, row);
      var level = 0;
      var name = '';
      if (inferIndent && rowMap.level === undefined) {
        var nameCol = rowMap.name !== undefined ? rowMap.name : 0;
        var lead = leadingDepth(row[nameCol] !== undefined ? row[nameCol] : row[0]);
        level = lead.depth;
        name = lead.text;
        if (rowMap.name !== undefined && row[nameCol] !== undefined) {
          row = row.slice();
          row[rowMap.name] = lead.text;
        }
      } else {
        level = parseInt(cell(row, rowMap, 'level', ''), 10);
        if (isNaN(level)) level = stackLevel;
      }

      var parsedEarly = extractFieldsFromExplorerRow(row);
      if (parsedEarly.name && isProductName(parsedEarly.name)) {
        name = parsedEarly.name;
      }
      if (!name) {
        name =
          cleanCell(cell(row, rowMap, 'name', '')) || cleanCell(cell(row, rowMap, 'title', ''));
      }
      name = stripIconNoise(unwrapJsonCell(name));
      if (!isProductName(name) && parsedEarly.name && isProductName(parsedEarly.name)) {
        name = parsedEarly.name;
      }
      if (!isProductName(name)) {
        skipRow('nome_invalido', String(name).slice(0, 40), r + 1);
        continue;
      }
      if (isGenericRowLabel(name)) {
        skipRow('tipo_linha', name, r + 1);
        continue;
      }
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      stackLevel = level;

      var prdFromRow = extractPrdFromRow(row);
      var pidCell = cell(row, rowMap, 'physicalid', '');
      var pid = pidCell || prdFromRow || ('IMP_' + (r + 1) + '_' + name.replace(/\W/g, '_').slice(0, 40));
      pid = String(pid);
      if (usedIds[pid]) pid = pid + '__r' + (r + 1);
      usedIds[pid] = true;
      var srcPrd = prdFromRow || (/^prd-R/i.test(pidCell) ? pidCell : '');
      var st = resolveMaturityFields(row, rowMap);
      var ownerHit = extractOwnerFromRow(row, rowMap);
      var ownerText = ownerHit.text;
      var ownerCol = ownerHit.raw;
      var parsedFields = parsedEarly.name ? parsedEarly : extractFieldsFromExplorerRow(row);
      if (parsedFields.name && (parsedFields.name === name || !isProductName(name) || fieldsNeedContentRepair({
        name: name,
        title: cell(row, rowMap, 'title', name),
        revision: cell(row, rowMap, 'revision', ''),
        type: cell(row, rowMap, 'type', ''),
        maturity: cell(row, rowMap, 'maturity', '')
      }))) {
        name = parsedFields.name;
      }
      var titleVal = stripIconNoise(unwrapJsonCell(cell(row, rowMap, 'title', name))) || String(name);
      var revisionVal = cell(row, rowMap, 'revision', '');
      var typeVal = cell(row, rowMap, 'type', 'Physical Product');
      if (parsedFields.name) {
        name = parsedFields.name || name;
        if (parsedFields.title && !looksLikePersonName(parsedFields.title)) {
          titleVal = parsedFields.title;
        } else if (looksLikePersonName(titleVal) && parsedFields.name) {
          titleVal = parsedFields.name;
        }
        revisionVal = parsedFields.revision || revisionVal;
        ownerText = parsedFields.owner || ownerText;
        typeVal = parsedFields.type || typeVal;
        if (parsedFields.maturity) {
          st = normalizeImportedState(parsedFields.maturity, st.approval);
        }
      }
      if (looksLikePersonName(titleVal) && !looksLikePersonName(name)) titleVal = String(name);
      if (revisionVal && !isRevisionText(revisionVal) && parsedFields.revision) revisionVal = parsedFields.revision;
      if (isRevisionText(typeVal) && parsedFields.type) typeVal = parsedFields.type;
      if (!st.state && !st.maturity) {
        var scanned = findMaturityInCells(row);
        if (scanned) {
          st = normalizeImportedState(scanned, st.approval);
        }
      }
      items.push({
        physicalid: pid,
        sourcePhysicalId: srcPrd || (/^prd-R/i.test(pidCell) ? pidCell : ''),
        name: String(name),
        title: titleVal,
        type: typeVal || 'VPMReference',
        displayType: typeVal || 'Physical Product',
        revision: revisionVal,
        state: st.state,
        maturity: st.maturity,
        iconUrl: extractIconFromRow(row) || (ownerCol && parseOwnerCell(ownerCol).iconUrl) || '',
        quantity: parseFloat(cell(row, rowMap, 'quantity', '1')) || 1,
        owner: ownerText,
        _ownerRaw: ownerCol,
        organization: cell(row, rowMap, 'organization', ''),
        collabSpace: cell(row, rowMap, 'collabSpace', ''),
        approval: st.approval,
        level: level,
        parentKey: cell(row, rowMap, 'parent', ''),
        rowIndex: r + 1
      });
    }
    if (!items.length) {
      throw new Error('Nenhuma linha válida. Selecione a tabela E-BOM no Explorer, Ctrl+C, cole aqui.');
    }
    return items;
  }

  function parseXlsx(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Biblioteca XLSX não carregada.'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'array' });
          var sheet = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolve(smartParseRows(rows));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Falha ao ler arquivo.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseCsv(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          resolve(parseText(e.target.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Falha ao ler arquivo.')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function parseTextAsync(text) {
    return Promise.resolve(parseText(text));
  }

  function parseFile(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
    if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(file);
    return Promise.reject(new Error('Formato não suportado. Cole do Explorer (Ctrl+C) ou use .txt.'));
  }

  return {
    parseFile: parseFile,
    looksLikeExplorerPaste: looksLikeExplorerPaste,
    parseText: parseText,
    parseTextAsync: parseTextAsync,
    parseRows: parseRows,
    extractFieldsFromExplorerRow: extractFieldsFromExplorerRow,
    getImportReport: getImportReport,
    getLastImportReport: getLastImportReport,
    fixMojibake: fixMojibake
  };
})();
