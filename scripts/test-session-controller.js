'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/bom-waf-session-controller-bom20260621e.js', 'utf8');
const sandbox = {
  window: {},
  console,
  document: {
    createElement() { return { textContent: '', innerHTML: '' }; }
  }
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'bom-waf-session-controller-bom20260621e.js' });

const api = sandbox.__bomWafSessionController;
const test = api.__test;

assert.strictEqual(test.isCjContext({ title: 'SKA_ENDERSW-BES-00009887' }), false, 'SKA must not be CJ');
assert.strictEqual(test.isCjContext({ title: 'CJ MESA 4BCS VP TOP 3DX' }), true, 'CJ title enables CJ registry');
assert.strictEqual(test.isCjContext({ physicalId: 'prd-R1132100929518-01103695' }), true, 'CJ physical ID enables CJ registry');

const expansion = {
  member: [
    { id: 'REF-A', type: 'VPMReference', title: 'Repeated reference' },
    { id: 'INS-1', instanceId: 'INS-1', referenceId: 'REF-A', type: 'VPMInstance', title: 'Occurrence one', parentReferenceId: 'ROOT' },
    { id: 'INS-2', instanceId: 'INS-2', referenceId: 'REF-A', type: 'VPMInstance', title: 'Occurrence two', parentReferenceId: 'ROOT' }
  ]
};
const normalized = test.normalizeExpansion(
  { internalId: 'ROOT', title: 'Root' },
  { id: 'ROOT', title: 'Root', type: 'dseng:EngItem' },
  expansion
);
const instanceRows = normalized.rows.filter((row) => row.instanceId);
assert.strictEqual(instanceRows.length, 2, 'Two instances of one reference must remain two rows');
const counts = test.computeCounts(normalized.rows, normalized.rawRows, []);
assert.strictEqual(counts.occurrenceCount, normalized.rows.length - 1, 'Occurrences exclude only root row');
assert.strictEqual(counts.uniqueReferenceCount, 2, 'Root plus one repeated reference are unique references');

const diagnostic = JSON.parse(api.exportDiagnostics());
assert.ok(!JSON.stringify(diagnostic).match(/token|cookie|authorization/i), 'Diagnostics must be sanitized');

const widget = fs.readFileSync('widget-v3.html', 'utf8');
assert.ok(widget.includes('__bomWafSessionController.boot'), 'Widget must boot the official controller');
assert.ok(!widget.includes('App.run();'), 'Widget must not start legacy App.run');

console.log('PASS session controller contract tests');
