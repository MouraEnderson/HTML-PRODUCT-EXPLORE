import { Router } from 'express';
import { resolveVisualization } from '../services/threeDxVisualizationService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';
import { getThreeDxConfig } from '../services/threeDxConfig.js';

const router = Router();

function sendInternalError(res) {
  const mode = getThreeDxConfig().mode === 'mock' ? 'mock' : 'dseng-official';
  res.status(500).json(buildInternalErrorResponse(mode));
}

router.post('/resolve', async (req, res) => {
  try {
    const result = await resolveVisualization(req.body || {});
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.get('/representations/:referenceId', async (req, res) => {
  try {
    const result = await resolveVisualization({
      ...(req.body || {}),
      referenceId: req.params.referenceId,
      physicalId: req.params.referenceId
    });
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
