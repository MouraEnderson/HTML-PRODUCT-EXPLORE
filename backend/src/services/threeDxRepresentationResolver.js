import { ThreeDxDsengClient } from './threeDxDsengClient.js';
import { extractMembers, objectId } from './enoviaClient.js';
import {
  getModelCache,
  putModelCache,
  guessFormatFromName,
  isWebViewableFormat
} from './threeDxModelCache.js';
import { normalizeEngItem, unwrapEngItemPayload } from './threeDxBomNormalizer.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

function isRepReference(item) {
  return /VPMRepReference/i.test(str(item?.type || item?.displayType));
}

function is3DShape(item) {
  return /3DShape|ds3sh/i.test(str(item?.type || item?.displayType));
}

function collectExpandObjects(client, referenceId, expandDepth, endpointsUsed, attempts) {
  const found = { shapes: [], repRefs: [] };
  const body = {
    expandDepth,
    withPath: true,
    type_filter_bo: ['VPMReference', 'VPMRepReference', '3DShape'],
    type_filter_rel: ['VPMInstance', 'VPMRepInstance']
  };
  return client.expandEngItem(referenceId, body).then((expand) => {
    endpointsUsed.push(...client.getEndpointsUsed());
    const members = extractMembers(expand.data);
    members.forEach((member) => {
      if (is3DShape(member)) found.shapes.push(member);
      if (isRepReference(member)) found.repRefs.push(member);
    });
    attempts.push({
      step: `dseng:expand depth=${expandDepth}`,
      status: 200,
      shapeCount: found.shapes.length,
      shapeIds: found.shapes.map((s) => objectId(s)).filter(Boolean).slice(0, 8),
      repCount: found.repRefs.length,
      memberCount: members.length
    });
    return found;
  });
}

async function tryResolveFromShape(client, {
  refId,
  physId,
  shapeId,
  title,
  spaceUrl,
  attempts,
  endpointsUsed
}) {
  try {
    await client.client.get3DShape(shapeId);
    endpointsUsed.push({ method: 'GET', endpoint: `/ds3sh:3DShape/${shapeId}`, status: 200 });
  } catch (shapeMetaErr) {
    attempts.push({
      step: `ds3sh:get ${shapeId}`,
      status: Number(shapeMetaErr?.status || 502),
      summary: shapeMetaErr?.bodySummary || shapeMetaErr?.message
    });
  }
  await client.ensureCsrf();
  const locate = await client.client.locateDerivedOutputs(
    buildLocatePayload(shapeId, '3DShape', spaceUrl)
  );
  endpointsUsed.push({ method: 'POST', endpoint: '/dsdo:DerivedOutputs/Locate', status: 200 });
  const files = extractDerivedOutputFiles(locate);
  attempts.push({
    step: `dsdo via 3DShape ${shapeId}`,
    status: 200,
    fileCount: files.length,
    formats: files.map((f) => f.format || f.fileName).slice(0, 8)
  });
  const best = pickBestWebFile(files);
  if (!best) return null;
  const ticketPayload = await client.client.getDerivedOutputDownloadTicket(
    best.parentId || shapeId,
    best.id,
    {}
  );
  const ticketUrl = extractDownloadUrl(ticketPayload);
  if (!ticketUrl) return null;
  const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
  const cached = putModelCache({
    referenceId: refId,
    format: best.format,
    buffer: binary.buffer,
    fileName: best.fileName
  });
  return {
    ok: true,
    format: best.format,
    contentType: binary.contentType || guessContentType(best.format),
    cacheKey: cached.key,
    source: {
      referenceId: refId,
      physicalId: physId,
      representationId: shapeId,
      representationType: '3DShape',
      fileName: best.fileName,
      title
    },
    attempts,
    endpointsUsed
  };
}

