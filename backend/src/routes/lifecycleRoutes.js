import { Router } from 'express';
import { getLifecycleTransitions, changeMaturity } from '../services/threeDxLifecycleService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';
import { getThreeDxConfig } from '../services/threeDxConfig.js';

const router = Router();

function sendInternalError(res) {
  const mode = getThreeDxConfig().mode === 'mock' ? 'mock' : 'dseng-official';
  res.status(500).json(buildInternalErrorResponse(mode));
}

router.post('/transitions', async (req, res) => {
  try {
    const result = await getLifecycleTransitions(req.body || {});
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/change-maturity', async (req, res) => {
  try {
    const result = await changeMaturity(req.body || {});
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
