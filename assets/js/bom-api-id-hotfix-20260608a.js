/* BOM hotfix - 20260614b — DEC-015 Expand Item transport fix (CORS/CSRF) + Full BOM API alternativo */
(function () {
'use strict';

var w = window;
var BUILD = 'bom20260614b';
var BACKEND = 'https://bom-resolver.onrender.com';
var DATA_SOURCE = 'expand-item';
var EXPAND_ITEM_LEVELS = 2;
var LOADER_MODE = DATA_SOURCE;
var MIRROR_EXPLORER_MODE = false;
var DEC014_REF = 'DEC-014 (docs/DECISOES-TECNICAS.md)';
var DEC015_REF = 'DEC-015 (docs/DEC-015-EXPAND-ITEM-PROVIDER.md)';
var MIRROR_UNAVAILABLE_MSG =
  'Modo Explorer Mirror indisponível: o Product Structure Explorer não expõe API pública para árvore expandida em widget GitHub Pages separado. Consulte DEC-014.';
var FULL_BOM_API_MSG =
  'Modo Full BOM API: estrutura reconstruída via API ENOVIA, independente do estado visual expandido no Product Explorer.';
var MIRROR_ROADMAP_NOTE =
  'Para viabilizar Mirror Explorer real, validar com Dassault/tenant contrato oficial ENOPSTR_* ou API interna para nós expandidos/carregados. Sem esse contrato: widget nativo mesma origem com API oficial.';

w.BOM_BUILD_ID = BUILD;
w.__BOM_BUILD_ID__ = BUILD;
w.__BOM_BACKEND_URL__ = BACKEND;
w.__BOM_HOTFIX_MODE__ = 'expand-item-provider';
w.__BOM_LOADER_MODE__ = LOADER_MODE;
w.__BOM_DATA_SOURCE__ = DATA_SOURCE;
w.EXPAND_ITEM_LEVELS = EXPAND_ITEM_LEVELS;
w.__BOM_MIRROR_EXPLORER_MODE__ = MIRROR_EXPLORER_MODE;
w.__bomBridgeLastResult = null;
w.__bomBridgeLastError = null;

function updateBuildPill() {
  try {
    w.__BOM_BUILD_ID__ = BUILD;
    w.BOM_BUILD_ID = BUILD;
    var root = w.__3DX_UI_ROOT__ || document;
    var pill = root.querySelector && root.querySelector('.bom-build-pill');
    if (pill) pill.textContent = BUILD;
    var tag = root.querySelector && root.querySelector('#buildTag');
    if (tag) tag.textContent = BUILD;
  } catch (e) {}
}

function getWafData() {
  if (w.WAFData && w.WAFData.authenticatedRequest) return w.WAFData;
  if (w.widget && w.widget.WAFData && w.widget.WAFData.authenticatedRequest) return w.widget.WAFData;
  return null;
}

function getWafHeaders() {
  var h = { Accept: 'application/json' };
  try {
    var st =
      typeof w.PlatformContext !== 'undefined' &&
      w.PlatformContext.getState &&
      w.PlatformContext.getState();
    if (st && st.securityContext) {
      h.SecurityContext = st.securityContext;
      return h;
    }
  } catch (e) {}
  try {
    if (w.widget && w.widget.wafSecurityContext) {
      h.SecurityContext = w.widget.wafSecurityContext;
    }
  } catch (e) {}
  return h;
}

function ensureBridgeContext() {
  return Promise.resolve()
    .then(function () {
      if (typeof w.PlatformContext !== 'undefined' && w.PlatformContext.init) {
        return w.PlatformContext.init();
      }
      return null;
    })
    .then(function () {
      updateBuildPill();
      var headers = getWafHeaders();
      if (headers && headers.SecurityContext) return headers;
      diag('warn', 'SecurityContext ausente — chamadas ENOVIA podem retornar 401');
      return headers;
    })
    .catch(function () {
      return getWafHeaders();
    });
}

function s(v) {
return String(v || '').trim();
}

function n(v) {
return Number(v || 0);
}

function sleep(ms) {
return new Promise(function (resolve) {
setTimeout(resolve, ms);
});
}

function cleanUrl(v) {
return s(v).replace(/\/+$/, '');
}

function diag(type, msg) {
try {
console.log('[BOM ' + BUILD + ']', type, msg);
} catch (e) {}

try {
  var id = 'bom-hotfix-toast';
  var el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.left = '12px';
    el.style.right = '12px';
    el.style.bottom = '12px';
    el.style.zIndex = '999999';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.fontFamily = 'Arial, sans-serif';
    el.style.fontSize = '13px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,.20)';
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.style.background = type === 'error' ? '#7f1d1d' : type === 'warn' ? '#92400e' : '#166534';
  el.style.color = '#fff';
} catch (e) {}

}

function getCompassSpaceUrl() {
return new Promise(function (resolve) {
try {
if (w.widget && w.widget.getValue) {
var p = w.widget.getValue('x3dPlatformId') || w.widget.getValue('platformId');
if (p) {
resolve('https://' + String(p).toLowerCase() + '-us1-space.3dexperience.3ds.com/enovia');
return;
}
}
} catch (e) {}


  try {
    if (w.compass && w.compass.getServiceUrl) {
      w.compass.getServiceUrl({
        serviceName: '3DSpace',
        onComplete: function (url) {
          resolve(cleanUrl(url));
        },
        onFailure: function () {
          resolve('');
        }
      });
      return;
    }
  } catch (e) {}

  try {
    if (w.UWA && w.UWA.Data && w.UWA.Data.getCompassServiceUrl) {
      w.UWA.Data.getCompassServiceUrl({
        serviceName: '3DSpace',
        onComplete: function (url) {
          resolve(cleanUrl(url));
        },
        onFailure: function () {
          resolve('');
        }
      });
      return;
    }
  } catch (e) {}

  resolve('');
});

}

function guessSpaceUrlFromLocation() {
try {
var host = String(location.hostname || '').toLowerCase();
if (host.indexOf('3dexperience.3ds.com') >= 0) {
var m = host.match(/(r\d+)-/i);
if (m && m[1]) {
return 'https://' + m[1].toLowerCase() + '-us1-space.3dexperience.3ds.com/enovia';
}
}
} catch (e) {}
return '';
}

function getRootName() {
var values = [];

try {
  values.push(w.__BOM_ROOT_NAME__);
  values.push(w.__CURRENT_ROOT_NAME__);
  values.push(w.BOM_ROOT_NAME);
} catch (e) {}

try {
  var title = document.querySelector('.breadcrumb, .title, [title*="CJ"], [aria-label*="CJ"]');
  if (title) values.push(title.textContent || title.getAttribute('title'));
} catch (e) {}

try {
  var selected = document.querySelector('.selected, .is-selected, .wux-datagrid-row-selected');
  if (selected) values.push(selected.textContent);
} catch (e) {}

try {
  values.push(document.title);
} catch (e) {}

for (var i = 0; i < values.length; i++) {
  var v = s(values[i]);
  if (!v) continue;

  var m = v.match(/CJ\s+MESA\s+4BCS\s+VP\s+TOP\s+3DX/i);
  if (m) return 'CJ MESA 4BCS VP TOP 3DX';

  var m2 = v.match(/SKA_ENDERSW-BES-\d+/i);
  if (m2) return m2[0];
}

return 'CJ MESA 4BCS VP TOP 3DX';

}

function getPhysicalId() {
var values = [];

try {
  values.push(w.__BOM_PHYSICAL_ID__);
  values.push(w.__CURRENT_PHYSICAL_ID__);
  values.push(w.BOM_PHYSICAL_ID);
} catch (e) {}

try {
  var html = document.body ? document.body.innerText : '';
  var m = String(html || '').match(/prd-R\d+-\d+/i);
  if (m) values.push(m[0]);
} catch (e) {}

for (var i = 0; i < values.length; i++) {
  var v = s(values[i]);
  if (v.indexOf('prd-') === 0) return v;
}

return '';

}

function getExplorerLoadedCount() {
  try {
    if (w.__BOM_EXPLORER_LOADED_COUNT__) return n(w.__BOM_EXPLORER_LOADED_COUNT__);
  } catch (e) {}

  try {
    if (typeof w.ProductExplorerBridge !== 'undefined' && w.ProductExplorerBridge.getExplorerObjectCount) {
      if (w.ProductExplorerBridge.pollDashboardExplorerChrome) {
        w.ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      var nObj = n(w.ProductExplorerBridge.getExplorerObjectCount());
      if (nObj > 0) return nObj;
    }
  } catch (e) {}

  try {
    var txt = document.body ? document.body.innerText : '';
    var m = String(txt || '').match(/(\d+)\s+objetos/i);
    if (m) return Number(m[1]);
  } catch (e) {}

  try {
    if (w.__BOM_EXPECTED_COUNT__) return n(w.__BOM_EXPECTED_COUNT__);
  } catch (e) {}

  return 0;
}

function getExpectedCount() {
  return getExplorerLoadedCount();
}

function normalizeMatchKey(v) {
  return s(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.\d+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferParentVisualIndices(rows) {
  rows = Array.isArray(rows) ? rows : [];
  var stack = [];
  rows.forEach(function (row, idx) {
    var level = n(row.level);
    if (level > 0 && stack[level - 1] != null) {
      row.parentVisualIndex = stack[level - 1];
    } else {
      row.parentVisualIndex = null;
    }
    stack[level] = idx;
    stack.length = level + 1;
  });
  return rows;
}

function mirrorItemToExplorerRow(item, idx) {
  item = item || {};
  return {
    visualIndex: idx,
    level: n(item.level),
    title: s(item.title || item.name),
    name: s(item.name || item.title),
    instanceName: s(item.name || item.title),
    physicalId: s(item.sourcePhysicalId || (item.physicalid && /^prd-/i.test(item.physicalid) ? item.physicalid : '')),
    referenceId: s(item.sourcePhysicalId),
    revision: s(item.revision),
    maturity: s(item.maturity || item.state),
    state: s(item.state || item.maturity),
    owner: s(item.owner),
    type: s(item.type || item.displayType),
    displayType: s(item.displayType || item.type),
    approval: s(item.approval),
    text: s(item.name || item.title),
    expanded: null,
    collapsed: null,
    parentVisualIndex: null
  };
}

function disableMirrorCaptureFlags() {
  try {
    if (typeof w.APP_CONFIG === 'undefined') w.APP_CONFIG = {};
    w.APP_CONFIG.USE_DOM_MIRROR_PRIMARY = false;
    w.APP_CONFIG.DOM_MIRROR_FALLBACK = false;
    w.APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = false;
    w.APP_CONFIG.PASTE_TRAP_ENABLED = false;
    w.APP_CONFIG.EXPLORER_MIRROR_AUTO_SYNC = false;
    w.APP_CONFIG.PRIMARY_LOADER = 'api';
    if (w.APP_CONFIG.DATA_SOURCE) {
      DATA_SOURCE = w.APP_CONFIG.DATA_SOURCE;
      LOADER_MODE = DATA_SOURCE;
      w.__BOM_DATA_SOURCE__ = DATA_SOURCE;
      w.__BOM_LOADER_MODE__ = DATA_SOURCE;
    }
    if (w.APP_CONFIG.EXPAND_ITEM_LEVELS > 0) {
      EXPAND_ITEM_LEVELS = n(w.APP_CONFIG.EXPAND_ITEM_LEVELS);
      w.EXPAND_ITEM_LEVELS = EXPAND_ITEM_LEVELS;
    }
  } catch (e) {}
}

function getExplorerReferenceContext() {
  var rootName = getRootName();
  try {
    if (typeof w.ProductExplorerBridge !== 'undefined') {
      if (w.ProductExplorerBridge.pollDashboardExplorerChrome) {
        w.ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (w.ProductExplorerBridge.getStructureNameHint) {
        var hint = s(w.ProductExplorerBridge.getStructureNameHint());
        if (hint) rootName = hint;
      }
    }
  } catch (e0) { /* */ }
  try {
    if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
      var ctx = w.ExplorerContext.refresh(true);
      if (ctx && ctx.rootName) rootName = s(ctx.rootName) || rootName;
    }
  } catch (e1) { /* */ }
  return {
    loaderMode: LOADER_MODE,
    mirrorExplorerMode: false,
    mirrorStatus: 'unavailable',
    mirrorMessage: MIRROR_UNAVAILABLE_MSG,
    fullBomMessage: FULL_BOM_API_MSG,
    dec014: DEC014_REF,
    explorerReferenceCount: getExplorerLoadedCount(),
    rootName: rootName,
    status: 'reference-only'
  };
}

function mirrorLog(label, value) {
  try {
    if (value !== undefined) console.log('[BOM loader]', label + ':', value);
    else console.log('[BOM loader]', label);
  } catch (e) {}
}

function probeExplorerDomAccess() {
  var out = {
    crossOriginBlocked: false,
    iframeDoc: false,
    topAccessible: false,
    reason: ''
  };
  try {
    if (w.top && w.top.document && w.top.document.body) out.topAccessible = true;
  } catch (e) {
    out.crossOriginBlocked = true;
    out.reason = 'top document blocked: ' + (e && e.message ? e.message : String(e));
  }
  try {
    var PEB = w.ProductExplorerBridge;
    if (PEB && PEB.readExplorerIframeDocument) {
      var doc = PEB.readExplorerIframeDocument();
      out.iframeDoc = !!(doc && doc.body);
      if (!out.iframeDoc && !out.crossOriginBlocked) {
        out.reason = out.reason || 'explorer iframe not found in parent/top';
      }
    }
  } catch (e2) {
    out.crossOriginBlocked = true;
    out.reason = e2 && e2.message ? e2.message : String(e2);
  }
  return out;
}

function applyExplorerPayload(snapshot, payload, mode) {
  if (!payload || !payload.items || !payload.items.length) return false;
  if (payload.items.length < (snapshot.rows || []).length) return false;
  snapshot.source = payload.scrapeSource || mode;
  snapshot.extractionMode = mode;
  snapshot.rootName = s(payload.productName) || snapshot.rootName;
  snapshot.rows = payload.items.map(mirrorItemToExplorerRow);
  snapshot.rows = inferParentVisualIndices(snapshot.rows);
  return true;
}

/** Referência Explorer apenas (contador/nome) — sem DOM/TSV/clipboard. DEC-014 */
function extractExplorerSnapshotAsync() {
  var ctx = getExplorerReferenceContext();
  w.__bomExplorerSnapshot = ctx;
  mirrorLog('explorer reference count', ctx.explorerReferenceCount);
  mirrorLog('loader mode', LOADER_MODE);
  return Promise.resolve(ctx);
}

function extractExplorerSnapshot() {
  return w.__bomExplorerSnapshot || getExplorerReferenceContext();
}

w.__bomExtractExplorerSnapshot = extractExplorerSnapshotAsync;

function backendPost(path, payload) {
return fetch(BACKEND + path, {
method: 'POST',
mode: 'cors',
credentials: 'omit',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(payload || {})
}).then(function (res) {
return res.text().then(function (txt) {
var data = {};
try {
data = txt ? JSON.parse(txt) : {};
} catch (e) {
data = { raw: txt };
}

    if (!res.ok) {
      var err = new Error(data.error || data.message || ('Backend HTTP ' + res.status));
      err.response = data;
      throw err;
    }

    return data;
  });
});

}

function wafGet(url) {
return new Promise(function (resolve) {
try {
var WAF = getWafData();
var headers = getWafHeaders();
if (!WAF) {
resolve({
ok: false,
error: 'WAFData.authenticatedRequest indisponivel',
status: 0
});
return;
}

    WAF.authenticatedRequest(url, {
      method: 'GET',
      type: 'json',
      headers: headers,
      timeout: 60000,
      onComplete: function (data) {
        resolve({
          ok: true,
          status: 200,
          payload: data
        });
      },
      onFailure: function (err) {
        var status = err && (err.status || err.statusCode || err.code || err.responseCode) || 0;
        resolve({
          ok: false,
          status: status,
          error: err && (err.message || err.error || err.toString && err.toString()) || 'WAF request failed',
          payload: err || null
        });
      }
    });
  } catch (e) {
    resolve({
      ok: false,
      status: 0,
      error: e && e.message ? e.message : String(e)
    });
  }
});

}

function runTasks(tasks) {
var list = Array.isArray(tasks) ? tasks : [];
var chain = Promise.resolve([]);
list.forEach(function (t) {
chain = chain.then(function (acc) {
if (!t || !t.url) {
acc.push({
id: t && t.id,
meta: t && t.meta,
ok: false,
error: 'task sem url'
});
return acc;
}
    return wafGet(t.url).then(function (r) {
      acc.push({
        id: t.id,
        taskId: t.id,
        meta: t.meta || {},
        ok: !!r.ok,
        status: r.status || 0,
        error: r.error || '',
        payload: r.payload || null
      });
      return acc;
    });
  });
});
return chain;

}

function normalizeBackendResult(data) {
data = data || {};

var rows = data.rows || data.items || data.bom || [];
if (!Array.isArray(rows)) rows = [];

return {
  source: 'browser-auth-bridge',
  build: data.build || BUILD,
  status: data.status || (data.partial ? 'partial' : 'done'),
  partial: !!data.partial,
  expectedCount: n(data.expectedCount || data.expected || data.total),
  actualCount: n(data.actualCount || rows.length),
  rows: rows,
  items: rows,
  bom: rows,
  diagnostics: data.diagnostics || [],
  message: data.message || '',
  stoppedByExpected: !!data.stoppedByExpected
};

}

function bridgeLog(label, value) {
  try {
    if (value !== undefined) {
      console.log('[BOM bridge]', label + ':', value);
    } else {
      console.log('[BOM bridge]', label);
    }
  } catch (e) {}
}

function isRealTreeRow(row) {
  row = row || {};
  if (row.root === true || s(row.source) === 'root') return true;
  var src = s(row.source);
  if (src === 'engInstance' || src === 'browser-auth') {
    return !!s(row.instanceId);
  }
  return false;
}

function filterRealTreeRows(rows) {
  rows = Array.isArray(rows) ? rows : [];
  var kept = [];
  var discarded = [];
  rows.forEach(function (row) {
    if (isRealTreeRow(row)) {
      kept.push(row);
    } else {
      discarded.push({
        id: s(row.id),
        title: s(row.title || row.name || row.instanceName),
        source: s(row.source),
        reason: 'nao root/engInstance com instanceId'
      });
    }
  });
  return { rows: kept, discarded: discarded };
}

function dedupeKey(row) {
  row = row || {};
  var instanceId = s(row.instanceId);
  if (instanceId) return 'inst:' + instanceId;
  var parentId = s(row.parentId || 'ROOT');
  var refId = s(row.referenceId || row.physicalId || row.navId || row.objectId || row.id);
  var instName = s(row.instanceName || row.name || row.title);
  if (refId && instName) return 'combo:' + parentId + '|' + refId + '|' + instName;
  return 'combo:' + parentId + '|' + refId;
}

function rowScore(row) {
  row = row || {};
  var score = 0;
  if (row.root === true || s(row.source) === 'root') score += 500;
  if (s(row.source) === 'engInstance') score += 200;
  if (s(row.source) === 'browser-auth') score += 120;
  if (s(row.treeOrigin) === 'root-crawl') score += 80;
  if (s(row.treeOrigin) === 'probe-crawl') score += 40;
  if (s(row.instanceId)) score += 60;
  if (s(row.parentId)) score += 10;
  score -= n(row.level) * 3;
  return score;
}

function dedupeByInstanceId(rows) {
  rows = Array.isArray(rows) ? rows : [];
  var byInst = {};
  var removed = 0;
  var out = [];

  rows.forEach(function (row) {
    var iid = s(row.instanceId);
    if (!iid) return;
    if (!byInst[iid] || rowScore(row) > rowScore(byInst[iid])) {
      if (byInst[iid]) removed += 1;
      byInst[iid] = row;
    } else {
      removed += 1;
    }
  });

  Object.keys(byInst).forEach(function (k) {
    out.push(byInst[k]);
  });

  rows.forEach(function (row) {
    if (!s(row.instanceId) && (row.root === true || s(row.source) === 'root')) {
      out.push(row);
    }
  });

  return { rows: out, removed: removed };
}

function filterConnectedTree(rows, rootName) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return [];

  var byId = {};
  rows.forEach(function (row) {
    byId[s(row.id)] = row;
  });

  var startIds = [];
  rows.forEach(function (row) {
    if (row.root === true || s(row.source) === 'root') {
      startIds.push(s(row.id));
    }
  });

  if (!startIds.length) {
    rows.forEach(function (row) {
      var parentId = s(row.parentId);
      if (!parentId || !byId[parentId]) {
        startIds.push(s(row.id));
      }
    });
  }

  if (!startIds.length) startIds.push(s(rows[0].id));

  var connected = {};
  function walk(id) {
    if (!id || connected[id] || !byId[id]) return;
    connected[id] = byId[id];
    rows.forEach(function (row) {
      if (s(row.parentId) === id) walk(s(row.id));
    });
  }

  startIds.forEach(function (id) {
    walk(id);
  });

  return Object.keys(connected).map(function (k) {
    return connected[k];
  });
}

function dedupeBridgeRows(rows) {
  rows = Array.isArray(rows) ? rows : [];
  var best = {};
  var removed = 0;
  rows.forEach(function (row) {
    var key = dedupeKey(row);
    if (!best[key] || rowScore(row) > rowScore(best[key])) {
      if (best[key]) removed += 1;
      best[key] = row;
    } else {
      removed += 1;
    }
  });
  return {
    rows: Object.keys(best).map(function (k) {
      return best[k];
    }),
    removed: removed
  };
}

function classifyBridgeRows(rows) {
  rows = Array.isArray(rows) ? rows : [];
  var candidateRows = [];
  var probeRows = [];
  var navigationRows = [];
  var treeRows = [];
  var discarded = [];

  rows.forEach(function (row) {
    row = row || {};
    var src = s(row.source);
    var meta = {
      id: s(row.id),
      title: s(row.title || row.name || row.instanceName),
      source: src,
      parentId: s(row.parentId),
      instanceId: s(row.instanceId),
      referenceId: s(row.referenceId || row.physicalId || row.navId),
      navigableId: s(row.navigableId || row.navId),
      name: s(row.name || row.instanceName),
      type: s(row.type || row.objectType),
      treeOrigin: s(row.treeOrigin)
    };

    if (row.root === true || src === 'root') {
      treeRows.push(Object.assign({}, row, { source: 'root' }));
      return;
    }

    if ((src === 'engInstance' || src === 'browser-auth') && meta.instanceId) {
      treeRows.push(Object.assign({}, row, { source: 'engInstance' }));
      return;
    }

    if (
      src === 'search' ||
      src === 'candidate' ||
      src === 'rootSearch' ||
      src === 'childSearch' ||
      meta.treeOrigin.indexOf('search') >= 0
    ) {
      candidateRows.push(row);
      discarded.push(Object.assign({}, meta, { reason: 'candidato search — nao entra na E-BOM' }));
      return;
    }

    if (src === 'probe' || (meta.treeOrigin.indexOf('probe') === 0 && !meta.instanceId)) {
      probeRows.push(row);
      discarded.push(Object.assign({}, meta, { reason: 'probe de navegacao — nao entra na E-BOM' }));
      return;
    }

    if (src === 'detail' || src === 'navigation' || src === 'reference') {
      navigationRows.push(row);
      discarded.push(Object.assign({}, meta, { reason: 'detail/navigation — nao entra na E-BOM' }));
      return;
    }

    discarded.push(Object.assign({}, meta, { reason: 'linha auxiliar sem instanceId valido' }));
  });

  return {
    candidateRows: candidateRows,
    probeRows: probeRows,
    navigationRows: navigationRows,
    treeRows: treeRows,
    discarded: discarded
  };
}

function buildFinalTreeRows(classified) {
  classified = classified || {};
  var treeRows = classified.treeRows || [];

  var instDedup = dedupeByInstanceId(treeRows);
  var connected = filterConnectedTree(instDedup.rows);
  var deduped = dedupeBridgeRows(connected);

  var finalRows = deduped.rows.filter(function (row) {
    var src = s(row.source);
    return src === 'root' || (src === 'engInstance' && !!s(row.instanceId));
  });

  finalRows = sortRowsTreeOrder(finalRows);

  return {
    finalRows: finalRows,
    instDedupRemoved: instDedup.removed,
    bridgeDedupRemoved: deduped.removed,
    detailMerged: 0
  };
}

function backendRowKey(row) {
  return s(row && (row.id || row.instanceId || row.referenceId || row.title));
}

function buildBackendMatchIndex(backendRows) {
  backendRows = Array.isArray(backendRows) ? backendRows : [];
  var index = {
    byPhysicalId: {},
    byInstanceId: {},
    byReferenceId: {},
    byTitle: {},
    byInstanceName: {},
    byParentTitleLevel: {},
    all: backendRows.slice()
  };

  backendRows.forEach(function (row) {
    var physicalId = s(row.physicalId || row.referenceId);
    var instanceId = s(row.instanceId);
    var referenceId = s(row.referenceId || row.physicalId || row.navId);
    var title = normalizeMatchKey(row.title || row.name || row.instanceName);
    var instanceName = normalizeMatchKey(row.instanceName || row.name || row.title);
    var parentId = s(row.parentId);
    var level = n(row.level);

    function push(map, key) {
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }

    if (physicalId && /^prd-/i.test(physicalId)) push(index.byPhysicalId, physicalId);
    push(index.byInstanceId, instanceId);
    push(index.byReferenceId, referenceId);
    push(index.byTitle, title);
    push(index.byInstanceName, instanceName);
    if (title) push(index.byParentTitleLevel, parentId + '|' + title + '|' + level);
  });

  return index;
}

function pickUnusedMatch(rows, used) {
  rows = Array.isArray(rows) ? rows : [];
  var i;
  for (i = 0; i < rows.length; i++) {
    var key = backendRowKey(rows[i]);
    if (!key || !used[key]) {
      if (key) used[key] = true;
      return rows[i];
    }
  }
  return null;
}

function matchBackendRow(explorerRow, index, used, parentBackendId) {
  explorerRow = explorerRow || {};
  index = index || {};

  var physicalId = s(explorerRow.physicalId || explorerRow.referenceId);
  if (physicalId && /^prd-/i.test(physicalId)) {
    var byPid = pickUnusedMatch(index.byPhysicalId[physicalId], used);
    if (byPid) return byPid;
  }

  var instanceId = s(explorerRow.instanceId);
  if (instanceId) {
    var byInst = pickUnusedMatch(index.byInstanceId[instanceId], used);
    if (byInst) return byInst;
  }

  var referenceId = s(explorerRow.referenceId);
  if (referenceId) {
    var byRef = pickUnusedMatch(index.byReferenceId[referenceId], used);
    if (byRef) return byRef;
  }

  var title = normalizeMatchKey(explorerRow.title || explorerRow.name);
  var level = n(explorerRow.level);
  if (parentBackendId && title) {
    var byPtl = pickUnusedMatch(index.byParentTitleLevel[parentBackendId + '|' + title + '|' + level], used);
    if (byPtl) return byPtl;
  }

  var instanceName = normalizeMatchKey(explorerRow.instanceName || explorerRow.name || explorerRow.title);
  if (instanceName) {
    var byName = pickUnusedMatch(index.byInstanceName[instanceName], used);
    if (byName) return byName;
  }

  if (title) {
    var byTitle = pickUnusedMatch(index.byTitle[title], used);
    if (byTitle) return byTitle;
  }

  return null;
}

function mergeExplorerMirror(explorerSnapshot, backendRows) {
  explorerSnapshot = explorerSnapshot || {};
  var explorerRows = Array.isArray(explorerSnapshot.rows) ? explorerSnapshot.rows.slice() : [];
  var index = buildBackendMatchIndex(backendRows);
  var used = {};
  var finalRows = [];
  var matched = 0;
  var parentBackendByVisual = {};

  explorerRows.forEach(function (exRow, idx) {
    var parentVisual = exRow.parentVisualIndex;
    var parentBackendId = parentVisual != null ? parentBackendByVisual[parentVisual] : null;
    var backend = matchBackendRow(exRow, index, used, parentBackendId);
    var isRoot = n(exRow.level) === 0 && idx === 0;

    var merged = {
      id: backend ? s(backend.id) : ('explorer:' + idx),
      visualIndex: idx,
      level: n(exRow.level),
      parentId: backend ? s(backend.parentId) : null,
      instanceId: backend ? s(backend.instanceId) : s(exRow.instanceId),
      instanceName: s(exRow.instanceName || exRow.name || exRow.title),
      name: s(exRow.name || exRow.title),
      title: s(exRow.title || exRow.name),
      type: s((backend && backend.type) || exRow.type) || 'VPMReference',
      physicalId: s((backend && (backend.physicalId || backend.referenceId)) || exRow.physicalId),
      referenceId: s((backend && (backend.referenceId || backend.physicalId)) || exRow.referenceId || exRow.physicalId),
      navigableId: backend ? s(backend.navigableId || backend.navId) : '',
      navId: backend ? s(backend.navId || backend.navigableId) : '',
      maturity: s((backend && backend.maturity) || exRow.maturity || exRow.state),
      state: s((backend && backend.state) || exRow.state || exRow.maturity),
      owner: s((backend && backend.owner) || exRow.owner),
      revision: s((backend && backend.revision) || exRow.revision),
      source: isRoot ? 'root' : 'explorer-mirror',
      root: isRoot,
      mirrorSource: true,
      enriched: !!backend
    };

    if (backend) matched += 1;
    parentBackendByVisual[idx] = merged.id;
    finalRows.push(merged);
  });

  var backendOnly = [];
  index.all.forEach(function (row) {
    var key = backendRowKey(row);
    if (key && !used[key]) {
      backendOnly.push({
        title: s(row.title || row.name || row.instanceName),
        id: s(row.id),
        source: s(row.source),
        parentId: s(row.parentId),
        instanceId: s(row.instanceId),
        referenceId: s(row.referenceId || row.physicalId || row.navId),
        reason: 'backendOnly — ausente no snapshot do Explorer'
      });
    }
  });

  return {
    finalRows: finalRows,
    matched: matched,
    backendOnly: backendOnly,
    explorerCount: explorerRows.length
  };
}

function logBackendOnlyRows(rows) {
  if (!rows || !rows.length) return;
  bridgeLog('backend-only discarded', rows);
}

function logDiscardedRows(discarded) {
  if (!discarded || !discarded.length) return;
  bridgeLog('discarded rows sample', discarded.slice(0, 12));
}

function sortRowsTreeOrder(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return [];

  var byId = {};
  rows.forEach(function (row) {
    byId[s(row.id)] = row;
  });

  var roots = rows.filter(function (row) {
    var parentId = s(row.parentId);
    return !parentId || !byId[parentId] || n(row.level) === 0;
  });

  if (!roots.length) roots = [rows[0]];
  roots.sort(function (a, b) {
    return n(a.level) - n(b.level);
  });

  var out = [];
  var seen = {};

  function walk(row, depth) {
    var id = s(row.id);
    if (seen[id]) return;
    seen[id] = true;
    row.level = depth;
    out.push(row);
    rows.forEach(function (child) {
      if (s(child.parentId) === id) walk(child, depth + 1);
    });
  }

  roots.forEach(function (root) {
    walk(root, n(root.level) || 0);
  });

  rows.forEach(function (row) {
    if (!seen[s(row.id)]) {
      out.push(row);
    }
  });

  return out;
}

function mapExpandRowsToImportItems(rows) {
  rows = Array.isArray(rows) ? rows : [];
  return rows.map(function (row, idx) {
    row = row || {};
    var physicalid = s(row.instanceId) || s(row.referenceId) || ('expand_' + idx);
    return {
      level: n(row.level),
      physicalid: physicalid,
      name: s(row.instanceName || row.name || row.title) || ('Item ' + idx),
      title: s(row.title || row.name || row.instanceName),
      type: s(row.type) || 'VPMReference',
      displayType: 'Physical Product',
      revision: s(row.revision),
      state: s(row.state || row.maturity),
      maturity: s(row.maturity || row.state),
      owner: s(row.owner),
      approval: 'Unknown',
      quantity: 1,
      sourcePhysicalId: s(row.physicalId || row.referenceId),
      parentId: s(row.parentReferenceId),
      instanceName: s(row.instanceName),
      referenceId: s(row.referenceId),
      rowKey: s(row.rowKey),
      organization: s(row.organization),
      collabspace: s(row.collabspace)
    };
  });
}

function mapRowsToImportItems(rows, rootName, preserveOrder) {
  if (!preserveOrder) {
    rows = sortRowsTreeOrder(rows);
  }
  return rows.map(function (row, idx) {
    var physicalid =
      s(row.instanceId) ||
      s(row.physicalId) ||
      s(row.navId) ||
      s(row.referenceId) ||
      ('bridge_' + idx);
    var title = s(row.title || row.name || row.instanceName);
    var name = s(row.instanceName || row.name || title);
    return {
      level: n(row.level),
      physicalid: physicalid,
      name: name || title || ('Item ' + idx),
      title: title || name,
      type: s(row.type || row.objectType) || 'VPMReference',
      displayType: 'Physical Product',
      revision: s(row.revision) || '',
      state: s(row.maturity || row.state) || '',
      maturity: s(row.maturity || row.state) || '',
      owner: s(row.owner || row.reservedBy) || '',
      approval: 'Unknown',
      quantity: row.quantity || 1,
      sourcePhysicalId: s(row.physicalId || row.navId || row.referenceId),
      parentId: s(row.parentId),
      instanceName: name,
      referenceId: s(row.physicalId || row.navId || row.referenceId || physicalid)
    };
  });
}

function processBridgeResult(raw, loadContext) {
  raw = raw || {};
  loadContext = loadContext || w.__bomLoadContext || getExplorerReferenceContext();

  var rawRows = raw.rows || raw.items || raw.bom || raw.treeRows || [];
  if (!Array.isArray(rawRows)) rawRows = [];

  var explorerRef = n(loadContext.explorerReferenceCount) || getExplorerLoadedCount();
  var rootName = s(loadContext.rootName) || getRootName();
  var backendStats = raw.stats || {};

  bridgeLog('explorer reference count', explorerRef);
  bridgeLog('backend raw rows', rawRows.length);

  var classified = classifyBridgeRows(rawRows);
  var built = buildFinalTreeRows(classified);
  var finalRows = built.finalRows;
  var detailMerged = n(backendStats.detailMerged) || 0;
  var duplicatesRemoved = built.instDedupRemoved + built.bridgeDedupRemoved;

  logDiscardedRows(classified.discarded);

  var items = mapRowsToImportItems(finalRows, rootName, false);
  var mappedCount = items.length;

  if (items.length) bridgeLog('first row', items[0]);
  bridgeLog('final dashboard rows', mappedCount);

  if (explorerRef > 0 && mappedCount !== explorerRef) {
    bridgeLog('info only — Explorer carregado: ' + explorerRef + ' | Full BOM API: ' + mappedCount);
  }

  return {
    rawCount: rawRows.length,
    realTreeCount: finalRows.length,
    discardedCount: classified.discarded.length,
    dedupCount: mappedCount,
    mappedCount: mappedCount,
    explorerReferenceCount: explorerRef,
    explorerLoadedCount: explorerRef,
    rootName: rootName,
    items: items,
    partial: !!raw.partial,
    incomplete: false,
    mirrorMode: false,
    loaderMode: LOADER_MODE,
    message: 'Full BOM API: ' + mappedCount + ' linhas',
    removedDuplicates: duplicatesRemoved,
    discardedRows: classified.discarded,
    stats: {
      explorerReferenceCount: explorerRef,
      backendRawRows: rawRows.length,
      backendTreeRows: finalRows.length,
      searchDiscarded: classified.candidateRows.length,
      probeDiscarded: classified.probeRows.length,
      detailMerged: detailMerged,
      duplicatesRemoved: duplicatesRemoved
    }
  };
}

function applyBridgeItemsToUI(processed) {
  processed = processed || {};
  var items = processed.items || [];
  var rootName = processed.rootName || getRootName();

  if (!items.length) {
    return Promise.reject(new Error('Bridge retornou 0 linhas apos deduplicacao'));
  }

  if (typeof w.APP_CONFIG !== 'undefined') {
    w.APP_CONFIG.IMPORT_MODE = true;
    w.APP_CONFIG.DEMO_MODE = false;
  }

  if (typeof w.BomSnapshot !== 'undefined' && w.BomSnapshot.buildFromImported && w.BomSnapshot.applyPayload) {
    var payload = w.BomSnapshot.buildFromImported(items, rootName);
    if (payload) {
      payload.scrapeSource =
        processed.loaderMode === 'expand-item'
          ? 'expand-item'
          : processed.loaderMode === 'full-bom-api'
            ? 'full-bom-api'
            : 'browser-auth-bridge';
    }
    return w.BomSnapshot.applyPayload(payload).then(function (meta) {
      var count =
        typeof w.BomService !== 'undefined' && w.BomService.getNodeCount
          ? w.BomService.getNodeCount()
          : processed.mappedCount;
      bridgeLog('UI nodeCount', count);
      return {
        meta: meta || {},
        count: count
      };
    });
  }

  if (typeof w.BomService === 'undefined' || !w.BomService.loadFromImportedItems) {
    return Promise.reject(new Error('BomService indisponivel para aplicar bridge'));
  }

  if (w.BomService.reset) w.BomService.reset();
  return Promise.resolve(w.BomService.loadFromImportedItems(items)).then(function () {
    var count = w.BomService.getNodeCount ? w.BomService.getNodeCount() : items.length;
    bridgeLog('UI nodeCount', count);
    return {
      meta: {
        productName: rootName,
        itemCount: count,
        rootPhysicalId: items[0] && items[0].physicalid
      },
      count: count
    };
  });
}

function buildOrchestratorResult(processed, loaded) {
  processed = processed || {};
  loaded = loaded || {};
  var count = n(loaded.count) || processed.mappedCount || 0;
  var explorerLoaded = n(processed.explorerLoadedCount) || n(processed.expectedCount);
  var partial = !!processed.partial;

  var mode = processed.loaderMode || LOADER_MODE;
  return {
    loaderMode: mode,
    mode: mode,
    partial: partial,
    message:
      processed.message ||
      (mode === 'expand-item' ? 'Expand Item: ' + count + ' linhas' : 'Full BOM API: ' + count + ' linhas'),
    meta: Object.assign({}, loaded.meta || {}, {
      itemCount: count,
      rootPhysicalId: getPhysicalId(),
      productName: processed.rootName || getRootName(),
      bridgeRawCount: processed.rawCount,
      bridgeDedupCount: processed.dedupCount,
      bridgeRemovedDuplicates: processed.removedDuplicates,
      explorerReferenceCount: explorerLoaded,
      dec014: DEC014_REF,
      mirrorStatus: 'unavailable',
      mirrorMode: false,
      fullBomApi: true
    }),
    context: {
      explorerReferenceCount: explorerLoaded,
      productName: processed.rootName || getRootName(),
      physicalId: getPhysicalId(),
      loaderMode: mode
    },
    diagnostic: {
      explorerReferenceCount: explorerLoaded,
      explorerLoadedCount: explorerLoaded,
      dashboardCount: count,
      backendFound: n(processed.rawCount),
      loaderMode: mode,
      expandItemRootId: processed.rootId || '',
      mirrorMode: false,
      dec014: DEC014_REF,
      mirrorRoadmap: MIRROR_ROADMAP_NOTE
    },
    refreshSource: 'manual',
    bridgeResult: processed
  };
}

function getUiRoot() {
  return w.__3DX_UI_ROOT__ || document;
}

function byIdUi(id) {
  var root = getUiRoot();
  if (root.querySelector) {
    var el = root.querySelector('#' + id);
    if (el) return el;
  }
  return document.getElementById(id);
}

function getDataSource() {
  if (w.__BOM_DATA_SOURCE__) return w.__BOM_DATA_SOURCE__;
  if (w.APP_CONFIG && w.APP_CONFIG.DATA_SOURCE) return w.APP_CONFIG.DATA_SOURCE;
  return DATA_SOURCE;
}

function isExpandItemActive() {
  return getDataSource() === 'expand-item';
}

function isFullBomActive() {
  return getDataSource() === 'full-bom-api' || LOADER_MODE === 'full-bom-api';
}

function isDec014UiActive() {
  return isExpandItemActive() || isFullBomActive();
}

function parseExplorerRef(processed) {
  processed = processed || w.__bomBridgeLastResult || {};
  var ref = n(processed.explorerReferenceCount || processed.explorerLoadedCount);
  if (ref > 0) return ref;
  if (typeof w.SyncBanner !== 'undefined' && w.SyncBanner.parseExplorerCount) {
    var fromBanner = w.SyncBanner.parseExplorerCount();
    if (fromBanner > 0) return fromBanner;
  }
  return 0;
}

function renderDataSourceBanner(el, dash, explorerRef) {
  explorerRef = n(explorerRef);
  dash = n(dash);
  el.classList.remove('bom-hidden');
  el.className = 'bom-sync-banner bom-sync-ok';
  if (isExpandItemActive()) {
    if (explorerRef > 0 && explorerRef !== dash) {
      el.innerHTML =
        'Explorer carregado: <strong>' + explorerRef + '</strong> | Expand Item: <strong>' + dash +
        '</strong> linhas | modo dseng/expand';
    } else if (explorerRef > 0) {
      el.innerHTML =
        'Explorer carregado: <strong>' + explorerRef + '</strong> | Expand Item: <strong>' + dash +
        '</strong> linhas';
    } else {
      el.innerHTML = 'Expand Item: <strong>' + dash + '</strong> linhas | modo dseng/expand';
    }
    return;
  }
  if (explorerRef > 0) {
    el.innerHTML =
      'Explorer carregado: <strong>' + explorerRef + '</strong> | Full BOM API: <strong>' + dash +
      '</strong> linhas | modo API ENOVIA';
  } else {
    el.innerHTML = 'Full BOM API: <strong>' + dash + '</strong> linhas | modo API ENOVIA';
  }
}

function renderFullBomBanner(el, dash, explorerRef) {
  renderDataSourceBanner(el, dash, explorerRef);
}

function updateLoadSyncBanner(processed, dash) {
  processed = processed || {};
  dash = n(dash);
  try {
    var el = byIdUi('syncBanner');
    if (!el) return;
    renderFullBomBanner(el, dash, parseExplorerRef(processed));
  } catch (e) {}
}

function parseDiagStatus(detail) {
  var m = String(detail || '').match(/\b(401|403|404|406|500|502|503)\b/);
  return m ? parseInt(m[1], 10) : null;
}

function isExpectedDiagnosticProbe(row) {
  if (!row || row.ok) return false;
  var step = String(row.step || '');
  var detail = String(row.detail || '');
  var url = row.extra && row.extra.url ? String(row.extra.url) : '';
  var status = row.extra && row.extra.status != null ? row.extra.status : parseDiagStatus(detail);
  var blob = step + ' ' + detail + ' ' + url;

  if (/^RAW /i.test(step)) return true;
  if (/probe|candidate|candidates|search|UQL|resolver|variants|relationship|child resolution|Label ambiguity/i.test(blob)) {
    return true;
  }
  if (status === 404 || status === 403) return true;
  if (/\b404\b|\b403\b/.test(detail)) return true;
  if (/expand/i.test(blob)) return true;
  if (/EngItem|EngInstance|PhysicalProduct|VPMReference|dseng:/i.test(blob)) return true;
  if (/^dseng:/i.test(step) && (status === 404 || status === 403)) return true;
  if (/nenhum candidato|sem instancias|sem filhos|indisponivel para testar|sem ID candidato|label nao e identidade/i.test(detail)) {
    return true;
  }
  return false;
}

function isOperationalDiagnosticError(row) {
  if (!row || row.ok) return false;
  if (isExpectedDiagnosticProbe(row)) return false;
  var step = String(row.step || '');
  var detail = String(row.detail || '');

  if (step === 'WAFData') return true;
  if (step === 'SecurityContext' && /sem SecurityContext/i.test(detail)) return true;
  if (/CompassServices|Compass\/3DSpace|3DSpace verificado|CSRF/.test(step)) return true;
  if (/ExplorerContext/.test(step)) return true;
  if (/physicalId/.test(step) && /nao resolvido/i.test(detail)) return true;
  if (/modulo indisponivel|indisponivel neste build/i.test(detail)) return true;
  if (/CORS|browser\/start|browser\/continue|backend/i.test(detail)) return true;
  return true;
}

function classifyDiagnosticRows(rows) {
  rows = rows || [];
  var operationalErrors = [];
  var diagnosticProbes = [];
  var expectedFailures = [];
  var backendErrors = [];

  rows.forEach(function (row) {
    if (!row || row.ok) return;
    if (isExpectedDiagnosticProbe(row)) {
      expectedFailures.push(row);
      diagnosticProbes.push(row);
      return;
    }
    if (/backend|browser\/start|browser\/continue/i.test(String(row.step || '') + String(row.detail || ''))) {
      backendErrors.push(row);
      operationalErrors.push(row);
      return;
    }
    if (isOperationalDiagnosticError(row)) {
      operationalErrors.push(row);
    } else {
      expectedFailures.push(row);
      diagnosticProbes.push(row);
    }
  });

  return {
    operationalErrors: operationalErrors,
    diagnosticProbes: diagnosticProbes,
    expectedFailures: expectedFailures,
    backendErrors: backendErrors,
    probeCount: diagnosticProbes.length,
    operationalCount: operationalErrors.length
  };
}

function fullBomLoadSucceeded() {
  var last = w.__bomBridgeLastResult;
  if (last && n(last.mappedCount || last.dedupCount) > 0) return true;
  if (typeof w.BomService !== 'undefined' && w.BomService.getNodeCount && w.BomService.getNodeCount() > 0) {
    return true;
  }
  return false;
}

function formatDiagStatusMessage(classified, mode) {
  classified = classified || {};
  mode = mode || classified.mode || 'quick';
  var probes = n(classified.probeCount);
  var ops = n(classified.operationalCount);
  var success = fullBomLoadSucceeded();

  if (ops > 0) {
    return 'Diagnóstico: ' + ops + ' falha(s) operacional(is) — veja Avançado';
  }
  if (mode === 'deep' && probes > 0) {
    return 'Diagnóstico: ' + probes + ' probes técnicos, 0 falhas operacionais';
  }
  if (success || mode === 'quick') {
    return 'API concluída sem falhas operacionais';
  }
  return 'Diagnóstico: 0 falhas operacionais';
}

function renderAdvancedPanel(classified) {
  try {
    var panel = byIdUi('bomRulesPanel');
    if (!panel) return;
    panel.setAttribute('data-dec014', '1');

    var last = w.__bomBridgeLastResult || {};
    var explorerRef = parseExplorerRef(last);
    var dash = n(last.mappedCount || last.dedupCount);
    if (typeof w.BomService !== 'undefined' && w.BomService.getNodeCount) {
      dash = dash || w.BomService.getNodeCount();
    }
    var deepRun = !!w.__bomDiagDeepRun;
    var probes = deepRun
      ? (classified ? n(classified.probeCount) : n(w.__bomDiagClassification && w.__bomDiagClassification.probeCount))
      : 0;
    var ops = classified ? n(classified.operationalCount) : n(w.__bomDiagClassification && w.__bomDiagClassification.operationalCount);

    panel.innerHTML =
      '<p style="margin:0 0 6px;font-size:.72rem"><strong>DEC-014: Mirror Explorer indisponível</strong></p>' +
      '<p style="margin:0 0 6px;font-size:.7rem">Modo ativo: <strong>' +
      (isExpandItemActive() ? 'Expand Item (DEC-015)' : 'Full BOM API') +
      '</strong></p>' +
      (isExpandItemActive()
        ? '<p style="margin:0 0 4px;font-size:.65rem;color:#5c6b7a">Full BOM API disponível como alternativo (<code>DATA_SOURCE=full-bom-api</code>).</p>'
        : '') +
      (explorerRef > 0
        ? '<p style="margin:0 0 4px;font-size:.7rem">Explorer carregado: <strong>' + explorerRef + '</strong></p>'
        : '') +
      (dash > 0
        ? '<p style="margin:0 0 4px;font-size:.7rem">Full BOM API: <strong>' + dash + '</strong></p>'
        : '') +
      '<p style="margin:0 0 4px;font-size:.7rem">Falhas operacionais: <strong>' + ops + '</strong></p>' +
      (deepRun
        ? '<p style="margin:0 0 6px;font-size:.7rem">Probes técnicos (profundo): <strong>' + probes + '</strong></p>'
        : '<p style="margin:0 0 6px;font-size:.65rem;color:#5c6b7a">Probes de contrato só no diagnóstico profundo.</p>') +
      '<p style="margin:0 0 6px;font-size:.65rem;color:#5c6b7a">Root resolvido via EngItem/search/candidato navegável</p>' +
      '<p style="margin:0 0 8px;font-size:.65rem;color:#92400e">' + MIRROR_UNAVAILABLE_MSG + '</p>' +
      '<button type="button" id="btnApiDiagnosticDeep" class="bom-btn bom-btn-secondary" style="font-size:.7rem;margin-bottom:4px">Diagnóstico profundo</button>' +
      '<p id="bomDiagDeepHint" style="margin:0 0 6px;font-size:.62rem;color:#92400e">Diagnóstico profundo executa probes que podem gerar 404/403 esperados no Console.</p>' +
      '<p style="margin:0;font-size:.65rem;color:#5c6b7a">' + MIRROR_ROADMAP_NOTE + '</p>';
    wireDeepDiagnosticButton();
  } catch (e) {}
}

function patchSyncBanner() {
  if (!w.SyncBanner || !w.SyncBanner.update || w.SyncBanner.__BOM_DEC014_UI_PATCH__) return false;

  var originalUpdate = w.SyncBanner.update.bind(w.SyncBanner);
  w.SyncBanner.__BOM_ORIGINAL_UPDATE__ = originalUpdate;
  w.SyncBanner.update = function (dashboardCount) {
    if (!isDec014UiActive()) {
      return originalUpdate(dashboardCount);
    }

    var dash = n(dashboardCount);
    if (typeof w.BomService !== 'undefined' && w.BomService.getNodeCount && w.BomService.getNodeCount() > 0) {
      dash = w.BomService.getNodeCount();
    }

    var el = byIdUi('syncBanner');
    if (!el) return;

    var explorerRef = parseExplorerRef();
    if (dash < 1 && explorerRef < 1) {
      el.className = 'bom-sync-banner bom-sync-info';
      el.innerHTML =
        'Nenhuma estrutura carregada. Abra o Product Structure Explorer ao lado e clique ' +
        '<strong>Atualizar estrutura</strong> (modo <strong>Full BOM API</strong>, DEC-014).';
      return;
    }

    renderFullBomBanner(el, dash, explorerRef);
  };
  w.SyncBanner.__BOM_DEC014_UI_PATCH__ = true;
  return true;
}

function diagRow(step, ok, detail, extra) {
  return {
    ts: new Date().toISOString(),
    step: step,
    ok: !!ok,
    detail: String(detail || ''),
    extra: extra || null
  };
}

function formatDiagRows(rows) {
  return (rows || [])
    .map(function (r) {
      return (r.ok ? 'OK' : 'FAIL') + '  ' + r.step + ' - ' + r.detail;
    })
    .join('\n');
}

/** Diagnóstico rápido local — sem probes RAW 404/403 (bundle legado não tem runQuick). */
function runQuickDiagnosticLocal() {
  var rows = [];
  rows.push(diagRow('WAFData', !!getWafData(), getWafData() ? 'authenticatedRequest disponível' : 'WAFData ausente'));
  var headers = getWafHeaders();
  rows.push(
    diagRow(
      'SecurityContext',
      !!(headers && headers.SecurityContext),
      (headers && headers.SecurityContext) || 'sem SecurityContext'
    )
  );

  return ensureBridgeContext()
    .then(function () {
      return getCompassSpaceUrl();
    })
    .then(function (spaceUrl) {
      spaceUrl = cleanUrl(spaceUrl || guessSpaceUrlFromLocation());
      rows.push(diagRow('3DSpace', !!spaceUrl, spaceUrl || 'não resolvido', { url: spaceUrl || '' }));
      if (!spaceUrl) return null;
      var csrfUrl = spaceUrl + '/resources/v1/application/CSRF';
      return wafGet(csrfUrl).then(function (r) {
        rows.push(
          diagRow('CSRF GET', !!r.ok, r.ok ? 'OK' : (r.error || 'falhou'), {
            url: csrfUrl,
            status: r.status || 0
          })
        );
      });
    })
    .then(function () {
      return fetch(BACKEND + '/health', { method: 'GET', mode: 'cors', credentials: 'omit' })
        .then(function (res) {
          rows.push(
            diagRow('Backend /health', res.ok, res.ok ? 'OK' : 'HTTP ' + res.status, {
              status: res.status
            })
          );
        })
        .catch(function (err) {
          rows.push(diagRow('Backend /health', false, err.message || 'CORS/rede'));
        });
    })
    .then(function () {
      var lines = 0;
      if (fullBomLoadSucceeded()) {
        var last = w.__bomBridgeLastResult;
        lines = n(last && (last.mappedCount || last.dedupCount));
        if (!lines && w.BomService && w.BomService.getNodeCount) lines = w.BomService.getNodeCount();
      }
      rows.push(
        diagRow(
          'Full BOM API último resultado',
          lines > 0,
          lines > 0 ? lines + ' linhas carregadas' : 'sem carga recente',
          { count: lines }
        )
      );
      var explorerRef = parseExplorerRef();
      if (explorerRef > 0) {
        rows.push(
          diagRow('Explorer referência', true, explorerRef + ' objetos (visual, não valida total)', {
            count: explorerRef
          })
        );
      }
      return {
        rows: rows,
        summary: formatDiagRows(rows),
        mode: 'quick',
        physicalId: getPhysicalId() || ''
      };
    });
}

function resolveApiDiagnosticRunner(deep) {
  if (deep) {
    if (w.ApiDiagnostic && w.ApiDiagnostic.runDeep) return w.ApiDiagnostic.runDeep.bind(w.ApiDiagnostic);
    if (w.ApiDiagnostic && w.ApiDiagnostic.run) return w.ApiDiagnostic.run.bind(w.ApiDiagnostic);
    return null;
  }
  if (w.ApiDiagnostic && w.ApiDiagnostic.runQuick) return w.ApiDiagnostic.runQuick.bind(w.ApiDiagnostic);
  return function () {
    return runQuickDiagnosticLocal();
  };
}

function patchApiDiagnosticModes() {
  if (!w.ApiDiagnostic || !w.ApiDiagnostic.run || w.ApiDiagnostic.__BOM_QUICK_DEEP_PATCH__) return false;
  var deepRun = w.ApiDiagnostic.run.bind(w.ApiDiagnostic);
  w.ApiDiagnostic.runDeep = deepRun;
  w.ApiDiagnostic.runQuick = function () {
    return runQuickDiagnosticLocal();
  };
  w.ApiDiagnostic.run = function (opts) {
    opts = opts || {};
    if (opts.deep) return w.ApiDiagnostic.runDeep(opts);
    return w.ApiDiagnostic.runQuick(opts);
  };
  w.ApiDiagnostic.__BOM_QUICK_DEEP_PATCH__ = true;
  return true;
}

function finishDiagnosticUi(report, classified, mode, btnEl, btnLabel) {
  classified = classified || {};
  classified.mode = mode || (report && report.mode) || 'quick';
  w.__bomDiagClassification = classified;
  w.__bomDiagDeepRun = mode === 'deep';

  var box = byIdUi('apiDiagReport');
  if (box) {
    var summary = (report && report.summary) || '';
    if (mode === 'deep') {
      summary +=
        '\n\n--- Probes esperados / diagnóstico de contrato ---\n' +
        'Probes técnicos: ' + classified.probeCount + '\n' +
        'Falhas operacionais: ' + classified.operationalCount;
    } else {
      summary += '\n\n(modo rápido — sem probes RAW 404/403)';
    }
    box.value = summary;
    box.classList.remove('bom-hidden');
  }

  var msg = formatDiagStatusMessage(classified, mode);
  if (w.App && w.App.setStatus) {
    w.App.setStatus(msg, classified.operationalCount > 0 ? 'error' : 'ok');
  }
  renderAdvancedPanel(classified);
  console.log('[BOM API DIAG ' + mode + ']', report, classified);
}

function runDec014ApiDiagnosticQuick(btnEl) {
  var runner = resolveApiDiagnosticRunner(false);
  if (!runner) {
    if (w.App && w.App.setStatus) w.App.setStatus('Diagnóstico API indisponível neste build.', 'error');
    return;
  }
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Diagnosticando…';
  }
  if (w.App && w.App.setStatus) w.App.setStatus('Diagnóstico rápido…', 'info');

  runner({})
    .then(function (report) {
      var rows = (report && report.rows) || [];
      var classified = classifyDiagnosticRows(rows);
      finishDiagnosticUi(report, classified, 'quick', btnEl, 'Diagnosticar API');
    })
    .catch(function (err) {
      if (w.App && w.App.setStatus) {
        w.App.setStatus('Diagnóstico: ' + (err.message || err), 'error');
      }
    })
    .finally(function () {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Diagnosticar API';
      }
    });
}

function runDec014ApiDiagnosticDeep(btnEl) {
  var runner = resolveApiDiagnosticRunner(true);
  if (!runner) {
    if (w.App && w.App.setStatus) w.App.setStatus('Diagnóstico profundo indisponível.', 'error');
    return;
  }
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Probes…';
  }
  if (w.App && w.App.setStatus) w.App.setStatus('Diagnóstico profundo (probes de contrato)…', 'info');

  runner({ deep: true })
    .then(function (report) {
      var rows = (report && report.rows) || [];
      var classified = classifyDiagnosticRows(rows);
      finishDiagnosticUi(report, classified, 'deep', btnEl, 'Diagnóstico profundo');
    })
    .catch(function (err) {
      if (w.App && w.App.setStatus) {
        w.App.setStatus('Diagnóstico: ' + (err.message || err), 'error');
      }
    })
    .finally(function () {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Diagnóstico profundo';
      }
    });
}

