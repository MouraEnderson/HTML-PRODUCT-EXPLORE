import { objectId } from './enoviaClient.js';

export const SOURCE = 'RENDER_BOM_SERVICE';
export const DSENG_MAX_DEPTH = 3;
export const CJ_MESA_ROOT_ID = '63FC553465A62400699E0792000086AB';

const DEFAULT_MODE = 'dseng-official';

export function buildErrorResponse(code, message, mode = DEFAULT_MODE) {
  return {
    ok: false,
    source: SOURCE,
    mode,
    error: {
      code,
      message
    },
    diagnostics: {
      status: 'ERROR',
      mode,
      endpointsUsed: [],
      warnings: [],
      errors: [message]
    }
  };
}

export function buildInternalErrorResponse(mode = DEFAULT_MODE) {
  return buildErrorResponse('INTERNAL_ERROR', 'Unexpected backend error', mode);
}

export function buildMockRow({
  physicalId,
  title,
  level = 0,
  parentId = null,
  instanceId = null,
  owner = '',
  revision = '',
  maturity = '',
  description = '',
  name = '',
  instanceName = ''
}) {
  const rowKey = instanceId
    ? `level${level}:${parentId || 'root'}:${instanceId}:${physicalId}`
    : `level${level}:${physicalId}`;
  return {
    rowKey,
    level,
    parentId,
    instanceId,
    physicalId,
    title,
    description,
    revision,
    owner,
    maturity,
    format: 'VPMReference',
    type: 'VPMReference',
    name,
    instanceName
  };
}

export function normalizeEngItem(item) {
  const id = objectId(item);
  return {
    id,
    title: item?.title || item?.name || id || '',
    description: item?.description || item?.desc || '',
    revision: item?.revision || item?.rev || '',
    owner: item?.owner || item?.originatedBy || item?.ownerName || '',
    state: item?.state || item?.maturity || item?.current || '',
    type: item?.type || '',
    name: item?.name || ''
  };
}

export function normalizeEngInstance(instance) {
  return {
    instanceId: objectId(instance),
    instanceName: instance?.name || instance?.title || instance?.instanceName || '',
    childId: extractChildReferenceId(instance)
  };
}

export function extractChildReferenceId(instance) {
  if (!instance || typeof instance !== 'object') return '';

  const candidates = [
    instance.childId,
    instance.childPhysicalId,
    instance.referenceId,
    instance.toId,
    instance.targetId,
    instance.relatedId,
    instance.referencedObject?.id,
    instance.referenceObject?.id,
    instance.reference?.id,
    instance.child?.id,
    instance.to?.id,
    instance['dseng:EngItem']?.id
  ];

  for (const value of candidates) {
    const id = objectId({ id: value });
    if (id) return id;
  }
  return '';
}

export function getMissingChildReferenceSampleKeys(instance) {
  if (!instance || typeof instance !== 'object') return [];
  return Object.keys(instance).slice(0, 15);
}

export function buildRootContract(root) {
  return {
    id: root.id,
    title: root.title,
    revision: root.revision,
    state: root.state,
    owner: root.owner
  };
}

export function buildBomRow({ level, parentId, instance, item, index = 0 }) {
  const physicalId = item.id;
  const instanceId = instance?.instanceId || null;
  const rowKey = instanceId
    ? `level${level}:${parentId}:${instanceId}:${physicalId}`
    : `level${level}:${physicalId}`;
  return {
    rowKey,
    level,
    parentId,
    instanceId,
    physicalId,
    title: item.title,
    description: item.description,
    revision: item.revision,
    owner: item.owner,
    maturity: item.state,
    format: item.type || 'VPMReference',
    type: item.type || 'VPMReference',
    name: item.name,
    instanceName: instance?.instanceName || ''
  };
}

export function buildCounts(rows, includeRoot, depth) {
  const levelCounts = {};
  for (const row of rows) {
    const level = Number(row.level || 0);
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  }
  return {
    totalRows: rows.length,
    rootIncluded: includeRoot,
    depth,
    levelCounts
  };
}

export function buildDiagnostics({
  mode,
  endpointsUsed = [],
  durationMs = 0,
  warnings = [],
  errors = [],
  levelCounts = {},
  missingChildReferenceIdsCount = 0,
  skippedInstancesCount = 0,
  missingChildReferenceSampleKeys = null,
  truncatedInstancesCount = 0
}) {
  const diagnostics = {
    status: errors.length ? 'ERROR' : 'OK',
    mode,
    endpointsUsed,
    durationMs,
    warnings,
    errors
  };
  if (Object.keys(levelCounts).length) diagnostics.levelCounts = levelCounts;
  if (missingChildReferenceIdsCount) diagnostics.missingChildReferenceIdsCount = missingChildReferenceIdsCount;
  if (skippedInstancesCount) diagnostics.skippedInstancesCount = skippedInstancesCount;
  if (truncatedInstancesCount) diagnostics.truncatedInstancesCount = truncatedInstancesCount;
  if (missingChildReferenceSampleKeys?.length) {
    diagnostics.missingChildReferenceSampleKeys = missingChildReferenceSampleKeys;
  }
  return diagnostics;
}

export function buildStructureSuccess({ mode, root, rows, depth, includeRoot, diagnostics }) {
  const counts = buildCounts(rows, includeRoot, depth);
  return {
    ok: true,
    source: SOURCE,
    mode,
    root: buildRootContract(root),
    rows,
    counts,
    diagnostics: diagnostics || buildDiagnostics({
      mode,
      endpointsUsed: [],
      durationMs: 0,
      warnings: [],
      errors: [],
      levelCounts: counts.levelCounts
    })
  };
}

export function buildDiagnosticSuccess({
  mode,
  parameters,
  environment,
  checks = null,
  endpointsUsed = [],
  durationMs = 0,
  warnings = [],
  errors = []
}) {
  const payload = {
    ok: true,
    source: SOURCE,
    mode,
    parameters,
    environment,
    endpointsUsed,
    durationMs,
    warnings,
    errors
  };
  if (checks) payload.checks = checks;
  return payload;
}

export function unwrapEngItemPayload(data) {
  if (!data) return null;
  if (data.id || data.physicalId || data.physicalid) return data;
  if (Array.isArray(data.member) && data.member.length) return data.member[0];
  if (Array.isArray(data.members) && data.members.length) return data.members[0];
  return data;
}
