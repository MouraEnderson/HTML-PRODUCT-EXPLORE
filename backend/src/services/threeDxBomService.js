import { getThreeDxConfig, getPublicEnvironmentFlags } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import { getCasCredentials, probeCasAuth } from './threeDxCasAuth.js';
import { resolveSelectionToEngItem } from './selectionResolver.js';
import { normalizeExpandItemPayload } from './threeDxExpandItemNormalizer.js';
import { attachScopeToPayload } from './scopeContract.js';
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
    upstream: config.upstream,
    auth: {
      configured: config.authConfigured,
      mode: config.authMode,
      casFallback: Boolean(config.casFallback),
      cookieConfigured: Boolean(config.cookie),
      usernameConfigured: Boolean(config.usernameConfigured),
      passwordConfigured: Boolean(config.passwordConfigured),
      passportUrlConfigured: Boolean(config.passportUrl),
      passportUrlIgnored: Boolean(config.passportUrlIgnored),
      securityContextValid: Boolean(config.securityContextValid)
    },
    deploy: {
      commit: String(process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || '').slice(0, 12),
      service: String(process.env.RENDER_SERVICE_NAME || '')
    }
  };
}

export async function getSkaAuthHealth() {
  const base = getSkaHealth();
  const config = getThreeDxConfig();
  const auth = {
    configured: config.authConfigured,
    mode: config.authMode,
    casFallback: Boolean(config.casFallback),
    usernameConfigured: Boolean(config.usernameConfigured),
    passwordConfigured: Boolean(config.passwordConfigured),
    dsengReachable: false,
    canReadKnownRoot: false,
    knownRootId: CJ_MESA_ROOT_ID,
    sessionExpired: false,
    error: null
  };

  const configuredCheck = assertDsengConfigured(config);
  if (!configuredCheck.ok) {
    auth.error = configuredCheck.message;
    return { ...base, ok: false, auth };
  }

  if (config.authMode === 'cas') {
    auth.casProbe = await probeCasAuth(config);
    if (config.passportUrlIgnored) {
      auth.passportUrlIgnored = true;
      auth.hint =
        'THREEDX_PASSPORT_URL on Render is invalid (dashboard/ifwe URL). Remove it or set https://r<TENANT>-eu1.iam.3dexperience.3ds.com';
    }
    try {
      const creds = await getCasCredentials(config, { forceRefresh: true });
      auth.casLoginOk = true;
      auth.casHasCsrf = Boolean(creds.csrfToken);
      auth.casHasCookie = Boolean(creds.cookie);
    } catch (error) {
      auth.casLoginOk = false;
      auth.casLoginError = String(error?.message || error).slice(0, 300);
      auth.error = auth.casLoginError;
      auth.sessionExpired = /CAS login rejected|CAS service authentication failed|invalid_grant|authenticated session/i.test(
        auth.casLoginError
      );
      if (auth.sessionExpired) {
        auth.hint =
          'CAS rejected THREEDX_USERNAME/THREEDX_PASSWORD on Render. Update credentials (no dashboard URLs, no quotes).';
      } else if (/CAS service authentication failed \(401\)/i.test(auth.casLoginError || '')) {
        auth.hint =
          '3DPassport login succeeded but 3DSpace returned 401. Verify THREEDX_SECURITY_CONTEXT and user access to that collab space.';
      }
      if (!config.securityContextValid) {
        auth.securityContextInvalid = true;
        auth.hint =
          'THREEDX_SECURITY_CONTEXT must start with ctx:: (example: ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO).';
      }
      return { ...base, ok: false, auth };
    }
  }

  const client = new ThreeDxDsengClient(config);
  try {
    const result = await client.getEngItem(CJ_MESA_ROOT_ID);
    auth.dsengReachable = true;
    auth.canReadKnownRoot = Boolean(result?.ok);
    if (!auth.canReadKnownRoot) {
      auth.error = 'Known root EngItem was not readable';
    }
  } catch (error) {
    const mapped = client.mapUpstreamError(error);
    auth.error = mapped.message;
    auth.sessionExpired = mapped.code === 'UPSTREAM_AUTH_FAILED';
    auth.upstreamDetail = String(error?.message || '').slice(0, 240);
    if (auth.sessionExpired && config.authMode === 'cas') {
      auth.hint =
        'Verify THREEDX_USERNAME/THREEDX_PASSWORD on Render and ensure 3DPassport allows server-side CAS login.';
    }
  }

  return {
    ...base,
    ok: auth.canReadKnownRoot,
    auth
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
    expandDepth: Number(body.expandDepth ?? depthResult.depth),
    includeRoot: body.includeRoot !== false,
    mode: body.mode || mode,
    expandStrategy: body.expandStrategy || '',
    scopeMode: body.scopeMode || body.payloadMode || '',
    selectionSource: body.selectionSource || ''
  };
}