function buildLocatePayload(referenceId, type, spaceUrl) {
  const source = String(spaceUrl || '').replace(/\/$/, '');
  return {
    data: [
      {
        id: referenceId,
        identifier: referenceId,
        type: type || 'VPMReference',
        source,
        relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${referenceId}`
      }
    ]
  };
}

function extractDownloadUrl(ticketPayload) {
  const body = ticketPayload || {};
  const ticket =
    body.ticketURL ||
    body.ticketUrl ||
    body.url ||
    body.downloadUrl ||
    body?.data?.ticketURL ||
    body?.data?.ticketUrl;
  if (ticket) return str(ticket);
  const elements = body.dataelements || body?.data?.dataelements || body?.ticket;
  if (typeof elements === 'string' && /^https?:/i.test(elements)) return elements;
  if (elements && typeof elements === 'object') {
    return str(elements.ticketURL || elements.ticketUrl || elements.url || elements.href);
  }
  const members = extractMembers(body);
  for (const member of members) {
    const url = str(
      member.ticketURL ||
        member.ticketUrl ||
        member.url ||
        member.downloadUrl ||
        member?.dataelements?.ticketURL
    );
    if (url) return url;
  }
  return '';
}

function extractDerivedOutputFiles(locatePayload) {
  const members = extractMembers(locatePayload);
  const files = [];
  members.forEach((member) => {
    const derivedOutputId = objectId(member);
    const nested = extractMembers(member);
    const list = nested.length ? nested : [member];
    list.forEach((item) => {
      const fileName = str(item.fileName || item.filename || item.title || item.name);
      const format = guessFormatFromName(fileName) || guessFormatFromName(str(item.format));
      const fileId = objectId(item);
      if (!fileId && !fileName) return;
      files.push({
        id: fileId,
        parentId:
          derivedOutputId ||
          objectId(item.parent) ||
          objectId(member.parent) ||
          str(item.parentId),
        fileName,
        format,
        mimeType: str(item.mimeType || item.contentType),
        raw: item
      });
    });
  });
  return files.filter((f) => f.id || f.fileName);
}

function pickBestWebFile(files) {
  const ranked = files
    .map((f) => ({
      ...f,
      format: f.format || guessFormatFromName(f.fileName)
    }))
    .filter((f) => isWebViewableFormat(f.format));
  const order = ['glb', 'gltf', 'obj', 'stl'];
  ranked.sort((a, b) => order.indexOf(a.format) - order.indexOf(b.format));
  return ranked[0] || null;
}

async function downloadFromTicket(client, ticketUrl, endpointsUsed) {
  if (!ticketUrl) return null;
  let url = ticketUrl;
  if (url.startsWith('/')) {
    url = `${client.client.spaceUrl}${url}`;
  }
  try {
    const parsed = new URL(url);
    const spaceHost = (() => {
      try {
        return new URL(client.client.spaceUrl).hostname;
      } catch (_) {
        return '';
      }
    })();
    const crossHost = spaceHost && parsed.hostname !== spaceHost;
    const result = crossHost
      ? await client.client.fetchBinaryUrl(url)
      : await client.client.getBinary(`${parsed.pathname}${parsed.search}`);
    const endpointLabel = crossHost
      ? `${parsed.hostname}${parsed.pathname}${parsed.search}`.slice(0, 200)
      : `${parsed.pathname}${parsed.search}`;
    endpointsUsed.push({
      method: 'GET',
      endpoint: endpointLabel,
      status: result.status || 200,
      ticketHost: parsed.hostname,
      crossHost
    });
    return result;
  } catch (error) {
    endpointsUsed.push({
      method: 'GET',
      endpoint: ticketUrl.slice(0, 120),
      status: Number(error?.status || 502)
    });
    throw error;
  }
}

export async function resolveRepresentationForItem({
  client,
  referenceId,
  physicalId,
  type = 'VPMReference',
  title = ''
}) {
  const endpointsUsed = [];
  const attempts = [];
  const refId = str(referenceId || physicalId);
  const physId = str(physicalId || referenceId);
  if (!refId) {
    return { ok: false, code: 'REFERENCE_ID_REQUIRED', attempts, endpointsUsed };
  }

  let item = null;
  try {
    const itemResult = await client.getEngItem(refId);
    item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
    endpointsUsed.push(...client.getEndpointsUsed());
  } catch (error) {
    endpointsUsed.push(...client.getEndpointsUsed());
    attempts.push({
      step: 'dseng:EngItem',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  const objectType = str(type || item?.type || 'VPMReference');
  const spaceUrl = client.client.spaceUrl;
  const itemTitle = str(title || item?.title || '');
  const itemName = str(item?.name || '');

  // 0) ds3sh search by title/name
  for (const query of [itemTitle, itemName].filter(Boolean)) {
    try {
      const search = await client.client.search3DShape(query, 10);
      endpointsUsed.push({ method: 'GET', endpoint: '/ds3sh:3DShape/search', status: 200 });
      const shapes = extractMembers(search);
      attempts.push({ step: `ds3sh:search ${query}`, status: 200, count: shapes.length });
      for (const shape of shapes.slice(0, 3)) {
        const shapeId = objectId(shape);
        if (!shapeId) continue;
        try {
          await client.ensureCsrf();
          const locate = await client.client.locateDerivedOutputs(
            buildLocatePayload(shapeId, '3DShape', spaceUrl)
          );
          const files = extractDerivedOutputFiles(locate);
          const best = pickBestWebFile(files);
          if (!best) continue;
          const ticketPayload = await client.client.getDerivedOutputDownloadTicket(
            best.parentId || shapeId,
            best.id,
            {}
          );
          const ticketUrl = extractDownloadUrl(ticketPayload);
          if (!ticketUrl) continue;
          const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
          const cached = putModelCache({
            referenceId: refId,
            format: best.format,
            buffer: binary.buffer,
            fileName: best.fileName
          });
          return {
            ok: true,
            format: best.format,
            contentType: binary.contentType || guessContentType(best.format),
            cacheKey: cached.key,
            source: {
              referenceId: refId,
              physicalId: physId,
              representationId: shapeId,
              representationType: 'ds3sh:3DShape',
              fileName: best.fileName,
              title: itemTitle
            },
            attempts,
            endpointsUsed
          };
        } catch (shapeErr) {
          attempts.push({
            step: `ds3sh derived ${shapeId}`,
            status: Number(shapeErr?.status || 502),
            summary: shapeErr?.bodySummary || shapeErr?.message
          });
        }
      }
    } catch (searchErr) {
      attempts.push({
        step: `ds3sh:search ${query}`,
        status: Number(searchErr?.status || 502),
        summary: searchErr?.bodySummary || searchErr?.message
      });
    }
  }

  // 1) dsdo:DerivedOutputs/Locate
  try {
    await client.ensureCsrf();
    const locateBody = buildLocatePayload(refId, objectType, spaceUrl);
    const locate = await client.client.locateDerivedOutputs(locateBody);
    endpointsUsed.push({
      method: 'POST',
      endpoint: '/dsdo:DerivedOutputs/Locate',
      status: 200
    });
    const files = extractDerivedOutputFiles(locate);
    attempts.push({
      step: 'dsdo:DerivedOutputs/Locate',
      status: 200,
      fileCount: files.length,
      formats: files.map((f) => f.format || f.fileName).slice(0, 8)
    });
    const best = pickBestWebFile(files);
    if (best) {
      const parentId = best.parentId || refId;
      const ticketPayload = await client.client.getDerivedOutputDownloadTicket(parentId, best.id, {});
      endpointsUsed.push({
        method: 'POST',
        endpoint: '/dsdo:DerivedOutputFiles/DownloadTicket',
        status: 200
      });
      const ticketUrl = extractDownloadUrl(ticketPayload);
      if (ticketUrl) {
        const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
        const cached = putModelCache({
          referenceId: refId,
          format: best.format,
          buffer: binary.buffer,
          fileName: best.fileName
        });
        return {
          ok: true,
          format: best.format,
          contentType: binary.contentType || guessContentType(best.format),
          cacheKey: cached.key,
          source: {
            referenceId: refId,
            physicalId: physId,
            representationId: best.id,
            representationType: 'DerivedOutput',
            fileName: best.fileName,
            title: title || item?.title || ''
          },
          attempts,
          endpointsUsed
        };
      }
      attempts.push({
        step: 'dsdo:DownloadTicket',
        status: 422,
        summary: 'Ticket sem URL de download'
      });
    } else if (files.length) {
      return {
        ok: false,
        code: 'NO_WEB_VIEWABLE_FORMAT',
        attempts,
        endpointsUsed,
        files: files.slice(0, 10).map((f) => ({
          id: f.id,
          fileName: f.fileName,
          format: f.format || guessFormatFromName(f.fileName)
        }))
      };
    }
  } catch (error) {
    endpointsUsed.push({
      method: 'POST',
      endpoint: '/dsdo:DerivedOutputs/Locate',
      status: Number(error?.status || 502)
    });
    attempts.push({
      step: 'dsdo:DerivedOutputs/Locate',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  // 2b) dseng expand depth 2 — discover linked 3DShape (not in EngRepInstance)
  try {
    const expanded = await collectExpandObjects(client, refId, 2, endpointsUsed, attempts);
    for (const shape of expanded.shapes.slice(0, 5)) {
      const shapeId = objectId(shape);
      if (!shapeId) continue;
      const resolved = await tryResolveFromShape(client, {
        refId,
        physId,
        shapeId,
        title: itemTitle || str(shape.title || shape.name),
        spaceUrl,
        attempts,
        endpointsUsed
      });
      if (resolved?.ok) return resolved;
    }
    if (expanded.repRefs.length) {
      for (const rep of expanded.repRefs.slice(0, 3)) {
        const repId = objectId(rep);
        if (!repId) continue;
        try {
          await client.ensureCsrf();
          const locate = await client.client.locateDerivedOutputs(
            buildLocatePayload(repId, 'VPMRepReference', spaceUrl)
          );
          const files = extractDerivedOutputFiles(locate);
          const best = pickBestWebFile(files);
          if (!best) continue;
          const ticketPayload = await client.client.getDerivedOutputDownloadTicket(repId, best.id, {});
          const ticketUrl = extractDownloadUrl(ticketPayload);
          if (!ticketUrl) continue;
          const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
          const cached = putModelCache({
            referenceId: refId,
            format: best.format,
            buffer: binary.buffer,
            fileName: best.fileName
          });
          return {
            ok: true,
            format: best.format,
            contentType: binary.contentType,
            cacheKey: cached.key,
            source: {
              referenceId: refId,
              physicalId: physId,
              representationId: repId,
              representationType: 'VPMRepReference',
              fileName: best.fileName,
              title: itemTitle
            },
            attempts,
            endpointsUsed
          };
        } catch (repErr) {
          attempts.push({
            step: `dsdo via expand VPMRepReference ${repId}`,
            status: Number(repErr?.status || 502),
            summary: repErr?.bodySummary || repErr?.message
          });
        }
      }
    }
  } catch (error) {
    attempts.push({
      step: 'dseng:expand depth=2',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  // 2) dseng:EngRepInstance
  try {
    const repInstances = await client.client.getEngRepInstances(refId);
    endpointsUsed.push({
      method: 'GET',
      endpoint: '/dseng:EngRepInstance',
      status: 200
    });
    const reps = extractMembers(repInstances).filter(isRepReference);
    attempts.push({
      step: 'dseng:EngRepInstance',
      status: 200,
      repCount: reps.length
    });
    if (reps.length) {
      for (const rep of reps.slice(0, 3)) {
        const repId = objectId(rep);
        try {
          await client.ensureCsrf();
          const locate = await client.client.locateDerivedOutputs(
            buildLocatePayload(repId, 'VPMRepReference', spaceUrl)
          );
          const files = extractDerivedOutputFiles(locate);
          const best = pickBestWebFile(files);
          if (!best) continue;
          const ticketPayload = await client.client.getDerivedOutputDownloadTicket(
            repId,
            best.id,
            {}
          );
          const ticketUrl = extractDownloadUrl(ticketPayload);
          if (!ticketUrl) continue;
          const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
          const cached = putModelCache({
            referenceId: refId,
            format: best.format,
            buffer: binary.buffer,
            fileName: best.fileName
          });
          return {
            ok: true,
            format: best.format,
            contentType: binary.contentType,
            cacheKey: cached.key,
            source: {
              referenceId: refId,
              physicalId: physId,
              representationId: repId,
              representationType: 'VPMRepReference',
              fileName: best.fileName,
              title: title || item?.title || rep.title || ''
            },
            attempts,
            endpointsUsed
          };
        } catch (repError) {
          attempts.push({
            step: `dsdo via EngRepInstance ${repId}`,
            status: Number(repError?.status || 502),
            summary: repError?.bodySummary || repError?.message
          });
        }
      }
    }
  } catch (error) {
    attempts.push({
      step: 'dseng:EngRepInstance',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  // 3) ds3sh:3DShape — derived outputs via shape id
  try {
    const shapeCandidates = [];
    if (item && item.shapeId) shapeCandidates.push(str(item.shapeId));
    if (item && item.id3dShape) shapeCandidates.push(str(item.id3dShape));
    try {
      const expandShape = await client.expandEngItem(refId, { expandDepth: 1 });
      extractMembers(expandShape.data).forEach((member) => {
        const type = str(member.type || member.displayType);
        if (/3DShape|ds3sh/i.test(type)) {
          shapeCandidates.push(objectId(member));
        }
      });
    } catch (expandShapeError) {
      attempts.push({
        step: 'ds3sh:expand-discover',
        status: Number(expandShapeError?.status || 502),
        summary: expandShapeError?.bodySummary || expandShapeError?.message
      });
    }
    const uniqueShapes = [...new Set(shapeCandidates.filter(Boolean))];
    for (const shapeId of uniqueShapes.slice(0, 2)) {
      try {
        await client.client.get3DShape(shapeId);
        endpointsUsed.push({
          method: 'GET',
          endpoint: `/ds3sh:3DShape/${shapeId}`,
          status: 200
        });
        await client.ensureCsrf();
        const locate = await client.client.locateDerivedOutputs(
          buildLocatePayload(shapeId, '3DShape', spaceUrl)
        );
        const files = extractDerivedOutputFiles(locate);
        const best = pickBestWebFile(files);
        if (!best) {
          attempts.push({
            step: `ds3sh:${shapeId}`,
            status: 200,
            fileCount: files.length
          });
          continue;
        }
        const ticketPayload = await client.client.getDerivedOutputDownloadTicket(
          best.parentId || shapeId,
          best.id,
          {}
        );
        const ticketUrl = extractDownloadUrl(ticketPayload);
        if (!ticketUrl) continue;
        const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
        const cached = putModelCache({
          referenceId: refId,
          format: best.format,
          buffer: binary.buffer,
          fileName: best.fileName
        });
        return {
          ok: true,
          format: best.format,
          contentType: binary.contentType || guessContentType(best.format),
          cacheKey: cached.key,
          source: {
            referenceId: refId,
            physicalId: physId,
            representationId: shapeId,
            representationType: 'ds3sh:3DShape',
            fileName: best.fileName,
            title: title || item?.title || ''
          },
          attempts,
          endpointsUsed
        };
      } catch (shapeError) {
        attempts.push({
          step: `ds3sh:${shapeId}`,
          status: Number(shapeError?.status || 502),
          summary: shapeError?.bodySummary || shapeError?.message
        });
      }
    }
  } catch (error) {
    attempts.push({
      step: 'ds3sh:discover',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  // 4) dsxcad:Representation/locate
  try {
    await client.ensureCsrf();
    const cadLocate = await client.client.locateCadRepresentation({
      referencedObject: {
        source: spaceUrl,
        type: objectType,
        identifier: refId,
        relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${refId}`
      }
    });
    endpointsUsed.push({
      method: 'POST',
      endpoint: '/dsxcad:Representation/locate',
      status: 200
    });
    const cadMembers = extractMembers(cadLocate);
    attempts.push({
      step: 'dsxcad:Representation/locate',
      status: 200,
      count: cadMembers.length
    });
    for (const cad of cadMembers.slice(0, 3)) {
      const partId = objectId(cad) || str(cad.partId);
      if (!partId) continue;
      try {
        const ticketPayload = await client.client.getCadAuthoringFileDownloadTicket(partId, {});
        const ticketUrl = extractDownloadUrl(ticketPayload);
        if (!ticketUrl) continue;
        const binary = await downloadFromTicket(client, ticketUrl, endpointsUsed);
        const format = guessFormatFromName(ticketUrl) || 'obj';
        if (!isWebViewableFormat(format)) {
          attempts.push({
            step: 'dsxcad:AuthoringFile',
            status: 422,
            summary: `Formato não web: ${format || 'unknown'}`
          });
          continue;
        }
        const cached = putModelCache({
          referenceId: refId,
          format,
          buffer: binary.buffer,
          fileName: partId
        });
        return {
          ok: true,
          format,
          contentType: binary.contentType,
          cacheKey: cached.key,
          source: {
            referenceId: refId,
            physicalId: physId,
            representationId: partId,
            representationType: 'dsxcad:Part',
            fileName: partId,
            title: title || item?.title || ''
          },
          attempts,
          endpointsUsed
        };
      } catch (cadErr) {
        attempts.push({
          step: `dsxcad:AuthoringFile ${partId}`,
          status: Number(cadErr?.status || 502),
          summary: cadErr?.bodySummary || cadErr?.message
        });
      }
    }
  } catch (error) {
    attempts.push({
      step: 'dsxcad:Representation/locate',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  // 4) expand VPMRepReference discovery only
  try {
    const expand = await client.expandEngItem(refId, { expandDepth: 1 });
    const repRefs = extractMembers(expand.data).filter(isRepReference);
    attempts.push({
      step: 'dseng:expand VPMRepReference',
      status: 200,
      repCount: repRefs.length
    });
    if (repRefs.length && !attempts.some((a) => a.step?.startsWith('dsdo'))) {
      return {
        ok: false,
        code: 'NO_WEB_VIEWABLE_FORMAT',
        attempts,
        endpointsUsed: [...endpointsUsed, ...client.getEndpointsUsed()],
        representations: repRefs.slice(0, 10).map((r) => ({
          id: objectId(r),
          title: str(r.title || r.name),
          type: str(r.type)
        }))
      };
    }
  } catch (error) {
    attempts.push({
      step: 'dseng:expand',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
  }

  return {
    ok: false,
    code: 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED',
    attempts,
    endpointsUsed,
    item: item
      ? { id: item.id, title: item.title, revision: item.revision, state: item.state }
      : { id: refId, title }
  };
}

function guessContentType(format) {
  if (format === 'glb') return 'model/gltf-binary';
  if (format === 'gltf') return 'model/gltf+json';
  if (format === 'obj') return 'model/obj';
  if (format === 'stl') return 'model/stl';
  return 'application/octet-stream';
}

export function getCachedModelByKey(key) {
  return getModelCache(key);
}

export function createDsengClient(config) {
  return new ThreeDxDsengClient(config);
}
