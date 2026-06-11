/* BOM browser-auth bridge hotfix - 20260612d */
(function () {
'use strict';

var w = window;
var BUILD = 'bom20260612d';
var BACKEND = 'https://bom-resolver.onrender.com';

w.BOM_BUILD_ID = BUILD;
w.__BOM_BUILD_ID__ = BUILD;
w.__BOM_HOTFIX_MODE__ = 'browser-auth-bfs-bridge';
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

function getExpectedCount() {
try {
var txt = document.body ? document.body.innerText : '';
var m = String(txt || '').match(/(\d+)\s+objetos/i);
if (m) return Number(m[1]);
} catch (e) {}

try {
  if (w.__BOM_EXPECTED_COUNT__) return Number(w.__BOM_EXPECTED_COUNT__);
} catch (e) {}

return 0;

}

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

function logExtraRowsVsExplorer(finalRows, expected) {
  if (!expected || finalRows.length <= expected) return;
  var ordered = sortRowsTreeOrder(finalRows);
  var extras = ordered.slice(expected).map(function (row) {
    return {
      id: s(row.id),
      title: s(row.title || row.name || row.instanceName),
      source: s(row.source),
      parentId: s(row.parentId),
      instanceId: s(row.instanceId),
      referenceId: s(row.referenceId || row.physicalId || row.navId),
      reason: 'linha real acima do expectedCount do Explorer (diagnostico BFS)'
    };
  });
  bridgeLog('extra rows vs explorer', extras);
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

function mapRowsToImportItems(rows, rootName) {
  rows = sortRowsTreeOrder(rows);
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

function processBridgeResult(raw) {
  raw = raw || {};
  var rawRows = raw.rows || raw.items || raw.bom || raw.treeRows || [];
  if (!Array.isArray(rawRows)) rawRows = [];

  var expected = n(raw.expectedCount) || getExpectedCount();
  var rootName = getRootName();
  var backendStats = raw.stats || {};

  bridgeLog('expected explorer', expected);
  bridgeLog('raw received', rawRows.length);

  var classified = classifyBridgeRows(rawRows);
  var built = buildFinalTreeRows(classified);
  var finalRows = built.finalRows;

  var rootCount = finalRows.filter(function (row) {
    return row.root === true || s(row.source) === 'root';
  }).length;
  var engCount = finalRows.filter(function (row) {
    return s(row.source) === 'engInstance';
  }).length;
  var searchDiscarded = classified.candidateRows.length + classified.discarded.filter(function (d) {
    return String(d.reason || '').indexOf('search') >= 0;
  }).length;
  var probeDiscarded = classified.probeRows.length;
  var detailMerged = n(backendStats.detailMerged) || 0;
  var duplicatesRemoved = built.instDedupRemoved + built.bridgeDedupRemoved;
  var discardedTotal = classified.discarded.length;

  bridgeLog('root rows', rootCount);
  bridgeLog('engInstance rows', engCount);
  bridgeLog('search rows discarded', searchDiscarded);
  bridgeLog('probe rows discarded', probeDiscarded);
  bridgeLog('detail rows merged', detailMerged);
  bridgeLog('duplicates removed', duplicatesRemoved);
  bridgeLog('final real tree rows', finalRows.length);

  logDiscardedRows(classified.discarded);

  if (expected > 0 && finalRows.length !== expected) {
    bridgeLog('count mismatch explorer=' + expected + ' dashboard=' + finalRows.length);
  }

  if (expected > 0 && finalRows.length > expected) {
    logExtraRowsVsExplorer(finalRows, expected);
  }

  var items = mapRowsToImportItems(finalRows, rootName);
  var mappedCount = items.length;

  if (items.length) bridgeLog('first row', items[0]);

  var partial = expected > 0 && mappedCount < expected - 1;
  var message =
    expected > 0
      ? (partial
        ? 'Parcial ' + mappedCount + '/' + expected + ' (BROWSER-BACKEND)'
        : 'BOM ' + mappedCount + '/' + expected + ' via bridge')
      : ('Bridge ' + BUILD + ': ' + mappedCount + ' linhas');

  return {
    rawCount: rawRows.length,
    realTreeCount: finalRows.length,
    discardedCount: discardedTotal,
    dedupCount: finalRows.length,
    mappedCount: mappedCount,
    expectedCount: expected,
    rootName: rootName,
    items: items,
    partial: partial,
    message: message,
    removedDuplicates: duplicatesRemoved,
    discardedRows: classified.discarded,
    stats: {
      rootRows: rootCount,
      engInstanceRows: engCount,
      searchDiscarded: searchDiscarded,
      probeDiscarded: probeDiscarded,
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
    if (payload) payload.scrapeSource = 'browser-auth-bridge';
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
  var expected = n(processed.expectedCount);
  var partial = expected > 0 ? count < expected - 1 : !!processed.partial;

  return {
    loaderMode: 'browser-backend',
    mode: 'browser-backend',
    partial: partial,
    message: processed.message || ('Bridge ' + BUILD + ': ' + count + ' linhas'),
    meta: Object.assign({}, loaded.meta || {}, {
      itemCount: count,
      rootPhysicalId: getPhysicalId(),
      productName: processed.rootName || getRootName(),
      bridgeRawCount: processed.rawCount,
      bridgeDedupCount: processed.dedupCount,
      bridgeRemovedDuplicates: processed.removedDuplicates
    }),
    context: {
      expectedCount: expected,
      productName: processed.rootName || getRootName(),
      physicalId: getPhysicalId()
    },
    refreshSource: 'manual',
    bridgeResult: processed
  };
}

function finalizeBridgeResult(raw) {
  var processed = processBridgeResult(raw);
  return applyBridgeItemsToUI(processed).then(function (loaded) {
    w.__bomBridgeLastResult = processed;
    w.__bomBridgeLastError = null;
    var out = buildOrchestratorResult(processed, loaded);
    var real = n(processed.dedupCount);
    var raw = n(processed.rawCount);
    var discarded = n(processed.discardedCount) + n(processed.removedDuplicates);
    diag(
      'ok',
      'Bridge OK: ' + (loaded.count || real) + ' linhas' +
        ' (raw ' + raw + ', real ' + real + ', descartadas ' + discarded + ')'
    );
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
return getCompassSpaceUrl();
})
.then(function (spaceUrl) {
spaceUrl = cleanUrl(spaceUrl || guessSpaceUrlFromLocation());

    var rootName = getRootName();
    var physicalId = getPhysicalId();
    var expectedCount = getExpectedCount();

    diag('ok', 'Hotfix ativo: ' + BUILD + ' | browser-auth BFS bridge');
    console.log('[BOM bridge]', BUILD, 'POST', BACKEND + '/api/bom/browser/start', {
      spaceUrl: spaceUrl,
      rootName: rootName,
      physicalId: physicalId,
      expectedCount: expectedCount
    });

    return backendPost('/api/bom/browser/start', {
      spaceUrl: spaceUrl,
      rootName: rootName,
      physicalId: physicalId,
      expectedCount: expectedCount
    });
  })
  .then(function (start) {
    return bridgeLoop(start);
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
        return finalizeBridgeResult(result);
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
      return finalizeBridgeResult(result);
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
      return finalizeBridgeResult(result);
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
