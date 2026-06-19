import test from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePassportCandidates,
  sanitizeSpaceUrl,
  casLogin,
  invalidateCasSession
} from './threeDxCasAuth.js';

test('sanitizeSpaceUrl extracts embedded enovia URL', () => {
  const value = 'THREEDX_SPACE_URL=https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  assert.equal(
    sanitizeSpaceUrl(value),
    'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia'
  );
});

test('derivePassportCandidates builds tenant iam hosts', () => {
  const candidates = derivePassportCandidates(
    'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia'
  );
  assert.ok(candidates.includes('https://r1132100929518-us1.iam.3dexperience.3ds.com'));
  assert.ok(candidates.includes('https://r1132100929518-eu1.iam.3dexperience.3ds.com'));
});

test('casLogin stores session cookies and csrf token', async () => {
  const originalFetch = global.fetch;
  const config = {
    spaceUrl: 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia',
    securityContext: 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO',
    username: 'service-user',
    password: 'service-pass',
    passportUrl: 'https://r1132100929518-eu1.iam.3dexperience.3ds.com'
  };

  invalidateCasSession(config);

  global.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/login?action=get_auth_params')) {
      return new Response(JSON.stringify({ response: 'login', lt: 'LT-test' }), {
        status: 200,
        headers: { 'set-cookie': 'JSESSIONID=passport-session; Path=/' }
      });
    }
    if (target.includes('/login?service=') && options.method === 'POST') {
      return new Response('', {
        status: 302,
        headers: {
          location: `${config.spaceUrl}/resources/v1/application/CSRF?ticket=ST-test`,
          'set-cookie': 'CASTGC=tgc-test; Path=/'
        }
      });
    }
    if (target.includes('/resources/v1/application/CSRF')) {
      return new Response(JSON.stringify({ csrf: { name: 'ENO_CSRF_TOKEN', value: 'csrf-test' } }), {
        status: 200,
        headers: { 'set-cookie': 'JSESSIONID=space-session; Path=/' }
      });
    }
    throw new Error(`Unexpected fetch URL: ${target}`);
  };

  try {
    const session = await casLogin(config, { forceRefresh: true });
    assert.match(session.cookieHeader, /JSESSIONID=space-session/);
    assert.equal(session.csrfToken, 'csrf-test');
    const cached = await casLogin(config);
    assert.equal(cached.cookieHeader, session.cookieHeader);
  } finally {
    global.fetch = originalFetch;
    invalidateCasSession(config);
  }
});
