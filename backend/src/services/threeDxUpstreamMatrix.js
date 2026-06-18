import { ThreeDxDsengClient } from './threeDxDsengClient.js';
import { extractMembers, objectId } from './enoviaClient.js';
import { getThreeDxConfig } from './threeDxConfig.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

async function tryCall(label, fn, attempts) {
  try {
    const data = await fn();
    attempts.push({ step: label, status: 200, summary: summarize(data) });
    return { ok: true, data };
  } catch (error) {
    attempts.push({
      step: label,
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
    return { ok: false, error };
  }
}

function summarize(data) {
  if (!data) return 'empty';
  const members = extractMembers(data);
  if (members.length) {
    return `members=${members.length} types=${[...new Set(members.map((m) => str(m.type || m.displayType)).filter(Boolean))].slice(0, 5).join(',')}`;
  }
  if (typeof data === 'object') {
    return JSON.stringify(data).slice(0, 300);
  }
  return String(data).slice(0, 300);
}

export async function runUpstreamMatrix({ referenceId, title = '', name = '' } = {}) {
  const config = getThreeDxConfig();
  const client = new ThreeDxDsengClient(config);
  const attempts = [];
  const refId = str(referenceId);
  const spaceUrl = client.client.spaceUrl;

  await client.ensureCsrf();

  const locateVariants = [
    { type: 'VPMReference', rel: `/resources/v1/modeler/dseng/dseng:EngItem/${refId}` },
    { type: 'dseng:EngItem', rel: `/resources/v1/modeler/dseng/dseng:EngItem/${refId}` },
    { type: 'VPMReference', rel: '' }
  ];

  for (const variant of locateVariants) {
    const body = {
      data: [
        {
          id: refId,
          identifier: refId,
          type: variant.type,
          source: spaceUrl,
          ...(variant.rel ? { relativePath: variant.rel } : {})
        }
      ]
    };
    await tryCall(`dsdo:Locate type=${variant.type}`, () => client.client.locateDerivedOutputs(body), attempts);
  }

  if (title) {
    await tryCall(`ds3sh:search title=${title}`, () => client.client.search3DShape(title, 10), attempts);
  }
  if (name) {
    await tryCall(`ds3sh:search name=${name}`, () => client.client.search3DShape(name, 10), attempts);
  }

  await tryCall('dseng:EngRepInstance', () => client.client.getEngRepInstances(refId), attempts);

  const expandBodies = [
    {
      expandDepth: 2,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance']
    },
    {
      expandDepth: 1,
      withPath: true,
      type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape', 'Drawing'],
      type_filter_rel: ['VPMInstance', 'VPMRepInstance', 'Drawing Instance']
    }
  ];
  for (const body of expandBodies) {
    await tryCall(`dseng:expand depth=${body.expandDepth}`, () => client.client.expandEngItem(refId, body), attempts);
  }

  const cadBodies = [
    {
      referencedObject: {
        source: spaceUrl,
        type: 'VPMReference',
        identifier: refId,
        relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${refId}`
      }
    },
    {
      referencedObject: {
        source: spaceUrl,
        type: 'dseng:EngItem',
        identifier: refId
      }
    }
  ];
  for (const body of cadBodies) {
    await tryCall('dsxcad:Representation/locate', () => client.client.locateCadRepresentation(body), attempts);
  }

  const globalBodies = [
    [{ identifier: refId, type: 'dseng:EngItem', source: spaceUrl, targetState: 'Frozen' }],
    [{ identifier: refId, type: 'dseng:EngItem', source: '3DSpace', targetState: 'FROZEN' }],
    { identifier: refId, type: 'dseng:EngItem', targetState: 'Frozen' }
  ];
  for (const body of globalBodies) {
    await tryCall('dseng:invoke changeMaturity', () => client.client.invokeDsengGlobal('dseng:changeMaturity', body), attempts);
    await tryCall('dseng:invoke ChangeMaturity', () => client.client.invokeDsengGlobal('dseng:ChangeMaturity', body), attempts);
  }

  const shapeIds = ['63FC553465A62400699DB30C00004EF7', '2C56DEE5E1E943068A77F7E8B2F0AB7B'];
  for (const shapeId of shapeIds) {
    await tryCall(`ds3sh:get ${shapeId}`, () => client.client.get3DShape(shapeId), attempts);
    const jobBodies = [
      {
        data: [
          {
            id: shapeId,
            identifier: shapeId,
            type: '3DShape',
            source: spaceUrl,
            format: 'glb'
          }
        ]
      },
      {
        referencedObject: {
          source: spaceUrl,
          type: '3DShape',
          identifier: shapeId,
          relativePath: `/resources/v1/modeler/ds3sh/ds3sh:3DShape/${shapeId}`
        },
        derivedFormat: 'GLB'
      }
    ];
    for (const body of jobBodies) {
      await tryCall(`dsdo:DerivedOutputJobs ${shapeId}`, () => client.client.createDerivedOutputJob(body), attempts);
    }
  }
    '/resources/v1/modeler/dslc/dslc:changeMaturity',
    '/resources/v1/modeler/dslc/invoke/dslc:changeMaturity',
    '/resources/v1/modeler/dslc/dslc:Lifecycle/changeMaturity'
  ];
  for (const path of dslcPaths) {
    await tryCall(`dslc POST ${path}`, () => client.client.post(path, { identifier: refId, targetState: 'Frozen' }), attempts);
  }

  return {
    referenceId: refId,
    title,
    name,
    attempts,
    endpointsUsed: client.getEndpointsUsed()
  };
}
