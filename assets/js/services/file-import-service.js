/**
 * @file services/file-import-service.js
 * Importa estrutura Product Explorer via colar (Ctrl+C) ou arquivo opcional.
 */
var FileImportService = (function () {
  'use strict';

  var COLUMN_ALIASES = {
    level: ['nivel', 'nível', 'level', 'n', 'depth', 'profundidade'],
    name: ['name', 'nome', 'title', 'titulo', 'título', 'display name', 'displayname'],
    title: ['title', 'titulo', 'título', 'description', 'descricao'],
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

  function finalizeImportReport(items) {
    lastImportReport.parsed = items ? items.length : 0;
    return items;
  }

  function skipRow(reason, name, rowNum) {
    lastImportReport.skipped.push({ reason: reason, name: name || '', row: rowNum });
  }

  /** Corrige MÃ¡quinas → Máquinas (UTF-8 lido como Latin-1). */
  function fixMojibake(s) {
    var str = String(s == null ? '' : s);
    if (!str || str.indexOf('Ã') < 0) return str;
    try {
      var bytes = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
      var fixed = new TextDecoder('utf-8').decode(bytes);
      if (fixed.indexOf('Ã') < 0 && fixed.indexOf('\uFFFD') < 0) return fixed;
    } catch (e) { /* ignore */ }
    return str
      .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ').replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç').replace(/Ãƒ/g, 'ã').replace(/Ã"/g, 'Ó');
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
    if (!isJsonBlob(s)) return !!cleanCell(s);
    try {
      var o = JSON.parse(s);
      return !!(o.label || o.name || o.displayName);
    } catch (e) {
      return /"label"\s*:\s*"[^"]+"/i.test(s);
    }
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
        if (om.label) it.owner = om.label;
        if (om.iconUrl && !it.iconUrl) it.iconUrl = om.iconUrl;
      }
      if ((!it.owner || /^sem\s*propriet|^-$|^—$/i.test(String(it.owner).trim())) && it._ownerRaw) {
        var om2 = parseOwnerCell(it._ownerRaw);
        if (om2.label) it.owner = om2.label;
      }
      if (!it.sourcePhysicalId || isSyntheticImportId(it.sourcePhysicalId)) {
        var prd = '';
        if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.lookupPrdByPartName) {
          prd = ProductExplorerBridge.lookupPrdByPartName(it.name || it.title);
        }
        if (prd) it.sourcePhysicalId = prd;
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

  function isProductName(name) {
    var n = cleanCell(name);
    if (!n || n.length < 2) return false;
    if (isJsonBlob(n)) return false;
    if (/^physical\s*product$/i.test(n)) return false;
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
    return cleanCell(h).toLowerCase().replace(/\s+/g, ' ');
  }

  function mapColumns(headers) {
    var map = {};
    headers.forEach(function (h, i) {
      var nh = normHeader(h);
      if (!nh) return;
      if (nh.indexOf('matur') >= 0 || nh.indexOf('lifecycle') >= 0) {
        map.maturity = i;
        return;
      }
    });
    headers.forEach(function (h, i) {
      var nh = normHeader(h);
      if (!nh) return;
      Object.keys(COLUMN_ALIASES).forEach(function (key) {
        if (map[key] !== undefined) return;
        if (key === 'maturity' && map.maturity !== undefined) return;
        if (COLUMN_ALIASES[key].some(function (a) { return nh === a || nh.indexOf(a) >= 0; })) {
          map[key] = i;
        }
      });
    });
    return map;
  }

  function guessExplorerColumnMap(row) {
    var map = { name: 0, title: 1 };
    if (!row || !row.length) return map;
    if (/^\d+$/.test(String(row[0]).trim())) {
      map = { level: 0, name: 1, title: 2, type: 3, revision: 4, owner: 5, state: 6, maturity: 6 };
    }
    for (var i = 0; i < row.length; i++) {
      var v = cleanCell(unwrapJsonCell(row[i]));
      if (!v) continue;
      if (/^(aprovado|em\s*trabalh|released|in\s*wor|obsoleto|obsolete|frozen|wip)/i.test(v) ||
          /aprovado|em\s*trabalh/i.test(v)) {
        map.maturity = i;
        map.state = i;
      }
      if (/^\d+[.,]\d+$/.test(v)) map.revision = i;
      if (/physical\s*product|^vpm/i.test(v)) map.type = i;
    }
    var ownerIdx = pickOwnerColumnIndex(row, map);
    if (ownerIdx !== undefined) map.owner = ownerIdx;
    if (row.length >= 6 && map.maturity === undefined) {
      map.maturity = row.length - 1;
      map.state = row.length - 1;
    }
    return map;
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
        } else if (cells.length >= 5) {
          colMap = { name: 0, revision: 1, type: 2, owner: 3, state: 4 };
        }
        try {
          var built = buildItemsFromRows([cells], colMap, true);
          if (built && built[0]) return built[0];
        } catch (e2) { /* legacy */ }
      }
    }
    var nameM = raw.match(/^(Mont\d*|M\d+)\b/i);
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
    if (!looksLikeExplorerPaste(text)) {
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
    var colMap = guessExplorerColumnMap(rows[0]);
    if (!colMap.name && rows[0].length >= 5) {
      colMap = { name: 0, revision: 1, type: 2, owner: 3, state: 4, maturity: 4 };
    }
    return buildItemsFromRows(rows, colMap, true);
  }

  function parseRows(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Dados insuficientes. Copie pelo menos o cabeçalho e uma linha do Explorer.');
    }
    var headers = rows[0].map(function (c) { return String(c || ''); });
    var colMap = mapColumns(headers);
    if (colMap.name === undefined && colMap.title === undefined) {
      colMap.name = 0;
      colMap.level = colMap.level !== undefined ? colMap.level : (headers.length > 1 ? 1 : undefined);
    }
    return buildItemsFromRows(rows.slice(1), colMap, false);
  }

  function buildItemsFromRows(dataRows, colMap, inferIndent) {
    var items = [];
    var usedIds = {};
    var stackLevel = 0;
    for (var r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      if (!row || !row.length) continue;

      var level = 0;
      var name = '';
      if (inferIndent && colMap.level === undefined) {
        var lead = leadingDepth(row[colMap.name] !== undefined ? row[colMap.name] : row[0]);
        level = lead.depth;
        name = lead.text;
        if (colMap.name !== undefined && row[colMap.name] !== undefined) {
          row = row.slice();
          row[colMap.name] = lead.text;
        }
      } else {
        level = parseInt(cell(row, colMap, 'level', ''), 10);
        if (isNaN(level)) level = stackLevel;
      }

      if (!name) {
        name = cleanCell(cell(row, colMap, 'name', '')) || cleanCell(cell(row, colMap, 'title', ''));
      }
      name = stripIconNoise(unwrapJsonCell(name));
      if (!isProductName(name)) {
        skipRow('nome_invalido', String(name).slice(0, 40), r + 1);
        continue;
      }
      if (/^physical\s*product$/i.test(name)) {
        skipRow('tipo_header', name, r + 1);
        continue;
      }
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      stackLevel = level;

      var pid = cell(row, colMap, 'physicalid', '') || ('IMP_' + (r + 1) + '_' + name.replace(/\W/g, '_').slice(0, 40));
      pid = String(pid);
      if (usedIds[pid]) pid = pid + '__r' + (r + 1);
      usedIds[pid] = true;
      var st = resolveMaturityFields(row, colMap);
      var ownerCol = colMap.owner !== undefined ? row[colMap.owner] : '';
      if (!ownerCol && colMap.owner === undefined) {
        var oIdx = pickOwnerColumnIndex(row, colMap);
        if (oIdx !== undefined) ownerCol = row[oIdx];
      }
      var ownerMeta = parseOwnerCell(ownerCol);
      var ownerText = ownerMeta.label || cleanCell(unwrapJsonCell(cell(row, colMap, 'owner', '')));
      if (!ownerText || ownerText === '[]' || /^\[\s*\]$/.test(ownerText)) {
        var fbIdx = pickOwnerColumnIndex(row, colMap);
        if (fbIdx !== undefined && fbIdx !== colMap.owner) {
          ownerMeta = parseOwnerCell(row[fbIdx]);
          ownerText = ownerMeta.label || '';
        }
      }
      items.push({
        physicalid: pid,
        sourcePhysicalId: cell(row, colMap, 'physicalid', '') || '',
        name: String(name),
        title: stripIconNoise(unwrapJsonCell(cell(row, colMap, 'title', name))) || String(name),
        type: cell(row, colMap, 'type', 'VPMReference'),
        displayType: cell(row, colMap, 'type', 'Physical Product'),
        revision: cell(row, colMap, 'revision', ''),
        state: st.state,
        maturity: st.maturity,
        iconUrl: extractIconFromRow(row) || ownerMeta.iconUrl || '',
        quantity: parseFloat(cell(row, colMap, 'quantity', '1')) || 1,
        owner: ownerText,
        _ownerRaw: ownerCol,
        organization: cell(row, colMap, 'organization', ''),
        collabSpace: cell(row, colMap, 'collabSpace', ''),
        approval: st.approval,
        level: level,
        parentKey: cell(row, colMap, 'parent', ''),
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
    getImportReport: getImportReport,
    getLastImportReport: getLastImportReport
  };
})();
