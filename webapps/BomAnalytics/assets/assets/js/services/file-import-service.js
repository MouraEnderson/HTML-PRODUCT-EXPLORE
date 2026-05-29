/**
 * @file services/file-import-service.js
 * Importa estrutura Product Explorer via Excel/CSV (drag & drop).
 */
var FileImportService = (function () {
  'use strict';

  var COLUMN_ALIASES = {
    level: ['nivel', 'nível', 'level', 'n', 'depth', 'profundidade'],
    name: ['name', 'nome', 'title', 'titulo', 'título', 'display name', 'displayname'],
    title: ['title', 'titulo', 'título', 'description', 'descricao'],
    type: ['type', 'tipo', 'display type', 'policy', 'tipologia'],
    revision: ['revision', 'revisao', 'revisão', 'rev', 'majorrevision'],
    state: ['state', 'estado', 'maturity', 'maturidade', 'current', 'status'],
    quantity: ['quantity', 'quantidade', 'qty', 'qtd', 'amount'],
    owner: ['owner', 'proprietario', 'proprietário', 'creator'],
    organization: ['organization', 'organizacao', 'organização', 'org'],
    collabSpace: ['collabspace', 'collaborative space', 'espaco', 'espaço', 'project'],
    approval: ['approval', 'aprovacao', 'aprovação', 'approval status'],
    physicalid: ['physicalid', 'physical id', 'id', 'objectid', 'object id'],
    parent: ['parent', 'pai', 'parentid', 'parent id', 'parent name']
  };

  function normHeader(h) {
    return String(h || '').toLowerCase().trim().replace(/\s+/g, ' ');
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

  function parseRows(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Planilha vazia ou sem cabeçalho.');
    }
    var headers = rows[0].map(function (c) { return String(c || ''); });
    var colMap = mapColumns(headers);
    if (colMap.name === undefined && colMap.title === undefined) {
      throw new Error('Coluna Nome/Title não encontrada. Exporte do Product Explorer com cabeçalhos.');
    }

    var items = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.length) continue;
      var name = cell(row, colMap, 'name', '') || cell(row, colMap, 'title', '');
      if (!name) continue;

      var level = parseInt(cell(row, colMap, 'level', '0'), 10);
      if (isNaN(level)) level = 0;

      var pid = cell(row, colMap, 'physicalid', '') || ('IMP_' + r + '_' + name.replace(/\W/g, '_').slice(0, 40));
      items.push({
        physicalid: String(pid),
        name: String(name),
        title: cell(row, colMap, 'title', name),
        type: cell(row, colMap, 'type', 'VPMReference'),
        displayType: cell(row, colMap, 'type', 'Physical Product'),
        revision: cell(row, colMap, 'revision', ''),
        state: cell(row, colMap, 'state', ''),
        maturity: cell(row, colMap, 'state', ''),
        quantity: parseFloat(cell(row, colMap, 'quantity', '1')) || 1,
        owner: cell(row, colMap, 'owner', ''),
        organization: cell(row, colMap, 'organization', ''),
        collabSpace: cell(row, colMap, 'collabSpace', ''),
        approval: cell(row, colMap, 'approval', 'Unknown'),
        level: level,
        parentKey: cell(row, colMap, 'parent', ''),
        rowIndex: r
      });
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
          resolve(parseRows(rows));
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
          var text = e.target.result;
          var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
          var rows = lines.map(function (line) {
            return line.split(/[;\t,]/).map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
          });
          resolve(parseRows(rows));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Falha ao ler CSV.')); };
      reader.readAsText(file);
    });
  }

  function parseFile(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
    if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(file);
    return Promise.reject(new Error('Formato não suportado. Use .xlsx ou .csv exportado do Product Explorer.'));
  }

  return {
    parseFile: parseFile,
    parseRows: parseRows
  };
})();
