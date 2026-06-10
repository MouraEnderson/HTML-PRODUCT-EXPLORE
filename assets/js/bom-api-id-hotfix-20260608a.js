/* BOM browser-auth bridge hotfix - 20260610d */
(function () {
'use strict';

var w = window;
var BUILD = 'bom20260610d';
var BACKEND = 'https://bom-resolver.onrender.com';

w.BOM_BUILD_ID = BUILD;
w.__BOM_HOTFIX_MODE__ = 'browser-auth-bfs-bridge';

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
```

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

```
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
```

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

```
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
```

}

function getPhysicalId() {
var values = [];

```
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
```

}

function getExpectedCount() {
try {
var txt = document.body ? document.body.innerText : '';
var m = String(txt || '').match(/(\d+)\s+objetos/i);
if (m) return Number(m[1]);
} catch (e) {}

```
try {
  if (w.__BOM_EXPECTED_COUNT__) return Number(w.__BOM_EXPECTED_COUNT__);
} catch (e) {}

return 0;
```

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

```
    if (!res.ok) {
      var err = new Error(data.error || data.message || ('Backend HTTP ' + res.status));
      err.response = data;
      throw err;
    }

    return data;
  });
});
```

}

function wafGet(url) {
return new Promise(function (resolve) {
try {
if (!w.WAFData || !w.WAFData.authenticatedRequest) {
resolve({
ok: false,
error: 'WAFData.authenticatedRequest indisponivel',
status: 0
});
return;
}

```
    w.WAFData.authenticatedRequest(url, {
      method: 'GET',
      type: 'json',
      timeout: 60000,
      onComplete: function (data) {
        resolve({
          ok: true,
          status: 200,
          payload: data
        });
      },
      onFailure: function (err) {
        resolve({
          ok: false,
          status: err && (err.status || err.statusCode || err.code) || 0,
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
```

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

```
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
```

}

function normalizeBackendResult(data) {
data = data || {};

```
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
  message: data.message || ''
};
```

}

function bridgeLoop(startPayload) {
var jobId = startPayload.jobId;
var current = startPayload;
var rounds = 0;

```
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
```

}

function runBrowserBridge() {
return Promise.resolve()
.then(function () {
return getCompassSpaceUrl();
})
.then(function (spaceUrl) {
spaceUrl = cleanUrl(spaceUrl || guessSpaceUrlFromLocation());

```
    var rootName = getRootName();
    var physicalId = getPhysicalId();
    var expectedCount = getExpectedCount();

    diag('ok', 'Hotfix ativo: ' + BUILD + ' | browser-auth BFS bridge');

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
```

}

function localFallback(reason) {
diag('warn', 'BOM bridge fallback local: ' + (reason && reason.message ? reason.message : reason));

```
var rows = [];
try {
  var names = ['CJ MESA 4BCS VP TOP 3DX', 'Queimador', 'Tempre', 'Manípulo', 'Tampo'];
  for (var i = 0; i < names.length; i++) {
    rows.push({
      id: 'fallback-' + i,
      parentId: i === 0 ? null : 'fallback-0',
      level: i === 0 ? 0 : 1,
      name: names[i],
      title: names[i],
      type: i === 0 ? 'Root' : 'Product',
      source: 'fallback-local'
    });
  }
} catch (e) {}

return {
  source: 'fallback-local',
  build: BUILD,
  status: 'partial',
  partial: true,
  expectedCount: getExpectedCount(),
  actualCount: rows.length,
  rows: rows,
  items: rows,
  bom: rows,
  diagnostics: ['fallback-local'],
  message: 'Fallback local: bridge nao concluiu'
};
```

}

function patchScanner() {
try {
if (typeof w.ExplorerContext !== 'undefined') {
w.ExplorerContext.suggestLoaderMode = function () {
return 'browser-backend';
};
}
} catch (e) {}

```
if (!w.ExplorerScanner || !w.ExplorerScanner.scan) return false;

if (w.ExplorerScanner.__BOM_20260610D_PATCHED__) return true;

var original = w.ExplorerScanner.scan.bind(w.ExplorerScanner);
w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ = w.ExplorerScanner.__BOM_ORIGINAL_SCAN__ || original;

w.ExplorerScanner.scan = function () {
  return runBrowserBridge().catch(function (err) {
    return localFallback(err).catch ? localFallback(err) : localFallback(err);
  });
};

w.ExplorerScanner.__BOM_20260610D_PATCHED__ = true;

diag('ok', 'Hotfix ativo: ' + BUILD + ' | Scanner interceptado | browser-auth BFS bridge');
return true;

}

function boot() {
diag('ok', 'Hotfix carregado: ' + BUILD + ' | aguardando Scanner...');

var tries = 0;
var timer = setInterval(function () {
  tries += 1;
  if (patchScanner() || tries > 100) {
    clearInterval(timer);
    if (tries > 100) {
      diag('error', 'Hotfix ' + BUILD + ' carregou, mas ExplorerScanner nao apareceu.');
    }
  }
}, 250);

setTimeout(patchScanner, 1000);
setTimeout(patchScanner, 3000);

}

boot();
})();