function wireDeepDiagnosticButton() {
  var btn = byIdUi('btnApiDiagnosticDeep');
  if (!btn) return;
  btn.onclick = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!isDec014UiActive()) return;
    var ok = w.confirm(
      'Diagnóstico profundo executa probes que podem gerar 404/403 esperados no Console. Continuar?'
    );
    if (!ok) return;
    runDec014ApiDiagnosticDeep(btn);
  };
}

function patchDiagnosticButton() {
  var btn = byIdUi('btnApiDiagnostic');
  if (!btn || btn.__BOM_DEC014_DIAG_PATCH__) return false;

  btn.addEventListener(
    'click',
    function (ev) {
      if (!isDec014UiActive()) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      runDec014ApiDiagnosticQuick(btn);
    },
    true
  );
  btn.__BOM_DEC014_DIAG_PATCH__ = true;
  return true;
}

function patchUiMessaging() {
  patchApiDiagnosticModes();
  var bannerOk = patchSyncBanner();
  var diagOk = patchDiagnosticButton();
  renderAdvancedPanel(w.__bomDiagClassification || null);
  return bannerOk || diagOk;
}

function finalizeBridgeResult(raw, loadContext) {
  loadContext = loadContext || w.__bomLoadContext || getExplorerReferenceContext();
  var processed = processBridgeResult(raw, loadContext);
  if (!processed.items || !processed.items.length) {
    var errMsg = 'Full BOM API retornou 0 linhas — verifique raiz/seleção no Explorer e SecurityContext';
    diag('error', errMsg);
    return Promise.reject(new Error(errMsg));
  }
  return applyBridgeItemsToUI(processed).then(function (loaded) {
    w.__bomBridgeLastResult = processed;
    w.__bomBridgeLastError = null;
    w.__bomDiagClassification = null;
    w.__bomDiagDeepRun = false;
    var out = buildOrchestratorResult(processed, loaded);
    var dash = n(loaded.count) || n(processed.mappedCount);
    var explorerRef = n(processed.explorerReferenceCount);
    var successMsg = 'Full BOM API: ' + dash + ' linhas';
    diag('ok', successMsg + (explorerRef > 0 ? ' (Explorer ref: ' + explorerRef + ')' : ''));
    if (w.App && w.App.setStatus) {
      w.App.setStatus(successMsg + ' · API concluída sem falhas operacionais', 'ok');
    }
    bridgeLog(
      'load summary',
      (explorerRef > 0 ? 'Explorer carregado: ' + explorerRef + ' | ' : '') +
      'Full BOM API: ' + dash
    );
    if (typeof w.SyncBanner !== 'undefined' && w.SyncBanner.setLoadResult) {
      w.SyncBanner.setLoadResult(out);
    }
    updateLoadSyncBanner(processed, dash);
    renderAdvancedPanel(w.__bomDiagClassification || null);
    updateBuildPill();
    return out;
  });
}

