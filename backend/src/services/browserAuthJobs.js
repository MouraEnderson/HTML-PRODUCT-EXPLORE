import crypto from 'node:crypto';

const JOB_TTL_MS = 15 * 60 * 1000;
const jobs = new Map();

export function startBrowserBomJob(input = {}) {
  cleanupJobs();
  const jobId = crypto.randomUUID();
  const job = {
    id: jobId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: 'root-search',
    rootName: clean(input.rootName),
    physicalId: clean(input.physicalId),
    expectedCount: Number(input.expectedCount || 0),
    maxItems: Number(input.maxItems || process.env.BOM_MAX_ITEMS || 20000),
    maxDepth: Number(input.maxDepth || process.env.BOM_MAX_DEPTH || 40),
    candidates: [],
    selectedRoot: null,
    items: [],
    queue: [],
    seenParents: new Set(),
    diagnostics: { rootSearches: [], parentRequests: 0, errors: [] }
  };
  jobs.set(jobId, job);
  return responseFor(job, rootSearchTasks(job));
}

export function continueBrowserBomJob(jobId, results = []) {
  cleanupJobs();
  const job = jobs.get(jobId);
  if (!job) return { ok: false, status: 'expired', message: 'Browser-auth job expired or not found.' };
  job.updatedAt = Date.now();

  if (job.phase === 'root-search') return processRootSearch(job, results);
  if (job.phase === 'root-score') return processRootScore(job, results);
  if (job.phase === 'crawl') return processCrawl(job, results);

  return finalResponse(job);
}

function rootSearchTasks(job) {
  const queries = [];
  if (job.physicalId) {
    queries.push(job.physicalId);
    queries.push(`name:${job.physicalId}`);
    queries.push(`name:\"${job.physicalId}\"`);
  }
  if (job.rootName) {
    queries.push(`label:\"${job.rootName}\"`);
    queries.push(job.rootName);
  }
  return unique(queries).map((query, index) => ({
    taskId: `root-search-${index}`,
    kind: 'eng-search',
    query,
    path: `/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=${encodeURIComponent(query)}&$top=30`
  }));
}

function processRootSearch(job, results) {
  for (const result of results || []) {
    const body = result?.body;
    const members = extractMembers(body);
    job.diagnostics.rootSearches.push({ taskId: result.taskId, count: members.length, ok: result.ok !== false, status: result.status });
    for (const item of members) addCandidate(job, item);
  }
  const scoreTasks = job.candidates.map((candidate, index) => ({
    taskId: `root-score-${index}`,
    kind: 'eng-children-count',
    candidateId: candidate.id,
    path: `/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(candidate.id)}/dseng:EngInstance?$mva=true&$skip=0&$top=1&$mask=dsmveng%3AEngInstanceMask.Details&$fields=dsmvcfg%3Aattribute.hasConfiguredInstance`
  }));
  job.phase = 'root-score';
  return responseFor(job, scoreTasks);
}

function processRootScore(job, results) {
  for (const result of results || []) {
    const candidate = job.candidates.find(c => result.taskId === c.scoreTaskId || result.candidateId === c.id);
    const id = result.candidateId || candidate?.id;
    const cand = job.candidates.find(c => c.id === id);
    if (!cand) continue;
    const total = Number(result?.body?.totalItems ?? extractMembers(result?.body).length ?? 0);
    cand.childCount = total;
    cand.score = scoreCandidate(job, cand);
  }
  job.selectedRoot = [...job.candidates].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
  if (!job.selectedRoot) {
    job.phase = 'done';
    return finalResponse(job, 'root_not_resolved');
  }
  const rootRow = makeRootRow(job.selectedRoot);
  job.items = [rootRow];
  job.queue = [{ row: rootRow, parentApiId: job.selectedRoot.id, depth: 0 }];
  job.phase = 'crawl';
  return nextCrawlTasks(job);
}

function processCrawl(job, results) {
  for (const result of results || []) {
    const parent = result.parent;
    if (!parent) continue;
    if (result.ok === false) {
      job.diagnostics.errors.push({ parentApiId: parent.parentApiId, status: result.status, error: result.error });
      continue;
    }
    const members = extractMembers(result.body);
    for (const inst of members) {
      if (job.items.length >= job.maxItems) break;
      const child = makeInstanceRow(inst, parent.row, parent.depth + 1);
      job.items.push(child);
      const navId = child.referencedObjectId || child.resolvedId || child.physicalId;
      if (navId && child.type && /product|part|vpmreference|dsxcad/i.test(child.type)) {
        job.queue.push({ row: child, parentApiId: navId, depth: parent.depth + 1 });
      }
    }
  }
  if (job.expectedCount > 0 && job.items.length >= job.expectedCount) {
    job.phase = 'done';
    return finalResponse(job);
  }
  return nextCrawlTasks(job);
}

