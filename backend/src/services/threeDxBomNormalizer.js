export const SOURCE = 'RENDER_BOM_SERVICE';

export const CJ_MESA_ROOT_ID = '63FC553465A62400699E0792000086AB';

export function buildErrorResponse(code, message) {
  return {
    ok: false,
    source: SOURCE,
    error: {
      code,
      message
    },
    diagnostics: {
      status: 'ERROR',
      errors: []
    }
  };
}

export function buildInternalErrorResponse() {
  return {
    ok: false,
    source: SOURCE,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected backend error'
    },
    diagnostics: {
      status: 'ERROR',
      mode: 'mock',
      endpointsUsed: [],
      warnings: [],
      errors: ['Unexpected backend error']
    }
  };
}

export function buildMockRow({ physicalId, title, level = 0, owner = '', revision = '', maturity = '', description = '' }) {
  return {
    rowKey: `level${level}:${physicalId}`,
    level,
    parentId: null,
    instanceId: null,
    physicalId,
    title,
    description,
    revision,
    owner,
    maturity,
    format: 'VPMReference',
    type: 'VPMReference'
  };
}

export function buildStructureSuccess({ mode, root, rows, depth, includeRoot }) {
  return {
    ok: true,
    source: SOURCE,
    mode,
    root,
    rows,
    counts: {
      totalRows: rows.length,
      rootIncluded: includeRoot,
      depth
    },
    diagnostics: {
      status: 'OK',
      mode: 'mock',
      endpointsUsed: [],
      durationMs: 0,
      warnings: ['Mock response only. No 3DEXPERIENCE call was executed in PR 2.'],
      errors: []
    }
  };
}

export function buildDiagnosticSuccess({ parameters, environment, durationMs = 0 }) {
  return {
    ok: true,
    source: SOURCE,
    mode: 'mock',
    parameters,
    environment,
    endpointsUsed: [],
    durationMs,
    warnings: ['Diagnostic mock only. No upstream call executed.'],
    errors: []
  };
}
