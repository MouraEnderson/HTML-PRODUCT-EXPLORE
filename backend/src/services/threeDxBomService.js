import {
  SOURCE,
  CJ_MESA_ROOT_ID,
  buildErrorResponse,
  buildMockRow,
  buildStructureSuccess,
  buildDiagnosticSuccess
} from './threeDxBomNormalizer.js';

export function getSkaHealth() {
  return {
    ok: true,
    service: 'SKA_BOM_SERVICE',
    source: SOURCE,
    version: 'v1',
    mode: 'mock'
  };
}

function normalizeRootId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parseDepth(value) {
  if (value === undefined || value === null) {
    return { ok: true, depth: 2 };
  }
  if (!Number.isInteger(value) || value < 0) {
    return {
      ok: false,
      error: buildErrorResponse(
        'INVALID_DEPTH',
        'depth must be an integer greater than or equal to zero'
      )
    };
  }
  return { ok: true, depth: value };
}

function parseStructureInput(body) {
  body = body || {};
  const rootId = normalizeRootId(body.rootId);
  if (!rootId) {
    return {
      ok: false,
      error: buildErrorResponse('ROOT_ID_REQUIRED', 'rootId is required')
    };
  }

  const depthResult = parseDepth(body.depth);
  if (!depthResult.ok) {
    return depthResult;
  }

  return {
    ok: true,
    rootId,
    depth: depthResult.depth,
    includeRoot: body.includeRoot !== false,
    mode: body.mode || 'dseng-official'
  };
}

function buildRootMeta(rootId) {
  if (rootId === CJ_MESA_ROOT_ID) {
    return {
      id: CJ_MESA_ROOT_ID,
      title: 'CJ MESA 4BCS VP TOP 3DX',
      revision: '1.1',
      state: 'IN_WORK',
      owner: 'rafael.ruiz'
    };
  }
  return {
    id: rootId,
    title: 'Mock EngItem',
    revision: 'A',
    state: 'IN_WORK',
    owner: 'mock.owner'
  };
}

function buildMockRows(rootId, includeRoot) {
  const root = buildRootMeta(rootId);
  if (!includeRoot) {
    return [];
  }
  if (rootId === CJ_MESA_ROOT_ID) {
    return [
      buildMockRow({
        physicalId: CJ_MESA_ROOT_ID,
        title: 'CJ MESA 4BCS VP TOP 3DX',
        revision: '1.1',
        owner: 'rafael.ruiz',
        maturity: 'IN_WORK',
        description: ''
      })
    ];
  }
  return [
    buildMockRow({
      physicalId: rootId,
      title: 'Mock EngItem',
      revision: 'A',
      owner: 'mock.owner',
      maturity: 'IN_WORK',
      description: ''
    })
  ];
}

export function resolveMockStructure(body) {
  const parsed = parseStructureInput(body);
  if (!parsed.ok) {
    return parsed;
  }

  const rootMeta = buildRootMeta(parsed.rootId);
  const rows = buildMockRows(parsed.rootId, parsed.includeRoot);

  return {
    ok: true,
    data: buildStructureSuccess({
      mode: parsed.mode,
      root: rootMeta,
      rows,
      depth: parsed.depth,
      includeRoot: parsed.includeRoot
    })
  };
}

export function resolveMockDiagnostic(body) {
  body = body || {};
  const rootId = normalizeRootId(body.rootId);
  const depthResult = parseDepth(body.depth);
  const depth = depthResult.ok ? depthResult.depth : 2;

  return buildDiagnosticSuccess({
    parameters: {
      rootId: rootId || null,
      depth
    },
    environment: {
      spaceUrlConfigured: Boolean(process.env.SPACE_URL),
      securityContextConfigured: Boolean(process.env.SECURITY_CONTEXT),
      credentialsMode: 'mock'
    },
    durationMs: 0
  });
}
