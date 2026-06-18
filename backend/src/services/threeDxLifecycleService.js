import { getThreeDxConfig } from './threeDxConfig.js';
import { ThreeDxDsengClient, assertDsengConfigured } from './threeDxDsengClient.js';
import {
  SOURCE,
  normalizeEngItem,
  unwrapEngItemPayload,
  buildErrorResponse
} from './threeDxBomNormalizer.js';
import { extractMembers } from './enoviaClient.js';

function str(value) {
  return value == null ? '' : String(value).trim();
}

const INVOKE_TRANSITION_CANDIDATES = [
  'dseng:GetNextStates',
  'dseng:getNextStates',
  'dseng:GetTransitions',
  'dseng:getTransitions',
  'dseng:GetMaturityTransitions',
  'dseng:getMaturityTransitions',
  'dseng:GetLifecycleTransitions',
  'dseng:NextStates'
];

const INVOKE_CHANGE_CANDIDATES = [
  'dseng:ChangeMaturity',
  'dseng:changeMaturity',
  'dseng:Promote',
  'dseng:promote',
  'dseng:Demote',
  'dseng:demote',
  'dseng:SetState',
  'dseng:setState'
];

const STATE_API_VARIANTS = {
  IN_WORK: ['IN_WORK', 'In Work', 'InWork', 'PRIVATE'],
  FROZEN: ['FROZEN', 'Frozen'],
  RELEASED: ['RELEASED', 'Released']
};

function normalizeStateKey(value) {
  const raw = str(value).toUpperCase().replace(/\s+/g, '_');
  if (raw === 'INWORK') return 'IN_WORK';
  if (raw === 'PRIVATE') return 'IN_WORK';
  return raw;
}

function targetStateVariants(targetState) {
  const key = normalizeStateKey(targetState);
  const variants = STATE_API_VARIANTS[key] || [];
  const all = [str(targetState), ...variants];
  return [...new Set(all.filter(Boolean))];
}

function normalizeTransitions(payload, currentState = '') {
  const members = extractMembers(payload);
  if (members.length) {
    return members.map((item, idx) => ({
      id: str(item.id || item.name || item.transition || `t${idx}`),
      label: str(item.label || item.title || item.name || item.transition || item.to),
      from: str(item.from || item.currentState || item.sourceState || currentState),
      to: str(item.to || item.targetState || item.state),
      action: str(item.action || item.transition || item.name || 'promote')
    }));
  }
  if (Array.isArray(payload?.transitions)) {
    return payload.transitions.map((item, idx) => ({
      id: str(item.id || `t${idx}`),
      label: str(item.label || item.to || item.targetState),
      from: str(item.from || item.currentState || currentState),
      to: str(item.to || item.targetState),
      action: str(item.action || item.transition || 'promote')
    }));
  }
  if (Array.isArray(payload?.nextStates)) {
    return payload.nextStates.map((state) => ({
      id: str(state),
      label: str(state),
      from: str(currentState),
      to: str(state),
      action: 'promote'
    }));
  }
  return [];
}