function bridgeLoop(startPayload) {
var jobId = startPayload.jobId;
var current = startPayload;
var rounds = 0;

function step() {
  rounds += 1;

  if (rounds > 80) {
    current.status = 'partial';
    current.partial = true;
    current.message = 'Limite de rodadas atingido no browser-auth bridge';
    return normalizeBackendResult(current);
  }

  if (current.done || current.status === 'done' || current.status === 'partial' || current.status === 'error') {
    return normalizeBackendResult(current);
  }

  var tasks = current.tasks || [];
  if (!tasks.length) {
    current.status = current.status || 'partial';
    current.partial = true;
    current.message = current.message || 'Backend nao retornou novas tarefas';
    return normalizeBackendResult(current);
  }

  diag('ok', 'BOM bridge ' + BUILD + ' | rodada ' + rounds + ' | tasks ' + tasks.length);

  return runTasks(tasks).then(function (results) {
    return backendPost('/api/bom/browser/continue', {
      jobId: jobId,
      results: results
    });
  }).then(function (next) {
    current = next || {};
    return step();
  });
}

return step();

}

function runExpandItemStructure() {
  if (typeof w.ExpandItemProvider === 'undefined' || !w.ExpandItemProvider.loadCurrentStructure) {
    return Promise.reject(new Error('ExpandItemProvider indisponível'));
  }
  var levels = n(w.EXPAND_ITEM_LEVELS) || EXPAND_ITEM_LEVELS;
  return ensureBridgeContext()
    .then(function () {
      disableMirrorCaptureFlags();
      return extractExplorerSnapshotAsync();
    })
    .then(function (loadContext) {
      w.__bomLoadContext = loadContext;
      bridgeLog('loader mode', 'expand-item');
      bridgeLog('expand levels', levels);
      return w.ExpandItemProvider.loadCurrentStructure(levels).then(function (result) {
        result.__loadContext = loadContext;
        return result;
      });
    });
}

