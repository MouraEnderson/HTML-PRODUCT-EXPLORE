import crypto from 'node:crypto';
const jobs = new Map();
export function startBrowserBomJob(input = {}) {
  const jobId = crypto.randomUUID();
  const expectedCount = Number(input.expectedCount || 0);
  jobs.set(jobId, { expectedCount });
  return { ok: true, status: 'partial', jobId, source: 'browser-auth-bridge', expectedCount, actualCount: 0, root: null, items: [], tasks: [] };
}
export function continueBrowserBomJob(jobId) {
  const job = jobs