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
   