function buildEngItemInvokeArray(referenceId, spaceUrl, extra = {}) {
  const source = String(spaceUrl || '').replace(/\/$/, '');
  return [
    {
      identifier: referenceId,
      type: 'dseng:EngItem',
      source: source || '3DSpace',
      relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${referenceId}`,
      ...extra
    }
  ];
}

async function tryInvokeList(client, referenceId, invokeName, body, endpointsUsed, attempts) {
  try {
    await client.ensureCsrf();
    const data = await client.client.invokeEngItem(referenceId, invokeName, body);
    endpointsUsed.push({
      method: 'POST',
      endpoint: `/dseng:EngItem/${referenceId}/invoke/${invokeName}`,
      status: 200
    });
    const transitions = normalizeTransitions(data);
    attempts.push({
      invoke: invokeName,
      scope: 'item',
      status: 200,
      transitionCount: transitions.length
    });
    return { ok: true, data, transitions };
  } catch (error) {
    endpointsUsed.push({
      method: 'POST',
      endpoint: `/dseng:EngItem/${referenceId}/invoke/${invokeName}`,
      status: Number(error?.status || 502)
    });
    attempts.push({
      invoke: invokeName,
      scope: 'item',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
    return { ok: false, error };
  }
}

async function tryInvokeGlobal(client, invokeName, body, endpointsUsed, attempts) {
  try {
    await client.ensureCsrf();
    const data = await client.client.invokeDsengGlobal(invokeName, body);
    endpointsUsed.push({
      method: 'POST',
      endpoint: `/dseng/invoke/${invokeName}`,
      status: 200
    });
    attempts.push({
      invoke: invokeName,
      scope: 'global',
      status: 200
    });
    return { ok: true, data };
  } catch (error) {
    endpointsUsed.push({
      method: 'POST',
      endpoint: `/dseng/invoke/${invokeName}`,
      status: Number(error?.status || 502)
    });
    attempts.push({
      invoke: invokeName,
      scope: 'global',
      status: Number(error?.status || 502),
      summary: error?.bodySummary || error?.message
    });
    return { ok: false, error };
  }
}

export async function discoverLifecycleTransitions(client, referenceId, currentState) {
  const endpointsUsed = [];
  const attempts = [];
  const body = { currentState, state: currentState };

  for (const invokeName of INVOKE_TRANSITION_CANDIDATES) {
    const result = await tryInvokeList(client, referenceId, invokeName, body, endpointsUsed, attempts);
    if (result.ok && result.transitions.length) {
      return {
        ok: true,
        transitions: result.transitions,
        invokeName,
        endpointsUsed,
        attempts
      };
    }
  }

  for (const invokeName of ['dseng:getNextStates', 'dseng:GetNextStates']) {
    const globalBody = buildEngItemInvokeArray(referenceId, client.client.spaceUrl, {
      currentState,
      state: currentState
    });
    const global = await tryInvokeGlobal(client, invokeName, globalBody, endpointsUsed, attempts);
    if (global.ok) {
      const transitions = normalizeTransitions(global.data, currentState);
      if (transitions.length) {
        return {
          ok: true,
          transitions,
          invokeName,
          endpointsUsed,
          attempts
        };
      }
    }
  }

  return {
    ok: false,
    transitions: [],
    endpointsUsed,
    attempts,
    code: 'LIFECYCLE_TRANSITIONS_UNAVAILABLE'
  };
}

async function readItemState(client, referenceId) {
  const itemResult = await client.getEngItem(referenceId);
  const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
  return {
    item,
    state: str(item.state || item.maturity)
  };
}

function statesMatch(left, right) {
  return normalizeStateKey(left) === normalizeStateKey(right);
}

export async function executeLifecycleChange(client, referenceId, {
  currentState,
  targetState,
  transition,
  action
}) {
  const endpointsUsed = [];
  const attempts = [];
  const desired = str(targetState);
  const variants = targetStateVariants(desired);

  for (const invokeName of INVOKE_CHANGE_CANDIDATES) {
    for (const apiTarget of variants) {
      const payloads = [
        { currentState, targetState: apiTarget, transition, action, state: apiTarget },
        { currentState, nextState: apiTarget, transition },
        { state: apiTarget },
        { targetState: apiTarget }
      ];
      for (const body of payloads) {
        const result = await tryInvokeList(
          client,
          referenceId,
          invokeName,
          body,
          endpointsUsed,
          attempts
        );
        if (!result.ok) continue;
        const read = await readItemState(client, referenceId);
        if (desired && statesMatch(read.state, desired)) {
          return {
            ok: true,
            invokeName,
            previousState: currentState,
            newState: read.state,
            item: read.item,
            endpointsUsed,
            attempts
          };
        }
      }
    }
  }

  for (const invokeName of ['dseng:changeMaturity', 'dseng:ChangeMaturity']) {
    for (const apiTarget of variants) {
      const globalBody = buildEngItemInvokeArray(referenceId, client.client.spaceUrl, {
        targetState: apiTarget,
        transition,
        action
      });
      const global = await tryInvokeGlobal(client, invokeName, globalBody, endpointsUsed, attempts);
      if (!global.ok) continue;
      const read = await readItemState(client, referenceId);
      if (desired && statesMatch(read.state, desired)) {
        return {
          ok: true,
          invokeName,
          previousState: currentState,
          newState: read.state,
          item: read.item,
          endpointsUsed,
          attempts
        };
      }
      attempts.push({
        invoke: invokeName,
        scope: 'global',
        status: 200,
        verified: false,
        stateAfter: read.state
      });
    }
  }

  const finalRead = await readItemState(client, referenceId);
  if (desired && statesMatch(finalRead.state, desired) && !statesMatch(finalRead.state, currentState)) {
    return {
      ok: true,
      invokeName: 'verified-state-only',
      previousState: currentState,
      newState: finalRead.state,
      item: finalRead.item,
      endpointsUsed,
      attempts
    };
  }

  return {
    ok: false,
    code: 'TRANSITION_NOT_PERMITTED',
    endpointsUsed,
    attempts,
    stateAfter: finalRead.state
  };
}

export async function getLifecycleTransitions(body = {}) {
  const config = getThreeDxConfig();
  const mode = body.mode || config.mode || 'dseng-official';
  const referenceId = str(body.referenceId || body.physicalId);

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
        code: 'OFFICIAL_LIFECYCLE_API_REQUIRED',
        message: 'Modo mock não executa lifecycle real.',
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
    const itemResult = await client.getEngItem(referenceId);
    const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
    const currentState = str(body.currentState || item.state || item.maturity);

    const discovered = await discoverLifecycleTransitions(client, referenceId, currentState);
    if (!discovered.ok || !discovered.transitions.length) {
      return {
        ok: false,
        status: 501,
        data: {
          ok: false,
          source: SOURCE,
          mode,
          code: discovered.code || 'LIFECYCLE_TRANSITIONS_UNAVAILABLE',
          message:
            'Nenhuma transição oficial retornada pelo tenant. Tentativas invoke dseng documentadas em diagnostics.',
          referenceId,
          currentState,
          item: {
            id: item.id,
            title: item.title,
            revision: item.revision,
            currentState
          },
          transitions: [],
          diagnostics: {
            endpointsUsed: [...client.getEndpointsUsed(), ...discovered.endpointsUsed],
            attempts: discovered.attempts
          }
        }
      };
    }

    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        source: SOURCE,
        mode,
        referenceId,
        currentState,
        policy: str(item.policy),
        transitions: discovered.transitions,
        item: {
          id: item.id,
          title: item.title,
          revision: item.revision,
          currentState
        },
        diagnostics: {
          endpointsUsed: [...client.getEndpointsUsed(), ...discovered.endpointsUsed],
          attempts: discovered.attempts,
          invokeName: discovered.invokeName
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
  const referenceId = str(body.referenceId || body.physicalId);
  const targetState = str(body.targetState);
  const transition = str(body.transition);
  const action = str(body.action || body.transition);

  if (!referenceId) {
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
      data: buildErrorResponse('TARGET_STATE_REQUIRED', 'targetState or transition is required', mode)
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
        message: 'Modo mock não executa mudança real de maturidade.'
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
    const itemResult = await client.getEngItem(referenceId);
    const item = normalizeEngItem(unwrapEngItemPayload(itemResult.data));
    const currentState = str(body.currentState || item.state || item.maturity);

    const exec = await executeLifecycleChange(client, referenceId, {
      currentState,
      targetState,
      transition,
      action
    });

    if (!exec.ok) {
      const code = exec.code || 'TRANSITION_NOT_PERMITTED';
      return {
        ok: false,
        status: code === 'TRANSITION_NOT_PERMITTED' ? 403 : 501,
        data: {
          ok: false,
          source: SOURCE,
          mode,
          code,
          message:
            code === 'TRANSITION_NOT_PERMITTED'
              ? 'Transição não permitida ou invoke oficial de maturidade não confirmou mudança de estado.'
              : 'Mudança de maturidade não executada.',
          referenceId,
          previousState: currentState,
          targetState: targetState || transition,
          stateAfter: exec.stateAfter || currentState,
          diagnostics: {
            endpointsUsed: [...client.getEndpointsUsed(), ...exec.endpointsUsed],
            attempts: exec.attempts
          }
        }
      };
    }

    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        source: SOURCE,
        mode,
        referenceId,
        previousState: exec.previousState,
        newState: exec.newState,
        transition: transition || action || exec.invokeName,
        updatedItem: {
          id: exec.item.id,
          title: exec.item.title,
          revision: exec.item.revision,
          state: exec.newState
        },
        diagnostics: {
          endpointsUsed: [...client.getEndpointsUsed(), ...exec.endpointsUsed],
          attempts: exec.attempts,
          invokeName: exec.invokeName
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

export async function probeLifecycle(body = {}) {
  const referenceId = str(body.referenceId || body.physicalId || '63FC553465A62400699DB567');
  const transitionsResult = await getLifecycleTransitions({
    ...body,
    referenceId,
    mode: 'dseng-official'
  });
  return {
    referenceId,
    transitionsOk: transitionsResult.ok,
    transitions: transitionsResult.data?.transitions || [],
    diagnostics: transitionsResult.data?.diagnostics || transitionsResult.data
  };
}
