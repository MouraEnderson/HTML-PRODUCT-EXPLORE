'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');
var code = fs.readFileSync(path.join(root, 'assets/js/services/file-import-service.js'), 'utf8');
var sandbox = {
  APP_CONFIG: { STRUCTURE_IDS: {} },
  ProductExplorerBridge: {
    getExplorerObjectCount: function () { return 1; },
    getStructureNameHint: function () { return 'Starret EM_testeConnect'; },
    applyOwnersToItems: function (items) { return items; },
    enrichItemsWithPrd: function (items) { return items; }
  },
  console: console
};
vm.runInNewContext(code + '\nthis.FileImportService = FileImportService;', sandbox);
var tsv =
  'Título\tDescrição\tRevisão\tProprietário\tTipo\tEstado de maturidade\n' +
  '{"i":1}\tStarret EM_testeConnect\tStarret EM_testeConnect\t1.1\tEnderson Moura\tPhysical Product\tEm Trabalho\n' +
  '3D Shape\t\t1.1\tEnderson Moura\t3D Shape\tEm Trabalho\n';
var items = sandbox.FileImportService.parseText(tsv);
if (items.length !== 1) {
  console.error('FAIL count', items.length, items.map(function (i) { return i.name; }));
  process.exit(1);
}
if (items[0].name.indexOf('Starret') < 0) {
  console.error('FAIL name', items[0].name);
  process.exit(1);
}
console.log('OK Starret 1 item', items[0].name);
