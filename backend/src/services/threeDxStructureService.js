import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import { normalizeExpandItemPayload } from './threeDxExpandItemNormalizer.js';
import {
  SOURCE,
  buildErrorResponse,
  buildRootContract,
  buildDiagnostics
} from './threeDxBomNormalizer.js';

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

function str(v) { return v == null ? '' : String(v).trim(); }

function normalizePageSize(value) {
  const n = parseInt(value, 10);
  if (!isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

function buildCursor(offset, rootId) {
  return Buffer.from(JSON.stringify({ offset, rootId })).toString('base64');
}

function parseCursor(cursor) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch (_e) {
    return null;
  }
}

function paginateRows(rows, pageSize, cursor) {
  const parsed = parseCursor(cursor);
  const offset = (parsed && parsed.offset) ? Number(parsed.offset) : 0;
  const page = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < rows.length;
  return {
    rows: page,
    page: {
      offset,
      returned: page.length,
      total: rows.length,
      hasMore,
      nextCursor: hasMore ? buildCursor(nextOffset, parsed?.rootId || '') : null
    }
  };
}

export async function resolveStructureRoot(body, config) {
  const started = Date.now();
  const rootId = str(body.rootId);
  const pageSize = normalizePageSize(body.pageSize);
  const cursor = str(body.cursor) || null;
  const includeRoot = body.includeRoot !== false;
  const expandDepth = Math.min(Math.max(parseInt(body.expandDepth, 10) || 1, 1), 10);

  if (!rootId) {
    return {
      ok: false,
      status: 422,
      error: buildErrorResponse('ROOT_ID_REQUIRED', 'rootId is required for structure/root')
    };
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: 503,
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const client = new ThreeDxDsengClient(config);

  try {
    const result = await client.expandEngItem(rootId, { expandDepth });
    const normalized = normalizeExpandItemPayload(result.data, {
      rootId,
      includeRoot,
      expandDepth,
      mode: 'dseng-official',
      endpointsUsed: client.getEndpointsUsed(),
      durationMs: Date.now() - started
    });

    const allRows = normalized.rows || [];
    const paginated = paginateRows(allRows, pageSize, cursor);

    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        source: SOURCE,
        mode: 'dseng-official',
        scope: {
          rootId,
          rootTitle: normalized.root?.title || rootId,
          mode: 'root',
          expandDepth,
          partial: normalized.partial !== false
        },
        root: buildRootContract(normalized.root || { id: rootId }),
        rows: paginated.rows,
        counts: {
          returnedRows: paginated.rows.length,
          totalKnownRows: allRows.length,
          occurrenceCount: allRows.filter(r => Number(r.level || 0) > 0).length,
          uniqueReferenceCount: normalized.counts?.uniqueReferenceCount || 0,
          expandItem: normalized.expandItem || {}
        },
        page: paginated.page,
        diagnostics: buildDiagnostics({
          mode: 'dseng-official',
          endpointsUsed: client.getEndpointsUsed(),
          durationMs: Date.now() - started,
          warnings: normalized.diagnostics?.warnings || [],
          errors: normalized.diagnostics?.errors || [],
          levelCounts: normalized.counts?.levelCounts || {}
        })
      }
    };
  } catch (error) {
    const status = Number(error?.status || 502);
    const code = status === 404 ? 'ROOT_NOT_FOUND' : 'UPSTREAM_DSENG_ERROR';
    return {
      ok: false,
      status,
      error: buildErrorResponse(code, error?.message || String(error))
    };
  }
}

export async function resolveStructureChildren(body, config) {
  const started = Date.now();
  const rootId = str(body.rootId);
  const parentReferenceId = str(body.parentReferenceId);
  const pageSize = normalizePageSize(body.pageSize);
  const cursor = str(body.cursor) || null;
  const expandDepth = Math.min(Math.max(parseInt(body.expandDepth, 10) || 1, 1), 5);

  if (!parentReferenceId) {
    return {
      ok: false,
      status: 422,
      error: buildErrorResponse('ROOT_ID_REQUIRED', 'parentReferenceId is required for structure/children')
    };
  }

  const configured = assertDsengConfigured(config);
  if (!configured.ok) {
    return {
      ok: false,
      status: 503,
      error: buildErrorResponse(configured.code, configured.message)
    };
  }

  const client = new ThreeDxDsengClient(config);

  try {
    const result = await client.expandEngItem(parentReferenceId, { expandDepth });
    const normalized = normalizeExpandItemPayload(result.data, {
      rootId: parentReferenceId,
      includeRoot: false,
      expandDepth,
      mode: 'dseng-official',
      endpointsUsed: client.getEndpointsUsed(),
      durationMs: Date.now() - started
    });

    const allRows = normalized.rows || [];
    const paginated = paginateRows(allRows, pageSize, cursor);

    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        source: SOURCE,
        mode: 'dseng-official',
        scope: {
          mode: 'children',
          rootId: rootId || parentReferenceId,
          parentReferenceId,
          parentInstanceId: str(body.parentInstanceId),
          path: Array.isArray(body.path) ? body.path : [],
          expandDepth,
          partial: normalized.partial !== false
        },
        rows: paginated.rows,
        counts: {
          returnedRows: paginated.rows.length,
          totalKnownRows: allRows.length,
          occurrenceCount: allRows.length,
          expandItem: normalized.expandItem || {}
        },
        page: paginated.page,
        diagnostics: buildDiagnostics({
          mode: 'dseng-official',
          endpointsUsed: client.getEndpointsUsed(),
          durationMs: Date.now() - started,
          warnings: normalized.diagnostics?.warnings || [],
          errors: normalized.diagnostics?.errors || [],
          levelCounts: normalized.counts?.levelCounts || {}
        })
      }
    };
  } catch (error) {
    const status = Number(error?.status || 502);
    const code = status === 404 ? 'ROOT_NOT_FOUND' : 'UPSTREAM_DSENG_ERROR';
    return {
      ok: false,
      status,
      error: buildErrorResponse(code, error?.message || String(error))
    };
  }
}
