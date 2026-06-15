import { normalizeEngItem, unwrapEngItemPayload } from './threeDxBomNormalizer.js';

const PHYSICAL_ID_RE = /^[0-9A-F]{24,32}$/i;
const PRD_NAME_RE = /^prd-[A-Za-z0-9_-]+$/i;
const CANDIDATE_KEYS = [
  'physicalId',
  'physicalid',
  'id',
  'objectId',
  'selectedId',
  'rootId',
  'referenceId',
  'engItemId',
  'pid',
  'memberId',
  'memberid',
  'dsengEngItemId',
  'name',
  'title',
  'label'
];

const SENSITIVE_KEY_RE = /cookie|token|authorization|password|secret|bearer/i;

function normalizeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function looksLikePhysicalId(value) {
  const id = normalizeString(value);
  if (!id || id.length < 16) return false;
  if (/\s/.test(id)) return false;
  if (/^prd-/i.test(id)) return false;
  return PHYSICAL_ID_RE.test(id);
}

export function looksLikePrdName(value) {
  const id = normalizeString(value);
  if (!id || /\s/.test(id)) return false;
  return PRD_NAME_RE.test(id);
}

function maskCandidate(value) {
  const id = normalizeString(value);
  if (!id) return '';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function pushCandidate(list, seen, value, strategy, sourcePath) {
  const id = normalizeString(value);
  if (!id || seen.has(id)) return;
  seen.add(id);
  list.push({
    candidate: id,
    maskedCandidate: maskCandidate(id),
    strategy,
    sourcePath
  });
}

function walkRawCandidates(node, list, seen, depth, sourcePath) {
  if (depth > 4 || node == null) return;
  if (typeof node === 'string') {
    if (looksLikePhysicalId(node)) {
      pushCandidate(list, seen, node, 'physicalid', sourcePath || 'raw.string');
    } else if (looksLikePrdName(node)) {
      pushCandidate(list, seen, node, 'prd-name', sourcePath || 'raw.string');
    }
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.slice(0, 20).forEach(function (item, index) {
      walkRawCandidates(item, list, seen, depth + 1, `${sourcePath || 'raw'}[${index}]`);
    });
    return;
  }
  for (const key of Object.keys(node).slice(0, 40)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    const value = node[key];
    if (CANDIDATE_KEYS.includes(key) || /physical|object|reference|engitem|root|selected|title|label|name/i.test(key)) {
      if (typeof value === 'string') {
        let strategy = key.toLowerCase().includes('reference') ? 'reference-id' : 'physicalid';
        if (looksLikePrdName(value) || /name/i.test(key)) strategy = 'prd-name';
        if (/title|label/i.test(key) && !looksLikePhysicalId(value) && !looksLikePrdName(value)) strategy = 'selection-title';
        pushCandidate(list, seen, value, strategy, `${sourcePath || 'raw'}.${key}`);
      }
    }
    walkRawCandidates(value, list, seen, depth + 1, `${sourcePath || 'raw'}.${key}`);
  }
}

export function extractSelectionCandidates(selection = {}) {
  const normalized = selection.normalized || {};
  const raw = selection.raw || {};
  const manualRootId = normalizeString(selection.manualRootId || normalized.manualRootId);
  const seen = new Set();
  const candidates = [];

  if (manualRootId) {
    pushCandidate(candidates, seen, manualRootId, 'manual-root', 'manualRootId');
  }

  pushCandidate(candidates, seen, normalized.rootId, 'direct-engitem', 'normalized.rootId');
  pushCandidate(candidates, seen, normalized.selectedId, 'direct-engitem', 'normalized.selectedId');
  pushCandidate(candidates, seen, normalized.name, 'prd-name', 'normalized.name');
  pushCandidate(candidates, seen, normalized.title, 'selection-title', 'normalized.title');

  if (raw.platformItem) {
    walkRawCandidates(raw.platformItem, candidates, seen, 0, 'raw.platformItem');
  }
  if (raw.explorerContext) {
    walkRawCandidates(raw.explorerContext, candidates, seen, 0, 'raw.explorerContext');
  }
  walkRawCandidates(raw, candidates, seen, 0, 'raw');

  return candidates;
}

function summarizeInput(selection = {}) {
  const normalized = selection.normalized || {};
  const raw = selection.raw || {};
  return {
    source: normalizeString(selection.source || normalized.source || raw.source),
    title: normalizeString(normalized.title || raw.title || raw.displayName),
    name: normalizeString(normalized.name || raw.name || raw.platformItem?.name || raw.explorerContext?.name),
    hasPlatformItem: !!raw.platformItem,
    hasExplorerContext: !!raw.explorerContext,
    candidateCount: extractSelectionCandidates(selection).length
  };
}

function searchMembers(data) {
  if (!data) return [];
  if (Array.isArray(data.member)) return data.member;
  if (Array.isArray(data.members)) return data.members;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function quoteSearchValue(value) {
  return normalizeString(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function summarizeSearchEndpoint(searchStr) {
  return `/dseng:EngItem/search?$searchStr=${searchStr}`;
}

async function tryCandidateEngItem(client, candidate, strategy) {
  const endpoint = '/resources/v1/modeler/dseng/dseng:EngItem/{ID}';
  try {
    const result = await client.getEngItem(candidate.candidate);
    const item = normalizeEngItem(unwrapEngItemPayload(result.data));
    if (!item.id) {
      return {
        ok: false,
        attempt: {
          strategy: strategy || candidate.strategy,
          candidate: candidate.maskedCandidate || maskCandidate(candidate.candidate),
          endpoint,
          status: 404,
          message: 'EngItem payload without id'
        }
      };
    }
    return {
      ok: true,
      rootId: item.id,
      rootTitle: item.title || candidate.candidate,
      strategy: strategy || candidate.strategy,
      attempt: {
        strategy: strategy || candidate.strategy,
        candidate: candidate.maskedCandidate || maskCandidate(candidate.candidate),
        endpoint,
        status: 200,
        rootTitle: item.title || ''
      }
    };
  } catch (error) {
    return {
      ok: false,
      attempt: {
        strategy: strategy || candidate.strategy,
        candidate: candidate.maskedCandidate || maskCandidate(candidate.candidate),
        endpoint,
        status: Number(error?.status || 502),
        message: error?.message || 'EngItem lookup failed'
      }
    };
  }
}

async function trySearchExactEngItem(client, searchStr, candidateValue, strategy, matchField) {
  const endpoint = summarizeSearchEndpoint(searchStr);
  try {
    const result = await client.searchEngItems(searchStr, 20);
    const members = searchMembers(result.data);
    const expected = normalizeString(candidateValue);
    const exact = members.filter(function (member) {
      const item = normalizeEngItem(member);
      if (matchField === 'name') return normalizeString(item.name) === expected;
      if (matchField === 'title') return normalizeString(item.title) === expected;
      return normalizeString(item.id) === expected || normalizeString(item.name) === expected || normalizeString(item.title) === expected;
    });

    if (exact.length !== 1) {
      return {
        ok: false,
        attempt: {
          strategy,
          candidate: maskCandidate(expected),
          endpoint,
          status: exact.length ? 'AMBIGUOUS' : 'NOT_FOUND',
          message: exact.length ? `${exact.length} exact matches; not safe to auto-resolve` : 'No exact dseng search match',
          count: members.length,
          exactCount: exact.length
        }
      };
    }

    const item = normalizeEngItem(exact[0]);
    if (!looksLikePhysicalId(item.id)) {
      return {
        ok: false,
        attempt: {
          strategy,
          candidate: maskCandidate(expected),
          endpoint,
          status: 'INVALID',
          message: 'Search result does not contain a valid EngItem id',
          count: members.length,
          exactCount: exact.length
        }
      };
    }

    const resolved = await tryCandidateEngItem(
      client,
      { candidate: item.id, maskedCandidate: maskCandidate(item.id), strategy, sourcePath: endpoint },
      strategy
    );
    return {
      ...resolved,
      attempt: {
        ...resolved.attempt,
        searchEndpoint: endpoint,
        searchCandidate: maskCandidate(expected),
        searchCount: members.length,
        searchExactCount: exact.length
      }
    };
  } catch (error) {
    return {
      ok: false,
      attempt: {
        strategy,
        candidate: maskCandidate(candidateValue),
        endpoint,
        status: Number(error?.status || 502),
        message: error?.message || 'EngItem search failed'
      }
    };
  }
}

async function resolveDirectCandidates(client, candidates, inputSummary, attempts) {
  for (const candidate of candidates) {
    if (candidate.strategy === 'manual-root') continue;
    if (!looksLikePhysicalId(candidate.candidate)) continue;
    if (!client) {
      return {
        ok: true,
        status: 'RESOLVED',
        strategy: candidate.strategy,
        rootId: candidate.candidate,
        rootTitle: inputSummary.title || candidate.candidate,
        inputSummary,
        attempts
      };
    }
    const resolved = await tryCandidateEngItem(client, candidate, candidate.strategy);
    attempts.push(resolved.attempt);
    if (resolved.ok) {
      return {
        ok: true,
        status: 'RESOLVED',
        strategy: resolved.strategy,
        rootId: resolved.rootId,
        rootTitle: resolved.rootTitle,
        inputSummary,
        attempts
      };
    }
  }
  return null;
}

async function resolvePrdNameCandidates(client, candidates, inputSummary, attempts) {
  for (const candidate of candidates) {
    if (!looksLikePrdName(candidate.candidate)) continue;
    if (!client) continue;
    const searchStr = `name:${quoteSearchValue(candidate.candidate)}`;
    const resolved = await trySearchExactEngItem(client, searchStr, candidate.candidate, 'search-name', 'name');
    attempts.push(resolved.attempt);
    if (resolved.ok) {
      return {
        ok: true,
        status: 'RESOLVED',
        strategy: resolved.strategy,
        rootId: resolved.rootId,
        rootTitle: resolved.rootTitle,
        inputSummary,
        attempts
      };
    }
  }
  return null;
}

async function resolveTitleCandidates(client, inputSummary, attempts) {
  const title = inputSummary.title;
  if (!title || !client) return null;
  const searchStr = `label:\"${quoteSearchValue(title)}\"`;
  const resolved = await trySearchExactEngItem(client, searchStr, title, 'search-title-label', 'title');
  attempts.push(resolved.attempt);
  if (resolved.ok) {
    return {
      ok: true,
      status: 'RESOLVED',
      strategy: resolved.strategy,
      rootId: resolved.rootId,
      rootTitle: resolved.rootTitle,
      inputSummary,
      attempts
    };
  }
  return null;
}

export async function resolveSelectionToEngItem(selection, options = {}) {
  selection = selection || {};
  options = options || {};
  const client = options.client;

  if (options.manualRootId) {
    selection = {
      ...selection,
      manualRootId: options.manualRootId,
      normalized: { ...(selection.normalized || {}), manualRootId: options.manualRootId }
    };
  }

  const attempts = [];
  const candidates = extractSelectionCandidates(selection);
  const inputSummary = summarizeInput(selection);
  const manualCandidate = candidates.find((item) => item.strategy === 'manual-root');
  if (manualCandidate) {
    if (!looksLikePhysicalId(manualCandidate.candidate)) {
      attempts.push({
        strategy: 'manual-root',
        candidate: manualCandidate.maskedCandidate,
        endpoint: '(skipped)',
        status: 'INVALID',
        message: 'Manual rootId is not a valid physical id format'
      });
    } else if (client) {
      const resolved = await tryCandidateEngItem(client, manualCandidate, 'manual-root');
      attempts.push(resolved.attempt);
      if (resolved.ok) {
        return {
          ok: true,
          status: 'RESOLVED',
          strategy: resolved.strategy,
          rootId: resolved.rootId,
          rootTitle: resolved.rootTitle,
          inputSummary,
          attempts
        };
      }
    } else if (looksLikePhysicalId(manualCandidate.candidate)) {
      return {
        ok: true,
        status: 'RESOLVED',
        strategy: 'manual-root',
        rootId: manualCandidate.candidate,
        rootTitle: inputSummary.title || manualCandidate.candidate,
        inputSummary,
        attempts
      };
    }
  }

  const directResolved = await resolveDirectCandidates(client, candidates, inputSummary, attempts);
  if (directResolved) return directResolved;

  const prdResolved = await resolvePrdNameCandidates(client, candidates, inputSummary, attempts);
  if (prdResolved) return prdResolved;

  const titleResolved = await resolveTitleCandidates(client, inputSummary, attempts);
  if (titleResolved) return titleResolved;

  for (const candidate of candidates) {
    if (candidate.strategy === 'manual-root') continue;
    if (looksLikePhysicalId(candidate.candidate) || looksLikePrdName(candidate.candidate)) continue;
    attempts.push({
      strategy: candidate.strategy,
      candidate: candidate.maskedCandidate,
      endpoint: '(skipped)',
      status: 'INVALID',
      message: 'Candidate is not a resolvable dseng EngItem id or prd name'
    });
  }

  return {
    ok: false,
    status: 'NOT_RESOLVED',
    inputSummary,
    attempts
  };
}
