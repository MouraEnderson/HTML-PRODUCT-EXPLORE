/**
 * Contrato de escopo e contagem dseng para respostas SKA BOM Service.
 */

function str(value) {
  return value == null ? '' : String(value).trim();
}

export function buildScope({
  mode = 'root',
  source = 'dseng',
  item = '',
  rootId = '',
  expandStrategy = 'expand-item',
  expandDepth = 1,
  isPartial = true,
  selectionSource = ''
} = {}) {
  return {
    mode: str(mode) || 'root',
    source: str(source) || 'dseng',
    item: str(item),
    rootId: str(rootId),
    expandStrategy: str(expandStrategy) || 'expand-item',
    expandDepth: Number(expandDepth) || 1,
    isPartial: isPartial !== false,
    selectionSource: str(selectionSource)
  };
}

export function enrichCounts(counts = {}, rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const refs = new Set();
  let instanceCount = 0;
  let pathCount = 0;

  list.forEach((row) => {
    const ref = str(row.referenceId || row.physicalId);
    if (ref) refs.add(ref);
    if (row.instanceId) instanceCount += 1;
    if (Array.isArray(row.path) && row.path.length) pathCount += 1;
  });

  const occurrenceCount =
    counts.occurrenceCount != null
      ? counts.occurrenceCount
      : list.filter((row) => Number(row.level || 0) > 0).length;

  return {
    ...counts,
    loadedRows: counts.loadedRows != null ? counts.loadedRows : counts.totalRows != null ? counts.totalRows : list.length,
    totalRows: counts.totalRows != null ? counts.totalRows : list.length,
    occurrenceCount,
    referenceCount: counts.referenceCount != null ? counts.referenceCount : refs.size,
    uniqueReferenceCount:
      counts.uniqueReferenceCount != null ? counts.uniqueReferenceCount : refs.size,
    instanceCount: counts.instanceCount != null ? counts.instanceCount : instanceCount,
    pathCount: counts.pathCount != null ? counts.pathCount : pathCount
  };
}

export function attachScopeToPayload(payload, {
  mode = 'root',
  source = 'dseng',
  item = '',
  rootId = '',
  expandStrategy = 'expand-item',
  expandDepth = 1,
  isPartial = true,
  selectionSource = ''
} = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  payload.scope = buildScope({
    mode,
    source,
    item,
    rootId,
    expandStrategy,
    expandDepth,
    isPartial,
    selectionSource
  });
  payload.counts = enrichCounts(payload.counts || {}, payload.rows || []);
  payload.partial = payload.scope.isPartial;
  return payload;
}
