import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikePhysicalId,
  looksLikePrdOrBusinessName,
  extractResolvableFields,
  extractSelectionCandidates,
  selectUniqueExactMatch,
  normalizeSearchResults,
  resolveSelectionToEngItem
} from './selectionResolver.js';
import { CJ_MESA_ROOT_ID } from './threeDxBomNormalizer.js';

const VALID_ROOT = CJ_MESA_ROOT_ID;
const PRD_NAME = 'prd-R1132100929518-01103695';
const TITLE = 'CJ MESA 4BCS VP TOP 3DX';

function mockSearchMember(overrides = {}) {
  return {
    id: VALID_ROOT,
    name: PRD_NAME,
    title: TITLE,
    type: 'VPMReference',
    revision: '1.1',
    state: 'IN_WORK',
    owner: 'rafael.ruiz',
    collabspace: 'Default',
    ...overrides
  };
}

function mockClient({ engItems = {}, searchMap = {} } = {}) {
  const engItemCalls = [];
  const searchCalls = [];
  return {
    engItemCalls,
    searchCalls,
    getEngItem(id) {
      engItemCalls.push(id);
      const entry = engItems[id];
      if (!entry) {
        const error = new Error('not found');
        error.status = 404;
        throw error;
      }
      return Promise.resolve({ data: entry });
    },
    searchEngItems(searchStr) {
      searchCalls.push(searchStr);
      const members = searchMap[searchStr] || [];
      return Promise.resolve({
        data: {
          totalItems: members.length,
          member: members
        }
      });
    }
  };
}

test('looksLikePhysicalId accepts hex and rejects prd-*', () => {
  assert.equal(looksLikePhysicalId(VALID_ROOT), true);
  assert.equal(looksLikePhysicalId('CJ MESA'), false);
  assert.equal(looksLikePhysicalId(PRD_NAME), false);
  assert.equal(looksLikePrdOrBusinessName(PRD_NAME), true);
});

test('extractResolvableFields separates hex, prd and title', () => {
  const fields = extractResolvableFields({
    normalized: {
      rootId: PRD_NAME,
      selectedId: PRD_NAME,
      title: TITLE,
      name: PRD_NAME
    }
  });
  assert.equal(fields.prdNames.includes(PRD_NAME), true);
  assert.equal(fields.titles.includes(TITLE), true);
  assert.equal(fields.hexIds.includes(PRD_NAME), false);
});

test('selectUniqueExactMatch resolves, blocks ambiguous and not found', () => {
  const single = [mockSearchMember()];
  const twoSameTitle = [mockSearchMember(), mockSearchMember({ id: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' })];
  assert.equal(selectUniqueExactMatch(single, { field: 'name', value: PRD_NAME }).status, 'RESOLVED');
  assert.equal(selectUniqueExactMatch(twoSameTitle, { field: 'title', value: TITLE }).status, 'AMBIGUOUS');
  assert.equal(selectUniqueExactMatch(single, { field: 'title', value: 'Unknown' }).status, 'NOT_FOUND');
});

test('case 1 manual-root hexadecimal valid', async () => {
  const client = mockClient({
    engItems: { [VALID_ROOT]: { id: VALID_ROOT, title: TITLE, name: PRD_NAME } }
  });
  const result = await resolveSelectionToEngItem({ normalized: { title: TITLE } }, { client, manualRootId: VALID_ROOT });
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'manual-root');
  assert.equal(result.rootId, VALID_ROOT);
});

test('case 2 direct hex id resolves direct-engitem', async () => {
  const client = mockClient({
    engItems: { [VALID_ROOT]: { id: VALID_ROOT, title: TITLE, name: PRD_NAME } }
  });
  const result = await resolveSelectionToEngItem({ normalized: { rootId: VALID_ROOT, title: TITLE } }, { client });
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'direct-engitem');
  assert.equal(client.engItemCalls.includes(PRD_NAME), false);
});

test('case 3 prd-* resolves via search name without direct EngItem on prd', async () => {
  const client = mockClient({
    engItems: { [VALID_ROOT]: { id: VALID_ROOT, title: TITLE, name: PRD_NAME } },
    searchMap: {
      [`name:${PRD_NAME}`]: [mockSearchMember()]
    }
  });
  const result = await resolveSelectionToEngItem(
    { normalized: { name: PRD_NAME, title: TITLE, rootId: PRD_NAME, selectedId: PRD_NAME } },
    { client }
  );
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'search-name-prd');
  assert.equal(result.rootId, VALID_ROOT);
  assert.equal(client.engItemCalls.includes(PRD_NAME), false);
  assert.ok(client.searchCalls.some((s) => s === `name:${PRD_NAME}`));
});

test('case 4 title resolves via search label', async () => {
  const client = mockClient({
    engItems: { [VALID_ROOT]: { id: VALID_ROOT, title: TITLE, name: PRD_NAME } },
    searchMap: {
      [`label:"${TITLE}"`]: [mockSearchMember()]
    }
  });
  const result = await resolveSelectionToEngItem({ normalized: { title: TITLE } }, { client });
  assert.equal(result.ok, true);
  assert.equal(result.strategy, 'search-title-label');
  assert.equal(result.rootId, VALID_ROOT);
});

test('case 5 ambiguous title blocks resolution', async () => {
  const client = mockClient({
    searchMap: {
      [`label:"${TITLE}"`]: [mockSearchMember(), mockSearchMember({ id: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' })]
    }
  });
  const result = await resolveSelectionToEngItem({ normalized: { title: TITLE } }, { client });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'AMBIGUOUS');
});

test('case 6 title not found returns NOT_RESOLVED', async () => {
  const client = mockClient({ searchMap: {} });
  const result = await resolveSelectionToEngItem({ normalized: { title: 'Unknown assembly' } }, { client });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'NOT_RESOLVED');
});

test('case 7 prd direct EngItem is never called', async () => {
  const client = mockClient({
    engItems: { [VALID_ROOT]: { id: VALID_ROOT, title: TITLE, name: PRD_NAME } },
    searchMap: { [`name:${PRD_NAME}`]: [mockSearchMember()] }
  });
  await resolveSelectionToEngItem({ normalized: { rootId: PRD_NAME } }, { client });
  assert.equal(client.engItemCalls.includes(PRD_NAME), false);
});

test('normalizeSearchResults maps member payload', () => {
  const out = normalizeSearchResults({
    totalItems: 1,
    member: [{ id: VALID_ROOT, name: PRD_NAME, title: TITLE }]
  });
  assert.equal(out.totalItems, 1);
  assert.equal(out.member[0].id, VALID_ROOT);
  assert.equal(out.member[0].name, PRD_NAME);
});

test('extractSelectionCandidates keeps manual root first', () => {
  const list = extractSelectionCandidates({
    manualRootId: VALID_ROOT,
    normalized: { rootId: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }
  });
  assert.equal(list[0].strategy, 'manual-root');
});
