import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVisualization } from './threeDxVisualizationService.js';

test('resolveVisualization requires referenceId', async () => {
  const result = await resolveVisualization({ mode: 'mock' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 422);
  assert.equal(result.data.error.code, 'REFERENCE_ID_REQUIRED');
});

test('resolveVisualization mock mode returns official API required', async () => {
  const result = await resolveVisualization({
    mode: 'mock',
    referenceId: '63FC553465A62400699E0792000086AB'
  });
  assert.equal(result.ok, false);
  assert.equal(result.data.code, 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED');
});
