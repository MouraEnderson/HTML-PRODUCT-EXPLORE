import crypto from 'node:crypto';

const jobs = new Map();

export function startBrowserBomJob(input = {}) {
  const jobId = crypto.randomUUID();
  const expectedCount = Number(input.expectedCount || 0);
  jobs.set(jobId, { expectedCount, createdAt: Date.now() });
  return {
    ok: true,
    status: 'partial',
    jobId,
    source: 'browser-auth-bridge',
    expectedCount,
    actualCount: 0,
    root: null,
    diagnostics