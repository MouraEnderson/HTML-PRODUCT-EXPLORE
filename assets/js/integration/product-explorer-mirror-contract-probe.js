/**
 * @file integration/product-explorer-mirror-contract-probe.js
 * DEC-017 — probe técnico (Avançado/Diagnóstico). Não alimenta tabela.
 * Proibido: DOM do Explorer, clipboard, TSV, Expand Item como resposta final.
 */
(function (global) {
  'use strict';

  var w = global;
  var BUILD = 'bom20260614m';
  var LOG = '[DEC-017 Probe]';
  var LISTEN_MS = 10000;

  var AMD_CANDIDATES = [
    'DS/ENOPSTR_AP/ENOPSTR_AP',
    'DS/ENOSCEN_AP/ENOSCEN_AP',
    'DS/PlatformAPI/PlatformAPI',
    'DS/WAFData/WAFData',
    'DS/i3DXCompassServices/i3DXCompassServices',
    'DS/DataDragAndDrop/DataDragAndDrop',
    'DS/ProductStructure/ProductStructure',
    'DS/Structure/Structure',
    'DS/Explorer/Explorer',
    'DS/PSE/PSE'
  ];

  var STRUCTURE_HINTS = [
    '3DX_STRUCTURE',
    'structureRoot',
    'loadedNodes',
    'visibleStructure',
    'ENOPSTR_structure',
    'ENOSCEN_selection',
    'structureItems',
    'gridRows'
  ];

  function s(v) {
    return String(v || '').trim();
  }

  function n(v) {
    var x = Number(v);
    return isFinite(x) ? x : 0;
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(LOG);
      console.log.apply(console, args);
    } catch (e) {}
  }

  function getRequire() {
    if (typeof widget !== 'undefined' && widget && widget.requirejs) return widget.requirejs;
    if (typeof require !== 'undefined') return require;
    return null;
  }

  function getRequestedBuildFromUrl() {
    try {
      var m = String(w.location.search || '').match(/[?&]v=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function getRuntimeBuild() {
    return s(w.__BOM_BUILD_ID__ || (w.APP_CONFIG && w.APP_CONFIG.BUILD) || BUILD);
  }

  function getFrameUwaUrl() {
    try {
      if (w.frameElement && w.frameElement.src) return String(w.frameElement.src);
      if (w.widget && w.widget.uwaUrl) return String(w.widget.uwaUrl);
      if (w.widget && w.widget.getUrl) return String(w.widget.getUrl());
    } catch (e) {}
    return '';
  }

  function getVersionDivergence() {
    var requested = getRequestedBuildFromUrl();
    var runtime = getRuntimeBuild();
    var frameUwa = getFrameUwaUrl();
    var frameParam = '';
    try {
      var fm = frameUwa.match(/[?&]v=([^&]+)/);
      frameParam = fm ? decodeURIComponent(fm[1]) : '';
    } catch (e2) {}
    var divergent = !!(requested && runtime && requested !== runtime);
    var frameDivergent = !!(frameParam && runtime && frameParam !== runtime);
    var msg = '';
    if (divergent) {
      msg =
        'Versão divergente: Web Page Reader ainda aponta para ' +
        requested +
        ', mas runtime carregou ' +
        runtime +
        '. Atualize a URL do widget e faça hard refresh.';
    }
  return {
      requestedBuildFromUrl: requested,
      runtimeBuild: runtime,
      frameUwaUrl: frameUwa,
      frameBuildFromUrl: frameParam,
      cacheDivergent: divergent || frameDivergent,
      cacheWarning: msg || (frameDivergent
        ? 'frameUwaUrl contém v=' + frameParam + ' mas runtime=' + runtime
        : '')
    };
  }

  function collectLoadedScripts() {
    var scripts = [];
    try {
      var nodes = document.querySelectorAll('script[src]');
      var i;
      for (i = 0; i < nodes.length; i++) {
        scripts.push(nodes[i].src || '');
      }
    } catch (e) {}
    return scripts;
  }

  function probeExplorerMirrorProviderStatus() {
    var load = (w.__BOM_SCRIPT_LOAD_STATUS__ || {})['explorer-mirror-provider'] || {};
    var provider = w.ExplorerMirrorProvider;
    var methods = [];
    if (provider) {
      try {
        methods = Object.keys(provider);
      } catch (e) {}
    }
    return {
      scriptExpected: true,
      scriptUrl: load.url || '',
      scriptOk: load.ok === true,
      loadError: load.error || '',
      globalName: 'ExplorerMirrorProvider',
      available: !!(provider && typeof provider.fetch === 'function'),
      methods: methods,
      build: provider && provider.BUILD ? provider.BUILD : ''
    };
  }

  function probeAmdModule(modName) {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve({ module: modName, available: false, reason: 'require indisponível' });
        return;
      }
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve({ module: modName, available: false, reason: 'timeout' });
      }, 2500);
      try {
        req(
          [modName],
          function (Mod) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            var exports = [];
            if (Mod) {
              try {
                exports = Object.keys(Mod).slice(0, 40);
              } catch (e) {}
            }
            var hasLoaded =
              Mod &&
              ((typeof Mod.getLoadedStructure === 'function') ||
                (typeof Mod.getVisibleNodes === 'function'));
            resolve({
              module: modName,
              available: !!Mod,
              exports: exports,
              hasGetLoadedStructure: !!(Mod && Mod.getLoadedStructure),
              hasGetVisibleNodes: !!(Mod && Mod.getVisibleNodes),
              hasGetSelection: !!(Mod && Mod.getSelection),
              hasPublish: !!(Mod && Mod.publish),
              structureApi: hasLoaded
            });
          },
          function (err) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve({
              module: modName,
              available: false,
              reason: err && err.message ? err.message : 'define failed'
            });
          }
        );
      } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ module: modName, available: false, reason: e.message || 'require error' });
      }
    });
  }

  function probeAllAmdModules() {
    return Promise.all(AMD_CANDIDATES.map(probeAmdModule));
  }

  function probePlatformApiQuick() {
    var out = {
      globalPlatformApi: !!w.__3DX_PLATFORM_API__,
      widgetObject: typeof w.widget !== 'undefined' && !!w.widget,
      trustedFlag: !!w.__3DX_TRUSTED_WIDGET__,
      wafData: typeof w.WAFData !== 'undefined' && !!(w.WAFData && w.WAFData.authenticatedRequest),
      compass: !!w.__3DX_COMPASS__
    };
    if (w.__3DX_PLATFORM_API__) {
      var p = w.__3DX_PLATFORM_API__;
      out.hasGetSelection = typeof p.getSelection === 'function';
      out.hasPublish = typeof p.publish === 'function';
      out.hasSetSelection = typeof p.setSelection === 'function';
    }
    return out;
  }

  function summarizeMessage(data) {
    if (!data || typeof data !== 'object') return { type: typeof data, structureLike: false };
    var type = s(data.type || data.event || data.name || data.messageName || data.action || data.protocol);
    var blob = '';
    try {
      blob = JSON.stringify(data).slice(0, 500);
    } catch (e) {
      blob = type;
    }
    var structureLike = false;
    var i;
    for (i = 0; i < STRUCTURE_HINTS.length; i++) {
      if (type.indexOf(STRUCTURE_HINTS[i]) >= 0 || blob.indexOf(STRUCTURE_HINTS[i]) >= 0) {
        structureLike = true;
        break;
      }
    }
    var rowCount = 0;
    var arrays = [
      data.structureItems,
      data.loadedNodes,
      data.loadedItems,
      data.visibleRows,
      data.rows,
      data.items,
      data.data && data.data.items
    ];
    for (i = 0; i < arrays.length; i++) {
      if (Array.isArray(arrays[i])) rowCount = Math.max(rowCount, arrays[i].length);
    }
    return {
      type: type || '(sem type)',
      origin: '(listener)',
      structureLike: structureLike,
      rowCount: rowCount,
      preview: blob.slice(0, 280)
    };
  }

  function listenPostMessages(ms) {
    ms = n(ms) || LISTEN_MS;
    return new Promise(function (resolve) {
      var collected = [];
      function onMessage(event) {
        if (!event) return;
        var data = event.data;
        if (data == null) return;
        if (typeof data === 'string') {
          if (data.length > 4000) return;
          try {
            data = JSON.parse(data);
          } catch (e) {
            collected.push({
              type: 'string',
              origin: event.origin || '',
              preview: data.slice(0, 200),
              structureLike: /structure|ENOPSTR|loadedNodes|3DX_STRUCTURE/i.test(data)
            });
            return;
          }
        }
        var summary = summarizeMessage(data);
        summary.origin = event.origin || '';
        summary.timestamp = new Date().toISOString();
        collected.push(summary);
      }
      w.addEventListener('message', onMessage);
      setTimeout(function () {
        w.removeEventListener('message', onMessage);
        resolve(collected);
      }, ms);
    });
  }

  function getKnownExplorerCount() {
    var tech = w.__bomTechnicalReport || {};
    if (n(tech.explorerCount) > 0) return n(tech.explorerCount);
    if (w.__bomBridgeLastResult && n(w.__bomBridgeLastResult.explorerReferenceCount) > 0) {
      return n(w.__bomBridgeLastResult.explorerReferenceCount);
    }
    return null;
  }

  function getDashboardRowsReturnable() {
    var tech = w.__bomTechnicalReport || {};
    if (n(tech.dashboardRows) >= 0 && tech.sourceUsed) return n(tech.dashboardRows);
    if (w.ExplorerMirrorProvider && w.__bomTechnicalReport) {
      return n(tech.dashboardRows);
    }
    if (typeof w.BomService !== 'undefined' && w.BomService.getNodeCount) {
      return n(w.BomService.getNodeCount());
    }
    return 0;
  }

  function computeVerdict(report) {
    if (report.version.cacheDivergent) {
      return 'BLOCKED_CACHE_DIVERGENCE — corrija v= na URL do Web Page Reader antes de concluir';
    }
    var structureMessages = (report.postMessages || []).filter(function (m) {
      return m.structureLike && n(m.rowCount) > 0;
    });
    if (structureMessages.length) {
      return 'INCONCLUSIVE — postMessage com hints de estrutura detectado; validar manualmente com DS (não é prova de contrato oficial)';
    }
    var amdStructure = (report.amdModules || []).filter(function (m) {
      return m.structureApi;
    });
    if (amdStructure.length) {
      return 'INCONCLUSIVE — módulo AMD com API de estrutura encontrado; falta documentação oficial e teste de contagem';
    }
    if (report.explorerMirrorProvider && report.explorerMirrorProvider.available && n(report.dashboardRows) > 0) {
      var ec = n(report.explorerCount);
      if (ec > 0 && n(report.dashboardRows) === ec) {
        return 'CANDIDATE_CONTRACT — linhas retornáveis batem explorerCount; exige validação DEC-017 gate';
      }
      return 'DIVERGENT — fonte retornou linhas mas contagem não bate Explorer';
    }
    return 'D — nenhum contrato oficial acessível comprovado no runtime (alinha DEC-017)';
  }

  function formatReportText(report) {
    return JSON.stringify(report, null, 2);
  }

  function run(options) {
    options = options || {};
    var listenMs = n(options.listenMs) || LISTEN_MS;
    log('iniciando coleta', listenMs + 'ms postMessage');

    var version = getVersionDivergence();
    var base = {
      dec: 'DEC-017',
      build: BUILD,
      timestamp: new Date().toISOString(),
      windowLocationHref: w.location.href,
      frameUwaUrl: version.frameUwaUrl,
      requestedBuildFromUrl: version.requestedBuildFromUrl,
      runtimeBuild: version.runtimeBuild,
      frameBuildFromUrl: version.frameBuildFromUrl,
      versionDivergence: version,
      loadedScripts: collectLoadedScripts(),
      explorerMirrorProvider: probeExplorerMirrorProviderStatus(),
      platformApi: probePlatformApiQuick(),
      explorerCount: getKnownExplorerCount(),
      dashboardRows: getDashboardRowsReturnable(),
      expandItemNote: 'Expand Item não avaliado como resposta final neste probe',
      postMessages: [],
      amdModules: [],
      verdict: '',
      gate: 'Implementação Explorer Mirror bloqueada até contrato comprovado (DEC-017)'
    };

    if (version.cacheDivergent && version.cacheWarning) {
      base.cacheAlert = version.cacheWarning;
    }

    return listenPostMessages(listenMs)
      .then(function (messages) {
        base.postMessages = messages;
        base.officialStructureMessages = messages.filter(function (m) {
          return m.structureLike;
        });
        return probeAllAmdModules();
      })
      .then(function (amdResults) {
        base.amdModules = amdResults;
        base.verdict = computeVerdict(base);
        w.__productExplorerMirrorContractProbeReport = base;
        log('relatório pronto', base.verdict);
        return base;
      });
  }

  function copyReportToClipboard() {
    var rep = w.__productExplorerMirrorContractProbeReport;
    if (!rep) return Promise.reject(new Error('Execute o probe DEC-017 antes de copiar.'));
    var text = formatReportText(rep);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('Cópia não suportada'));
      } catch (e) {
        reject(e);
      }
    });
  }

  w.ProductExplorerMirrorContractProbe = {
    BUILD: BUILD,
    LISTEN_MS: LISTEN_MS,
    run: run,
    copyReportToClipboard: copyReportToClipboard,
    formatReportText: formatReportText,
    getVersionDivergence: getVersionDivergence
  };
})(typeof window !== 'undefined' ? window : this);
