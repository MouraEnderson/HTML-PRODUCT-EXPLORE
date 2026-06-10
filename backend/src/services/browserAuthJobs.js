const JOBS = new Map();
const ROUND = 24;
const MAX_ROWS = 5000;
const MAX_DEPTH = 30;

const s = v => String(v || '').trim();
const b = v => s(v).replace(/\/+$/, '');
const e = v => encodeURIComponent(String(v || ''));
const a = v => !v ? [] : Array.isArray(v) ? v : Array.isArray(v.member) ? v.member : Array.isArray(v.data) ? v.data : Array.isArray(v.results) ? v.results : [];
const p = r => r && (r.payload || r.data || r.response || r.body || r);
const norm = v => s(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cleanName = v => s(v).replace(/<[^>]*>/g, '').replace(/\.\d+$/g, '').replace(/\([^)]*\)$/g, '').trim();
const itemId = x => s(x && (x.id || x.identifier || x.physicalId || x.physicalid));