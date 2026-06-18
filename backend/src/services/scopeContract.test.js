import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScope, enrichCounts, attachScopeToPayload } from './scopeContract.js';

test('buildScope returns contract fields', () => {
  const scope = buildScope({
    mode: 'root',
    source: 'dseng',
    item: 'CJ MESA',
    rootId: 'abc',
    expandStrategy: 'expand-item',
    expandDepth: 1,
    isPartial: true
  });
  assert.equal(scope.mode, 'root');
  assert.equal(scope.expandDepth, 1);
  assert.equal(scope.isPartial, true);
});

test('enrichCounts derives reference and occurrence counts', () => {
  const counts = enrichCounts(
    { totalRows: 2 },
    [
      { level: 0, referenceId: 'r1', physicalId: 'r1' },
      { level: 1, referenceId: 'r2', physicalId: 'r2', instanceId: 'i1', path: ['r1', 'i1', 'r2'] }
    ]
  );
  assert.equal(counts.loadedRows, 2);
  assert.equal(counts.occurrenceCount, 1);
  assert.equal(counts.uniqueReferenceCount, 2);
  assert.equal(counts.instanceCount, 1);
  assert.equal(counts.pathCount, 1);
});

test('attachScopeToPayload merges scope and counts', () => {
  const payload = attachScopeToPayload(
    {
      rows: [{ level: 0, referenceId: 'x', physicalId: 'x' }],
      counts: { totalRows: 1 }
    },
    { mode: 'dashboard-row', expandDepth: 2 }
  );
  assert.equal(payload.scope.mode, 'dashboard-row');
  assert.equal(payload.counts.loadedRows, 1);
  assert.equal(payload.partial, true);
});
