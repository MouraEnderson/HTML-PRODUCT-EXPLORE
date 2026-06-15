import { extractMembers, objectId } from './enoviaClient.js';
import { normalizeEngItem, unwrapEngItemPayload } from './threeDxBomNormalizer.js';

const PHYSICAL_ID_RE = /^[0-9A-F]{24,32}$/i;
const PRD_NAME_RE = /^(prd|bfa)-/i;
const SEARCH_ENDPOINT = '/resources/v1/modeler/dseng/dseng:EngItem/search';
const ENG_ITEM_ENDPOINT = '/resources/v1/modeler/dseng/dseng:EngItem/{ID}';

const STRING_FIELD_KEYS = [
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
  'name',
  'displayName',
  'label',
  'title',
  'productName',
  'rootName'
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
  if (PRD_NAME_RE.test(id)) return false;
  return PHYSICAL_ID_RE.test(id);
}

export function looksLikePrdOrBusinessName(value) {
  const v = normalizeString(value);
  return !!v && PRD_NAME_RE.test(v);
}

function maskCandidate(value) {
  const id = normalizeString(value);
  if (!id) return '';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function pushUnique(list, seen, value) {
  const v = normalizeString(value);
  if (!v || seen.has(v)) return;
  seen.add(v);
  list.push(v);
}

export function normalizeSearchMember(item) {
  if (!item || typeof item !== 'object') return null;
  const id = objectId(item);
  if (!id) return null;
  return {
    id,
    name: normalizeString(item.name),
    title: normalizeString(item.title),
    type: normalizeString(item.type),
    revision: normalizeString(item.revision),
    state: normalizeString(item.state || item.maturity),
    owner: normalizeString(item.owner || item.originatedBy || item.ownerName),
    collabspace: normalizeString(item.collabspace)
  };
}

export function normalizeSearchResults(data) {
  const member = extractMembers(data)
    .map(normalizeSearchMember)
    .filter(Boolean);
  return {
    totalItems: Number(data?.totalItems ?? member.length),
    member
  };
}

export function selectUniqueExactMatch(members, { field, value }) {
  const input = normalizeString(value);
  if (!input) {
    return { status: 'NOT_FOUND', matches: [], selected: null, reason: 'empty input' };
  }
  const matches = (members || []).filter((item) => normalizeString(item[field]) === input);
  if (matches.length === 1) {
    return { status: 'RESOLVED', matches, selected: matches[0], reason: 'exact unique match' };
  }
  if (matches.length > 1) {
    return { status: 'AMBIGUOUS', matches, selected: null, reason: 'multiple exact matches' };
  }
  return { status: 'NOT_FOUND', matches: [], selected: null, reason: 'no exact match' };
}

function walkRawStrings(node, collectors, depth, sourcePath) {
  if (depth > 4 || node == null) return;
  if (typeof node === 'string') {
    considerString(node, collectors, sourcePath || 'raw.string');
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.slice(0, 20).forEach((item, index) => {
      walkRawStrings(item, collectors, depth + 1, `${sourcePath || 'raw'}[${index}]`);
    });
    return;
  }
  for (const key of Object.keys(node).slice(0, 40)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    const value = node[key];
    if (typeof value === 'string') {
      if (STRING_FIELD_KEYS.includes(key) || /physical|object|reference|engitem|root|selected|name|title|label|display/i.test(key)) {
        considerString(value, collectors, `${sourcePath || 'raw'}.${key}`);
      }
      if (/^title$|^label$|^displayName$/i.test(key)) {
        pushUnique(collectors.titles, collectors.titleSeen, value);
      }
    } else {
      walkRawStrings(value, collectors, depth + 1, `${sourcePath || 'raw'}.${key}`);
    }
  }
}

function considerString(value, collectors, _sourcePath) {
  const v = normalizeString(value);
  if (!v) return;
  if (looksLikePhysicalId(v)) {
    pushUnique(collectors.hexIds, collectors.hexSeen, v);
  } else if (looksLikePrdOrBusinessName(v)) {
    pushUnique(collectors.prdNames, collectors.prdSeen, v);
  }
}

export function extractResolvableFields(selection = {}) {
  const normalized = selection.normalized || {};
  const raw = selection.raw || {};
  const collectors = {
    manualRootId: normalizeString(selection.manualRootId || normalized.manualRootId),
    hexIds: [],
    prdNames: [],
    titles: [],
    hexSeen: new Set(),
    prdSeen: new Set(),
    titleSeen: new Set()
  };

  considerString(collectors.manualRootId, collectors, 'manualRootId');
  considerString(normalized.rootId, collectors, 'normalized.rootId');
  considerString(normalized.selectedId, collectors, 'normalized.selectedId');
  considerString(normalized.name, collectors, 'normalized.name');
  considerString(normalized.physicalId, collectors, 'normalized.physicalId');
  pushUnique(collectors.titles, collectors.titleSeen, normalized.title);
  pushUnique(collectors.titles, collectors.titleSeen, normalized.label);
  pushUnique(collectors.titles, collectors.titleSeen, normalized.displayName);
  pushUnique(collectors.titles, collectors.titleSeen, normalized.productName);
  pushUnique(collectors.titles, collectors.titleSeen, normalized.rootName);

  if (raw.platformItem) walkRawStrings(raw.platformItem, collectors, 0, 'raw.platformItem');
  if (raw.explorerContext) walkRawStrings(raw.explorerContext, collectors, 0, 'raw.explorerContext');
  walkRawStrings(raw, collectors, 0, 'raw');

  return {
    manualRootId: collectors.manualRootId,
    hexIds: collectors.hexIds,
    prdNames: collectors.prdNames,
    titles: collectors.titles
  };
}

/** @deprecated use extractResolvableFields */
export function extractSelectionCandidates(selection = {}) {
  const fields = extractResolvableFields(selection);
  const out = [];
  if (fields.manualRootId) {
    out.push({ candidate: fields.manualRootId, maskedCandidate: maskCandidate(fields.manualRootId), strategy: 'manual-root', sourcePath: 'manualRootId' });
  }
  fields.hexIds.forEach((id) => {
    out.push({ candidate: id, maskedCandidate: maskCandidate(id), strategy: 'direct-engitem', sourcePath: 'hexId' });
  });
  fields.prdNames.forEach((name) => {
    out.push({ candidate: name, maskedCandidate: maskCandidate(name), strategy: 'search-name-prd', sourcePath: 'prdName' });
  });
  return out;
}

function summarizeInput(selection = {}) {
  const normalized = selection.normalized || {};
  const raw = selection.raw || {};
  const fields = extractResolvableFields(selection);
  return {
    source: normalizeString(selection.source || normalized.source || raw.source),
    title: normalizeString(normalized.title || raw.title || raw.displayName),
    name: normalizeString(normalized.name || normalized.rootId || normalized.selectedId),
    hasPlatformItem: !!raw.platformItem,
    hasExplorerContext: !!raw.explorerContext,
    hexCandidateCount: fields.hexIds.length,
    prdCandidateCount: fields.prdNames.length,
    titleCandidateCount: fields.titles.length
  };
}

function buildAttempt({ strategy, input, endpoint, status, matches, selectedId, reason, message }) {
  return {
    strategy,
    input: maskCandidate(input),
    endpoint,
    status,
    matches: matches != null ? matches : undefined,
    selectedId: selectedId ? maskCandidate(selectedId) : undefined,
    reason: reason || message || undefined,
    message: message || reason || undefined
  };
}

async function tryDirectEngItem(client, hexId, strategy) {
  try {
    const result = await client.getEngItem(hexId);
    const item = normalizeEngItem(unwrapEngItemPayload(result.data));
    if (!item.id) {
      return {
        ok: false,
        attempt: buildAttempt({
          strategy,
          input: hexId,
          endpoint: ENG_ITEM_ENDPOINT,
          status: 404,
          reason: 'EngItem payload without id'
        })
      };
    }
    return {
      ok: true,
      rootId: item.id,
      rootName: item.name || '',
      rootTitle: item.title || hexId,
      strategy,
      attempt: buildAttempt({
        strategy,
        input: hexId,
        endpoint: ENG_ITEM_ENDPOINT,
        status: 200,
        selectedId: item.id,
        reason: 'EngItem GET ok'
      })
    };
  } catch (error) {
    return {
      ok: false,
      attempt: buildAttempt({
        strategy,
        input: hexId,
        endpoint: ENG_ITEM_ENDPOINT,
        status: Number(error?.status || 502),
        reason: error?.message || 'EngItem lookup failed'
      })
    };
  }
}

async function trySearchByName(client, name) {
  const searchStr = `name:${name}`;
  try {
    const result = await client.searchEngItems(searchStr);
    const normalized = normalizeSearchResults(result.data);
    const pick = selectUniqueExactMatch(normalized.member, { field: 'name', value: name });
    const attemptBase = {
      strategy: 'search-name-prd',
      input: name,
      endpoint: SEARCH_ENDPOINT,
      matches: pick.matches.length,
      reason: pick.reason
    };
    if (pick.status === 'AMBIGUOUS') {
      return {
        ok: false,
        ambiguous: true,
        attempt: buildAttempt({ ...attemptBase, status: 'AMBIGUOUS' })
      };
    }
    if (pick.status !== 'RESOLVED' || !pick.selected) {
      return {
        ok: false,
        attempt: buildAttempt({ ...attemptBase, status: 'NOT_FOUND' })
      };
    }
    const verified = await tryDirectEngItem(client, pick.selected.id, 'search-name-prd');
    verified.attempt = buildAttempt({
      strategy: 'search-name-prd',
      input: name,
      endpoint: SEARCH_ENDPOINT,
      status: 200,
      matches: 1,
      selectedId: pick.selected.id,
      reason: `search name exact → ${pick.selected.id}`
    });
    return verified;
  } catch (error) {
    return {
      ok: false,
      attempt: buildAttempt({
        strategy: 'search-name-prd',
        input: name,
        endpoint: SEARCH_ENDPOINT,
        status: Number(error?.status || 502),
        reason: error?.message || 'search name failed'
      })
    };
  }
}

async function trySearchByTitle(client, title) {
  const searchStr = `label:"${title.replace(/"/g, '')}"`;
  try {
    const result = await client.searchEngItems(searchStr);
    const normalized = normalizeSearchResults(result.data);
    const pick = selectUniqueExactMatch(normalized.member, { field: 'title', value: title });
    const attemptBase = {
      strategy: 'search-title-label',
      input: title.slice(0, 80),
      endpoint: SEARCH_ENDPOINT,
      matches: pick.matches.length,
      reason: pick.reason
    };
    if (pick.status === 'AMBIGUOUS') {
      return {
        ok: false,
        ambiguous: true,
        attempt: buildAttempt({ ...attemptBase, status: 'AMBIGUOUS' })
      };
    }
    if (pick.status !== 'RESOLVED' || !pick.selected) {
      return {
        ok: false,
        attempt: buildAttempt({ ...attemptBase, status: 'NOT_FOUND' })
      };
    }
    const verified = await tryDirectEngItem(client, pick.selected.id, 'search-title-label');
    verified.attempt = buildAttempt({
      strategy: 'search-title-label',
      input: title.slice(0, 80),
      endpoint: SEARCH_ENDPOINT,
      status: 200,
      matches: 1,
      selectedId: pick.selected.id,
      reason: `search label exact → ${pick.selected.id}`
    });
    return verified;
  } catch (error) {
    return {
      ok: false,
      attempt: buildAttempt({
        strategy: 'search-title-label',
        input: title.slice(0, 80),
        endpoint: SEARCH_ENDPOINT,
        status: Number(error?.status || 502),
        reason: error?.message || 'search label failed'
      })
    };
  }
}

async function trySafeFallbackSearch(client, text) {
  const trimmed = normalizeString(text);
  if (!trimmed || trimmed.length < 3) return { ok: false, skipped: true };
  try {
    const result = await client.searchEngItems(trimmed);
    const normalized = normalizeSearchResults(result.data);
    const byName = selectUniqueExactMatch(normalized.member, { field: 'name', value: trimmed });
    const byTitle = selectUniqueExactMatch(normalized.member, { field: 'title', value: trimmed });
    const pick = byName.status === 'RESOLVED' ? byName : byTitle.status === 'RESOLVED' ? byTitle : null;
    if (!pick || !pick.selected) {
      const ambiguous = byName.status === 'AMBIGUOUS' || byTitle.status === 'AMBIGUOUS';
      return {
        ok: false,
        ambiguous,
        attempt: buildAttempt({
          strategy: 'search-fallback-safe',
          input: trimmed.slice(0, 80),
          endpoint: SEARCH_ENDPOINT,
          status: ambiguous ? 'AMBIGUOUS' : 'NOT_FOUND',
          matches: normalized.member.length,
          reason: ambiguous ? 'multiple exact matches' : 'no exact unique match'
        })
      };
    }
    const verified = await tryDirectEngItem(client, pick.selected.id, 'search-fallback-safe');
    verified.attempt = buildAttempt({
      strategy: 'search-fallback-safe',
      input: trimmed.slice(0, 80),
      endpoint: SEARCH_ENDPOINT,
      status: 200,
      matches: 1,
      selectedId: pick.selected.id,
      reason: 'fallback exact unique'
    });
    return verified;
  } catch (error) {
    return {
      ok: false,
      attempt: buildAttempt({
        strategy: 'search-fallback-safe',
        input: trimmed.slice(0, 80),
        endpoint: SEARCH_ENDPOINT,
        status: Number(error?.status || 502),
        reason: error?.message || 'fallback search failed'
      })
    };
  }
}

function resolvedPayload(resolution, inputSummary, attempts) {
  return {
    ok: true,
    status: 'RESOLVED',
    strategy: resolution.strategy,
    rootId: resolution.rootId,
    rootName: resolution.rootName || '',
    rootTitle: resolution.rootTitle,
    inputSummary,
    attempts
  };
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
  const fields = extractResolvableFields(selection);
  const inputSummary = summarizeInput(selection);

  if (fields.manualRootId) {
    if (!looksLikePhysicalId(fields.manualRootId)) {
      attempts.push(
        buildAttempt({
          strategy: 'manual-root',
          input: fields.manualRootId,
          endpoint: '(skipped)',
          status: 'INVALID',
          reason: 'Manual rootId is not a valid hexadecimal physical id'
        })
      );
    } else if (client) {
      const resolved = await tryDirectEngItem(client, fields.manualRootId, 'manual-root');
      attempts.push(resolved.attempt);
      if (resolved.ok) return resolvedPayload(resolved, inputSummary, attempts);
    } else if (looksLikePhysicalId(fields.manualRootId)) {
      return resolvedPayload(
        {
          strategy: 'manual-root',
          rootId: fields.manualRootId,
          rootName: '',
          rootTitle: inputSummary.title || fields.manualRootId
        },
        inputSummary,
        attempts
      );
    }
  }

  const hexTried = new Set();
  if (fields.manualRootId && looksLikePhysicalId(fields.manualRootId)) {
    hexTried.add(fields.manualRootId);
  }

  for (const hexId of fields.hexIds) {
    if (hexTried.has(hexId)) continue;
    hexTried.add(hexId);
    if (!client) {
      return resolvedPayload(
        { strategy: 'direct-engitem', rootId: hexId, rootName: '', rootTitle: inputSummary.title || hexId },
        inputSummary,
        attempts
      );
    }
    const resolved = await tryDirectEngItem(client, hexId, 'direct-engitem');
    attempts.push(resolved.attempt);
    if (resolved.ok) return resolvedPayload(resolved, inputSummary, attempts);
  }

  if (client) {
    for (const name of fields.prdNames) {
      const resolved = await trySearchByName(client, name);
      attempts.push(resolved.attempt);
      if (resolved.ok) return resolvedPayload(resolved, inputSummary, attempts);
      if (resolved.ambiguous) {
        return { ok: false, status: 'AMBIGUOUS', inputSummary, attempts };
      }
    }

    for (const title of fields.titles) {
      const resolved = await trySearchByTitle(client, title);
      attempts.push(resolved.attempt);
      if (resolved.ok) return resolvedPayload(resolved, inputSummary, attempts);
      if (resolved.ambiguous) {
        return { ok: false, status: 'AMBIGUOUS', inputSummary, attempts };
      }
    }

    for (const title of fields.titles) {
      const resolved = await trySafeFallbackSearch(client, title);
      if (resolved.skipped) continue;
      attempts.push(resolved.attempt);
      if (resolved.ok) return resolvedPayload(resolved, inputSummary, attempts);
      if (resolved.ambiguous) {
        return { ok: false, status: 'AMBIGUOUS', inputSummary, attempts };
      }
    }
  } else {
    for (const name of fields.prdNames) {
      attempts.push(
        buildAttempt({
          strategy: 'search-name-prd',
          input: name,
          endpoint: '(no-client)',
          status: 'SKIPPED',
          reason: 'dseng search requires configured backend client'
        })
      );
    }
    for (const title of fields.titles) {
      attempts.push(
        buildAttempt({
          strategy: 'search-title-label',
          input: title.slice(0, 80),
          endpoint: '(no-client)',
          status: 'SKIPPED',
          reason: 'dseng search requires configured backend client'
        })
      );
    }
  }

  return {
    ok: false,
    status: 'NOT_RESOLVED',
    inputSummary,
    attempts
  };
}
