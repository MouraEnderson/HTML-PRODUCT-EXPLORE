'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const detectorSource = fs.readFileSync('assets/js/bom-auto-context-detector-bom20260622b.js', 'utf8');
const resolverSource = fs.readFileSync('assets/js/bom-expandable-object-resolver-bom20260622b.js', 'utf8');
const orchestratorSource = fs.readFileSync('assets/js/bom-auto-expand-orchestrator-bom20260622b.js', 'utf8');

function baseSandbox(extra) {
  const sandbox = Object.assign(
    {
      console,
      Promise,
      setTimeout,
      clearTimeout,
      Date,
      location: { href: 'https://example.test/widget-v3.html' },
      document: { querySelector() { return null; } },
      addEventListener() {},
      removeEventListener() {}
    },
    extra || {}
  );
  sandbox.window = sandbox;
  return sandbox;
}

async function testDetectorPriority() {
  const sandbox = baseSandbox({
    __3DX_PLATFORM_API__: {
      getStructureContext() {
        return Promise.resolve({ physicalId: '63FC553465A62400699E0792000086AB', title: 'Platform Root', type: 'EngItem' });
      }
    },
    ExplorerContext: {
      get() {
        return { physicalId: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', title: 'Explorer Root' };
      },
      refresh() {}
    },
    ProductExplorerBridge: {
      getSelection() {
        return { physicalId: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', title: 'Bridge Root' };
      }
    }
  });
  vm.runInNewContext(detectorSource, sandbox, { filename: 'bom-auto-context-detector-bom20260622b.js' });
  const result = await sandbox.BomAutoContextDetector.detect();
  assert.strictEqual(result.ok, true, 'Detector should resolve a valid context');
  assert.strictEqual(result.source, 'PlatformAPI.getStructureContext()', 'PlatformAPI probe must win by priority');
  assert.strictEqual(result.detectedObject.id, '63FC553465A62400699E0792000086AB');
}

async function testDetectorFallback() {
  const sandbox = baseSandbox();
  vm.runInNewContext(detectorSource, sandbox, { filename: 'bom-auto-context-detector-bom20260622b.js' });
  const result = await sandbox.BomAutoContextDetector.detect();
  assert.strictEqual(result.ok, false, 'Detector should fail honestly without context');
  assert.strictEqual(result.autoContextProbeResults.length, 5, 'Detector must report all five probes');
}

async function testResolverStrategies() {
  const sandbox = baseSandbox({
    EnoviaApi: {
      getEngItem(id) {
        return Promise.resolve({ member: { id, title: 'Resolved Root', type: 'dseng:EngItem', childrenCount: 24 } });
      },
      getEngItemUqlSearch(query) {
        if (query.indexOf('label:"Ambiguous Root"') >= 0) {
          return Promise.resolve({
            member: [
              { id: '11111111111111111111111111111111', title: 'Ambiguous Root', type: 'dseng:EngItem' },
              { id: '22222222222222222222222222222222', title: 'Ambiguous Root', type: 'dseng:EngItem' }
            ]
          });
        }
        return Promise.resolve({ member: [] });
      }
    }
  });
  vm.runInNewContext(resolverSource, sandbox, { filename: 'bom-expandable-object-resolver-bom20260622b.js' });
  const direct = await sandbox.BomExpandableObjectResolver.resolve({
    id: '63FC553465A62400699E0792000086AB',
    title: 'Resolved Root'
  });
  assert.strictEqual(direct.ok, true, 'Resolver should accept direct EngItem IDs');
  assert.strictEqual(direct.resolverStrategy, 'direct-hex-engitem-get');
  assert.strictEqual(direct.detectedDepth, 2, 'Depth should be estimated from expected child count');

  const ambiguous = await sandbox.BomExpandableObjectResolver.resolve({
    title: 'Ambiguous Root'
  });
  assert.strictEqual(ambiguous.ok, false, 'Resolver must block ambiguous title matches');
  assert.ok(/Múltiplos objetos encontrados/i.test(ambiguous.reason), 'Ambiguous message must be explicit');
}

async function testOrchestratorAutoload() {
  const elements = {};
  function makeElement(id) {
    elements[id] = {
      id,
      value: '',
      textContent: '',
      title: '',
      className: '',
      __handlers: {},
      classList: { remove() {} },
      addEventListener(type, handler) { this.__handlers[type] = handler; }
    };
  }

  ['explorerObjectId', 'skaDepthInput', 'explorerObjectName', 'autoContextBadge', 'autoContextLabel', 'syncBanner', 'statusBar', 'btnRetryAutoContext']
    .forEach(makeElement);

  let loads = 0;
  const sandbox = baseSandbox({
    __3DX_UI_ROOT__: {
      querySelector(selector) {
        return elements[selector.replace(/^#/, '')] || null;
      }
    },
    BomAutoContextDetector: {
      detect() {
        return Promise.resolve({
          ok: true,
          source: 'ExplorerContext.currentSelection',
          detectedObject: {
            id: 'prd-R1132100929518-01103695',
            name: 'prd-R1132100929518-01103695',
            title: 'CJ MESA 4BCS VP TOP 3DX',
            source: 'explorer-context',
            expectedCount: 7
          },
          autoContextProbeResults: [{ name: 'ExplorerContext.currentSelection', ok: true, timingMs: 5 }],
          autoContextTimings: { total: 5 }
        });
      }
    },
    BomExpandableObjectResolver: {
      resolve() {
        return Promise.resolve({
          ok: true,
          rootEngItemId: '63FC553465A62400699E0792000086AB',
          rootInstanceId: 'prd-R1132100929518-01103695',
          expectedChildCount: 7,
          detectedDepth: 1,
          resolverStrategy: 'uql-name-prd',
          title: 'CJ MESA 4BCS VP TOP 3DX'
        });
      }
    }
  });

  vm.runInNewContext(orchestratorSource, sandbox, { filename: 'bom-auto-expand-orchestrator-bom20260622b.js' });
  const controller = {
    getState() {
      return { controller: 'bom-waf-session-controller-bom20260621e' };
    },
    setStatusMessage(message) {
      elements.statusBar.textContent = message;
    },
    loadManualInput() {
      loads += 1;
      return Promise.resolve([]);
    }
  };

  await sandbox.__bomAutoExpandOrchestrator.boot(controller);
  assert.strictEqual(elements.explorerObjectId.value, '63FC553465A62400699E0792000086AB', 'Orchestrator must autofill the resolved EngItem ID');
  assert.strictEqual(elements.skaDepthInput.value, '1', 'Orchestrator must autofill the estimated depth');
  assert.strictEqual(loads, 1, 'Orchestrator must auto-trigger loadManualInput when depth > 0');
  assert.strictEqual(sandbox.__bomAutoExpandOrchestrator.getDiagnostics().resolverStrategy, 'uql-name-prd');
}

(async function run() {
  await testDetectorPriority();
  await testDetectorFallback();
  await testResolverStrategies();
  await testOrchestratorAutoload();
  console.log('PASS auto-context tests');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
