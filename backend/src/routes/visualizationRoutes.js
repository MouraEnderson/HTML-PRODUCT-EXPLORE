import { Router } from 'express';
import {
  resolveVisualization,
  streamCachedModel,
  probeVisualization
} from '../services/threeDxVisualizationService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';
import { getThreeDxConfig } from '../services/threeDxConfig.js';

const router = Router();

function sendInternalError(res) {
  const mode = getThreeDxConfig().mode === 'mock' ? 'mock' : 'dseng-official';
  res.status(500).json(buildInternalErrorResponse(mode));
}

router.post('/resolve', async (req, res) => {
  try {
    const result = await resolveVisualization(req.body || {}, req);
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/probe', async (req, res) => {
  try {
    const data = await probeVisualization(req.body || {});
    res.json(data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.get('/model/:cacheKey', async (req, res) => {
  try {
    streamCachedModel(req.params.cacheKey, res);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.get('/representations/:referenceId', async (req, res) => {
  try {
    const result = await resolveVisualization(
      {
        ...(req.body || {}),
        referenceId: req.params.referenceId,
        physicalId: req.params.referenceId
      },
      req
    );
    res.status(result.status || (result.ok ? 200 : 422)).json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
