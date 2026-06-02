'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');
var code = fs.readFileSync(path.join(root, 'assets/js/services/file-import-service.js'), 'utf8');
var sandbox = {
  APP_CONFIG: { STRUCTURE_IDS: { Mont10: 'prd-x', M1: 'x', M2: 'y' } },
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
  '{"icon":"x"}\tMont10\tMont10\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n' +
  'M1\tM1\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n' +
  'M2\tM2\t1.1\tEnderson Moura\tPhysical Product\tAprovado\n';

var items = FIS.parseText(tsv);
if (items.length !== 3) {
  console.error('FAIL count', items.length, items.map(function (i) { return i.name; }));
  process.exit(1);
}
var m1 = items.find(function (i) { return i.name === 'M1'; });
var m2 = items.find(function (i) { return i.name === 'M2'; });
if (!m1 || !m2) {
  console.error('FAIL missing M1/M2', items.map(function (i) { return i.name; }));
  process.exit(1);
}
if (m2.maturity !== 'Aprovado' && m2.state !== 'Aprovado') {
  console.error('FAIL M2 maturity', m2.maturity, m2.state);
  process.exit(1);
}
console.log('OK Mont10 mixed icon', items.map(function (i) { return i.name + ':' + i.maturity; }).join(','));
