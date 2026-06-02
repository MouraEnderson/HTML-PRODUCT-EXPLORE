'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');
var code = fs.readFileSync(path.join(root, 'assets/js/services/file-import-service.js'), 'utf8');
var sandbox = {
  APP_CONFIG: { STRUCTURE_IDS: {} },
  ProductExplorerBridge: {
    getExplorerObjectCount: function () { return 79; },
    getStructureNameHint: function () { return 'SKA_ENDERSW-BES-00009887'; },
    applyOwnersToItems: function (items) { return items; },
    enrichItemsWithPrd: function (items) { return items; }
  },
  console: console
};
vm.runInNewContext(code + '\nthis.FileImportService = FileImportService;', sandbox);
var FIS = sandbox.FileImportService;

var row =
  '{"icon":"x"}' + '\t' +
  'SKA_ENDERSW-BES-00009887' + '\t' +
  'TRANSPORTADOR DE PALLET' + '\t' +
  '1.1' + '\t' +
  'Enderson Moura' + '\t' +
  'Physical Product' + '\t' +
  'Em Trabalho';

var header =
  'Título\tDescrição\tRevisão\tProprietário\tTipo\tEstado de maturidade';
var tsv = header + '\n' + row;
var items = FIS.parseText(tsv);
var it = items[0];
if (it.revision !== '1.1') {
  console.error('FAIL revision', it.revision);
  process.exit(1);
}
if (it.title.indexOf('TRANSPORTADOR') < 0) {
  console.error('FAIL title', it.title, 'full', JSON.stringify(it));
  process.exit(1);
}
if (it.type.indexOf('Physical') < 0) {
  console.error('FAIL type', it.type);
  process.exit(1);
}
console.log('OK SKA row', it.name, it.title, it.revision, it.type);
