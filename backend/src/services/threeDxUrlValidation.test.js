import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THREEDX_SPACE_URL,
  isValidThreeDxSpaceUrl,
  resolveThreeDxSpaceUrl,
  classifyUpstreamAuthFailure
} from './threeDxUrlValidation.js';
import { getThreeDxConfig } from './threeDxConfig.js';

test('isValidThreeDxSpaceUrl accepts tenant space URL', () => {
  assert.equal(
    isValidThreeDxSpaceUrl('https://r1132100929518-us1-space.3dexperience.3ds.com/enovia'),
    true
  );
});

test('isValidThreeDxSpaceUrl rejects GitHub Pages widget URL', () => {
  assert.equal(
    isValidThreeDxSpaceUrl('https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js'),
    false
  );
});

test('isValidThreeDxSpaceUrl rejects ifwe dashboard URL', () => {
  assert.equal(
    isValidThreeDxSpaceUrl('https://r1132100929518-us1-ifwe.3dexperience.3ds.com/#dashboard:abc'),
    false
  );
});

test('resolveThreeDxSpaceUrl uses safe default when env is GitHub URL', () => {
  const resolved = resolveThreeDxSpaceUrl(
    'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js'
  );
  assert.equal(resolved.spaceUrl, DEFAULT_THREEDX_SPACE_URL);
  assert.equal(resolved.spaceUrlHost, 'r1132100929518-us1-space.3dexperience.3ds.com');
  assert.equal(resolved.spaceUrlConfigError, 'INVALID_THREEDX_SPACE_URL');
  assert.equal(resolved.spaceUrlRejectedHost, 'mouraenderson.github.io');
  assert.equal(resolved.spaceUrlUsedDefault, true);
});

test('resolveThreeDxSpaceUrl uses default when env missing', () => {
  const resolved = resolveThreeDxSpaceUrl('');
  assert.equal(resolved.spaceUrl, DEFAULT_THREEDX_SPACE_URL);
  assert.equal(resolved.spaceUrlConfigError, null);
  assert.equal(resolved.spaceUrlUsedDefault, true);
});

test('getThreeDxConfig never exposes GitHub URL as spaceUrl', () => {
  const original = process.env.THREEDX_SPACE_URL;
  process.env.THREEDX_SPACE_URL =
    'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js';
  try {
    const config = getThreeDxConfig();
    assert.equal(config.spaceUrl, DEFAULT_THREEDX_SPACE_URL);
    assert.equal(config.spaceUrlHost, 'r1132100929518-us1-space.3dexperience.3ds.com');
    assert.equal(config.spaceUrlConfigError, 'INVALID_THREEDX_SPACE_URL');
    assert.equal(config.spaceUrlRejectedHost, 'mouraenderson.github.io');
  } finally {
    if (original === undefined) delete process.env.THREEDX_SPACE_URL;
    else process.env.THREEDX_SPACE_URL = original;
  }
});

test('classifyUpstreamAuthFailure detects tenant binding error', () => {
  const result = classifyUpstreamAuthFailure(
    "CAS service authentication failed (401): tenant 'r1132100929518' does not exist"
  );
  assert.equal(result.errorType, 'tenant_not_found');
  assert.equal(result.upstreamStatus, 401);
});
