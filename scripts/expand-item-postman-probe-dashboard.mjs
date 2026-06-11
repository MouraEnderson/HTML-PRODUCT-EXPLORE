/**
 * DEC-015 — Probe Postman-equivalente no 3DDashboard (iframe widget autenticado).
 *
 * Executar no console do iframe do widget BOM (sessão 3DEXPERIENCE logada):
 *
 *   await import('https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/scripts/expand-item-postman-probe-dashboard.mjs')
 *     .then(m => m.runExpandItemPostmanProbe())
 *
 * Ou colar o conteúdo após build local.
 *
 * Não altera normalizador/tabela/widget — só valida CSRF + root + POST expand.
 */
export const PROBE_CONFIG = {
  SPACE_URL: 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia',
  ROOT_ID: '63FC553465A62400699E0792000086AB',
  SECURITY_CONTEXT: 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO',
  EXPAND_DEPTH: 2
};

function getWaf() {
  if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
  if (typeof widget !== 'undefined' && widget?.WAFData?.authenticatedRequest) return widget.WAFData;
  return null;
}

function getSecurityContext(cfg) {
  try {
    const st = typeof PlatformContext !== 'undefined' && PlatformContext.getState?.();
    if (st?.securityContext) return String(st.securityContext).trim();
  } catch (e) {}
  try {
    if (typeof widget !== 'undefined' && widget.wafSecurityContext) return String(widget.wafSecurityContext).trim();
  } catch (e) {}
  return cfg.SECURITY_CONTEXT;
}

function wafRequest(url, opts) {
  const WAF = getWaf();
  if (!WAF) return Promise.reject(new Error('WAFData indisponível — abra no 3DDashboard'));
  return new Promise((resolve, reject) => {
    WAF.authenticatedRequest(url, {
      ...opts,
      timeout: 60000,
      onComplete: (data) => resolve({ ok: true, status: 200, data, url }),
      onFailure: (err) => {
        const msg = err?.message || err?.error || String(err || 'WAF failed');
        const m = msg.match(/ResponseCode[^0-9]*(\d{3})/i);
        resolve({ ok: false, status: Number(m?.[1] || err?.status || 0), error: msg, err, url });
      }
    });
  });
}

function parseCsrf(data) {
  const csrf = data?.csrf || data;
  const name = csrf?.name || 'ENO_CSRF_TOKEN';
  const value = csrf?.value || data?.value || data?.token || '';
  return { name, value, present: !!value };
}

function analyzeExpandPayload(data) {
  const members = Array.isArray(data?.member) ? data.member : [];
  let ref = 0;
  let inst = 0;
  let pathCount = 0;
  let firstPath = '';
  let firstRef = null;
  let firstInst = null;
  members.forEach((m) => {
    if (!m) return;
    if (m.type === 'VPMReference') {
      ref++;
      if (!firstRef) firstRef = m;
    }
    if (m.type === 'VPMInstance') {
      inst++;
      if (!firstInst) firstInst = m;
    }
    if (Array.isArray(m.Path) && m.Path.length) {
      pathCount++;
      if (!firstPath) firstPath = m.Path.join(' -> ');
    }
  });
  return {
    totalItems: data?.totalItems,
    memberCount: members.length,
    referenceCount: ref,
    instanceCount: inst,
    pathCount,
    firstPath,
    firstReference: firstRef,
    firstInstance: firstInst,
    raw: data
  };
}

function classify(status, pathCount, rootStatus) {
  if (rootStatus === 403) return 'B-permissao-root';
  if (rootStatus === 404) return 'C-root-errado';
  if (status === 200 && pathCount > 0) return 'A-api-ok';
  if (status === 403) return 'B-permissao-expand';
  if (status === 404) return 'C-root-errado';
  if (status === 405) return 'D-metodo-url';
  if (status === 400) return 'E-body-schema';
  if (status === 415) return 'E-content-type';
  return 'unknown';
}

