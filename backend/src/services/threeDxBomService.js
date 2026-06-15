import { getThreeDxConfig, getPublicEnvironmentFlags } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import { resolveSelectionToEngItem } from './selectionResolver.js';
import {
  SOURCE,
  CJ_MESA_ROOT_ID,
  DSENG_MAX_DEPTH,
  buildErrorResponse,
  buildMockRow,
  buildStructureSuccess,
  buildDiagnosticSuccess,
  buildBomRow,
  buildDiagnostics,
  normalizeEngItem,
  normalizeEngInstance,
  unwrapEngItemPayload,
  getMissingChildReferenceSampleKeys
} from './threeDxBomNormalizer.js';

const ERROR_STATUS = {
  ROOT_ID_REQUIRED: 422,
  INVALID_DEPTH: 422,
  DEPTH_LIMIT_EXCEEDED: 422,
  UPSTREAM_NOT_CONFIGURED: 503,
  ROOT_NOT_FOUND: 404,
  SELECTION_NOT_RESOLVED: 422,
  UPSTREAM_AUTH_FAILED: 502,
  UPSTREAM_AUTH_NOT_IMPLEMENTED: 502,
  UPSTREAM_DSENG_ERROR: 502,
  INTERNAL_ERROR: 500
};

export function getErrorStatus(code) {
  return ERROR_STATUS[code] || 500;
}

export function getSkaHealth() {
  const config = getThreeDxConfig();
  let mode = config.mode;
  if (mode === 'dseng-official') mode = 'dseng-official';
  else if (mode === 'mock') mode = 'mock';
  else mode = 'not-configured';

  return {
    ok: true,
    service: 'SKA_BOM_SERVICE',
    source: SOURCE,
    version: 'v1',
    mode,
    upstream: config.upstream
  };
}

function normalizeRootId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parseDepth(value, defaultDepth, mode = 'dseng-official') {
  if (value === undefined || value === null) {
    return { ok: true, depth: defaultDepth };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return {
      ok: false,
      error: buildErrorResponse(
        'INVALID_DEPTH',
        'depth must be an integer greater than or equal to zero',
        mode
      )
    };
  }
  return { ok: true, depth: num };
}

