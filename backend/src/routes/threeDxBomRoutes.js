import { Router } from 'express';
import {
  getSkaHealth,
  resolveMockStructure,
  resolveMockDiagnostic
} from '../services/threeDxBomService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';

const router = Router();

function sendInternalError(res) {
  res.status(500).json(buildInternalErrorResponse());
}

router.get('/health', (_req, res) => {
  try {
    res.json(getSkaHealth());
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/structure', (req, res) => {
  try {
    const result = resolveMockStructure(req.body || {});
    if (!result.ok) {
      res.status(422).json(result.error);
      return;
    }
    res.json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/diagnostic', (req, res) => {
  try {
    res.json(resolveMockDiagnostic(req.body || {}));
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
