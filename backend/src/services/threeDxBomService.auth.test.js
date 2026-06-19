import test from 'node:test';
import assert from 'node:assert/strict';
import { getSkaAuthHealth } from './threeDxBomService.js';

test('getSkaAuthHealth reports session expiry without live credentials', async () => {
  const originalCookie = process.env.ENOVIA_COOKIE;
  const originalBearer = process.env.ENOVIA_BEARER_TOKEN;
  const originalUser = process.env.THREEDX_USERNAME;
  const originalPass = process.env.THREEDX_PASSWORD;
  const originalMode = process.env.THREEDX_AUTH_MODE;
  const originalSpace = process.env.THREEDX_SPACE_URL;
  const originalCtx = process.env.THREEDX_SECURITY_CONTEXT;

  process.env.THREEDX_SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  process.env.THREEDX_SECURITY_CONTEXT = 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO';
  process.env.THREEDX_AUTH_MODE = 'cookie-only';
  process.env.ENOVIA_BEARER_TOKEN = '';
  process.env.THREEDX_USERNAME = '';
  process.env.THREEDX_PASSWORD = '';
  process.env.ENOVIA_COOKIE = 'JSESSIONID=expired';

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({
      error: 'invalid_grant',
      error_description: 'Invalid, expired or missing authenticated session. New service ticket required'
    }),
    headers: { getSetCookie: () => [] }
  });

  try {
    const result = await getSkaAuthHealth();
    assert.equal(result.ok, false);
    assert.equal(result.auth.sessionExpired, true);
    assert.equal(result.auth.canReadKnownRoot, false);
  } finally {
    global.fetch = originalFetch;
    if (originalCookie === undefined) delete process.env.ENOVIA_COOKIE;
    else process.env.ENOVIA_COOKIE = originalCookie;
    if (originalBearer === undefined) delete process.env.ENOVIA_BEARER_TOKEN;
    else process.env.ENOVIA_BEARER_TOKEN = originalBearer;
    if (originalUser === undefined) delete process.env.THREEDX_USERNAME;
    else process.env.THREEDX_USERNAME = originalUser;
    if (originalPass === undefined) delete process.env.THREEDX_PASSWORD;
    else process.env.THREEDX_PASSWORD = originalPass;
    if (originalMode === undefined) delete process.env.THREEDX_AUTH_MODE;
    else process.env.THREEDX_AUTH_MODE = originalMode;
    if (originalSpace === undefined) delete process.env.THREEDX_SPACE_URL;
    else process.env.THREEDX_SPACE_URL = originalSpace;
    if (originalCtx === undefined) delete process.env.THREEDX_SECURITY_CONTEXT;
    else process.env.THREEDX_SECURITY_CONTEXT = originalCtx;
  }
});
