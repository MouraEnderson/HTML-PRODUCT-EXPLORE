import { getThreeDxConfig } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import { extractMembers, objectId } from './enoviaClient.js';
import {
  SOURCE,
  normalizeEngItem,
  unwrapEngItemPayload,
  buildErrorResponse
} from './threeDxBomNormalizer.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

function isRepReference(item) {
  const type = str(item?.type || item?.displayType);
  return /VPMRepReference/i.test(type);
}

export async function resolveVisualization(body = {}) {
  const config = getThreeDxConfig();
  const mode = body.mode || config.mode || 'dseng-official';
  const referenceId = str(body.referenceId || body.physicalId);
  const physicalId = str(body.physicalId || body.referenceId);

  if (!referenceId) {
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
        message:
          'Representação 3D web não disponível sem API oficial/conversão configurada.',
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

  const client = new ThreeDxDsengClient(config);
  const endpointsUsed = [];

  try {
    const itemResult = await client.getEngItem(referenceId);
    endpointsUsed.push(...client.getEndpointsUsed());
    const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));

    let repReferences = [];
    try {
      const expandResult = await client.expandEngItem(referenceId, { expandDepth: 1 });
      endpointsUsed.push(...client.getEndpointsUsed());
      const members = extractMembers(expandResult.data);
      repReferences = members.filter(isRepReference).map((member) => ({
        id: objectId(member),
        title: str(member.title || member.name),
        type: str(member.type)
      }));
    } catch (_expandError) {
      // expand optional for diagnostics only
    }

    if (repReferences.length) {
      return {
        ok: false,
        status: 422,
        data: {
          ok: false,
          source: SOURCE,
          mode,
          code: 'NO_WEB_VIEWABLE_FORMAT',
          message:
            'Representação 3D associada encontrada via dseng, mas nenhum formato web (GLB/glTF/OBJ/STL) está disponível sem API oficial de download/conversão.',
          item: {
            id: item.id,
            title: item.title,
            revision: item.revision,
            state: item.state
          },
          representations: repReferences.slice(0, 10),
          diagnostics: {
            endpointsUsed,
            repCount: repReferences.length
          }
        }
      };
    }

    return {
      ok: false,
      status: 501,
      data: {
        ok: false,
        source: SOURCE,
        mode,
        code: 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED',
        message:
          'Representação 3D web não disponível sem API oficial/conversão configurada.',
        item: {
          id: item.id || physicalId,
          title: item.title || body.title || '',
          revision: item.revision,
          state: item.state
        },
        diagnostics: {
          endpointsUsed,
          note:
            'ExpandItem/dseng fornece estrutura e referências; download de malha 3D web requer API oficial Dassault (3DSpace/VPMRep/ticket) não configurada neste serviço.'
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
