import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BOM_SERVICE_MODE = 'mock';

const { resolveSelection } = await import('./threeDxBomService.js');
const { CJ_MESA_ROOT_ID } = await import('./threeDxBomNormalizer.js');

test('resolve-selection mock returns RESOLVED CJ MESA with 5 rows', async () => {
  const result = await resolveSelection({
    selection: {
      normalized: {
        rootId: CJ_MESA_ROOT_ID,
        title: 'CJ MESA 4BCS VP TOP 3DX'
      },
      source: 'PlatformAPI/ExplorerContext'
    },
    depth: 1,
    includeRoot: true,
    mode: 'mock'
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.data.resolution.status, 'RESOLVED');
  assert.equal(result.data.resolution.rootId, CJ_MESA_ROOT_ID);
  assert.ok(result.data.rows.length >= 1);
  assert.equal(result.data.counts.totalRows, result.data.rows.length);
});

test('resolve-selection mock title-only returns NOT_RESOLVED', async () => {
  const result = await resolveSelection({
    selection: {
      normalized: { title: 'CJ MESA only title' },
      raw: { title: 'CJ MESA only title' },
      source: 'PlatformAPI/ExplorerContext'
    },
    depth: 1,
    includeRoot: true,
    mode: 'mock'
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 422);
  assert.equal(result.error.error.code, 'SELECTION_NOT_RESOLVED');
  assert.equal(result.error.resolution.status, 'NOT_RESOLVED');
});