function processExpandItemResult(result, loadContext) {
  result = result || {};
  loadContext = loadContext || result.__loadContext || w.__bomLoadContext || getExplorerReferenceContext();
  var normalized = result.normalized || (w.normalizeExpandItemPayload && w.normalizeExpandItemPayload(result.payload));
  var rows = (normalized && normalized.rows) || [];
  var explorerRef = n(loadContext.explorerReferenceCount) || getExplorerLoadedCount();
  var rootName = s(loadContext.rootName) || getRootName();
  var items = mapExpandRowsToImportItems(rows);

  return {
    rawCount: (normalized && normalized.stats && normalized.stats.rawMemberCount) || 0,
    mappedCount: items.length,
    dedupCount: items.length,
    explorerReferenceCount: explorerRef,
    explorerLoadedCount: explorerRef,
    rootName: rootName,
    rootId: result.rootId,
    items: items,
    partial: false,
    incomplete: false,
    mirrorMode: false,
    loaderMode: 'expand-item',
    message: 'Expand Item: ' + items.length + ' linhas',
    normalized: normalized,
    payload: result.payload
  };
}

function finalizeExpandResult(result, loadContext) {
  loadContext = loadContext || (result && result.__loadContext) || getExplorerReferenceContext();
  var processed = processExpandItemResult(result, loadContext);
  if (!processed.items || !processed.items.length) {
    var errMsg = 'Expand Item retornou 0 linhas — verifique rootId interno e níveis de expansão';
    diag('error', errMsg);
    return Promise.reject(new Error(errMsg));
  }
  return applyBridgeItemsToUI(processed).then(function (loaded) {
    w.__bomBridgeLastResult = processed;
    w.__bomBridgeLastError = null;
    w.__bomDiagClassification = null;
    w.__bomDiagDeepRun = false;
    var out = buildOrchestratorResult(processed, loaded);
    out.loaderMode = 'expand-item';
    out.mode = 'expand-item';
    out.message = processed.message;
    var dash = n(loaded.count) || n(processed.mappedCount);
    var explorerRef = n(processed.explorerReferenceCount);
    var successMsg = 'Expand Item: ' + dash + ' linhas';
    diag('ok', successMsg + (explorerRef > 0 ? ' (Explorer ref: ' + explorerRef + ')' : ''));
    if (w.App && w.App.setStatus) {
      w.App.setStatus(successMsg, 'ok');
    }
    bridgeLog('load summary', successMsg);
    if (typeof w.SyncBanner !== 'undefined' && w.SyncBanner.setLoadResult) {
      w.SyncBanner.setLoadResult(out);
    }
    updateLoadSyncBanner(processed, dash);
    renderAdvancedPanel(w.__bomDiagClassification || null);
    updateBuildPill();
    return out;
  });
}

