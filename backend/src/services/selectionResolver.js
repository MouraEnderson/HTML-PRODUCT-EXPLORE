import { normalizeEngItem, unwrapEngItemPayload } from './threeDxBomNormalizer.js';

const PHYSICAL_ID_RE = /^[0-9A-F]{24,32}$/i;
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
  'dsengEngItemId'
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
    if (CANDIDATE_KEYS.includes(key) || /physical|object|reference|engitem|root|selected/i.test(key)) {
      if (typeof value === 'string') {
        pushCandidate(list, seen, value, key.toLowerCase().includes('reference') ? 'reference-id' : 'physicalid', `${sourcePath || 'raw'}.${key}`);
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
    hasPlatformItem: !!raw.platformItem,
    hasExplorerContext: !!raw.explorerContext,
    candidateCount: extractSelectionCandidates(selection).length
  };
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

  for (const candidate of candidates) {
    if (candidate.strategy === 'manual-root') continue;
    if (!looksLikePhysicalId(candidate.candidate)) {
      attempts.push({
        strategy: candidate.strategy,
        candidate: candidate.maskedCandidate,
        endpoint: '(skipped)',
        status: 'INVALID',
        message: 'Candidate is not a physical id format'
      });
      continue;
    }
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

  const title = inputSummary.title;
  if (title) {
    attempts.push({
      strategy: 'search-title',
      candidate: title.slice(0, 80),
      endpoint: '(not-attempted)',
      status: 'SKIPPED',
      message: 'Title-only selection cannot be resolved without official search contract'
    });
  }

  return {
    ok: false,
    status: 'NOT_RESOLVED',
    inputSummary,
    attempts
  };
}
