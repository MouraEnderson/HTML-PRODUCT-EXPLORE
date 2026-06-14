import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikePhysicalId,
  extractSelectionCandidates,
  resolveSelectionToEngItem
} from './selectionResolver.js';
import { CJ_MESA_ROOT_ID } from './threeDxBomNormalizer.js';

const VALID_ROOT = CJ_MESA_ROOT_ID;

function mockClient(map) {
  return {
    getEngItem(id) {
      const entry = map[id];
      if (!entry) {
        const error = new Error('not found');
        error.status = 404;
        throw error;
      }
      return Promise.resolve({ data: entry });
    }
  };
}

test('looksLikePhysicalId accepts dseng physical id', () => {
  assert.equal(looksLikePhysicalId(VALID_ROOT), true);
  assert.equal(looksLikePhysicalId('CJ MESA'), false);
  assert.equal(looksLikePhysicalId('prd-123'), false);
});

test('extractSelectionCandidates prioritizes manual root', () => {
  const list = extractSelectionCandidates({
    manualRootId: VALID_ROOT,
    normalized: { rootId: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }
  });
  assert.equal(list[0].strategy, 'manual-root');
  assert.equal(list[0].candidate, VALID_ROOT);
});

test('case 1 normalized.rootId valid resolves direct-engitem', async () => {
  const client = mockClient({
    [VALID_ROOT]: { id: VALID_ROOT, title: 'CJ MESA 4BCS VP TOP 3DX' }
  });
  const result = await resolveSelectionToEngItem(
    { normalized: { rootId: VALID_ROOT, title: 'CJ MESA 4BCS VP TOP 3DX' } },
    { client }
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.strategy, 'direct-engitem');
  assert.equal(result.rootId, VALID_ROOT);
});

test('case 2 normalized.selectedId valid resolves direct-engitem', async () => {
  const client = mockClient({
    [VALID_ROOT]: { id: VALID_ROOT, title: 'CJ MESA 4BCS VP TOP 3DX' }
  });
  const result = await resolveSelectionToEngItem(
    { normalized: { selectedId: VALID_ROOT, title: 'CJ MESA' } },
    { client }
  );
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'direct-engitem');
});

test('case 3 raw physicalId valid resolves physicalid', async () => {
  const client = mockClient({
    [VALID_ROOT]: { id: VALID_ROOT, title: 'CJ MESA 4BCS VP TOP 3DX' }
  });
  const result = await resolveSelectionToEngItem(
    {
      raw: {
        platformItem: {
          displayName: 'CJ MESA',
          physicalId: VALID_ROOT
        }
      }
    },
    { client }
  );
  assert.equal(result.ok, true);
  assert.equal(result.rootId, VALID_ROOT);
});

test('case 4 title only is NOT_RESOLVED without dangerous search', async () => {
  const client = mockClient({});
  const result = await resolveSelectionToEngItem(
    { normalized: { title: 'CJ MESA 4BCS VP TOP 3DX' }, raw: { title: 'CJ MESA' } },
    { client }
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 'NOT_RESOLVED');
  assert.ok(result.attempts.some((item) => item.strategy === 'search-title'));
});

test('case 5 invalid candidate is NOT_RESOLVED', async () => {
  const client = mockClient({});
  const result = await resolveSelectionToEngItem(
    { normalized: { rootId: 'CJ MESA', selectedId: 'label-only' } },
    { client }
  );
  assert.equal(result.ok, false);
  assert.ok(result.attempts.some((item) => item.status === 'INVALID'));
});

test('case 6 valid format but dseng 404 records attempt and NOT_RESOLVED', async () => {
  const missing = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
  const client = mockClient({});
  const result = await resolveSelectionToEngItem(
    { normalized: { rootId: missing, title: 'Missing item' } },
    { client }
  );
  assert.equal(result.ok, false);
  assert.ok(result.attempts.some((item) => item.status === 404));
});

test('case 7 manual rootId valid resolves manual-root', async () => {
  const client = mockClient({
    [VALID_ROOT]: { id: VALID_ROOT, title: 'CJ MESA 4BCS VP TOP 3DX' }
  });
  const result = await resolveSelectionToEngItem(
    { normalized: { title: 'ignored title' } },
    { client, manualRootId: VALID_ROOT }
  );
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'manual-root');
  assert.equal(result.rootId, VALID_ROOT);
});