function nextCrawlTasks(job) {
  const tasks = [];
  while (job.queue.length && tasks.length < 12 && job.items.length < job.maxItems) {
    const parent = job.queue.shift();
    if (!parent?.parentApiId) continue;
    if (parent.depth >= job.maxDepth) continue;
    if (job.seenParents.has(parent.parentApiId)) continue;
    job.seenParents.add(parent.parentApiId);
    job.diagnostics.parentRequests += 1;
    tasks.push({
      taskId: `crawl-${job.diagnostics.parentRequests}`,
      kind: 'eng-children',
      parent,
      path: `/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(parent.parentApiId)}/dseng:EngInstance?$mva=true&$skip=0&$top=100&$mask=dsmveng%3AEngInstanceMask.Details&$fields=dsmvcfg%3Aattribute.hasConfiguredInstance`
    });
  }
  if (!tasks.length) {
    job.phase = 'done';
    return finalResponse(job);
  }
  return responseFor(job, tasks);
}

function responseFor(job, tasks) {
  return { ok: true, status: 'running', jobId: job.id, phase: job.phase, expectedCount: job.expectedCount, actualCount: job.items.length, tasks };
}

function finalResponse(job, forcedStatus) {
  const status = forcedStatus || (job.expectedCount > 0 && job.items.length !== job.expectedCount ? 'partial' : 'complete');
  return {
    ok: status === 'complete',
    status,
    jobId: job.id,
    source: 'browser-auth-bridge',
    expectedCount: job.expectedCount,
    actualCount: job.items.length,
    root: job.selectedRoot,
    diagnostics: { ...job.diagnostics, candidates: job.candidates.map(c => ({ id: c.id, name: c.name, title: c.title, childCount: c.childCount, score: c.score })) },
    items: job.expectedCount > 0 && job.items.length > job.expectedCount ? job.items.slice(0, job.expectedCount) : job.items
  };
}

function addCandidate(job, item) {
  const id = objectId(item);
  if (!id || job.candidates.some(c => c.id === id)) return;
  const c = { id, name: clean(item.name), title: clean(item.title), description: clean(item.description), type: clean(item.type), revision: clean(item.revision), state: clean(item.state), owner: clean(item.owner), childCount: 0, score: 0 };
  c.scoreTaskId = `root-score-${job.candidates.length}`;
  job.candidates.push(c);
}

function scoreCandidate(job, cand) {
  let score = 0;
  if (cand.name === job.physicalId) score += 1000;
  if (cand.title === job.rootName) score += 700;
  if (cand.childCount > 0) score += 250 + cand.childCount;
  if (cand.type === 'VPMReference') score += 100;
  return score;
}

function makeRootRow(root) {
  return { rowId: `root:${root.id}`, level: 0, parentRowId: null, occurrenceId: null, instanceId: null, title: root.title || root.name || root.id, description: root.description || '', revision: root.revision || '', maturity: root.state || '', owner: root.owner || '', type: root.type || 'VPMReference', physicalId: root.name || '', resolvedId: root.id, referencedObjectId: root.id, source: 'root', canOpen3D: true, canChangeMaturity: Boolean(root.id) };
}

function makeInstanceRow(inst, parent, level) {
  const ref = Array.isArray(inst?.referencedObject) ? inst.referencedObject[0] : (inst?.referencedObject || {});
  const instanceId = objectId(inst);
  const refId = objectId(ref);
  return { rowId: `occ:${instanceId || refId}:${parent.rowId}`, level, parentRowId: parent.rowId, occurrenceId: instanceId, instanceId, title: clean(inst?.title || inst?.name || ref.title || ref.name || ref.identifier || instanceId), description: clean(inst?.description || ref.description), revision: clean(inst?.revision || ref.revision), maturity: clean(inst?.state || ref.state), owner: clean(inst?.owner || ref.owner), type: clean(ref.type || inst?.type), physicalId: clean(ref.identifier || ref.id), resolvedId: clean(ref.id || ref.identifier), referencedObjectId: clean(ref.identifier || ref.id), source: 'eng-instance', canOpen3D: Boolean(refId), canChangeMaturity: Boolean(refId) };
}

function extractMembers(data) {
  if (!data) return [];
  if (Array.isArray(data.member)) return data.member;
  if (Array.isArray(data.members)) return data.members;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}
function objectId(obj) { return clean(obj?.id || obj?.physicalid || obj?.physicalId || obj?.identifier); }
function clean(v) { return String(v || '').trim(); }
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function cleanupJobs() { const now = Date.now(); for (const [id, job] of jobs.entries()) if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id); }
