import { EnoviaClient, extractMembers, firstMember, objectId } from './enoviaClient.js';

const MAX_ITEMS = Number(process.env.BOM_MAX_ITEMS || 20000);
const PAGE_SIZE = Number(process.env.BOM_PAGE_SIZE || 100);

export async function resolveBom(input) {
  const request = normalizeRequest(input);
  const client = new EnoviaClient(request.auth);
  if (!request.auth.csrfToken && process.env.AUTO_CSRF === 'true') {
    request.auth.csrfToken = await client.getCsrf();
  }

  const root = await resolveRoot(client, request);
  if (!root?.id) {
    return failure('root_not_resolved', request, null, 'Não foi possível resolver a raiz para VPMReference/EngItem navegável.');
  }

  const crawl = await crawlBom(client, root, request);
  const status = request.expectedCount > 0 && crawl.items.length !== request.expectedCount ? 'partial' : 'complete';

  return {
    ok: status === 'complete',
    status,
    source: 'backend-api-resolver',
    root: {
      title: root.title,
      name: root.name,
      physicalId: request.physicalId,
      resolvedId: root.id,
      type: root.type,
      revision: root.revision,
      maturity: root.state,
      owner: root.owner
    },
    expectedCount: request.expectedCount,
    actualCount: crawl.items.length,
    diagnostics: {
      ...crawl.diagnostics,
      rootResolution: root.diagnostics || [],
      maxItems: MAX_ITEMS,
      pageSize: PAGE_SIZE
    },
    items: crawl.items
  };
}

function normalizeRequest(input) {
  const auth = {
    spaceUrl: input.spaceUrl || process.env.SPACE_URL,
    csrfToken: input.csrfToken || process.env.ENO_CSRF_TOKEN,
    securityContext: input.securityContext || process.env.SECURITY_CONTEXT,
    cookie: input.cookie || process.env.ENOVIA_COOKIE,
    bearerToken: input.bearerToken || process.env.ENOVIA_BEARER_TOKEN
  };
  return {
    auth,
    physicalId: clean(input.physicalId),
    rootName: clean(input.rootName || input.title || input.name),
    expectedCount: Number(input.expectedCount || 0),
    maxDepth: Number(input.maxDepth || process.env.BOM_MAX_DEPTH || 40),
    includeApiPreview: input.includeApiPreview !== false
  };
}

async function resolveRoot(client, request) {
  const diagnostics = [];
  const candidates = [];
  async function search(label, query) {
    if (!query) return;
    try {
      const data = await client.searchEngItems(query, 30);
      const list = extractMembers(data);
      diagnostics.push({ step: label, query, count: list.length });
      for (const item of list) {
        const id = objectId(item);
        if (id && !candidates.some(c => c.id === id)) {
          candidates.push({ ...item, id });
        }
      }
    } catch (error) {
      diagnostics.push({ step: label, query, error: error.message, status: error.status });
    }
  }

  await search('physicalId raw', request.physicalId);
  await search('physicalId name', request.physicalId ? `name:${request.physicalId}` : '');
  await search('physicalId quoted', request.physicalId ? `name:"${request.physicalId}"` : '');
  await search('root label', request.rootName ? `label:"${request.rootName}"` : '');
  await search('root raw', request.rootName);

  const exact = candidates.filter(c => c.name === request.physicalId || c.title === request.rootName);
  const pool = exact.length ? exact : candidates;
  let best = null;
  let bestScore = -Infinity;

  for (const cand of pool) {
    const childCount = await countChildren(client, cand.id);
    let score = 0;
    if (cand.name === request.physicalId) score += 1000;
    if (cand.title === request.rootName) score += 700;
    if (childCount > 0) score += 250 + childCount;
    if (cand.type === 'VPMReference') score += 100;
    if (score > bestScore) {
      bestScore = score;
      best = { ...cand, childCount };
    }
  }

  if (!best) return null;
  return {
    id: best.id,
    name: best.name,
    title: best.title,
    type: best.type,
    revision: best.revision,
    state: best.state,
    owner: best.owner,
    diagnostics
  };
}

async function countChildren(client, id) {
  try {
    const data = await client.getEngInstances(id, { skip: 0, top: 1 });
    return Number(data?.totalItems ?? extractMembers(data).length ?? 0);
  } catch {
    return 0;
  }
}

