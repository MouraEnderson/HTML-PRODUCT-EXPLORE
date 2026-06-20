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

test('resolve-selection surfaces expired upstream session as auth failure', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    BOM_SERVICE_MODE: process.env.BOM_SERVICE_MODE,
    THREEDX_SPACE_URL: process.env.THREEDX_SPACE_URL,
    THREEDX_SECURITY_CONTEXT: process.env.THREEDX_SECURITY_CONTEXT,
    ENOVIA_COOKIE: process.env.ENOVIA_COOKIE
  };

  process.env.BOM_SERVICE_MODE = 'dseng';
  process.env.THREEDX_SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  process.env.THREEDX_SECURITY_CONTEXT = 'ctx::Role.Org.Project';
  process.env.ENOVIA_COOKIE = 'JSESSIONID=expired';
  global.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () =>
      JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid, expired or missing authenticated session. New service ticket required'
      })
  });

  try {
    const result = await resolveSelection({
      selection: {
        normalized: {
          name: 'prd-R1132100929518-01103695',
          title: 'CJ MESA 4BCS VP TOP 3DX'
        }
      },
      depth: 1,
      includeRoot: true,
      mode: 'dseng-official'
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 502);
    assert.equal(result.error.error.code, 'UPSTREAM_AUTH_FAILED');
    assert.equal(result.error.diagnostics.errors[0], 'UPSTREAM_AUTH_FAILED');
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
