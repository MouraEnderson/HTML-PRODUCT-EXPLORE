
const JOBS = new Map();

const MAX_TASKS_PER_ROUND = 24;
const MAX_ROWS = 5000;
const MAX_DEPTH = 30;

function now() {
  return Date.now();
}

function cleanBaseUrl(v) {
  return String(v || '').replace(/\/+$/, '');
}

function enc(v) {
  return encodeURIComponent(String(v || ''));
}

function safeId(v) {
  return String(v || '').trim();
}

function arr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v.member)) return v.member;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.results)) return v.results;
  return [];
}

function firstMember(payload) {
  const a = arr(payload);
  return a.length ? a[0] : null;
}

function getPayload(result) {
  if (!result) return null;
  if (result.payload) return result.payload;
  if (result.data) return result.data;
  if (result.response) return result.response;
  if (result.body) return result.body;
  return result;
}

function task(id, url, meta = {}) {
  return { id, method: 'GET', url, meta };
}

function engSearchUrl(base, q, top = 20) {
  return `${base}/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=${enc(q)}&$top=${top}`;
}

function engSearchPlainUrl(base, q, top = 20) {
  return `${base}/resources/v1/modeler/dseng/dseng:EngItem/search?searchStr=${enc(q)}&$top=${top}`;
}

function engItemUrl(base, id) {
  return `${base}/resources/v1/modeler/dseng/dseng:EngItem/${enc(id)}`;
}

function engInstUrl(base, id, top = 200) {
  return `${base}/resources/v1/modeler/dseng/dseng:EngItem/${enc(id)}/dseng:EngInstance?$mva=true&$skip=0&$top=${top}&$mask=dsmveng%3AEngInstanceMask.Details&$fields=dsmvcfg%3Aattribute.hasConfiguredInstance`;
}

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function stripInstanceName(v) {
  return String(v || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\.\d+$/g, '')
    .replace(/\(\s*[^)]*?\s*\)$/g, '')
    .trim();
}

function idFromItem(x) {
  return safeId(x && (x.id || x.identifier || x.physicalid || x.physicalId));
}

function titleFromItem(x) {
  return safeId(x && (x.title || x.label || x.name || x.displayName));
}

function nameFromItem(x) {
  return safeId(x && (x.name || x.title || x.label || x.displayName));
}

function refFromInstance(inst) {
  const r = inst && (inst.referencedObject || inst.reference || inst.referencedItem || inst.child);
  if (!r) return null;
  return {
    id: safeId(r.identifier || r.id || r.physicalid || r.physicalId),
    type: safeId(r.type || r.kind),
    title: safeId(r.title || r.name || r.label),
    relativePath: safeId(r.relativePath),
  };
}

function scoreRootCandidate(job, c, childCount) {
  const id = idFromItem(c);
  const title = normalizeText(titleFromItem(c));
  const name = normalizeText(nameFromItem(c));
  const rootName = normalizeText(job.rootName);
  const physicalId = normalizeText(job.physicalId);

  let s = 0;
  if (childCount > 0) s += 10000 + childCount;
  if (name === physicalId) s += 2000;
  if (title === rootName) s += 1600;
  if (title.includes(rootName) || rootName.includes(title)) s += 800;
  if (name.includes(physicalId) || physicalId.includes(name)) s += 500;
  if (id && job.seenCandidateIds.has(id)) s += 25;
  return s;
}

function scoreChildCandidate(wantedId, wantedName, c, childCount) {
  const id = idFromItem(c);
  const title = normalizeText(titleFromItem(c));
  const name = normalizeText(nameFromItem(c));
  const wid = normalizeText(wantedId);
  const wname = normalizeText(wantedName);

  let s = 0;
  if (id && normalizeText(id) === wid) s += 5000;
  if (name === wid) s += 3500;
  if (title === wname) s += 1500;
  if (name === wname) s += 1300;
  if (title && wname && (title.includes(wname) || wname.includes(title))) s += 500;
  if (childCount > 0) s += 100 + childCount;
  return s;
}