function parseStructureInput(body, defaultDepth = 1, mode = 'dseng-official') {
  body = body || {};
  const rootId = normalizeRootId(body.rootId);
  if (!rootId) {
    return {
      ok: false,
      error: buildErrorResponse('ROOT_ID_REQUIRED', 'rootId is required', mode)
    };
  }

  const depthResult = parseDepth(body.depth, defaultDepth, mode);
  if (!depthResult.ok) {
    return depthResult;
  }

  return {
    ok: true,
    rootId,
    depth: depthResult.depth,
    includeRoot: body.includeRoot !== false,
    mode: body.mode || mode
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
  if (!includeRoot) return [];
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
  const parsed = parseStructureInput(body, 2, 'mock');
  if (!parsed.ok) {
    return parsed;
  }

  const rootMeta = buildRootMeta(parsed.rootId);
  const rows = buildMockRows(parsed.rootId, parsed.includeRoot);
  const counts = {
    totalRows: rows.length,
    rootIncluded: parsed.includeRoot,
    depth: parsed.depth,
    levelCounts: rows.reduce((acc, row) => {
      acc[row.level] = (acc[row.level] || 0) + 1;
      return acc;
    }, {})
  };

  return {
    ok: true,
    data: buildStructureSuccess({
      mode: 'mock',
      root: rootMeta,
      rows,
      depth: parsed.depth,
      includeRoot: parsed.includeRoot,
      diagnostics: buildDiagnostics({
        mode: 'mock',
        endpointsUsed: [],
        durationMs: 0,
        warnings: ['Mock response only. No 3DEXPERIENCE call was executed in PR 2.'],
        errors: [],
        levelCounts: counts.levelCounts
      })
    })
  };
}

function failureFromUpstream(error, client, mode = 'dseng-official') {
  const mapped = client.mapUpstreamError(error);
  return {
    ok: false,
    status: getErrorStatus(mapped.code),
    error: buildErrorResponse(mapped.code, mapped.message, mode)
  };
}

async function resolveDsengStructure(parsed, config) {
  const started = Date.now();
  const client = new ThreeDxDsengClient(config);
  const warnings = [];
  const errors = [];
  let missingChildReferenceIdsCount = 0;
  let skippedInstancesCount = 0;
  let missingChildReferenceSampleKeys = null;
  let truncatedInstancesCount = 0;
  const visitedPaths = new Set();

  let rootPayload;
  try {
    const result = await client.getEngItem(parsed.rootId);
    rootPayload = unwrapEngItemPayload(result.data);
  } catch (error) {
    return failureFromUpstream(error, client);
  }

  const root = normalizeEngItem(rootPayload);
  if (!root.id) {
    return {
      ok: false,
      status: 404,
      error: buildErrorResponse('ROOT_NOT_FOUND', 'EngItem not found')
    };
  }

  const rows = [];
  if (parsed.includeRoot) {
    rows.push(buildBomRow({ level: 0, parentId: null, instance: null, item: root }));
  }

  if (parsed.depth > 0) {
    const queue = [{ parentId: root.id, level: 0 }];

    while (queue.length) {
      const current = queue.shift();
      if (current.level >= parsed.depth) continue;

      let members = [];
      try {
        const instancesResult = await client.getEngInstances(current.parentId);
        members = instancesResult.members;
        if (instancesResult.truncatedInstancesCount > 0) {
          truncatedInstancesCount += instancesResult.truncatedInstancesCount;
          warnings.push(
            `EngInstances truncated for parent ${current.parentId}: ${instancesResult.truncatedInstancesCount} not fetched (page limit)`
          );
        }
      } catch (error) {
        if (current.level === 0) {
          return failureFromUpstream(error, client);
        }
        warnings.push(`Failed to fetch EngInstances for parent ${current.parentId}`);
        continue;
      }

      for (const inst of members) {
        const normalizedInst = normalizeEngInstance(inst);
        const childId = normalizedInst.childId;
        if (!childId) {
          missingChildReferenceIdsCount += 1;
          skippedInstancesCount += 1;
          if (!missingChildReferenceSampleKeys) {
            missingChildReferenceSampleKeys = getMissingChildReferenceSampleKeys(inst);
          }
          warnings.push('EngInstance missing child reference id');
          continue;
        }

        const nextLevel = current.level + 1;
        const pathKey = `${current.parentId}:${normalizedInst.instanceId}:${childId}:${nextLevel}`;
        if (visitedPaths.has(pathKey)) {
          skippedInstancesCount += 1;
          continue;
        }
        visitedPaths.add(pathKey);

        let childItem;
        try {
          const childResult = await client.getEngItem(childId);
          childItem = normalizeEngItem(unwrapEngItemPayload(childResult.data));
        } catch (_error) {
          skippedInstancesCount += 1;
          warnings.push(`Failed to fetch EngItem ${childId}`);
          continue;
        }

        rows.push(
          buildBomRow({
            level: nextLevel,
            parentId: current.parentId,
            instance: normalizedInst,
            item: childItem
          })
        );

        if (nextLevel < parsed.depth) {
          queue.push({ parentId: childId, level: nextLevel });
        }
      }
    }
  }

  const counts = rows.length
    ? buildStructureSuccess({
        mode: 'dseng-official',
        root,
        rows,
        depth: parsed.depth,
        includeRoot: parsed.includeRoot
      }).counts
    : { totalRows: 0, rootIncluded: parsed.includeRoot, depth: parsed.depth, levelCounts: {} };

  return {
    ok: true,
    data: buildStructureSuccess({
      mode: 'dseng-official',
      root,
      rows,
      depth: parsed.depth,
      includeRoot: parsed.includeRoot,
      diagnostics: buildDiagnostics({
        mode: 'dseng-official',
        endpointsUsed: client.getEndpointsUsed(),
        durationMs: Date.now() - started,
        warnings,
        errors,
        levelCounts: counts.levelCounts,
        missingChildReferenceIdsCount,
        skippedInstancesCount,
        missingChildReferenceSampleKeys,
        truncatedInstancesCount
      })
    })
  };
}

export async function buildStructureFromRoot({ rootId, depth, includeRoot, mode = 'dseng-official' }, config) {
  const parsed = {
    rootId: normalizeRootId(rootId),
    depth,
    includeRoot: includeRoot !== false,
    mode
  };
  return resolveDsengStructure(parsed, config);
}

function buildResolveSelectionFailure(resolution, mode = 'dseng-official', diagnosticsExtra = {}) {
  return {
    ok: false,
    source: SOURCE,
    mode,
    error: {
      code: 'SELECTION_NOT_RESOLVED',
      message: 'Não foi possível resolver a seleção do Product Explorer para um EngItem dseng válido.'
    },
    resolution: {
      status: 'NOT_RESOLVED',
      attempts: resolution.attempts || [],
      inputSummary: resolution.inputSummary || {}
    },
    diagnostics: buildDiagnostics({
      mode,
      endpointsUsed: diagnosticsExtra.endpointsUsed || [],
      durationMs: diagnosticsExtra.durationMs || 0,
      warnings: diagnosticsExtra.warnings || [],
      errors: ['SELECTION_NOT_RESOLVED']
    })
  };
}

function buildResolveSelectionSuccess(structureData, resolution, mode = 'dseng-official') {
  return {
    ...structureData,
    ok: true,
    mode,
    resolution: {
      status: 'RESOLVED',
      strategy: resolution.strategy,
      rootId: resolution.rootId,
      rootTitle: resolution.rootTitle,
      inputSummary: resolution.inputSummary || {},
      attempts: resolution.attempts || []
    }
  };
}

function parseResolveSelectionInput(body, defaultDepth = 1, mode = 'dseng-official') {
  body = body || {};
  const depthResult = parseDepth(body.depth, defaultDepth, mode);
  if (!depthResult.ok) {
    return depthResult;
  }
  const selection = body.selection || {};
  return {
    ok: true,
    selection,
    depth: depthResult.depth,
    includeRoot: body.includeRoot !== false,
    mode: body.mode || mode,
    manualRootId: normalizeRootId(body.manualRootId || selection.manualRootId || selection.normalized?.manualRootId)
  };
}

export async function resolveSelection(body) {
  const config = getThreeDxConfig();
  const started = Date.now();

  if (config.mode === 'mock') {
    const parsed = parseResolveSelectionInput(body, 1, 'mock');
    if (!parsed.ok) {
      return { ok: false, status: getErrorStatus(parsed.error.error.code), error: parsed.error };
    }
    const resolution = await resolveSelectionToEngItem(parsed.selection, {
      manualRootId: parsed.manualRootId
    });
    if (!resolution.ok) {
      return {
        ok: false,
        status: 422,
        error: buildResolveSelectionFailure(resolution, 'mock', { durationMs: Date.now() - started })
      };
    }
    const structure = resolveMockStructure({
      rootId: resolution.rootId,
      depth: parsed.depth,
      includeRoot: parsed.includeRoot,
      mode: 'mock'
    });
    if (!structure.ok) {
      return { ok: false, status: getErrorStatus(structure.error.error.code), error: structure.error };
    }
    return {
      ok: true,
      status: 200,
      data: buildResolveSelectionSuccess(structure.data, resolution, 'mock')
    };
  }

  const parsed = parseResolveSelectionInput(body, 1);
  if (!parsed.ok) {
    return { ok: false, status: getErrorStatus(parsed.error.error.code), error: parsed.error };
  }

  if (parsed.depth > DSENG_MAX_DEPTH) {
    return {
      ok: false,
      status: 422,
      error: buildErrorResponse(
        'DEPTH_LIMIT_EXCEEDED',
        'depth greater than 3 is not allowed in dseng v1'
      )
    };
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: getErrorStatus(configured.code),
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const client = new ThreeDxDsengClient(config);
  const resolution = await resolveSelectionToEngItem(parsed.selection, {
    client,
    manualRootId: parsed.manualRootId
  });

  if (!resolution.ok) {
    return {
      ok: false,
      status: 422,
      error: buildResolveSelectionFailure(resolution, parsed.mode, {
        endpointsUsed: client.getEndpointsUsed(),
        durationMs: Date.now() - started
      })
    };
  }

  const structureResult = await buildStructureFromRoot(
    {
      rootId: resolution.rootId,
      depth: parsed.depth,
      includeRoot: parsed.includeRoot,
      mode: parsed.mode
    },
    config
  );

  if (!structureResult.ok) {
    return structureResult;
  }

  return {
    ok: true,
    status: 200,
    data: buildResolveSelectionSuccess(structureResult.data, resolution, parsed.mode)
  };
}

export async function resolveStructure(body) {
  const config = getThreeDxConfig();

  if (config.mode === 'mock') {
    const mock = resolveMockStructure(body);
    if (!mock.ok) {
      return { ok: false, status: getErrorStatus(mock.error.error.code), error: mock.error };
    }
    return { ok: true, status: 200, data: mock.data };
  }

  const parsed = parseStructureInput(body, 1);
  if (!parsed.ok) {
    return { ok: false, status: getErrorStatus(parsed.error.error.code), error: parsed.error };
  }

  if (parsed.depth > DSENG_MAX_DEPTH) {
    return {
      ok: false,
      status: 422,
      error: buildErrorResponse(
        'DEPTH_LIMIT_EXCEEDED',
        'depth greater than 3 is not allowed in dseng v1'
      )
    };
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: getErrorStatus(configured.code),
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const result = await resolveDsengStructure(parsed, config);
  if (!result.ok) {
    return result;
  }
  return { ok: true, status: 200, data: result.data };
}

export function resolveMockDiagnostic(body) {
  body = body || {};
  const rootId = normalizeRootId(body.rootId);
  const depthResult = parseDepth(body.depth, 2);
  const depth = depthResult.ok ? depthResult.depth : 2;

  return buildDiagnosticSuccess({
    mode: 'mock',
    parameters: {
      rootId: rootId || null,
      depth
    },
    environment: {
      ...getPublicEnvironmentFlags(getThreeDxConfig()),
      credentialsMode: 'mock'
    },
    durationMs: 0,
    warnings: ['Diagnostic mock only. No upstream call executed.'],
    errors: []
  });
}

async function resolveDsengDiagnostic(body, config) {
  const started = Date.now();
  const client = new ThreeDxDsengClient(config);
  const rootId = normalizeRootId(body?.rootId);
  const depthResult = parseDepth(body?.depth, 1);
  const depth = depthResult.ok ? depthResult.depth : 1;
  const warnings = [];
  const checks = {};

  if (rootId) {
    let root;
    try {
      const rootResult = await client.getEngItem(rootId);
      root = normalizeEngItem(unwrapEngItemPayload(rootResult.data));
      checks.root = {
        ok: true,
        status: 200,
        title: root.title
      };
    } catch (error) {
      return failureFromUpstream(error, client);
    }

    try {
      const instancesResult = await client.getEngInstances(rootId);
      checks.level1Instances = {
        ok: true,
        status: 200,
        count: instancesResult.members.length
      };
    } catch (error) {
      const mapped = client.mapUpstreamError(error);
      return {
        ok: false,
        status: getErrorStatus(mapped.code),
        error: buildErrorResponse(mapped.code, mapped.message)
      };
    }
  }

  return {
    ok: true,
    status: 200,
    data: buildDiagnosticSuccess({
      mode: 'dseng-official',
      parameters: { rootId: rootId || null, depth },
      environment: getPublicEnvironmentFlags(config),
      checks: Object.keys(checks).length ? checks : undefined,
      endpointsUsed: client.getEndpointsUsed(),
      durationMs: Date.now() - started,
      warnings,
      errors: []
    })
  };
}

export async function resolveDiagnostic(body) {
  const config = getThreeDxConfig();

  if (config.mode === 'mock') {
    return { ok: true, status: 200, data: resolveMockDiagnostic(body) };
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: getErrorStatus(configured.code),
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const result = await resolveDsengDiagnostic(body, config);
  if (!result.ok) {
    return {
      ok: false,
      status: result.status || 502,
      error: result.error
    };
  }
  return { ok: true, status: 200, data: result.data };
}