function runBrowserBridge() {
  return ensureBridgeContext()
    .then(function () {
      disableMirrorCaptureFlags();
      return extractExplorerSnapshotAsync();
    })
    .then(function (loadContext) {
      w.__bomLoadContext = loadContext;
      w.__bomExplorerSnapshot = loadContext;
      bridgeLog('loader mode', LOADER_MODE);
      bridgeLog('explorer reference', loadContext.explorerReferenceCount);
      return loadContext;
    })
    .then(function (loadContext) {
      return getCompassSpaceUrl().then(function (spaceUrl) {
        spaceUrl = cleanUrl(spaceUrl || guessSpaceUrlFromLocation());
        var rootName = s(loadContext.rootName) || getRootName();
        var physicalId = getPhysicalId();
        var explorerRef = n(loadContext.explorerReferenceCount);

        diag('ok', BUILD + ' | ' + FULL_BOM_API_MSG);
        console.log('[BOM bridge]', BUILD, 'POST', BACKEND + '/api/bom/browser/start', {
          spaceUrl: spaceUrl,
          rootName: rootName,
          physicalId: physicalId,
          loaderMode: LOADER_MODE,
          explorerReferenceCount: explorerRef,
          mirrorExplorerMode: false
        });

        return backendPost('/api/bom/browser/start', {
          spaceUrl: spaceUrl,
          rootName: rootName,
          physicalId: physicalId,
          expectedCount: 0,
          explorerReferenceCount: explorerRef,
          loaderMode: LOADER_MODE,
          mirrorExplorerMode: false
        }).then(function (start) {
          start.__loadContext = loadContext;
          return start;
        });
      });
    })
    .then(function (start) {
      return bridgeLoop(start).then(function (result) {
        result.__loadContext = start.__loadContext;
        return result;
      });
    });
}

