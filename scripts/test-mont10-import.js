/**
 * Smoke: parser Mont10 — M1/M2 não podem virar título do proprietário.
 * node scripts/test-mont10-import.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var code = fs.readFileSync(path.join(root, 'assets/js/services/file-import-service.js'), 'utf8');
var sandbox = {
  APP_CONFIG: { STRUCTURE_IDS: { Mont10: 'prd-R1132100929518-00511496', M1: 'x', M2: 'y' } },
  ProductExplorerBridge: {
    getExplorerObjectCount: function () { return 3; },
    getStructureNameHint: function () { return 'Mont10'; },
    applyOwnersToItems: function (items) { return items; },
    enrichItemsWithPrd: function (items) { return items; }
  },
  console: console
};
vm.runInNewContext(code + '\nthis.FileImportService = FileImportService;', sandbox);
var FIS = sandbox.FileImportService;

var tsv =
  'Título\tDescrição\tRevisão\tProprietário\tTipo\tEstado de maturidade\n' +
  'Mont10\tMont10\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n' +
  'M1\tEnderson Moura\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n' +
  'M2\tEnderson Moura\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n';

var items = FIS.parseText(tsv);
var names = items.map(function (it) { return it.name; }).join(',');
var titles = items.map(function (it) { return it.title; }).join(',');

if (items.length !== 3) {
  console.error('FAIL count', items.length);
  process.exit(1);
}
if (names.indexOf('M1') < 0 || names.indexOf('M2') < 0) {
  console.error('FAIL names', names);
  process.exit(1);
}
if (titles.indexOf('Enderson Moura') >= 0 && titles.indexOf('M1') < 0) {
  console.error('FAIL titles', titles);
  process.exit(1);
}
console.log('OK Mont10 parser', names);
