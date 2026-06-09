import crypto from 'node:crypto';

const jobs = new Map();
const TTL = 15 * 60 * 1000;

export function startBrowserBomJob(input = {}) {
  sweep();
  const id = crypto.randomUUID();
  const job = {
    id,
    phase: 'root-search',
    updatedAt: Date.now(),
    rootName: s(input.rootName),
    physicalId: s(input.physicalId),
    expectedCount: Number(input.expectedCount || 0),
    maxItems: Number(input.maxItems || process.env