function bridgeFailure(err, context) {
  w.__bomBridgeLastError = err;
  var msg = err && err.message ? err.message : String(err || 'Bridge falhou');
  diag('error', (context || 'Bridge') + ' erro: ' + msg + ' (sem fallback legado)');
  throw err;
}

function patchOrchestrator() {
  if (!w.BomOrchestrator || !w.BomOrchestrator.refreshStructure) return false;
  if (w.BomOrchestrator.__BOM_BRIDGE_PATCHED__) return true;

  var original = w.BomOrchestrator.refreshStructure.bind(w.BomOrchestrator);
  w.BomOrchestrator.__BOM_ORIGINAL_REFRESH__ = w.BomOrchestrator.__BOM_ORIGINAL_REFRESH__ || original;

  w.BomOrchestrator.refreshStructure = function (options) {
    options = options || {};
    if (options.source !== 'manual') {
      return original(options);
    }

    if (isExpandItemActive()) {
      diag('ok', BUILD + ' | Atualizar estrutura -> Expand Item (DEC-015)');
      console.log('[BOM bridge]', BUILD, 'Atualizar estrutura -> Expand Item');
      return runExpandItemStructure()
        .then(function (result) {
          return finalizeExpandResult(result, result && result.__loadContext);
        })
        .catch(function (err) {
          return bridgeFailure(err, 'Atualizar estrutura Expand Item');
        });
    }

    diag('ok', BUILD + ' | Atualizar estrutura -> Full BOM API (DEC-014)');
    console.log('[BOM bridge]', BUILD, 'Atualizar estrutura -> Full BOM API');

    return runBrowserBridge()
      .then(function (result) {
        return finalizeBridgeResult(result, result && result.__loadContext);
      })
      .catch(function (err) {
        return bridgeFailure(err, 'Atualizar estrutura');
      });
  };

  w.BomOrchestrator.__BOM_BRIDGE_PATCHED__ = true;
  diag('ok', 'Hotfix ativo: ' + BUILD + ' | BomOrchestrator.refreshStructure interceptado');
  return true;
}

