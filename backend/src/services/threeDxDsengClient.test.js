import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreeDxDsengClient } from './threeDxDsengClient.js';

test('dseng read methods do not request CSRF before GET calls', async () => {
  const originalFetch = global.fetch;
  const originalAutoCsrf = process.env.AUTO_CSRF;
  const calls = [];

  process.env.AUTO_CSRF = 'true';
  global.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ member: [] })
    };
  };

  try {
    const client = new ThreeDxDsengClient({
      spaceUrl: 'https://example.com/enovia',
      securityContext: 'ctx::Role.Org.Project',
      authMode: 'cookie',
      cookie: 'JSESSIONID=test-cookie',
      csrfToken: '',
      bearerToken: '',
      username: '',
      password: ''
    });

    await client.searchEngItems('name:prd-R1132100929518-01103695', 20);

    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/resources\/v1\/modeler\/dseng\/dseng:EngItem\/search/);
    assert.equal(calls.some((url) => url.includes('/resources/v1/application/CSRF')), false);
  } finally {
    global.fetch = originalFetch;
    if (originalAutoCsrf === undefined) delete process.env.AUTO_CSRF;
    else process.env.AUTO_CSRF = originalAutoCsrf;
  }
});