function scopeOptionsFromParsed(parsed, data, overrides = {}) {
  const root = data?.root || {};
  return {
    mode: overrides.mode || parsed.scopeMode || 'root',
    source: overrides.source || 'dseng',
    item: overrides.item || root.title || root.id || parsed.rootId || '',
    rootId: overrides.rootId || parsed.rootId || root.id || '',
    expandStrategy: parsed.expandStrategy === 'expand-item' ? 'expand-item' : 'eng-instances',
    expandDepth: parsed.expandDepth || parsed.depth || 1,
    isPartial: overrides.isPartial !== false,
    selectionSource: parsed.selectionSource || overrides.selectionSource || ''
  };
}

function withStructureScope(data, parsed, overrides = {}) {
  return attachScopeToPayload(data, scopeOptionsFromParsed(parsed, data, overrides));
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
    data: withStructureScope(
      buildStructureSuccess({
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
      }),
      parsed,
      { mode: parsed.scopeMode || 'root', isPartial: parsed.depth > 0 }
    )
  };
}

function failureFromUpstream(error, client, mode = 'dseng-official') {
  const mapped = client.mapUpstreamError(error);
  const response = buildErrorResponse(mapped.code, mapped.message, mode);
  const upstreamDetail = error?.bodySummary || error?.message || '';
  if (upstreamDetail) {
    response.diagnostics.errors.push(`upstream: ${upstreamDetail}`);
  }
  response.diagnostics.endpointsUsed = client.getEndpointsUsed();
  return {
    ok: false,
    status: getErrorStatus(mapped.code),
    error: response
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
    data: withStructureScope(
      buildStructureSuccess({
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
      }),
      parsed
    )
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

function parseExpandDepth(value, defaultDepth = 1, mode = 'dseng-official') {
  const depthResult = parseDepth(value, defaultDepth, mode);
  if (!depthResult.ok) return depthResult;
  if (depthResult.depth < 1) {
    return {
      ok: false,
      error: buildErrorResponse(
        'INVALID_DEPTH',
        'expandDepth must be an integer greater than or equal to one',
        mode
      )
    };
  }
  if (depthResult.depth > DSENG_MAX_DEPTH) {
    return {
      ok: false,
      error: buildErrorResponse(
        'DEPTH_LIMIT_EXCEEDED',
        'expandDepth greater than 3 is not allowed in dseng v1',
        mode
      )
    };
  }
  return { ok: true, depth: depthResult.depth };
}

async function resolveDsengExpandItem(parsed, config) {
  const started = Date.now();
  const client = new ThreeDxDsengClient(config);
  try {
    const result = await client.expandEngItem(parsed.rootId, { expandDepth: parsed.expandDepth || parsed.depth || 1 });
    const data = normalizeExpandItemPayload(result.data, {
      rootId: parsed.rootId,
      includeRoot: parsed.includeRoot,
      expandDepth: parsed.expandDepth || parsed.depth || 1,
      mode: parsed.mode || 'dseng-official',
      endpointsUsed: client.getEndpointsUsed(),
      durationMs: Date.now() - started
    });
    return { ok: true, data: withStructureScope(data, parsed) };
  } catch (error) {
    return failureFromUpstream(error, client, parsed.mode || 'dseng-official');
  }
}

export async function buildExpandItemFromRoot(
  { rootId, expandDepth = 1, includeRoot, mode = 'dseng-official', scopeMode = '', selectionSource = '' },
  config
) {
  const parsed = {
    rootId: normalizeRootId(rootId),
    expandDepth,
    depth: expandDepth,
    includeRoot: includeRoot !== false,
    mode,
    expandStrategy: 'expand-item',
    scopeMode,
    selectionSource
  };
  if (!parsed.rootId) {
    return {
      ok: false,
      status: 422,
      error: buildErrorResponse('ROOT_ID_REQUIRED', 'rootId is required', mode)
    };
  }
  const depthResult = parseExpandDepth(parsed.expandDepth, 1, mode);
  if (!depthResult.ok) {
    return { ok: false, status: getErrorStatus(depthResult.error.error.code), error: depthResult.error };
  }
  parsed.expandDepth = depthResult.depth;
  parsed.depth = depthResult.depth;
  return resolveDsengExpandItem(parsed, config);
}

function resolutionHasAuthFailure(resolution = {}) {
  return (resolution.attempts || []).some((attempt) =>
    /invalid_grant|authenticated session|service ticket/i.test(String(attempt?.message || ''))
  );
}

function buildResolveSelectionFailure(resolution, mode = 'dseng-official', diagnosticsExtra = {}) {
  const authFailure = resolutionHasAuthFailure(resolution);
  const code = authFailure ? 'UPSTREAM_AUTH_FAILED' : 'SELECTION_NOT_RESOLVED';
  const message = authFailure
    ? 'Failed to authenticate with 3DEXPERIENCE'
    : 'Não foi possível resolver a seleção do Product Explorer para um EngItem dseng válido.';
  return {
    ok: false,
    source: SOURCE,
    mode,
    error: {
      code,
      message
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
      errors: [code]
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
  let selection = body.selection || {};
  if ((!selection.normalized && !selection.raw) && (body.title || body.name)) {
    selection = {
      normalized: {
        title: String(body.title || '').trim(),
        name: String(body.name || '').trim(),
        source: body.selectionSource || 'API_FLAT'
      },
      source: body.selectionSource || 'API_FLAT'
    };
  }
  return {
    ok: true,
    selection,
    depth: depthResult.depth,
    expandDepth: Number(body.expandDepth ?? depthResult.depth),
    includeRoot: body.includeRoot !== false,
    mode: body.mode || mode,
    expandStrategy: body.expandStrategy || '',
    manualRootId: normalizeRootId(body.manualRootId || selection.manualRootId || selection.normalized?.manualRootId),
    scopeMode: body.scopeMode || body.payloadMode || 'selected-branch',
    selectionSource: body.selectionSource || selection.source || ''
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
      const error = buildResolveSelectionFailure(resolution, 'mock', { durationMs: Date.now() - started });
      return {
        ok: false,
        status: getErrorStatus(error.error.code),
        error
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

  if (parsed.expandStrategy === 'expand-item') {
    const expandDepth = parseExpandDepth(parsed.expandDepth, parsed.depth || 1, parsed.mode);
    if (!expandDepth.ok) {
      return { ok: false, status: getErrorStatus(expandDepth.error.error.code), error: expandDepth.error };
    }
    parsed.expandDepth = expandDepth.depth;
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
    const error = buildResolveSelectionFailure(resolution, parsed.mode, {
      endpointsUsed: client.getEndpointsUsed(),
      durationMs: Date.now() - started
    });
    return {
      ok: false,
      status: getErrorStatus(error.error.code),
      error
    };
  }

  const structureResult = parsed.expandStrategy === 'expand-item'
    ? await buildExpandItemFromRoot(
        {
          rootId: resolution.rootId,
          expandDepth: parsed.expandDepth || parsed.depth || 1,
          includeRoot: parsed.includeRoot,
          mode: parsed.mode,
          scopeMode: parsed.scopeMode || 'selected-branch',
          selectionSource: parsed.selectionSource
        },
        config
      )
    : await buildStructureFromRoot(
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

  if (parsed.expandStrategy === 'expand-item') {
    const expandDepth = parseExpandDepth(parsed.expandDepth, parsed.depth || 1, parsed.mode);
    if (!expandDepth.ok) {
      return { ok: false, status: getErrorStatus(expandDepth.error.error.code), error: expandDepth.error };
    }
    parsed.expandDepth = expandDepth.depth;
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: getErrorStatus(configured.code),
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const result = parsed.expandStrategy === 'expand-item'
    ? await resolveDsengExpandItem(parsed, config)
    : await resolveDsengStructure(parsed, config);
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