function patchScanner() {
try {
if (typeof w.ExplorerContext !== 'undefined') {
w.ExplorerContext.suggestLoaderMode = function () {
return getDataSource();
};
}
} catch (e) {}

if (!w.ExplorerScanner || !w.ExplorerScanner.scan) return false;

if (w.ExplorerScanner.__BOM_20260610D_PATCHED__) return true;

var original = w.ExplorerScanner.scan.bind(w.ExplorerScanner);
w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ = w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ || original;

w.ExplorerScanner.scan = function () {
  if (isExpandItemActive()) {
    return runExpandItemStructure()
      .then(function (result) {
        return finalizeExpandResult(result, result && result.__loadContext);
      })
      .catch(function (err) {
        return bridgeFailure(err, 'ExplorerScanner.scan Expand Item');
      });
  }
  return runBrowserBridge()
    .then(function (result) {
      return finalizeBridgeResult(result, result && result.__loadContext);
    })
    .catch(function (err) {
      return bridgeFailure(err, 'ExplorerScanner.scan');
    });
};

w.ExplorerScanner.__BOM_20260610D_PATCHED__ = true;

diag('ok', 'Hotfix ativo: ' + BUILD + ' | Scanner interceptado | browser-auth BFS bridge');
return true;

}

function boot() {
diag('ok', 'Hotfix carregado: ' + BUILD + ' | ' + getDataSource() + ' (' + DEC015_REF + ')');
disableMirrorCaptureFlags();
updateBuildPill();

patchOrchestrator();
patchScanner();
patchUiMessaging();

var tries = 0;
var timer = setInterval(function () {
  tries += 1;
  var okOrchestrator = patchOrchestrator();
  var okScanner = patchScanner();
  patchUiMessaging();
  if ((okOrchestrator && okScanner) || tries > 100) {
    clearInterval(timer);
    if (!okOrchestrator) {
      diag('error', 'Hotfix ' + BUILD + ': BomOrchestrator.refreshStructure nao encontrado.');
    }
    if (!okScanner) {
      diag('error', 'Hotfix ' + BUILD + ': ExplorerScanner.scan nao encontrado.');
    }
  }
}, 250);

setTimeout(function () {
  patchOrchestrator();
  patchScanner();
  patchUiMessaging();
}, 1000);

}

