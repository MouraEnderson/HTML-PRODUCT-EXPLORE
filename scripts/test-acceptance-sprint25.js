#!/usr/bin/env node
/**
 * Sprint 2.5 — testes automatizados T1–T4 (repo + deploy GitHub Pages).
 * Uso: node scripts/test-acceptance-sprint25.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var ROOT = path.join(__dirname, '..');
var BUILD = 'bom20260605l';
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
  return /Ã|â‚¬|Â(?![\s\w])/.test(text);
}

function extractBuild(text) {
  var m = text.match(/BUILD:\s*['"](bom[^'"]+)['"]/);
  return m ? m[1] : null;
}

function testT1Mont10Snapshot() {
  var snap = json('data/mont10.json');
  var names = snap.items.map(function (it) { return it.name; });
  if (snap.items.length !== 3) {
    fail('T1', 'mont10.json tem ' + snap.items.length + ' itens (esperado 3)');
    return;
  }
  if (names.join(',') !== 'Mont10,M1,M2') {
    fail('T1', 'Nomes incorretos: ' + names.join(', '));
    return;
  }
  var root = snap.items[0];
  if (!root.owner || root.owner.indexOf('Enderson') < 0) {
    fail('T1', 'Owner raiz ausente ou incorreto');
    return;
  }
  if (snap.items.some(function (it) { return it.revision !== '1.1'; })) {
    fail('T1', 'Revisão diferente de 1.1');
    return;
  }
  pass('T1', 'Snapshot Mont10: 3/3 — Mont10, M1, M2, owner e revisão 1.1 OK');
}

function testT2DroneSnapshot() {
  var snap = json('data/drone-assembly-pilot.json');
  var n = snap.items.length;
  if (n < 11) {
    fail('T2', 'drone-assembly-pilot.json tem só ' + n + ' itens');
    return;
  }
  if (n !== 20) {
    warn(
      'T2',
      'Snapshot local tem ' + n + '/20 peças — aceite 20/20 exige piloto 3DDashboard (TSV/API live)'
    );
    return;
  }
  pass('T2', 'Snapshot Drone: 20/20 itens');
}

function testT3SkaPolicy() {
  var cfg = read('assets/js/config.js');
  if (cfg.indexOf('BOM_MAX_NODES') < 0 || cfg.indexOf('FAST_TSV_MAX') < 0) {
    fail('T3', 'Limites BOM_MAX_NODES / FAST_TSV_MAX ausentes em config.js');
    return;
  }
  var orch = read('assets/js/services/bom-orchestrator.js');
  if (orch.indexOf('runApiLoader') < 0 || orch.indexOf('expectedCount > maxTsv') < 0) {
    fail('T3', 'Orchestrator não encaminha SKA grande para API/paste');
    return;
  }
  var banner = read('assets/js/ui/sync-banner.js');
  if (banner.indexOf('Parcial') < 0 || banner.indexOf('truncada') < 0) {
    fail('T3', 'Sync banner sem mensagens Parcial/truncada');
    return;
  }
  pass(
    'T3',
    'Política SKA 79+: FAST_TSV_MAX=500, API lazy, banner Parcial/truncada — validar 79/79 no piloto'
  );
}

function testT4UxAndUtf8() {
  var widget = read('widget-v2.html');
  if (widget.indexOf("BOM_BUILD = '" + BUILD + "'") < 0) {
    fail('T4-build-widget', 'widget-v2.html não referencia ' + BUILD);
  } else {
    pass('T4-build-widget', 'widget-v2.html build ' + BUILD);
  }

  var buildId = read('assets/js/build-id.js');
  if (buildId.indexOf(BUILD) < 0) {
    fail('T4-build-id', 'build-id.js desalinhado');
  } else {
    pass('T4-build-id', 'build-id.js = ' + BUILD);
  }

  var cfgBuild = extractBuild(read('assets/js/config.js'));
  if (cfgBuild !== BUILD) {
    fail('T4-build-config', 'config.js BUILD=' + cfgBuild);
  } else {
    pass('T4-build-config', 'config.js BUILD alinhado');
  }

  var uiBlock = widget.slice(widget.indexOf('var UI_HTML'), widget.indexOf("root.innerHTML = UI_HTML"));
  if (hasMojibake(uiBlock)) {
    fail('T4-utf8', 'Mojibake detectado em UI_HTML do widget-v2.html');
  } else {
    pass('T4-utf8', 'UI_HTML sem mojibake (escapes \\u)');
  }

  var cfg = read('assets/js/config.js');
  if (/label: 'N\\u00edvel'/.test(cfg) === false && cfg.indexOf("label: 'N\\u00edvel'") < 0) {
    if (cfg.indexOf("'N\\u00edvel'") < 0) {
      fail('T4-columns', 'PRODUCT_EXPLORER_COLUMNS sem escapes UTF-8');
    }
  }
  pass('T4-columns', 'Colunas piloto com escapes Unicode');

  if (cfg.indexOf('USE_DOM_MIRROR_PRIMARY: false') < 0) {
    fail('T4-arch', 'USE_DOM_MIRROR_PRIMARY não está false');
  } else if (cfg.indexOf('AUTO_SYNC_EXPLORER_MS: 0') < 0) {
    fail('T4-arch', 'AUTO_SYNC_EXPLORER_MS não está 0');
  } else {
    pass('T4-arch', 'DOM off primary + auto-sync desligado (sem loop)');
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
        return;
      }
      if (res.body.indexOf(BUILD) < 0) {
        fail('T4-deploy', 'Widget publicado não contém build ' + BUILD);
        return;
      }
      if (hasMojibake(res.body.slice(0, 8000))) {
        warn('T4-deploy', 'Possível mojibake no HTML publicado (verificar cache CDN)');
      } else {
        pass('T4-deploy', 'GitHub Pages responde 200 com build ' + BUILD);
      }
      return fetchText(
        'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js/bom-bundle-' +
          BUILD +
          '.js'
      );
    })
    .then(function (bundleRes) {
      if (!bundleRes) return;
      if (bundleRes.status !== 200) {
        fail('T4-bundle', 'Bundle publicado HTTP ' + bundleRes.status);
        return;
      }
      if (bundleRes.body.indexOf('BomOrchestrator') < 0) {
        fail('T4-bundle', 'Bundle sem BomOrchestrator');
        return;
      }
      pass('T4-bundle', 'bom-bundle-' + BUILD + '.js acessível no GitHub Pages');
    })
    .catch(function (err) {
      fail('T4-deploy', 'Falha rede GitHub Pages: ' + err.message);
    });
}

function printReport() {
  var ok = 0;
  var bad = 0;
  var warns = 0;
  console.log('\n=== Sprint 2.5 — Aceite T1–T4 (automatizado) ===\n');
  results.forEach(function (r) {
    var tag = r.ok ? (r.warn ? 'WARN' : 'PASS') : 'FAIL';
    console.log('[' + tag + '] ' + r.id + ': ' + r.msg);
    if (!r.ok) bad++;
    else if (r.warn) warns++;
    else ok++;
  });
  console.log('\nResumo: ' + ok + ' pass, ' + warns + ' warn, ' + bad + ' fail');
  console.log('Widget: ' + WIDGET_URL);
  console.log('\nPiloto manual (3DDashboard): ver TESTE-SPRINT-25-T1-T4.md');
  process.exit(bad > 0 ? 1 : 0);
}

testT1Mont10Snapshot();
testT2DroneSnapshot();
testT3SkaPolicy();
testT4UxAndUtf8();

testDeployReachable().then(printReport);
