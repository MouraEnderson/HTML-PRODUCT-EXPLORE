import test from 'node:test';
import assert from 'node:assert/strict';
import { getLifecycleTransitions, changeMaturity } from './threeDxLifecycleService.js';

test('getLifecycleTransitions requires referenceId', async () => {
  const result = await getLifecycleTransitions({ mode: 'mock' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 422);
});

test('getLifecycleTransitions mock mode returns official API required', async () => {
  const result = await getLifecycleTransitions({
    mode: 'mock',
    referenceId: 'abc123'
  });
  assert.equal(result.ok, false);
  assert.equal(result.data.code, 'OFFICIAL_LIFECYCLE_API_REQUIRED');
});

test('changeMaturity requires confirm', async () => {
  const result = await changeMaturity({
    mode: 'mock',
    referenceId: 'abc123',
    targetState: 'RELEASED'
  });
  assert.equal(result.ok, false);
  assert.equal(result.data.code, 'CONFIRMATION_REQUIRED');
});

test('changeMaturity mock mode returns official API required when confirmed', async () => {
  const result = await changeMaturity({
    mode: 'mock',
    referenceId: 'abc123',
    targetState: 'RELEASED',
    confirm: true
  });
  assert.equal(result.ok, false);
  assert.equal(result.data.code, 'OFFICIAL_LIFECYCLE_API_REQUIRED');
});
