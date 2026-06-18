import { getThreeDxConfig } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import { buildErrorResponse, SOURCE } from './threeDxBomNormalizer.js';
import {
  resolveRepresentationForItem,
  getCachedModelByKey,
  createDsengClient
} from './threeDxRepresentationResolver.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

function publicModelUrl(req, cacheKey) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/api/3dx/visualization/model/${cacheKey}`;
}

export async function resolveVisualization(body = {}, req = null) {
  const config = getThreeDxConfig();
  const mode = body.mode || config.mode || 'dseng-official';
  const referenceId = str(body.referenceId);
  const physicalId = str(body.physicalId);

  if (!referenceId && !physicalId) {
    return {
      ok: false,
      status: 422,
      data: buildErrorResponse('REFERENCE_ID_REQUIRED', 'referenceId or physicalId is required', mode)
    };
  }

  if (mode === 'mock') {
    return {
      ok: false,
      status: 501,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code: 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED',
        message: 'Modo mock não fornece malha 3D real.',
        diagnostics: { mock: true }
      }
    };
  }

  try {
    assertDsengConfigured(config);
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: buildErrorResponse('UPSTREAM_NOT_CONFIGURED', error.message, mode)
    };
  }

  const client = createDsengClient(config);
  try {
    const result = await resolveRepresentationForItem({
      client,
      referenceId: referenceId || physicalId,
      physicalId: physicalId || referenceId,
      type: body.type,
      title: body.title
    });

    if (result.ok) {
      const modelUrl = req ? publicModelUrl(req, result.cacheKey) : `/api/3dx/visualization/model/${result.cacheKey}`;
      return {
        ok: true,
        status: 200,
        data: {
          ok: true,
          source: SOURCE,
          mode,
          format: result.format,
          contentType: result.contentType,
          modelUrl,
          source: result.source,
          sourceMeta: result.source,
          diagnostics: {
            endpointsUsed: result.endpointsUsed,
            attempts: result.attempts
          }
        }
      };
    }

    const code = result.code || 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED';
    const status = code === 'NO_WEB_VIEWABLE_FORMAT' ? 422 : 501;
    return {
      ok: false,
      status,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code,
        message:
          code === 'NO_WEB_VIEWABLE_FORMAT'
            ? 'Representação encontrada, mas sem formato web renderizável (GLB/glTF/OBJ/STL).'
            : 'Representação 3D web não disponível após tentativas dsdo/dsxcad/dseng.',
        item: result.item,
        representations: result.representations,
        files: result.files,
        diagnostics: {
          endpointsUsed: result.endpointsUsed,
          attempts: result.attempts
        }
      }
    };
  } catch (error) {
    const mapped = client.mapUpstreamError(error);
    const response = buildErrorResponse(mapped.code, mapped.message, mode);
    response.diagnostics.endpointsUsed = client.getEndpointsUsed();
    return {
      ok: false,
      status: mapped.code === 'ROOT_NOT_FOUND' ? 404 : 502,
      data: response
    };
  }
}

export function streamCachedModel(cacheKey, res) {
  const cached = getCachedModelByKey(cacheKey);
  if (!cached) {
    res.status(404).json({
      ok: false,
      code: 'MODEL_NOT_FOUND',
      message: 'Modelo em cache expirado ou inexistente.'
    });
    return false;
  }
  res.setHeader('Content-Type', cached.contentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).send(cached.buffer);
  return true;
}

export async function probeVisualization(body = {}) {
  const config = getThreeDxConfig();
  const referenceId = str(body.referenceId || body.physicalId || '63FC553465A62400699DB567');
  const client = createDsengClient(config);
  const result = await resolveRepresentationForItem({
    client,
    referenceId,
    physicalId: referenceId,
    type: body.type || 'VPMReference',
    title: body.title || ''
  });
  return {
    ok: result.ok,
    referenceId,
    code: result.code || (result.ok ? 'OK' : 'FAILED'),
    attempts: result.attempts || [],
    endpointsUsed: result.endpointsUsed || client.getEndpointsUsed(),
    format: result.format || null,
    cacheKey: result.cacheKey || null
  };
}