function addUniqueCandidate(job, item, source) {
  const id = idFromItem(item);
  if (!id) return;
  if (!job.candidates.has(id)) {
    job.candidates.set(id, { item, source, childCount: null });
  }
  job.seenCandidateIds.add(id);
}

function expectedLimit(job) {
  return Number(job.expectedCount || 0);
}

function expectedReached(job) {
  const expected = expectedLimit(job);
  return expected > 0 && job.rows.length >= expected;
}

function stopTraversal(job) {
  if (job.traversalStoppedByExpected) return;
  job.traversalStoppedByExpected = true;
  job.pending = [];
  job.diagnostics.push(
    `traversal stopped by expectedCount=${expectedLimit(job)} rows=${job.rows.length}`
  );
}

function sortRowsBfs(rows) {
  if (!rows.length) return [];
  const byId = {};
  rows.forEach((row) => {
    byId[safeId(row.id)] = row;
  });
  const roots = rows.filter(
    (row) => row.root || !safeId(row.parentId) || !byId[safeId(row.parentId)]
  );
  const start = roots.length ? roots : [rows[0]];
  const out = [];
  const seen = new Set();
  function walk(row) {
    const id = safeId(row.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(row);
    rows.forEach((child) => {
      if (safeId(child.parentId) === id) walk(child);
    });
  }
  start.forEach(walk);
  rows.forEach((row) => {
    if (!seen.has(safeId(row.id))) out.push(row);
  });
  return out;
}

function trimRowsToExpected(job) {
  const expected = expectedLimit(job);
  if (!expected || job.rows.length <= expected) return job.rows;
  return sortRowsBfs(job.rows).slice(0, expected);
}

function addRow(job, parentRowId, depth, inst, ref, navId, meta = {}) {
  if (expectedReached(job)) {
    stopTraversal(job);
    return null;
  }
  if (job.rows.length >= MAX_ROWS) return null;

  const instanceId = safeId(inst && inst.id);
  const rowKey = `${parentRowId || 'ROOT'}|${instanceId || ref.id || navId || job.rows.length}`;

  if (job.rowKeys.has(rowKey)) return null;
  job.rowKeys.add(rowKey);

  const row = {
    id: rowKey,
    parentId: parentRowId || null,
    level: depth,
    instanceId,
    instanceName: safeId(inst && inst.name),
    name: safeId(inst && inst.name) || safeId(ref && ref.title) || safeId(ref && ref.id),
    title: safeId(ref && ref.title) || safeId(inst && inst.name),
    type: safeId(ref && ref.type) || safeId(inst && inst.type),
    physicalId: safeId(ref && ref.id),
    referenceId: safeId(ref && ref.id),
    navId: safeId(navId || (ref && ref.id)),
    maturity: safeId(inst && (inst.state || inst.maturity || inst.current)),
    state: safeId(inst && (inst.state || inst.maturity || inst.current)),
    owner: safeId(inst && inst.reservedby),
    reservedBy: safeId(inst && inst.reservedby),
    revision: safeId(ref && ref.revision) || safeId(inst && inst.revision),
    hasConfiguredInstance: safeId(inst && inst.hasConfiguredInstance),
    quantity: 1,
    source: meta.source || 'engInstance',
    root: !!meta.root,
    treeOrigin: safeId(meta.treeOrigin || 'engInstance'),
  };

  job.rows.push(row);
  if (expectedReached(job)) stopTraversal(job);
  return row;
}

function ensureRootRow(job) {
  if (job.rootRowAdded || !job.rootNavId) return;
  job.rootRowAdded = true;
  const candidate = job.candidates.get(job.rootNavId);
  const item = candidate && candidate.item;
  addRow(
    job,
    null,
    0,
    { id: job.rootNavId, name: job.rootName },
    {
      id: job.rootNavId,
      title: titleFromItem(item) || job.rootName,
      type: safeId(item && item.type) || 'VPMReference',
    },
    job.rootNavId,
    { source: 'root', root: true, treeOrigin: 'root-crawl' }
  );
}

function queueProbe(job, navId, meta = {}) {
  if (expectedReached(job)) return;
  navId = safeId(navId);
  if (!navId || job.probedNav.has(navId)) return;
  job.probedNav.add(navId);
  job.pending.push(task(`probe:${navId}`, engInstUrl(job.baseUrl, navId), { phase: 'probe', navId, ...meta }));
}

function queueSearchesForChild(job, refId, instName, parentRowId, depth) {
  const cleanName = stripInstanceName(instName);
  const key = `${refId}|${cleanName}|${parentRowId}|${depth}`;
  if (job.childSearchKeys.has(key)) return;
  job.childSearchKeys.add(key);

  if (refId) {
    job.pending.push(task(`child-search-id:${key}`, engSearchUrl(job.baseUrl, refId, 20), {
      phase: 'childSearch',
      refId,
      instName,
      parentRowId,
      depth,
    }));
    job.pending.push(task(`child-name-id:${key}`, engSearchUrl(job.baseUrl, `name:${refId}`, 20), {
      phase: 'childSearch',
      refId,
      instName,
      parentRowId,
      depth,
    }));
  }

  if (cleanName) {
    job.pending.push(task(`child-label:${key}`, engSearchUrl(job.baseUrl, `label:"${cleanName}"`, 20), {
      phase: 'childSearch',
      refId,
      instName,
      parentRowId,
      depth,
    }));
  }
}

function makeSummary(job, status, message) {
  const expected = expectedLimit(job);
  const rows = trimRowsToExpected(job);
  job.rows = rows;
  const actual = rows.length;
  return {
    status,
    message,
    jobId: job.id,
    build: 'browser-auth-bfs-20260612c',
    expectedCount: expected,
    actualCount: actual,
    partial: expected ? actual < expected : false,
    stoppedByExpected: !!job.traversalStoppedByExpected,
    rows,
    items: rows,
    bom: rows,
    diagnostics: job.diagnostics.slice(-200),
    done: status === 'done' || status === 'partial' || status === 'error',
  };
}

function nextTasks(job) {
  if (expectedReached(job)) {
    stopTraversal(job);
    return [];
  }
  const out = job.pending.splice(0, MAX_TASKS_PER_ROUND);
  return out;
}

function responseWithTasks(job, message = 'continue') {
  const tasks = nextTasks(job);
  return {
    ok: true,
    jobId: job.id,
    status: tasks.length ? 'running' : 'waiting',
    message,
    tasks,
    diagnostics: job.diagnostics.slice(-80),
    done: false,
  };
}

function collectResults(req) {
  const b = req && req.body ? req.body : {};
  if (Array.isArray(b.results)) return b.results;
  if (Array.isArray(b.responses)) return b.responses;
  if (Array.isArray(b.taskResults)) return b.taskResults;
  if (Array.isArray(b.data)) return b.data;
  return [];
}

function getResultId(r) {
  return safeId(r && (r.id || r.taskId || r.key));
}

function indexResults(results) {
  const map = new Map();
  for (const r of results) {
    const id = getResultId(r);
    if (id) map.set(id, r);
  }
  return map;
}

function processSearchPayload(job, payload, source) {
  for (const item of arr(payload)) {
    addUniqueCandidate(job, item, source);
  }
}

function scheduleRoot(job) {
  const rootName = safeId(job.rootName);
  const physicalId = safeId(job.physicalId);

  if (rootName) {
    job.pending.push(task('root-label', engSearchUrl(job.baseUrl, `label:"${rootName}"`, 20), { phase: 'rootSearch' }));
    job.pending.push(task('root-plain', engSearchPlainUrl(job.baseUrl, rootName, 20), { phase: 'rootSearch' }));
  }

  if (physicalId) {
    job.pending.push(task('root-physical', engSearchUrl(job.baseUrl, physicalId, 20), { phase: 'rootSearch' }));
    job.pending.push(task('root-name-physical', engSearchUrl(job.baseUrl, `name:${physicalId}`, 20), { phase: 'rootSearch' }));
    job.pending.push(task('root-plain-physical', engSearchPlainUrl(job.baseUrl, physicalId, 20), { phase: 'rootSearch' }));
  }
}

function scheduleCandidateProbes(job) {
  for (const [id] of job.candidates) {
    if (!job.candidateProbeQueued.has(id)) {
      job.candidateProbeQueued.add(id);
      job.pending.push(task(`candidate-inst:${id}`, engInstUrl(job.baseUrl, id, 25), { phase: 'candidateProbe', candidateId: id }));
      job.pending.push(task(`candidate-item:${id}`, engItemUrl(job.baseUrl, id), { phase: 'candidateItem', candidateId: id }));
    }
  }
}

function chooseRoot(job) {
  let best = null;
  for (const [id, c] of job.candidates) {
    const childCount = Number(c.childCount || 0);
    const s = scoreRootCandidate(job, c.item, childCount);
    if (!best || s > best.score) best = { id, score: s, childCount };
  }
  if (best && best.childCount > 0) {
    job.rootNavId = best.id;
    job.diagnostics.push(`root=${best.id}; childCount=${best.childCount}; score=${best.score}`);
    return best.id;
  }
  return null;
}

function processCandidateProbe(job, result, candidateId) {
  const payload = getPayload(result);
  const members = arr(payload);
  const c = job.candidates.get(candidateId);
  if (c) c.childCount = members.length;
}

function scheduleRootCrawl(job) {
  if (!job.rootNavId || job.rootCrawlQueued) return;
  job.rootCrawlQueued = true;
  ensureRootRow(job);
  var rootRow = null;
  for (var i = job.rows.length - 1; i >= 0; i -= 1) {
    if (job.rows[i] && job.rows[i].root) {
      rootRow = job.rows[i];
      break;
    }
  }
  job.pending.push(task(`crawl:${job.rootNavId}`, engInstUrl(job.baseUrl, job.rootNavId, 500), {
    phase: 'crawl',
    navId: job.rootNavId,
    parentRowId: rootRow ? rootRow.id : null,
    depth: 1,
    treeOrigin: 'root-crawl',
  }));
}

function processCrawl(job, result, meta) {
  const payload = getPayload(result);
  const members = arr(payload);
  const parentRowId = meta.parentRowId || null;
  const depth = Number(meta.depth || 1);
  const navId = safeId(meta.navId);

  job.diagnostics.push(`crawl nav=${navId}; depth=${depth}; children=${members.length}`);

  for (const inst of members) {
    if (expectedReached(job)) {
      stopTraversal(job);
      break;
    }
    const ref = refFromInstance(inst) || { id: '', type: '', title: '' };
    const treeOrigin = safeId(meta.treeOrigin) || (parentRowId ? 'probe-crawl' : 'root-crawl');
    const row = addRow(job, parentRowId, depth, inst, ref, null, {
      source: 'engInstance',
      treeOrigin,
    });

    const refId = safeId(ref.id);
    const refType = normalizeText(ref.type);
    const isAssemblyCandidate = refId && depth < MAX_DEPTH && refType.includes('product');

    if (row && isAssemblyCandidate && !expectedReached(job)) {
      queueProbe(job, refId, {
        parentRowId: row.id,
        depth: depth + 1,
        refId,
        instName: row.instanceName || row.name,
        treeOrigin: 'probe-crawl',
      });
    }

    if (expectedReached(job)) {
      stopTraversal(job);
      break;
    }
  }
}

function processProbe(job, result, meta) {
  if (expectedReached(job)) return;
  const payload = getPayload(result);
  const members = arr(payload);
  const navId = safeId(meta.navId);
  const parentRowId = meta.parentRowId || null;
  const depth = Number(meta.depth || 1);

  job.diagnostics.push(`probe nav=${navId}; children=${members.length}`);

  if (members.length > 0 && parentRowId) {
    job.pending.push(task(`crawl:${navId}:${parentRowId}`, engInstUrl(job.baseUrl, navId, 500), {
      phase: 'crawl',
      navId,
      parentRowId,
      depth,
      treeOrigin: 'probe-crawl',
    }));
  }
}

function processChildSearch(job, result, meta) {
  const payload = getPayload(result);
  const candidates = arr(payload);
  if (!candidates.length) return;

  let best = null;
  for (const c of candidates) {
    const id = idFromItem(c);
    if (!id) continue;
    const s = scoreChildCandidate(meta.refId, stripInstanceName(meta.instName), c, 0);
    if (!best || s > best.score) best = { id, item: c, score: s };
  }

  if (!best) return;
  job.diagnostics.push(`childSearch ref=${meta.refId}; best=${best.id}; score=${best.score}`);
  queueProbe(job, best.id, {
    parentRowId: meta.parentRowId,
    depth: meta.depth,
    refId: meta.refId,
    instName: meta.instName,
  });
}

export async function startBrowserBomJob(req, res) {
  try {
    const body = req.body || {};
    const baseUrl = cleanBaseUrl(body.spaceUrl || body.baseUrl || body.enoviaUrl || body.url);
    const rootName = safeId(body.rootName || body.title || body.name || body.label);
    const physicalId = safeId(body.physicalId || body.rootPhysicalId || body.id);
    const expectedCount = Number(body.expectedCount || body.expected || body.total || 0);

    if (!baseUrl) {
      return res.status(400).json({ ok: false, error: 'missing-space-url' });
    }

    const id = `bab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const job = {
      id,
      createdAt: now(),
      updatedAt: now(),
      baseUrl,
      rootName,
      physicalId,
      expectedCount,
      candidates: new Map(),
      seenCandidateIds: new Set(),
      candidateProbeQueued: new Set(),
      pending: [],
      rows: [],
      rowKeys: new Set(),
      probedNav: new Set(),
      childSearchKeys: new Set(),
      diagnostics: [],
      rootNavId: '',
      rootCrawlQueued: false,
      rootRowAdded: false,
      traversalStoppedByExpected: false,
    };

    job.diagnostics.push(`start rootName=${rootName}; physicalId=${physicalId}; expected=${expectedCount}`);
    scheduleRoot(job);
    JOBS.set(id, job);

    return res.json(responseWithTasks(job, 'root-search-started'));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

export async function continueBrowserBomJob(req, res) {
  try {
    const body = req.body || {};
    const jobId = safeId(body.jobId || body.id);
    const job = JOBS.get(jobId);

    if (!job) {
      return res.status(404).json({ ok: false, error: 'job-not-found', jobId });
    }

    job.updatedAt = now();
    const results = collectResults(req);

    for (const r of results) {
      const id = getResultId(r);
      const meta = (r && r.meta) || {};
      const payload = getPayload(r);

      if (!id && !meta.phase) continue;

      if (meta.phase === 'rootSearch' || id.startsWith('root-')) {
        processSearchPayload(job, payload, id);
      }

      if (meta.phase === 'candidateProbe' || id.startsWith('candidate-inst:')) {
        const candidateId = safeId(meta.candidateId || id.replace('candidate-inst:', ''));
        processCandidateProbe(job, r, candidateId);
      }

      if (meta.phase === 'crawl' || id.startsWith('crawl:')) {
        processCrawl(job, r, meta);
      }

      if (meta.phase === 'probe' || id.startsWith('probe:')) {
        processProbe(job, r, meta);
      }

      if (meta.phase === 'childSearch' || id.startsWith('child-search') || id.startsWith('child-label') || id.startsWith('child-name-id')) {
        processChildSearch(job, r, meta);
      }
    }

    if (!job.rootNavId) {
      scheduleCandidateProbes(job);
      chooseRoot(job);
    }

    if (job.rootNavId) {
      scheduleRootCrawl(job);
    }

    const expected = expectedLimit(job);
    if (expectedReached(job)) {
      stopTraversal(job);
      return res.json(makeSummary(job, 'done', `BOM Explorer: ${job.rows.length}/${expected}`));
    }

    const tasks = nextTasks(job);
    if (tasks.length) {
      return res.json({
        ok: true,
        jobId: job.id,
        status: 'running',
        message: `BOM em processamento: ${job.rows.length}${expected ? '/' + expected : ''}`,
        tasks,
        actualCount: job.rows.length,
        expectedCount: expected,
        diagnostics: job.diagnostics.slice(-120),
        done: false,
      });
    }

    const status = expected && job.rows.length < expected ? 'partial' : 'done';
    return res.json(makeSummary(
      job,
      status,
      expected ? `BOM parcial: ${job.rows.length}/${expected}` : `BOM processada: ${job.rows.length}`
    ));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}
