/**
 * Expand Item browser-auth — retorna tentativas de chamada para o front executar via WAFData limpo.
 * Não mistura Full BOM API; não inventa estrutura.
 */

function cleanBaseUrl(v) {
  return String(v || '').replace(/\/+$/, '');
}

function enc(v) {
  return encodeURIComponent(String(v || ''));
}

function safeId(v) {
  return String(v || '').trim();
}

function expandUrl(base, rootId) {
  return `${base}/resources/v1/modeler/dseng/dseng:EngItem/${enc(rootId)}/expand`;
}

function expandBody(levels) {
  const lv = Number(levels);
  return {
    expandDepth: lv > 0 ? lv : 2,
    withPath: true,
    type_filter_bo: ['VPMReference', 'VPMRepReference'],
    type_filter_rel: ['VPMInstance', 'VPMRepInstance'],
  };
}

function buildAttempts(baseUrl, rootId, levels) {
  const url = expandUrl(baseUrl, rootId);
  const body = expandBody(levels);
  return [
    {
      id: 'expand-get-a',
      method: 'GET',
      url,
      phase: 'expand-get',
      note: 'GET /expand sem body',
    },
    {
      id: 'expand-get-b',
      method: 'GET',
      url: `${url}?$expandDepth=${levels}&withPath=true`,
      phase: 'expand-get-expandDepth',
      note: 'GET /expand?$expandDepth',
    },
    {
      id: 'expand-get-c',
      method: 'GET',
      url: `${url}?$levels=${levels}`,
      phase: 'expand-get-levels',
      note: 'GET /expand?$levels',
    },
    {
      id: 'expand-post-d',
      method: 'POST',
      url,
      body,
      phase: 'expand-post',
      note: 'POST /expand documentado dseng (sem CSRF manual no front)',
    },
  ];
}

export async function startExpandItemJob(req, res) {
  try {
    const body = req.body || {};
    const baseUrl = cleanBaseUrl(body.spaceUrl || body.baseUrl || body.enoviaUrl);
    const rootId = safeId(body.rootId);
    const levels = Number(body.levels) > 0 ? Number(body.levels) : 2;

    if (!baseUrl) {
      return res.status(400).json({ ok: false, error: 'missing-space-url' });
    }
    if (!rootId) {
      return res.status(400).json({ ok: false, error: 'missing-root-id' });
    }

    const attempts = buildAttempts(baseUrl, rootId, levels);

    return res.json({
      ok: true,
      build: 'expand-item-browser-auth-20260614b',
      transport: 'backend-browser-auth',
      rootId,
      levels,
      securityContext: safeId(body.securityContext) || null,
      attempts,
      message: 'Execute attempts via WAFData (headers mínimos, sem x-csrf-token)',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

export { buildAttempts, expandUrl, expandBody };