async function crawlBom(client, root, request) {
  const items = [];
  const queue = [];
  const seenParents = new Set();
  const diagnostics = {
    parentRequests: 0,
    resolvedParents: 0,
    unresolvedParents: 0,
    stoppedByMaxItems: false,
    stoppedByDepth: false,
    errors: []
  };

  const rootRow = makeRootRow(root);
  items.push(rootRow);
  queue.push({ row: rootRow, parentApiId: root.id, depth: 0 });

  while (queue.length && items.length < MAX_ITEMS) {
    const current = queue.shift();
    if (current.depth >= request.maxDepth) {
      diagnostics.stoppedByDepth = true;
      continue;
    }
    if (!current.parentApiId || seenParents.has(current.parentApiId)) continue;
    seenParents.add(current.parentApiId);
    diagnostics.parentRequests += 1;

    let children;
    try {
      children = await client.getAllEngInstances(current.parentApiId, { pageSize: PAGE_SIZE });
      diagnostics.resolvedParents += 1;
    } catch (error) {
      diagnostics.unresolvedParents += 1;
      diagnostics.errors.push({ parentApiId: current.parentApiId, error: error.message, status: error.status });
      continue;
    }

    const members = extractMembers(children);
    for (const inst of members) {
      if (items.length >= MAX_ITEMS) {
        diagnostics.stoppedByMaxItems = true;
        break;
      }
      const child = makeInstanceRow(inst, current.row, current.depth + 1);
      items.push(child);
      const navId = await resolveNavigationId(client, child);
      if (navId) queue.push({ row: child, parentApiId: navId, depth: current.depth + 1 });
    }
  }

  return { items, diagnostics };
}

function makeRootRow(root) {
  return {
    rowId: `root:${root.id}`,
    level: 0,
    parentRowId: null,
    occurrenceId: null,
    instanceId: null,
    title: root.title || root.name || root.id,
    description: root.description || '',
    revision: root.revision || '',
    maturity: root.state || '',
    owner: root.owner || '',
    type: root.type || 'VPMReference',
    physicalId: root.name || '',
    resolvedId: root.id,
    referencedObjectId: root.id,
    source: 'root',
    isComplete: true,
    canOpen3D: true,
    canChangeMaturity: Boolean(root.id)
  };
}

function makeInstanceRow(inst, parent, level) {
  const ref = normalizeRef(inst.referencedObject || inst.referenceObject || inst.child || inst.related || {});
  const instanceId = objectId(inst);
  const title = clean(inst.title || inst.name || ref.title || ref.name || ref.identifier || instanceId);
  return {
    rowId: `occ:${instanceId || ref.identifier}:${parent.rowId}`,
    level,
    parentRowId: parent.rowId,
    occurrenceId: instanceId,
    instanceId,
    title,
    description: clean(inst.description || ref.description || ''),
    revision: clean(inst.revision || ref.revision || ''),
    maturity: clean(inst.state || ref.state || ''),
    owner: clean(inst.owner || ref.owner || ''),
    type: clean(ref.type || inst.type || ''),
    physicalId: clean(ref.identifier || ref.id || ''),
    resolvedId: clean(ref.id || ref.identifier || ''),
    referencedObjectId: clean(ref.identifier || ref.id || ''),
    source: 'eng-instance',
    isComplete: true,
    canOpen3D: Boolean(ref.identifier || ref.id),
    canChangeMaturity: Boolean(ref.identifier || ref.id)
  };
}

function normalizeRef(ref) {
  if (Array.isArray(ref)) return ref[0] || {};
  return ref || {};
}

async function resolveNavigationId(client, row) {
  const id = row.referencedObjectId || row.resolvedId || row.physicalId;
  if (!id) return null;
  const direct = await countChildren(client, id);
  if (direct > 0) return id;

  const label = cleanLabel(row.title);
  if (!label) return null;
  try {
    const data = await client.searchEngItems(`label:"${label}"`, 20);
    const candidates = extractMembers(data);
    let best = null;
    let bestCount = 0;
    for (const c of candidates) {
      const cid = objectId(c);
      if (!cid || cid === id) continue;
      const cnt = await countChildren(client, cid);
      if (cnt > bestCount) {
        best = cid;
        bestCount = cnt;
      }
    }
    return bestCount > 0 ? best : null;
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value || '').trim();
}

function cleanLabel(value) {
  return clean(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\.\d+\s*$/g, '')
    .replace(/^prd-R\d+-[A-Za-z0-9._-]+$/i, '')
    .trim();
}

function failure(code, request, root, message) {
  return {
    ok: false,
    status: code,
    source: 'backend-api-resolver',
    root,
    expectedCount: request?.expectedCount || 0,
    actualCount: 0,
    diagnostics: {},
    message,
    items: []
  };
}
