'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const compassSource = fs.readFileSync('assets/js/platform/compass.js', 'utf8');
const contextSource = fs.readFileSync('assets/js/platform/context.js', 'utf8');
const compassSandbox = {
  APP_CONFIG: { TENANT_DEFAULTS: {}, DEMO_MODE: false },
  window: {},
  location: { hostname: '' },
  Promise,
  setTimeout
};
compassSandbox.window = compassSandbox;
vm.runInNewContext(compassSource, compassSandbox, { filename: 'compass.js' });
assert.strictEqual(
  typeof compassSandbox.CompassServices.ensure3DSpaceServiceUrl,
  'function',
  'CompassServices must export ensure3DSpaceServiceUrl'
);
assert.strictEqual(
  compassSandbox.CompassServices.ensure3DSpaceServiceUrl,
  compassSandbox.CompassServices.ensureWorkingSpaceUrl,
  'Both Compass aliases must reference the same resolver'
);
assert.ok(contextSource.includes('h.ENO_CSRF_TOKEN = state.csrfToken'), 'ENOVIA POST requests must use ENO_CSRF_TOKEN');
assert.ok(!contextSource.includes("h['X-CSRF-Token'] = state.csrfToken"), 'Do not send the non-contract X-CSRF-Token header');

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
assert.strictEqual(test.isEngItemId('63FC553465A62400699E0792000086AB'), true, 'Internal dseng IDs are accepted manually');
assert.strictEqual(test.isPrdId('prd-R1132100929518-00662677'), true, 'Cloud prd IDs are accepted manually');
assert.strictEqual(test.isEngItemId('prd-R1132100929518-00662677'), false, 'prd IDs must not be mistaken for dseng IDs');
assert.strictEqual(test.requestedExpandDepth(), 1, 'Expand contract defaults to an explicit positive depth');
assert.strictEqual(
  JSON.stringify(test.describeExpansionPayload({ member: [{ id: 'A' }], meta: { ignored: true } })),
  JSON.stringify({ type: 'object', keys: ['member', 'meta'], arrayLengths: { member: 1 } }),
  'Expansion diagnostics report shape without exposing member content'
);

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
assert.strictEqual(normalized.rows.length, 3, 'Reference metadata must not become an additional E-BOM row when instances exist');
assert.strictEqual(normalized.rawRows, 2, 'Raw E-BOM candidates are occurrence instances only');
assert.strictEqual(normalized.discardedReferenceMetadata, 1, 'Reference metadata is tracked as discarded from the row set');
const contractInspection = test.inspectExpansionPayload(expansion);
assert.strictEqual(contractInspection.objectsDetected, 3, 'Contract inspection sees every candidate object');
assert.strictEqual(contractInspection.byType.VPMInstance, 2, 'Contract inspection separates instance candidates from references');
assert.strictEqual(contractInspection.byType.VPMReference, 1, 'Contract inspection separates reference candidates from instances');
const counts = test.computeCounts(normalized.rows, normalized.rawRows, []);
assert.strictEqual(counts.occurrenceCount, normalized.rows.length - 1, 'Occurrences exclude only root row');
assert.strictEqual(counts.uniqueReferenceCount, 2, 'Root plus one repeated reference are unique references');

const diagnostic = JSON.parse(api.exportDiagnostics());
assert.ok(!JSON.stringify(diagnostic).match(/token|cookie|authorization/i), 'Diagnostics must be sanitized');
const initialState = api.getState();
assert.strictEqual(initialState.controller, 'bom-waf-session-controller-bom20260621e');
assert.strictEqual(initialState.activeEntrypoint, 'widget-v3.html');
assert.strictEqual(initialState.legacyOperationalHandlers, 0);
assert.strictEqual(typeof api, 'object', 'Controller must exist in the runtime');
assert.doesNotThrow(() => api.boot(), 'Controller boot must not fail before a user sync');

const widget = fs.readFileSync('widget-v3.html', 'utf8');
assert.ok(widget.includes('__bomWafSessionController.boot'), 'Widget must boot the official controller');
assert.ok(!widget.includes('App.run();'), 'Widget must not start legacy App.run');
assert.ok(widget.includes("bom-bundle-' + CANON_BUILD"), 'Canonical build must choose the bundle file');
assert.ok(!widget.includes('BOM_BUILD = fromQuery'), 'Query string must not select a bundle build');

const bundle = fs.readFileSync('assets/js/bom-bundle.js', 'utf8');
assert.ok(!bundle.includes('product-explorer-bridge.js'), 'Official bundle must not include DOM bridge');
assert.ok(!bundle.includes('tsv-bom-loader.js'), 'Official bundle must not include TSV loader');
assert.ok(!bundle.includes('paste-bom-loader.js'), 'Official bundle must not include clipboard loader');

assert.ok(source.includes("bindControllerButton('btnLoadPhysicalId', loadManualInput)"), 'Advanced manual root button must be owned by the controller');
assert.ok(source.includes('function probeContextSources()'), 'Controller must expose a safe context source probe');
assert.ok(source.includes('function expandRootWithValidatedContract(root)'), 'Controller must use a named expand contract helper');
assert.ok(!source.includes('expandEngItem(root.internalId, { expandDepth: -1 })'), 'Controller must not request unbounded expandDepth -1');

console.log('PASS session controller contract tests');
