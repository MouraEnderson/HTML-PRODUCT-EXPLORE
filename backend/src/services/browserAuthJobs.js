import crypto from 'node:crypto';

const jobs = new Map();
const TTL = 15 * 60 * 1000;

function clean(v) { return String(v || '').trim(); }
function members(body) {
  if (!body) return [];
  if (Array.isArray(body.member)) return body.member;
  if (Array.isArray(body.members)) return body.members;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
}
function idOf(o) { return clean(o && (o.id || o.physical