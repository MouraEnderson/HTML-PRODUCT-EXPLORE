import { extractMembers, objectId } from './enoviaClient.js';
import { SOURCE, buildDiagnostics, buildRootContract } from './threeDxBomNormalizer.js';

const REF_TYPES = new Set(['VPMReference', 'VPMRepReference']);
const INST_TYPES = new Set(['VPMInstance', 'VPMRepInstance']);

function str(value) {
  return value == null ? '' : String(value).trim();
}

function itemType(item) {
  return str(item?.type || item?.displayType);
}

function isReference(item) {
  return REF_TYPES.has(itemType(item));
}

function isInstance(item) {
  return INST_TYPES.has(itemType(item));
}

function isPathObject(item) {
  return item && Array.isArray(item.Path);
}

function normalizeReference(item = {}, fallbackId = '') {
  const id = objectId(item) || str(fallbackId);
  return {
    id,
    title: str(item.title || item.name || id),
    description: str(item.description || item.desc),
    revision: str(item.revision || item.rev),
    owner: str(item.owner || item['BusinessObject Owner'] || item.originatedBy || item.ownerName),
    state: str(item.state || item.maturity || item.current),
    type: str(item.type || 'VPMReference'),
    name: str(item.name),
    created: str(item.created),
    modified: str(item.modified)
  };
}

function normalizeInstance(item = {}, fallbackId = '') {
  const id = objectId(item) || str(fallbackId);
  return {
    id,
    name: str(item.name || item.title || item.instanceName || id),
    type: str(item.type || 'VPMInstance'),
    created: str(item.created),
    modified: str(item.modified)
  };
}

function normalizePath(path) {
  if (!Array.isArray(path)) return [];
  return path.map(str).filter(Boolean);
}

function buildRow({ path, level, parentReferenceId, instance, reference, includeRoot }) {
  const referenceId = reference.id || path[path.length - 1] || '';
  const instanceId = instance?.id || '';
  const rowKey = path.join('>');
  return {
    rowKey,
    level,
    parentId: parentReferenceId || '',
    parentReferenceId: parentReferenceId || '',
    parentKey: level > 0 ? path.slice(0, Math.max(path.length - 2, 1)).join('>') : '',
    instanceId,
    instanceName: instance?.name || '',
    physicalId: referenceId,
    referenceId,
    path,
    title: reference.title || reference.name || referenceId,
    name: reference.name || reference.title || referenceId,
    description: reference.description || '',
    revision: reference.revision || '',
    owner: reference.owner || '',
    maturity: reference.state || '',
    state: reference.state || '',
    type: reference.type || 'VPMReference',
    format: reference.type || 'VPMReference',
    quantity: 1,
    hasChildren: true,
    source: 'expand-item',
    rootIncluded: includeRoot !== false
  };
}

function buildCounts(rows, referencesById, instancesById, paths, includeRoot, expandDepth) {
  const levelCounts = {};
  rows.forEach((row) => {
    const level = Number(row.level || 0);
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });
  return {
    totalRows: rows.length,
    loadedRows: rows.length,
    rootIncluded: includeRoot !== false,
    depth: expandDepth,
    expandDepth,
    occurrenceCount: rows.filter((row) => Number(row.level || 0) > 0).length,
    referenceCount: referencesById.size,
    uniqueReferenceCount: referencesById.size,
    instanceCount: instancesById.size,
    pathCount: paths.length,
    levelCounts
  };
}

export function normalizeExpandItemPayload(payload, {
  rootId = '',
  includeRoot = true,
  expandDepth = 1,
  mode = 'dseng-official',
  endpointsUsed = [],
  durationMs = 0
} = {}) {
  const members = extractMembers(payload);
  const referencesById = new Map();
  const instancesById = new Map();
  const paths = [];
  const warnings = [];
  const errors = [];

  members.forEach((member) => {
    if (isReference(member)) {
      const ref = normalizeReference(member);
      if (ref.id) referencesById.set(ref.id, ref);
    } else if (isInstance(member)) {
      const inst = normalizeInstance(member);
      if (inst.id) instancesById.set(inst.id, inst);
    } else if (isPathObject(member)) {
      const path = normalizePath(member.Path);
      if (path.length) paths.push(path);
    }
  });

  const rows = [];
  const seen = new Set();
  let root = normalizeReference(referencesById.get(rootId), rootId);

  if (!root.id && paths.length) {
    root = normalizeReference(referencesById.get(paths[0][0]), paths[0][0]);
  }

  if (includeRoot !== false && root.id) {
    const rootPath = [root.id];
    const row = buildRow({
      path: rootPath,
      level: 0,
      parentReferenceId: '',
      instance: null,
      reference: root,
      includeRoot
    });
    rows.push(row);
    seen.add(row.rowKey);
  }

  paths.forEach((path) => {
    if (path.length < 3) {
      warnings.push(`ExpandItem Path ignored because it has ${path.length} segment(s)`);
      return;
    }

    for (let i = 2; i < path.length; i += 2) {
      const parentReferenceId = path[i - 2];
      const instanceId = path[i - 1];
      const referenceId = path[i];
      const rowPath = path.slice(0, i + 1);
      const rowKey = rowPath.join('>');
      if (seen.has(rowKey)) continue;
      const reference = normalizeReference(referencesById.get(referenceId), referenceId);
      if (!referencesById.has(referenceId)) {
        warnings.push(`ExpandItem Path references missing object ${referenceId}`);
      }
      const instance = normalizeInstance(instancesById.get(instanceId), instanceId);
      if (!instancesById.has(instanceId)) {
        warnings.push(`ExpandItem Path references missing instance ${instanceId}`);
      }
      rows.push(buildRow({
        path: rowPath,
        level: i / 2,
        parentReferenceId,
        instance,
        reference,
        includeRoot
      }));
      seen.add(rowKey);
    }
  });

  if (!rows.length && root.id && includeRoot !== false) {
    warnings.push('ExpandItem returned no Path rows; showing only the resolved root.');
    const rootPath = [root.id];
    rows.push(buildRow({
      path: rootPath,
      level: 0,
      parentReferenceId: '',
      instance: null,
      reference: root,
      includeRoot
    }));
  }

  const counts = buildCounts(rows, referencesById, instancesById, paths, includeRoot, expandDepth);

  return {
    ok: true,
    source: SOURCE,
    mode,
    strategy: 'expand-item',
    root: buildRootContract(root),
    rows,
    counts,
    partial: true,
    diagnostics: buildDiagnostics({
      mode,
      endpointsUsed,
      durationMs,
      warnings,
      errors,
      levelCounts: counts.levelCounts
    }),
    expandItem: {
      totalItems: Number(payload?.totalItems ?? members.length),
      memberCount: members.length,
      pathCount: paths.length,
      referenceCount: referencesById.size,
      instanceCount: instancesById.size
    }
  };
}
