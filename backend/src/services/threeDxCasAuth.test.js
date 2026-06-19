import test from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePassportCandidates,
  sanitizeSpaceUrl,
  casLogin,
  invalidateCasSession,
  probeCasAuth
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
  assert.equal(candidates[0], 'https://r1132100929518-eu1.iam.3dexperience.3ds.com');
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
      assert.match(String(options.body || ''), /rememberMe=no/);
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

test('casLogin extracts lt from HTML login form', async () => {
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
      return new Response('<form><input name="lt" value="LT-html" /></form>', {
        status: 200,
        headers: {
          'content-type': 'text/html;charset=UTF-8',
          'set-cookie': 'JSESSIONID=passport-session; Path=/'
        }
      });
    }
    if (target.includes('/login?service=') && options.method === 'POST') {
      return new Response('', {
        status: 302,
        headers: {
          location: `${config.spaceUrl}/resources/v1/application/CSRF?ticket=ST-html`,
          'set-cookie': 'CASTGC=tgc-html; Path=/'
        }
      });
    }
    if (target.includes('/resources/v1/application/CSRF')) {
      return new Response(JSON.stringify({ csrf: { name: 'ENO_CSRF_TOKEN', value: 'csrf-html' } }), {
        status: 200,
        headers: { 'set-cookie': 'JSESSIONID=space-session; Path=/' }
      });
    }
    throw new Error(`Unexpected fetch URL: ${target}`);
  };

  try {
    const session = await casLogin(config, { forceRefresh: true });
    assert.equal(session.csrfToken, 'csrf-html');
  } finally {
    global.fetch = originalFetch;
    invalidateCasSession(config);
  }
});

test('probeCasAuth reports ticket diagnostics without secrets', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('/login?action=get_auth_params')) {
      return new Response(JSON.stringify({ response: 'login', lt: 'LT-probe' }), {
        status: 200,
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'set-cookie': 'JSESSIONID=probe; Path=/'
        }
      });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const probe = await probeCasAuth({
      spaceUrl: 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia',
      username: 'user',
      password: 'pass'
    });
    assert.equal(probe.ticketOk, true);
    assert.equal(probe.steps[0].hasLt, true);
    assert.equal(probe.steps[0].ticketStatus, 200);
  } finally {
    global.fetch = originalFetch;
  }
});
