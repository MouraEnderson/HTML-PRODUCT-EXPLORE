import { Router } from 'express';
import {
  getSkaHealth,
  resolveMockStructure,
  resolveMockDiagnostic
} from '../services/threeDxBomService.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json(getSkaHealth());
});

router.post('/structure', (req, res) => {
  const result = resolveMockStructure(req.body || {});
  if (!result.ok) {
    res.status(422).json(result.error);
    return;
  }
  res.json(result.data);
});

router.post('/diagnostic', (req, res) => {
  res.json(resolveMockDiagnostic(req.body || {}));
});

export default router;
