import { Router } from 'express';
import {
  getSkaHealth,
  resolveStructure,
  resolveSelection,
  resolveDiagnostic,
  getErrorStatus
} from '../services/threeDxBomService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';
import { getThreeDxConfig } from '../services/threeDxConfig.js';

const router = Router();

function sendInternalError(res) {
  const mode = getThreeDxConfig().mode === 'mock' ? 'mock' : 'dseng-official';
  res.status(500).json(buildInternalErrorResponse(mode));
}

router.get('/health', (_req, res) => {
  try {
    res.json(getSkaHealth());
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/structure', async (req, res) => {
  try {
    const result = await resolveStructure(req.body || {});
    if (!result.ok) {
      const code = result.error?.error?.code;
      res.status(result.status || getErrorStatus(code)).json(result.error);
      return;
    }
    res.json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/resolve-selection', async (req, res) => {
  try {
    const result = await resolveSelection(req.body || {});
    if (!result.ok) {
      const code = result.error?.error?.code;
      res.status(result.status || getErrorStatus(code)).json(result.error);
      return;
    }
    res.json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/diagnostic', async (req, res) => {
  try {
    const result = await resolveDiagnostic(req.body || {});
    if (!result.ok) {
      const code = result.error?.error?.code;
      res.status(result.status || getErrorStatus(code)).json(result.error);
      return;
    }
    res.json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
