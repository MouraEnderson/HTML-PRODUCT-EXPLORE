#!/usr/bin/env node
/**
 * Acceptance checks for the current GitHub Pages build.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var ROOT = path.join(__dirname, '..');
var BUILD = extractBuild(fs.readFileSync(path.join(ROOT, 'assets/js/config.js'), 'utf8'));
var WIDGET_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=' + BUILD;

var results = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function json(rel) {
  return JSON.parse(read(rel));
}

function pass(id, msg) {
  results.push({ id: id, ok: true, msg: msg });
}

function fail(id, msg) {
  results.push({ id: id, ok: false, msg: msg });
}

function warn(id, msg) {
  results.push({ id: id, ok: true, warn: true, msg: msg });
}

function hasMojibake(text) {
  return /Ãƒ|Ã¢â€šÂ¬|Ã‚(?![\s\w])/.test(text);
}

function extractBuild(text) {
  var m = text.match(/BUILD:\s*['"](bom[^'"]+)['"]/);
  return m ? m[1] : null;
}

function testT1Mont10Snapshot() {
  var snap = json('data/mont10.json');
  var names = snap.items.map(function (it) { return it.name; });
  if (snap.items.length !== 3) {
    fail('T1', 'mont10.json has ' + snap.items.length + ' items, expected 3');
    return;
  }
  if (names.join(',') !== 'Mont10,M1,M2') {
    fail('T1', 'Unexpected names: ' + names.join(', '));
    return;
  }
  var root = snap.items[0];
  if (!root.owner || root.owner.indexOf('Enderson') < 0) {
    fail('T1', 'Root owner missing or incorrect');
    return;
  }
  if (snap.items.some(function (it) { return it.revision !== '1.1'; })) {
    fail('T1', 'Revision differs from 1.1');
    return;
  }
  pass('T1', 'Snapshot Mont10: 3/3, owner and revision OK');
}

function testT2DroneSnapshot() {
  var snap = json('data/drone-assembly-pilot.json');
  var n = snap.items.length;
  if (n < 11) {
    fail('T2', 'drone-assembly-pilot.json has only ' + n + ' items');
    return;
  }
  if (n !== 20) {
    warn('T2', 'Local snapshot has ' + n + '/20; live TSV/API must validate 20/20');
    return;
  }
  pass('T2', 'Snapshot Drone: 20/20 items');
}

function testT3SingleSourcePolicy() {
  var cfg = read('assets/js/config.js');
  var orch = read('assets/js/services/bom-orchestrator.js');
  var app = read('assets/js/app.js');
  var tsv = read('assets/js/services/tsv-bom-loader.js');

  if (cfg.indexOf('BOM_MAX_NODES') < 0 || cfg.indexOf('FAST_TSV_MAX') < 0) {
    fail('T3-config', 'Scale guards missing from config.js');
    return;
  }
  if (cfg.indexOf('ALLOW_PASTE_FALLBACK: false') < 0) {
    fail('T3-config', 'Paste fallback must be disabled for product flow');
    return;
  }
  if (cfg.indexOf('PASTE_TRAP_ENABLED: false') < 0) {
    fail('T3-config', 'Paste trap must be disabled for product flow');
    return;
  }
  if (app.indexOf("forceLoader: 'paste'") >= 0 || orch.indexOf("options.forceLoader || 'paste'") >= 0) {
    fail('T3-flow', 'Main refresh still forces paste');
    return;
  }
  if (tsv.indexOf('runCopyScrollFinish(mirrorPayload)') < 0) {
    fail('T3-loader', 'Explorer loader does not continue from mirror to scroll harvest');
    return;
  }
  pass('T3', 'Main refresh uses Explorer/API flow; paste is disabled as product path');
}

function testT4UxAndBuild() {
  var widget = read('widget-v2.html');
  if (widget.indexOf("BOM_BUILD = '" + BUILD + "'") < 0) {
    fail('T4-build-widget', 'widget-v2.html does not reference ' + BUILD);
  } else {
    pass('T4-build-widget', 'widget-v2.html build ' + BUILD);
  }

  var buildId = read('assets/js/build-id.js');
  if (buildId.indexOf(BUILD) < 0) {
    fail('T4-build-id', 'build-id.js is not aligned');
  } else {
    pass('T4-build-id', 'build-id.js = ' + BUILD);
  }

  var cfg = read('assets/js/config.js');
  var cfgBuild = extractBuild(cfg);
  if (cfgBuild !== BUILD) {
    fail('T4-build-config', 'config.js BUILD=' + cfgBuild);
  } else {
    pass('T4-build-config', 'config.js BUILD aligned');
  }

  var uiBlock = widget.slice(widget.indexOf('var UI_HTML'), widget.indexOf('root.innerHTML = UI_HTML'));
  if (hasMojibake(uiBlock)) {
    fail('T4-utf8', 'Mojibake detected in widget UI_HTML');
  } else {
    pass('T4-utf8', 'UI_HTML has no mojibake');
  }

  if (cfg.indexOf('USE_DOM_MIRROR_PRIMARY: true') < 0) {
    fail('T4-arch', 'USE_DOM_MIRROR_PRIMARY is not true for manual Explorer scan');
  } else if (cfg.indexOf('DOM_MIRROR_FALLBACK: true') < 0) {
    fail('T4-arch', 'DOM_MIRROR_FALLBACK is not true for manual Explorer scan');
  } else if (cfg.indexOf('PREFER_API_ON_MANUAL_REFRESH: false') < 0) {
    fail('T4-arch', 'Manual refresh still prefers API');
  } else if (cfg.indexOf('PASTE_TRAP_ENABLED: false') < 0) {
    fail('T4-arch', 'Paste trap is still enabled');
  } else {
    pass('T4-arch', 'Manual button uses Explorer scan with paste disabled');
  }
}

function fetchText(url) {
  return new Promise(function (resolve, reject) {
    https
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      })
      .on('error', reject);
  });
}

function testDeployReachable() {
  return fetchText(WIDGET_URL)
    .then(function (res) {
      if (res.status !== 200) {
        fail('T4-deploy', 'GitHub Pages HTTP ' + res.status);
        return null;
      }
      if (res.body.indexOf(BUILD) < 0) {
        fail('T4-deploy', 'Published widget does not contain build ' + BUILD);
        return null;
      }
      pass('T4-deploy', 'GitHub Pages responds with build ' + BUILD);
      return fetchText(
        'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js/bom-bundle-' +
          BUILD +
          '.js'
      );
    })
    .then(function (bundleRes) {
      if (!bundleRes) return;
      if (bundleRes.status !== 200) {
        fail('T4-bundle', 'Published bundle HTTP ' + bundleRes.status);
        return;
      }
      if (bundleRes.body.indexOf('BomOrchestrator') < 0) {
        fail('T4-bundle', 'Bundle does not include BomOrchestrator');
        return;
      }
      pass('T4-bundle', 'bom-bundle-' + BUILD + '.js reachable');
    })
    .catch(function (err) {
      fail('T4-deploy', 'GitHub Pages network failure: ' + err.message);
    });
}

function printReport() {
  var ok = 0;
  var bad = 0;
  var warns = 0;
  console.log('\n=== Acceptance report ===\n');
  results.forEach(function (r) {
    var tag = r.ok ? (r.warn ? 'WARN' : 'PASS') : 'FAIL';
    console.log('[' + tag + '] ' + r.id + ': ' + r.msg);
    if (!r.ok) bad++;
    else if (r.warn) warns++;
    else ok++;
  });
  console.log('\nSummary: ' + ok + ' pass, ' + warns + ' warn, ' + bad + ' fail');
  console.log('Widget: ' + WIDGET_URL);
  process.exit(bad > 0 ? 1 : 0);
}

testT1Mont10Snapshot();
testT2DroneSnapshot();
testT3SingleSourcePolicy();
testT4UxAndBuild();

testDeployReachable().then(printReport);
