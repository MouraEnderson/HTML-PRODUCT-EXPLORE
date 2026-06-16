import test from 'node:test';
import assert from 'node:assert/strict';
import { EnoviaClient } from './enoviaClient.js';

test('GET requests omit Content-Type header', async () => {
  const originalFetch = global.fetch;
  let capturedHeaders = null;

  global.fetch = async (_url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true })
    };
  };

  try {
    const client = new EnoviaClient({
      spaceUrl: 'https://example.com/enovia',
      securityContext: 'ctx::Role.Org.Project',
      cookie: 'JSESSIONID=test-cookie'
    });

    await client.get('/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=name%3Aprd&$top=20');

    assert.equal(capturedHeaders.Accept, 'application/json');
    assert.equal(capturedHeaders.SecurityContext, 'ctx::Role.Org.Project');
    assert.equal(capturedHeaders.Cookie, 'JSESSIONID=test-cookie');
    assert.equal(Object.hasOwn(capturedHeaders, 'Content-Type'), false);
  } finally {
    global.fetch = originalFetch;
  }
});
