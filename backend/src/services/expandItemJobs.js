/**
 * Expand Item — contrato dseng_v1 (POST oficial).
 * Retorna uma única tentativa POST para execução via WAFData no widget.
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

/** Body oficial IExpand (dseng_v1 / ws3dx.dseng) */
function expandBody(levels) {
  const lv = Number(levels);
  return {
    expandDepth: lv === 0 ? 1 : lv,
    withPath: true,
    type_filter_bo: ['VPMReference', 'VPMRepReference'],
    type_filter_rel: ['VPMInstance', 'VPMRepInstance'],
  };
}

export async function startExpandItemJob(req, res) {
  try {
    const body = req.body || {};
    const baseUrl = cleanBaseUrl(body.spaceUrl || body.baseUrl || body.enoviaUrl);
    const rootId = safeId(body.rootId);
    const levels = Number(body.levels);
    const expandDepth = levels === 0 ? 1 : levels || 1;

    if (!baseUrl) {
      return res.status(400).json({ ok: false, error: 'missing-space-url' });
    }
    if (!rootId) {
      return res.status(400).json({ ok: false, error: 'missing-root-id' });
    }

    const url = expandUrl(baseUrl, rootId);
    const payload = expandBody(expandDepth);

    return res.json({
      ok: true,
      build: 'expand-item-dseng-v1-post',
      transport: 'direct-wafdata',
      method: 'POST',
      rootId,
      expandDepth,
      url,
      body: payload,
      message: 'Execute POST via WAFData.authenticatedRequest (sem CSRF manual)',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

export { expandUrl, expandBody };
