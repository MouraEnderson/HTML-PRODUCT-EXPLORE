import { Router } from 'express';
import {
  getSkaHealth,
  getSkaAuthHealth,
  resolveStructure,
  resolveSelection,
  resolveDiagnostic,
  getErrorStatus
} from '../services/threeDxBomService.js';
import { resolveStructureRoot, resolveStructureChildren } from '../services/threeDxStructureService.js';
import { buildInternalErrorResponse } from '../services/threeDxBomNormalizer.js';
import { getThreeDxConfig } from '../services/threeDxConfig.js';
import { runUpstreamMatrix } from '../services/threeDxUpstreamMatrix.js';

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

router.get('/health/authcheck', async (_req, res) => {
  try {
    const result = await getSkaAuthHealth();
    res.status(result.ok ? 200 : 503).json(result);
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

router.post('/structure/root', async (req, res) => {
  try {
    const config = getThreeDxConfig();
    const result = await resolveStructureRoot(req.body || {}, config);
    if (!result.ok) {
      res.status(result.status || 500).json(result.error);
      return;
    }
    res.json(result.data);
  } catch (_err) {
    sendInternalError(res);
  }
});

router.post('/structure/children', async (req, res) => {
  try {
    const config = getThreeDxConfig();
    const result = await resolveStructureChildren(req.body || {}, config);
    if (!result.ok) {
      res.status(result.status || 500).json(result.error);
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

router.post('/upstream-matrix', async (req, res) => {
  try {
    const data = await runUpstreamMatrix(req.body || {});
    res.json(data);
  } catch (_err) {
    sendInternalError(res);
  }
});

export default router;
