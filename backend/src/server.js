import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { resolveBom } from './services/bomResolver.js';

const app = express();
const port = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bom-resolver',
    version: '0.1.0'
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

app.listen(port, () => {
  console.log(`BOM Resolver listening on :${port}`);
});
