import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolveBom } from './services/bomResolver.js';
import { startBrowserBomJob, continueBrowserBomJob } from './services/browserAuthJobs.js';

const app = express();
const port = process.env.PORT || 3000;

const explicitCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (explicitCorsOrigins.includes('*')) return true;
  if (explicitCorsOrigins.includes(origin)) return true;

  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host === 'mouraenderson.github.io') return true;
    if (host.endsWith('.3dexperience.3ds.com')) return true;
    if (host === 'localhost' || host === '127.0.0.1') return true;
  } catch (_err) {
    return false;
  }

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, origin || true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bom-resolver',
    version: '0.2.1',
    modes: ['server-auth', 'browser-auth-bridge']
  });
});

app.post('/api/bom/resolve', async (req, res) => {
  try {
    const result = await resolveBom(req.body || {});
    res.status(result.ok ? 200 : 422).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 'error',
      error: error?.message || String(error)
    });
  }
});

app.post('/api/bom/browser/start', startBrowserBomJob);

app.post('/api/bom/browser/continue', continueBrowserBomJob);

app.listen(port, () => {
  console.log(`BOM Resolver listening on :${port}`);
});
