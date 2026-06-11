import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolveBom } from './services/bomResolver.js';
import { startBrowserBomJob, continueBrowserBomJob } from './services/browserAuthJobs.js';

const app = express();
const port = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bom-resolver',
    version: '0.2.0',
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
