import crypto from 'node:crypto';

const jobs = new Map();
const TTL = 15 * 60 * 1000;

export function startBrowserBomJob(input = {}) {
  cleanup();
  const job = {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    phase: 'root-search',
    physicalId: txt(input.physicalId),
    rootName: txt(input.rootName),
    expectedCount: Number(input.expectedCount || 0),
