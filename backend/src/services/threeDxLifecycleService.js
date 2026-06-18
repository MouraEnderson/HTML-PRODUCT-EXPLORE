import { getThreeDxConfig } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import {
  SOURCE,
  normalizeEngItem,
  unwrapEngItemPayload,
  buildErrorResponse
} from './threeDxBomNormalizer.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

function itemContext(body = {}) {
  return {
    referenceId: str(body.referenceId || body.physicalId),
    physicalId: str(body.physicalId || body.referenceId),
    currentState: str(body.currentState || body.state || body.maturity),
    type: str(body.type || 'VPMReference'),
    policy: str(body.policy),
    title: str(body.title),
    revision: str(body.revision)
  };
}

export async function getLifecycleTransitions(body = {}) {
  const config = getThreeDxConfig();
  const mode = body.mode || config.mode || 'dseng-official';
  const ctx = itemContext(body);

  if (!ctx.referenceId) {
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
        code: 'OFFICIAL_LIFECYCLE_API_REQUIRED',
        message: 'Mudança de maturidade requer API oficial de lifecycle não configurada.',
        item: ctx,
        transitions: []
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

  const client = new ThreeDxDsengClient(config);

  try {
    const itemResult = await client.getEngItem(ctx.referenceId);
    const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
    const currentState = ctx.currentState || item.state || item.maturity || '';

    return {
      ok: false,
      status: 501,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code: 'OFFICIAL_LIFECYCLE_API_REQUIRED',
        message:
          'Transições de maturidade requerem API oficial Dassault (lifecycle/maturity) não configurada neste serviço.',
        item: {
          referenceId: ctx.referenceId,
          physicalId: ctx.physicalId || item.id,
          title: ctx.title || item.title,
          revision: ctx.revision || item.revision,
          currentState,
          type: ctx.type || item.type || 'VPMReference'
        },
        transitions: [],
        diagnostics: {
          endpointsUsed: client.getEndpointsUsed(),
          note:
            'Estado atual foi lido via dseng:EngItem. Promote/demote exige endpoint oficial de lifecycle (ex.: 3DSpace/modeler/dslc ou equivalente tenant).'
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

export async function changeMaturity(body = {}) {
  const config = getThreeDxConfig();
  const mode = body.mode || config.mode || 'dseng-official';
  const ctx = itemContext(body);
  const targetState = str(body.targetState);
  const transition = str(body.transition);

  if (!ctx.referenceId) {
    return {
      ok: false,
      status: 422,
      data: buildErrorResponse('REFERENCE_ID_REQUIRED', 'referenceId or physicalId is required', mode)
    };
  }

  if (!body.confirm) {
    return {
      ok: false,
      status: 422,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code: 'CONFIRMATION_REQUIRED',
        message: 'Mudança de maturidade exige confirm: true no payload.'
      }
    };
  }

  if (!targetState && !transition) {
    return {
      ok: false,
      status: 422,
      data: buildErrorResponse(
        'TARGET_STATE_REQUIRED',
        'targetState or transition is required',
        mode
      )
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
        code: 'OFFICIAL_LIFECYCLE_API_REQUIRED',
        message: 'Mudança de maturidade requer API oficial de lifecycle não configurada.',
        item: ctx
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

  const client = new ThreeDxDsengClient(config);

  try {
    const itemResult = await client.getEngItem(ctx.referenceId);
    const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
    const currentState = ctx.currentState || item.state || item.maturity || '';

    return {
      ok: false,
      status: 501,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code: 'OFFICIAL_LIFECYCLE_API_REQUIRED',
        message:
          'Mudança de maturidade não executada: API oficial de lifecycle/promote não configurada.',
        item: {
          referenceId: ctx.referenceId,
          physicalId: ctx.physicalId || item.id,
          title: ctx.title || item.title,
          revision: ctx.revision || item.revision,
          currentState,
          targetState: targetState || transition,
          type: ctx.type || item.type || 'VPMReference'
        },
        diagnostics: {
          endpointsUsed: client.getEndpointsUsed(),
          note: 'Nenhuma alteração foi aplicada no PLM.'
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
