import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExpandItemPayload } from './threeDxExpandItemNormalizer.js';

test('normalizes ExpandItem member and Path payload into occurrence rows', () => {
  const payload = {
    member: [
      {
        owner: 'root.owner',
        title: 'Root Product',
        type: 'VPMReference',
        revision: 'A',
        name: 'prd-root',
        id: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        state: 'IN_WORK'
      },
      {
        created: '2026-06-17T10:00:00Z',
        name: 'Child Instance.1',
        id: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        type: 'VPMInstance'
      },
      {
        owner: 'child.owner',
        title: 'Child Product',
        type: 'VPMReference',
        revision: 'B',
        name: 'prd-child',
        id: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        state: 'RELEASED'
      },
      {
        Path: [
          'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
        ]
      }
    ],
    totalItems: 4
  };

  const result = normalizeExpandItemPayload(payload, {
    rootId: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    includeRoot: true,
    expandDepth: 1,
    endpointsUsed: [{ method: 'POST', endpoint: '/dseng:EngItem/{ID}/expand', status: 200 }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'expand-item');
  assert.equal(result.root.id, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].level, 0);
  assert.equal(result.rows[1].level, 1);
  assert.equal(result.rows[1].parentReferenceId, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  assert.equal(result.rows[1].instanceId, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
  assert.equal(result.rows[1].referenceId, 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');
  assert.equal(
    result.rows[1].rowKey,
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA>BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB>CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
  );
  assert.equal(result.counts.totalRows, 2);
  assert.equal(result.counts.occurrenceCount, 1);
  assert.equal(result.counts.referenceCount, 2);
  assert.equal(result.counts.instanceCount, 1);
  assert.equal(result.counts.pathCount, 1);
});

test('keeps repeated references as separate occurrences when instance path differs', () => {
  const payload = {
    member: [
      { title: 'Root', type: 'VPMReference', id: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      { name: 'Child.1', id: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', type: 'VPMInstance' },
      { name: 'Child.2', id: 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', type: 'VPMInstance' },
      { title: 'Child', type: 'VPMReference', id: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' },
      { Path: ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'] },
      { Path: ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'] }
    ]
  };

  const result = normalizeExpandItemPayload(payload, {
    rootId: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    includeRoot: false,
    expandDepth: 1
  });

  assert.equal(result.rows.length, 2);
  assert.equal(result.counts.occurrenceCount, 2);
  assert.equal(result.rows[0].referenceId, result.rows[1].referenceId);
  assert.notEqual(result.rows[0].instanceId, result.rows[1].instanceId);
});
