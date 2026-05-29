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
    state: ['state', 'estado', 'maturity', 'maturidade', 'estado de maturidade', 'current', 'status'],
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

  /** Explorer copia proprietário como JSON { icon, label }. */
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
    if (/^aprovado$/i.test(s)) {
      return { state: s, maturity: s, approval: a && a !== 'Unknown' ? a : 'Approved' };
    }
    return { state: s, maturity: s, approval: a || 'Unknown' };
  }

  function isStatusLabel(name) {
    var t = cleanCell(name).toLowerCase();
    if (!t || t.length > 48) return false;
    if (t.indexOf('|') >= 0 || t.indexOf('3dexperience') >= 0) return false;
    if (STATUS_LABELS.indexOf(t) >= 0) return true;
    return /^(cr[ií]tico|aten[cç][aã]o|alerta)$/i.test(t);
  }

  function normHeader(h) {
    return cleanCell(h).toLowerCase().replace(/\s+/g, ' ');
  }

  function mapColumns(headers) {
    var map = {};
    headers.forEach(function (h, i) {
      var nh = normHeader(h);
      if (!nh) return;
      Object.keys(COLUMN_ALIASES).forEach(function (key) {
        if (map[key] !== undefined) return;
        if (COLUMN_ALIASES[key].some(function (a) { return nh === a || nh.indexOf(a) >= 0; })) {
          map[key] = i;
        }
      });
    });
    return map;
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
      joined.indexOf('title') >= 0;
  }

  function leadingDepth(str) {
    var s = String(str || '');
    var tabs = (s.match(/^\t*/) || [''])[0].length;
    if (tabs > 0) return { depth: tabs, text: s.replace(/^\t+/, '').trim() };
    var spaces = (s.match(/^ */) || [''])[0].length;
    return { depth: Math.floor(spaces / 2), text: s.trim() };
  }

  function splitLine(line) {
    if (line.indexOf('\t') >= 0) return line.split('\t').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
    if (line.indexOf(';') >= 0) return line.split(';').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
    return line.split(',').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
  }

  function textToRows(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) throw new Error('Nada colado. Copie linhas no Product Explorer (Ctrl+C) e cole de novo.');
    return lines.map(splitLine);
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
    var hasProduct = names.some(function (n) {
      return /^mont\d*$/i.test(n) || /^m\d+$/i.test(n) || n.indexOf('assembly') >= 0;
    });
    var onlyOwner = names.every(function (n) {
      return n.indexOf('enderson') >= 0 || n.indexOf('moura') >= 0 || n.indexOf('propriet') >= 0;
    });
    if (!hasProduct && (onlyOwner || names.length <= 2)) {
      throw new Error(
        'Parece coluna Proprietário (Enderson Moura), não a estrutura. Ctrl+A na grade inteira → Ctrl+C → cole na caixa azul.'
      );
    }
  }

  function parseText(text) {
    if (!looksLikeExplorerPaste(text)) {
      throw new Error(
        'Clipboard não tem a grade do Explorer. No Explorer: clique na tabela → Ctrl+A → Ctrl+C → cole na caixa azul → Varrer.'
      );
    }
    var rows = textToRows(text).map(function (row) {
      return row.map(function (c) { return cleanCell(c); });
    });
    if (rows.length === 1 && rows[0].length === 1) {
      return buildItemsFromSingleColumn([rows[0][0]]);
    }
    var items = smartParseRows(rows);
    items.forEach(function (it) {
      it.name = stripIconNoise(it.name) || it.name;
      it.title = stripIconNoise(it.title) || it.title;
    });
    items = inferAssemblyLevels(items.filter(function (it) {
      return it.name && it.name.length > 0;
    }));
    validateImportedItems(items);
    return items;
  }

  function parseRowsWithoutHeader(rows) {
    if (rows.length && looksLikeHeader(rows[0])) {
      return parseRows(rows);
    }
    var colMap = {};
    var first = rows[0];
    if (first.length >= 2 && /^\d+$/.test(String(first[0]).trim())) {
      colMap.level = 0;
      colMap.name = 1;
      colMap.title = 2;
      colMap.type = 3;
      colMap.revision = 4;
      colMap.state = 5;
    } else if (first.length >= 5) {
      colMap.name = 0;
      colMap.revision = 1;
      colMap.type = 2;
      colMap.owner = 3;
      colMap.state = 4;
    } else {
      colMap.name = 0;
      colMap.title = 1;
      colMap.type = 2;
      colMap.revision = 3;
      colMap.state = 4;
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
      if (!isProductName(name)) continue;
      if (/^physical\s*product$/i.test(name)) continue;
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      stackLevel = level;

      var pid = cell(row, colMap, 'physicalid', '') || ('IMP_' + (r + 1) + '_' + name.replace(/\W/g, '_').slice(0, 40));
      var st = normalizeImportedState(
        cell(row, colMap, 'state', ''),
        cell(row, colMap, 'approval', 'Unknown')
      );
      items.push({
        physicalid: String(pid),
        name: String(name),
        title: stripIconNoise(unwrapJsonCell(cell(row, colMap, 'title', name))) || String(name),
        type: cell(row, colMap, 'type', 'VPMReference'),
        displayType: cell(row, colMap, 'type', 'Physical Product'),
        revision: cell(row, colMap, 'revision', ''),
        state: st.state,
        maturity: st.maturity,
        quantity: parseFloat(cell(row, colMap, 'quantity', '1')) || 1,
        owner: unwrapJsonCell(cell(row, colMap, 'owner', '')),
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
    parseRows: parseRows
  };
})();