export async function runExpandItemPostmanProbe(userConfig = {}) {
  const cfg = { ...PROBE_CONFIG, ...userConfig };
  const sc = getSecurityContext(cfg);
  const report = {
    timestamp: new Date().toISOString(),
    build: typeof window !== 'undefined' ? window.__BOM_BUILD_ID__ || 'n/a' : 'n/a',
    SPACE_URL: cfg.SPACE_URL,
    ROOT_ID: cfg.ROOT_ID,
    SECURITY_CONTEXT: sc,
    EXPAND_DEPTH: cfg.EXPAND_DEPTH,
    csrf: {},
    rootValidation: {},
    expandPost: {},
    conclusion: '',
    decision: ''
  };

  const csrfUrl = `${cfg.SPACE_URL}/resources/v1/application/CSRF`;
  console.log('[PostmanProbe] GET CSRF', csrfUrl);
  const csrfRes = await wafRequest(csrfUrl, {
    method: 'GET',
    type: 'json',
    headers: { Accept: 'application/json' }
  });
  report.csrf.status = csrfRes.status;
  report.csrf.response = csrfRes.ok ? csrfRes.data : csrfRes.error;
  if (csrfRes.ok) {
    const parsed = parseCsrf(csrfRes.data);
    report.csrf.name = parsed.name;
    report.csrf.valuePresent = parsed.present;
    report.csrf.valuePreview = parsed.value ? `${parsed.value.slice(0, 8)}…` : '';
  } else {
    report.conclusion = 'GET CSRF falhou — parar antes do expand';
    report.decision = 'Autenticar sessão / usar Postman com cookie CAS';
    window.__expandItemPostmanReport = report;
    return report;
  }

  const rootUrl = `${cfg.SPACE_URL}/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(cfg.ROOT_ID)}`;
  console.log('[PostmanProbe] GET root', rootUrl);
  const rootRes = await wafRequest(rootUrl, {
    method: 'GET',
    type: 'json',
    headers: { Accept: 'application/json', SecurityContext: sc }
  });
  report.rootValidation.status = rootRes.status;
  report.rootValidation.url = rootUrl;
  const rootMember = rootRes.ok
    ? (Array.isArray(rootRes.data?.member) ? rootRes.data.member[0] : rootRes.data)
    : null;
  report.rootValidation.title = rootMember?.title || rootMember?.name || '';
  report.rootValidation.type = rootMember?.type || '';
  report.rootValidation.state = rootMember?.state || rootMember?.maturity || '';
  report.rootValidation.id = rootMember?.id || '';
  report.rootValidation.error = rootRes.ok ? '' : rootRes.error;

  if (!rootRes.ok) {
    report.conclusion = rootRes.status === 403 ? 'SecurityContext/permissão no root' : `Root validation HTTP ${rootRes.status}`;
    report.decision = rootRes.status === 403 ? 'Resolver SecurityContext/collabspace com admin' : 'Validar ROOT_ID';
    window.__expandItemPostmanReport = report;
    return report;
  }

  const expandUrl = `${cfg.SPACE_URL}/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(cfg.ROOT_ID)}/expand`;
  const body = {
    expandDepth: cfg.EXPAND_DEPTH,
    withPath: true,
    type_filter_bo: ['VPMReference', 'VPMRepReference'],
    type_filter_rel: ['VPMInstance', 'VPMRepInstance']
  };
  const csrfName = report.csrf.name || 'ENO_CSRF_TOKEN';
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    SecurityContext: sc,
    [csrfName]: report.csrf.valuePresent ? (parseCsrf(csrfRes.data).value) : ''
  };
  report.expandPost.url = expandUrl;
  report.expandPost.method = 'POST';
  report.expandPost.headers = Object.keys(headers);
  report.expandPost.body = body;

  console.log('[PostmanProbe] POST expand', expandUrl);
  const expandRes = await wafRequest(expandUrl, {
    method: 'POST',
    type: 'json',
    headers,
    data: JSON.stringify(body)
  });
  report.expandPost.status = expandRes.status;
  report.expandPost.error = expandRes.ok ? '' : expandRes.error;
  if (expandRes.ok) {
    const stats = analyzeExpandPayload(expandRes.data);
    report.expandPost.stats = stats;
    report.expandPost.responseSample = {
      totalItems: stats.totalItems,
      memberCount: stats.memberCount,
      pathCount: stats.pathCount,
      firstPath: stats.firstPath
    };
  } else {
    report.expandPost.responseText = expandRes.error;
  }

  const code = classify(expandRes.status, report.expandPost.stats?.pathCount || 0, rootRes.status);
  const map = {
    'A-api-ok': {
      conclusion: 'API OK — POST expand retorna member + Path no tenant',
      decision: 'Seguir bom20260614f: WAFData authenticatedRequest + GET CSRF + ENO_CSRF_TOKEN + host space-only'
    },
    'B-permissao-expand': {
      conclusion: '403 no expand — CSRF/SecurityContext/permissão/role',
      decision: 'Parar widget — checklist admin (collabspace, role, licença dseng expand)'
    },
    'C-root-errado': {
      conclusion: '404 — rootId ou endpoint incorreto',
      decision: 'Revalidar ROOT_ID (32 hex VPMReference, não prd-R)'
    },
    'D-metodo-url': {
      conclusion: '405 — método ou URL errado (não usar ifwe)',
      decision: 'Confirmar POST em *-space* apenas'
    },
    'E-body-schema': {
      conclusion: '400 — body/schema',
      decision: 'Ajustar body conforme dseng_v1'
    },
    'E-content-type': {
      conclusion: '415 — Content-Type',
      decision: 'application/json raw body'
    }
  };
  Object.assign(report, map[code] || { conclusion: 'Resultado inconclusivo', decision: 'Repetir no Postman com cookie CAS' });

  window.__expandItemPostmanReport = report;
  console.log('[PostmanProbe] REPORT', report);
  return report;
}

if (typeof window !== 'undefined') {
  window.runExpandItemPostmanProbe = runExpandItemPostmanProbe;
}
