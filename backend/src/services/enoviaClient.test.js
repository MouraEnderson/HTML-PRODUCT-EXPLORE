import test from 'node:test';
import assert from 'node:assert/strict';
import { EnoviaClient, summarizeBody } from './enoviaClient.js';

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

test('upstream body summaries omit sensitive fields', () => {
  const summary = summarizeBody({
    error: 'Bad Request',
    message: 'Invalid search',
    cookie: 'JSESSIONID=secret',
    authorization: 'Bearer secret',
    nested: {
      csrf: 'secret-token',
      detail: 'safe detail'
    }
  });

  assert.match(summary, /Bad Request/);
  assert.match(summary, /safe detail/);
  assert.doesNotMatch(summary, /JSESSIONID/);
  assert.doesNotMatch(summary, /Bearer/);
  assert.doesNotMatch(summary, /secret-token/);
});

test('GET errors include sanitized upstream body summary', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () =>
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid search',
        token: 'do-not-return'
      })
  });

  try {
    const client = new EnoviaClient({
      spaceUrl: 'https://example.com/enovia',
      securityContext: 'ctx::Role.Org.Project',
      cookie: 'JSESSIONID=test-cookie'
    });

    await assert.rejects(
      () => client.get('/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=name%3Aprd&$top=20'),
      (error) => {
        assert.equal(error.status, 400);
        assert.match(error.bodySummary, /Invalid search/);
        assert.doesNotMatch(error.bodySummary, /do-not-return/);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});