w.__bomBridgeInstall = function () {
  disableMirrorCaptureFlags();
  patchOrchestrator();
  patchScanner();
  patchUiMessaging();
  return w.__bomBridgeInfo();
};

w.__bomBridgeRun = function () {
  diag('ok', 'Executando carga manual: ' + BUILD + ' | ' + getDataSource());
  var chain = isExpandItemActive() ? runExpandItemStructure() : runBrowserBridge();
  var finalize = isExpandItemActive() ? finalizeExpandResult : finalizeBridgeResult;
  return chain
    .then(function (result) {
      return finalize(result, result && result.__loadContext);
    })
    .catch(function (err) {
      w.__bomBridgeLastError = err;
      diag('error', 'Carga manual erro: ' + (err && err.message ? err.message : err));
      throw err;
    });
};

w.__bomBridgeInfo = function () {
  return {
    build: BUILD,
    mode: w.__BOM_HOTFIX_MODE__,
    dataSource: getDataSource(),
    loaderMode: getDataSource(),
    expandItemLevels: EXPAND_ITEM_LEVELS,
    dec015: DEC015_REF,
    mirrorExplorerMode: MIRROR_EXPLORER_MODE,
    dec014: DEC014_REF,
    mirrorStatus: 'unavailable',
    mirrorMessage: MIRROR_UNAVAILABLE_MSG,
    fullBomMessage: FULL_BOM_API_MSG,
    mirrorRoadmap: MIRROR_ROADMAP_NOTE,
    backend: BACKEND,
    hasWAFData: !!getWafData(),
    hasSecurityContext: !!(getWafHeaders() && getWafHeaders().SecurityContext),
    hasExplorerScanner: !!(w.ExplorerScanner && w.ExplorerScanner.scan),
    orchestratorPatched: !!(w.BomOrchestrator && w.BomOrchestrator.__BOM_BRIDGE_PATCHED__),
    scannerPatched: !!(w.ExplorerScanner && w.ExplorerScanner.__BOM_20260610D_PATCHED__),
    lastResult: w.__bomBridgeLastResult || null,
    lastError: w.__bomBridgeLastError || null
  };
};

w.__bomBridgeLastResult = w.__bomBridgeLastResult || null;
w.__bomBridgeLastError = w.__bomBridgeLastError || null;

boot();
})();
