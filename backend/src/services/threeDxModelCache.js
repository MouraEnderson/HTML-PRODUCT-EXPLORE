import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CACHE_DIR = process.env.BOM_MODEL_CACHE_DIR || path.join(os.tmpdir(), 'bom-model-cache');
const TTL_MS = Number(process.env.BOM_MODEL_CACHE_TTL_MS || 30 * 60 * 1000);

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKey(parts) {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function putModelCache({ referenceId, format, buffer, fileName = '' }) {
  ensureDir();
  const key = cacheKey({ referenceId, format, fileName });
  const ext = format === 'gltf' ? 'gltf' : format || 'bin';
  const filePath = path.join(CACHE_DIR, `${key}.${ext}`);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  const metaPath = path.join(CACHE_DIR, `${key}.json`);
  fs.writeFileSync(
    metaPath,
    JSON.stringify({
      referenceId,
      format,
      fileName,
      contentType: guessContentType(format, fileName),
      createdAt: Date.now()
    })
  );
  return { key, filePath };
}

export function getModelCache(key) {
  ensureDir();
  const metaPath = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(metaPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (Date.now() - meta.createdAt > TTL_MS) {
    try {
      fs.unlinkSync(metaPath);
      const glob = fs.readdirSync(CACHE_DIR).filter((f) => f.startsWith(key));
      glob.forEach((f) => fs.unlinkSync(path.join(CACHE_DIR, f)));
    } catch (_e) {}
    return null;
  }
  const filePath = fs
    .readdirSync(CACHE_DIR)
    .map((f) => path.join(CACHE_DIR, f))
    .find((p) => p.startsWith(path.join(CACHE_DIR, key)) && !p.endsWith('.json'));
  if (!filePath || !fs.existsSync(filePath)) return null;
  return { ...meta, filePath, buffer: fs.readFileSync(filePath) };
}

function guessContentType(format, fileName = '') {
  const f = String(format || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  if (f === 'glb' || name.endsWith('.glb')) return 'model/gltf-binary';
  if (f === 'gltf' || name.endsWith('.gltf')) return 'model/gltf+json';
  if (f === 'obj' || name.endsWith('.obj')) return 'model/obj';
  if (f === 'stl' || name.endsWith('.stl')) return 'model/stl';
  return 'application/octet-stream';
}

export function guessFormatFromName(fileName = '') {
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.glb')) return 'glb';
  if (name.endsWith('.gltf')) return 'gltf';
  if (name.endsWith('.obj')) return 'obj';
  if (name.endsWith('.stl')) return 'stl';
  if (name.endsWith('.3dxml')) return '3dxml';
  if (name.endsWith('.step') || name.endsWith('.stp')) return 'step';
  return '';
}

export function isWebViewableFormat(format) {
  return ['glb', 'gltf', 'obj', 'stl'].includes(String(format || '').toLowerCase());
}
