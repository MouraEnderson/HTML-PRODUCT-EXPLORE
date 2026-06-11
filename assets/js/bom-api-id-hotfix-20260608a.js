/* BOM browser-auth bridge hotfix - 20260612e */
(function () {
'use strict';

var w = window;
var BUILD = 'bom20260612e';
var BACKEND = 'https://bom-resolver.onrender.com';
var MIRROR_EXPLORER_MODE = true;

w.BOM_BUILD_ID = BUILD;
w.__BOM_BUILD_ID__ = BUILD;
w.__BOM_HOTFIX_MODE__ = 'explorer-mirror-bridge';
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

function extractExplorerSnapshot() {
  var snapshot = {
    mirrorExplorerMode: MIRROR_EXPLORER_MODE,
    explorerLoadedCount: 0,
    rootName: getRootName(),
    rows: [],
    source: 'none',
    error: null,
    capturedAt: Date.now()
  };

  try {
    if (typeof w.ProductExplorerBridge !== 'undefined') {
      if (w.ProductExplorerBridge.pollDashboardExplorerChrome) {
        w.ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        if (ctx && ctx.rootName) snapshot.rootName = s(ctx.rootName) || snapshot.rootName;
      }

      snapshot.explorerLoadedCount = getExplorerLoadedCount();
      var rootName = snapshot.rootName || getRootName();
      var payload = null;

      if (w.ProductExplorerBridge.scrapeExplorerMirror) {
        payload = w.ProductExplorerBridge.scrapeExplorerMirror(rootName);
      }
      if ((!payload || !payload.items || payload.items.length < 1) && w.ProductExplorerBridge.scrapeExplorerGrid) {
        payload = w.ProductExplorerBridge.scrapeExplorerGrid(rootName);
      }

      if (payload && payload.items && payload.items.length) {
        snapshot.source = payload.scrapeSource || 'explorer-mirror';
        snapshot.rootName = s(payload.productName) || rootName;
        snapshot.rows = payload.items.map(mirrorItemToExplorerRow);
        snapshot.rows = inferParentVisualIndices(snapshot.rows);
        if (!snapshot.explorerLoadedCount) {
          snapshot.explorerLoadedCount = n(payload.explorerExpected) || snapshot.rows.length;
        }
      } else if (snapshot.explorerLoadedCount > 0) {
        snapshot.error = 'explorer-snapshot-empty';
      }
    } else {
      snapshot.error = 'ProductExplorerBridge indisponivel';
    }
  } catch (e) {
    snapshot.error = e && e.message ? e.message : String(e);
  }

  if (!snapshot.explorerLoadedCount && snapshot.rows.length) {
    snapshot.explorerLoadedCount = snapshot.rows.length;
  }

  w.__bomExplorerSnapshot = snapshot;
  return snapshot;
}

w.__bomExtractExplorerSnapshot = extractExplorerSnapshot;

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

function processBridgeResult(raw, explorerSnapshot) {
  raw = raw || {};
  explorerSnapshot = explorerSnapshot || w.__bomExplorerSnapshot || extractExplorerSnapshot();

  var rawRows = raw.rows || raw.items || raw.bom || raw.treeRows || [];
  if (!Array.isArray(rawRows)) rawRows = [];

  var explorerLoadedCount = n(explorerSnapshot.explorerLoadedCount) || getExplorerLoadedCount();
  var explorerSnapshotCount = (explorerSnapshot.rows || []).length;
  var rootName = s(explorerSnapshot.rootName) || getRootName();
  var backendStats = raw.stats || {};

  if (!explorerSnapshotCount) {
    bridgeLog('explorer snapshot rows', 0);
    bridgeLog('explorer snapshot error', explorerSnapshot.error || 'sem linhas no DOM do Explorer');
    return {
      rawCount: rawRows.length,
      realTreeCount: 0,
      discardedCount: 0,
      dedupCount: 0,
      mappedCount: 0,
      explorerLoadedCount: explorerLoadedCount,
      explorerSnapshotCount: 0,
      expectedCount: explorerLoadedCount,
      rootName: rootName,
      items: [],
      partial: true,
      mirrorMode: true,
      snapshotError: explorerSnapshot.error || 'explorer-snapshot-empty',
      message: 'Explorer mirror falhou: snapshot vazio'
    };
  }

  bridgeLog('explorer snapshot rows', explorerSnapshotCount);
  bridgeLog('explorer loaded count', explorerLoadedCount);
  bridgeLog('backend raw rows', rawRows.length);

  var classified = classifyBridgeRows(rawRows);
  var built = buildFinalTreeRows(classified);
  var backendTreeRows = built.finalRows;
  var merged = mergeExplorerMirror(explorerSnapshot, backendTreeRows);
  var finalRows = merged.finalRows;

  var detailMerged = n(backendStats.detailMerged) || 0;
  var duplicatesRemoved = built.instDedupRemoved + built.bridgeDedupRemoved;
  var backendOnlyCount = merged.backendOnly.length;

  bridgeLog('backend enriched matched rows', merged.matched);
  bridgeLog('backend-only rows discarded', backendOnlyCount);
  bridgeLog('final dashboard rows', finalRows.length);

  logDiscardedRows(classified.discarded);
  logBackendOnlyRows(merged.backendOnly);

  if (explorerLoadedCount > 0 && finalRows.length !== explorerLoadedCount) {
    bridgeLog(
      'count mismatch explorerLoaded=' + explorerLoadedCount +
      ' snapshot=' + explorerSnapshotCount +
      ' dashboard=' + finalRows.length
    );
  }

  if (explorerSnapshotCount !== finalRows.length) {
    bridgeLog('snapshot/dashboard row count mismatch', {
      snapshot: explorerSnapshotCount,
      dashboard: finalRows.length
    });
  }

  var items = mapRowsToImportItems(finalRows, rootName, true);
  var mappedCount = items.length;

  if (items.length) bridgeLog('first row', items[0]);

  var partial =
    explorerLoadedCount > 0 && mappedCount !== explorerLoadedCount ||
    explorerSnapshotCount !== mappedCount;
  var message =
    'Bridge OK: ' + mappedCount + ' linhas (Explorer mirror)';

  return {
    rawCount: rawRows.length,
    realTreeCount: backendTreeRows.length,
    discardedCount: classified.discarded.length + backendOnlyCount,
    dedupCount: mappedCount,
    mappedCount: mappedCount,
    explorerLoadedCount: explorerLoadedCount,
    explorerSnapshotCount: explorerSnapshotCount,
    expectedCount: explorerLoadedCount,
    rootName: rootName,
    items: items,
    partial: partial,
    mirrorMode: true,
    message: message,
    removedDuplicates: duplicatesRemoved,
    discardedRows: classified.discarded.concat(merged.backendOnly),
    backendOnlyRows: merged.backendOnly,
    backendMatched: merged.matched,
    backendOnlyDiscarded: backendOnlyCount,
    explorerSnapshot: explorerSnapshot,
    stats: {
      explorerSnapshotRows: explorerSnapshotCount,
      explorerLoadedCount: explorerLoadedCount,
      backendRawRows: rawRows.length,
      backendTreeRows: backendTreeRows.length,
      backendMatched: merged.matched,
      backendOnlyDiscarded: backendOnlyCount,
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
      payload.scrapeSource = processed.mirrorMode ? 'explorer-mirror' : 'browser-auth-bridge';
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

  return {
    loaderMode: 'explorer-mirror',
    mode: 'explorer-mirror',
    partial: partial,
    message: processed.message || ('Bridge OK: ' + count + ' linhas (Explorer mirror)'),
    meta: Object.assign({}, loaded.meta || {}, {
      itemCount: count,
      rootPhysicalId: getPhysicalId(),
      productName: processed.rootName || getRootName(),
      bridgeRawCount: processed.rawCount,
      bridgeDedupCount: processed.dedupCount,
      bridgeRemovedDuplicates: processed.removedDuplicates,
      backendMatched: n(processed.backendMatched),
      backendOnlyDiscarded: n(processed.backendOnlyDiscarded),
      explorerSnapshotCount: n(processed.explorerSnapshotCount),
      explorerLoadedCount: explorerLoaded,
      mirrorMode: true
    }),
    context: {
      expectedCount: explorerLoaded,
      explorerLoadedCount: explorerLoaded,
      explorerSnapshotCount: n(processed.explorerSnapshotCount),
      productName: processed.rootName || getRootName(),
      physicalId: getPhysicalId()
    },
    diagnostic: {
      explorerLoadedCount: explorerLoaded,
      dashboardCount: count,
      backendFound: n(processed.rawCount),
      backendOnlyDiscarded: n(processed.backendOnlyDiscarded),
      backendMatched: n(processed.backendMatched),
      mirrorMode: true
    },
    refreshSource: 'manual',
    bridgeResult: processed
  };
}

function updateMirrorSyncBanner(processed, dash) {
  processed = processed || {};
  dash = n(dash);
  try {
    var root = w.__3DX_UI_ROOT__ || document;
    var el = root.querySelector && root.querySelector('#syncBanner');
    if (!el) return;
    var explorerLoaded = n(processed.explorerLoadedCount);
    var backendFound = n(processed.rawCount);
    var extras = n(processed.backendOnlyDiscarded);
    var inSync = explorerLoaded > 0 && dash === explorerLoaded;
    el.className = inSync ? 'bom-sync-banner bom-sync-ok' : 'bom-sync-banner bom-sync-warn';
    el.classList.remove('bom-hidden');
    el.innerHTML =
      'Explorer carregado: <strong>' + explorerLoaded + '</strong>' +
      ' · Dashboard: <strong>' + dash + '</strong>' +
      ' · Backend encontrados: <strong>' + backendFound + '</strong>' +
      (extras > 0 ? ' · Extras descartados: <strong>' + extras + '</strong>' : '') +
      (inSync ? ' — sincronizado (Explorer mirror)' : ' — diferença no mirror');
  } catch (e) {}
}

function finalizeBridgeResult(raw, explorerSnapshot) {
  var processed = processBridgeResult(raw, explorerSnapshot);
  if (!processed.items || !processed.items.length) {
    var snapErr = processed.snapshotError || 'Explorer snapshot vazio';
    diag('error', 'Explorer mirror falhou: ' + snapErr);
    return Promise.reject(new Error(snapErr));
  }
  return applyBridgeItemsToUI(processed).then(function (loaded) {
    w.__bomBridgeLastResult = processed;
    w.__bomBridgeLastError = null;
    var out = buildOrchestratorResult(processed, loaded);
    var dash = n(loaded.count) || n(processed.mappedCount);
    var explorerLoaded = n(processed.explorerLoadedCount);
    var backendFound = n(processed.rawCount);
    var backendOnly = n(processed.backendOnlyDiscarded);
    diag(
      'ok',
      'Bridge OK: ' + dash + ' linhas (Explorer mirror)'
    );
    bridgeLog(
      'mirror summary',
      'Explorer carregado: ' + explorerLoaded +
      ' | Dashboard: ' + dash +
      ' | Backend encontrados: ' + backendFound +
      ' | Extras descartados: ' + backendOnly
    );
    updateMirrorSyncBanner(processed, dash);
    if (typeof w.SyncBanner !== 'undefined' && w.SyncBanner.setLoadResult) {
      w.SyncBanner.setLoadResult(out);
    }
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

function runBrowserBridge() {
return ensureBridgeContext()
.then(function () {
  var explorerSnapshot = extractExplorerSnapshot();
  w.__bomExplorerSnapshot = explorerSnapshot;
  bridgeLog('explorer snapshot rows', (explorerSnapshot.rows || []).length);
  bridgeLog('explorer loaded count', explorerSnapshot.explorerLoadedCount);
  return explorerSnapshot;
})
.then(function (explorerSnapshot) {
return getCompassSpaceUrl().then(function (spaceUrl) {
spaceUrl = cleanUrl(spaceUrl || guessSpaceUrlFromLocation());

    var rootName = s(explorerSnapshot.rootName) || getRootName();
    var physicalId = getPhysicalId();
    var explorerLoadedCount = n(explorerSnapshot.explorerLoadedCount) || getExplorerLoadedCount();

    diag('ok', 'Hotfix ativo: ' + BUILD + ' | Explorer mirror + API enrich');
    console.log('[BOM bridge]', BUILD, 'POST', BACKEND + '/api/bom/browser/start', {
      spaceUrl: spaceUrl,
      rootName: rootName,
      physicalId: physicalId,
      explorerLoadedCount: explorerLoadedCount,
      explorerSnapshotRows: (explorerSnapshot.rows || []).length,
      mirrorExplorerMode: MIRROR_EXPLORER_MODE
    });

    return backendPost('/api/bom/browser/start', {
      spaceUrl: spaceUrl,
      rootName: rootName,
      physicalId: physicalId,
      expectedCount: explorerLoadedCount,
      explorerLoadedCount: explorerLoadedCount,
      explorerSnapshotCount: (explorerSnapshot.rows || []).length,
      explorerSnapshot: explorerSnapshot.rows || [],
      mirrorExplorerMode: MIRROR_EXPLORER_MODE
    }).then(function (start) {
      start.__explorerSnapshot = explorerSnapshot;
      return start;
    });
  });
})
  .then(function (start) {
    return bridgeLoop(start).then(function (result) {
      result.__explorerSnapshot = start.__explorerSnapshot;
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

    diag('ok', BUILD + ' | Atualizar estrutura -> POST /api/bom/browser/start');
    console.log('[BOM bridge]', BUILD, 'Atualizar estrutura interceptado (refreshStructure manual)');

    return runBrowserBridge()
      .then(function (result) {
        return finalizeBridgeResult(result, result && result.__explorerSnapshot);
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
return 'browser-backend';
};
}
} catch (e) {}

if (!w.ExplorerScanner || !w.ExplorerScanner.scan) return false;

if (w.ExplorerScanner.__BOM_20260610D_PATCHED__) return true;

var original = w.ExplorerScanner.scan.bind(w.ExplorerScanner);
w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ = w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ || original;

w.ExplorerScanner.scan = function () {
  return runBrowserBridge()
    .then(function (result) {
      return finalizeBridgeResult(result, result && result.__explorerSnapshot);
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
diag('ok', 'Hotfix carregado: ' + BUILD + ' | instalando bridge...');
updateBuildPill();

patchOrchestrator();
patchScanner();

var tries = 0;
var timer = setInterval(function () {
  tries += 1;
  var okOrchestrator = patchOrchestrator();
  var okScanner = patchScanner();
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
}, 1000);

}

w.__bomBridgeInstall = function () {
  patchOrchestrator();
  patchScanner();
  return w.__bomBridgeInfo();
};

w.__bomBridgeRun = function () {
  diag('ok', 'Executando bridge manual: ' + BUILD);
  return runBrowserBridge()
    .then(function (result) {
      return finalizeBridgeResult(result, result && result.__explorerSnapshot);
    })
    .catch(function (err) {
      w.__bomBridgeLastError = err;
      diag('error', 'Bridge manual erro: ' + (err && err.message ? err.message : err));
      throw err;
    });
};

w.__bomBridgeInfo = function () {
  return {
    build: BUILD,
    mode: w.__BOM_HOTFIX_MODE__,
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
