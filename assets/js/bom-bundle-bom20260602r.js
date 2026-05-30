/* BOM Analytics bundle snapshot20260601d */
;/* --- assets\js\embed-query.js --- */
/**
 * @file embed-query.js
 * Resolve ?snapshot= e demais params quando o widget roda no frame 3DDashboard
 * (uwaUrl no frame pai — location.search do documento interno vem vazio).
 */
(function (global) {
  'use strict';

  function parseQueryString(search) {
    var q = {};
    if (!search) return q;
    var s = String(search).replace(/^\?/, '');
    if (!s) return q;
    s.split('&').forEach(function (pair) {
      var p = pair.split('=');
      var k = decodeURIComponent(p[0] || '');
      if (!k) return;
      try {
        q[k] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      } catch (e) {
        q[k] = p[1] || '';
      }
    });
    return q;
  }

  function mergeInto(target, source) {
    if (!source) return target;
    Object.keys(source).forEach(function (k) {
      if (source[k] != null && source[k] !== '') target[k] = source[k];
    });
    return target;
  }

  function paramsFromUrl(url) {
    var q = {};
    if (!url) return q;
    var str = String(url);
    var qIdx = str.indexOf('?');
    if (qIdx >= 0) mergeInto(q, parseQueryString(str.slice(qIdx)));

    var m = str.match(/[?&]uwaUrl=([^&]+)/i);
    if (m && m[1]) {
      try {
        var inner = decodeURIComponent(m[1]);
        mergeInto(q, paramsFromUrl(inner));
      } catch (e) { /* */ }
    }
    return q;
  }

  function collectSources() {
    var list = [];
    try {
      list.push(global.location.href);
      list.push(global.location.search);
    } catch (e) { /* */ }
    try {
      if (global.frameElement && global.frameElement.src) list.push(global.frameElement.src);
    } catch (e2) { /* */ }
    var win = global;
    for (var d = 0; d < 5; d++) {
      try {
        if (!win.parent || win.parent === win) break;
        win = win.parent;
        list.push(win.location.href);
        list.push(win.location.search);
      } catch (e3) {
        break;
      }
    }
    return list;
  }

  function parseEmbedQuery() {
    var merged = {};
    if (global.__3DX_EMBED_QUERY__ && typeof global.__3DX_EMBED_QUERY__ === 'object') {
      mergeInto(merged, global.__3DX_EMBED_QUERY__);
    }
    collectSources().forEach(function (src) {
      mergeInto(merged, paramsFromUrl(src));
      var hash = '';
      try {
        if (src && src.indexOf('#') >= 0) hash = src.slice(src.indexOf('#'));
      } catch (e) { /* */ }
      if (hash.indexOf('?') >= 0) {
        mergeInto(merged, parseQueryString(hash.slice(hash.indexOf('?'))));
      }
    });
    mergeInto(merged, parseQueryString(global.location.search));

    if (global.__3DX_DEFAULT_SNAPSHOT__ && !merged.snapshot && !merged.snap && !merged.data) {
      merged.snapshot = global.__3DX_DEFAULT_SNAPSHOT__;
    }
    return merged;
  }

  global.parseEmbedQuery = parseEmbedQuery;
  global.__3DX_EMBED_QUERY__ = parseEmbedQuery();
})(typeof window !== 'undefined' ? window : this);

;/* --- assets\js\config.js --- */
/**
 * @file config.js
 * Configuração central — ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.2.0',
    BUILD: 'bom20260602r',
    /** 3DDashboard: não espera probe CSRF (evita travar em "Conectando…") */
    SKIP_SPACE_PROBE: true,
    WAF_REQUEST_TIMEOUT_MS: 15000,
    SCAN_CONNECT_TIMEOUT_MS: 35000,
    /** Piloto: se API falhar no 3DDashboard, carrega snapshot validado (Mont10) */
    PILOT_FALLBACK_SNAPSHOT: true,
    /** Piloto: Varrer lê a árvore visível do Explorer antes da API (evita 406) */
    PILOT_GRID_FIRST: true,
    /** Bloqueia REST /enovia até Varrer (ou ?api=1 / ID manual) */
    PILOT_BLOCK_API_UNLESS_ALLOWED: true,
    /** Tenant cloud: não usar dseng:EngItem nem host *-space no 3DDashboard */
    CLOUD_PHYSICAL_ONLY: true,
    /** Fallback offline só com ?snapshot= na URL */
    DEFAULT_SNAPSHOT_PATH: 'data/mont10.json',

    /** Se *-space falhar (DNS), tenta mesmo tenant via *-ifwe/enovia */
    SPACE_FALLBACK_VIA_IFWE: true,
    PREFER_IFWE_FIRST: true,

    /** Tenant cloud: objetos usam prefixo prd- (ex. prd-R1132100929518-00511496) */
    PHYSICAL_ID_PREFIX: 'prd-',
    NORMALIZE_PRD_IDS: true,
    /** Não carrega BOM automático no boot — só após Varrer */
    WAIT_FOR_USER_SCAN: true,
    /** Piloto: grade Explorer primeiro; API só com ?api=1 ou após falha da grade */
    USE_API_SCAN_FIRST: false,
    /** 3DDashboard: Ctrl+C / área de cola como fonte principal (qualquer projeto) */
    ALLOW_PASTE_FALLBACK: true,
    /** Snapshot Mont10/Drone só se grade e cola falharem */
    PILOT_BUILTIN_LAST: true,
    SCAN_TIMEOUT_MS: 90000,
    AUTO_SCAN_ON_SELECTION: false,
    CAN_USE_ENOVIA_API: false,

    /** Somente Explorer → gráficos + tabela */
    EXPLORER_ONLY: true,
    UI_CLEAN: true,
    /** Oculta botão Varrer no widget (só Importar Ctrl+C) */
    HIDE_SCAN_BUTTON: true,
    SHOW_CHARTS: true,
    SHOW_RULES_PANEL: true,
    SHOW_TREE: false,
    SHOW_ISSUES_PANEL: false,
    SHOW_PLATFORM_SEARCH: false,
    AUTO_LOAD_DEMO_DRONE: false,
    DEMO_ON_API_FAIL: false,
    SNAPSHOT_FIRST: false,
    SNAPSHOT_DELIVERY_MODE: false,
    /** Poll título do Explorer no dashboard (estrutura aberta) */
    /** Piloto: sync automático gera centenas de 406 — só Varrer manual */
    AUTO_SYNC_EXPLORER_MS: 0,
    PILOT_API_TREE_DEPTH: 1,
    STRUCTURE_SYNC_DEBOUNCE_MS: 1800,
    SKIP_PP_ENRICH: true,
    BOM_FAST_DEPTH: 3,
    USE_FAST_BOOT: true,
    /** Se Explorer não responder em N ms, carrega produto padrão do tenant */
    EXPLORER_FALLBACK_MS: 3000,

    /** Limite de nós na árvore (proteção memória) */
    BOM_MAX_NODES: 50000,

    /** Filhos carregados por requisição lazy */
    BOM_LAZY_BATCH_SIZE: 100,

    /** Profundidade inicial automática */
    BOM_INITIAL_DEPTH: 3,

    /** Debounce busca/filtros (ms) */
    SEARCH_DEBOUNCE_MS: 280,

    /** Auto-refresh quando seleção muda (ms); 0 = desligado */
    AUTO_REFRESH_MS: 0,

    /** Modo demo via ?demo=true ou ?physicalid= em widget externo */
    DEMO_MODE: false,
    DEMO_ROOT_ID: null,
    IMPORT_MODE: false,

    /** Busca Physical Product na plataforma */
    SEARCH: {
      MIN_CHARS: 2,
      TOP: 40,
      DEBOUNCE_MS: 400
    },

    /**
     * Colunas alinhadas ao Product Explorer (ajuste conforme tenant).
     * key = campo no modelo interno; label = cabeçalho na tabela.
     */
    /** Tabela compacta no modo UI_CLEAN */
    PILOT_TABLE_COLUMNS: [
      { key: 'name', label: 'Peça / Nome' },
      { key: 'title', label: 'Descrição' },
      { key: 'revision', label: 'Revisão' },
      { key: 'owner', label: 'Proprietário' },
      { key: 'type', label: 'Tipo' },
      { key: 'maturity', label: 'Status', format: 'status' }
    ],

    PRODUCT_EXPLORER_COLUMNS: [
      { key: 'level', label: 'Nível', width: 48 },
      { key: 'name', label: 'Nome' },
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descrição' },
      { key: 'displayType', label: 'Tipo exibido' },
      { key: 'type', label: 'Tipo' },
      { key: 'revision', label: 'Revisão' },
      { key: 'state', label: 'Estado' },
      { key: 'maturity', label: 'Maturidade' },
      { key: 'approval', label: 'Aprovação' },
      { key: 'engineeringState', label: 'Estado engenharia' },
      { key: 'quantity', label: 'Qtd' },
      { key: 'owner', label: 'Owner' },
      { key: 'organization', label: 'Organization' },
      { key: 'collabSpace', label: 'Collaborative Space' },
      { key: 'modified', label: 'Modificado', format: 'date' },
      { key: 'created', label: 'Criado', format: 'date' },
      { key: 'physicalid', label: 'Physical ID' },
      { key: 'hasPhysicalProduct', label: 'Physical Product', format: 'bool' }
    ],

    /** Modelers ENOVIA REST (ajuste release) */
    MODELERS: {
      ENG_ITEM: 'dseng',
      ENG_ITEM_TYPE: 'dseng:EngItem',
      ENG_INSTANCE: 'dseng:EngInstance',
      PHYSICAL_PRODUCT: 'dspfl',
      PHYS_PRODUCT_TYPE: 'dspfl:PhysicalProduct'
    },

    /** Relações expand REST */
    EXPAND: {
      BOM_CHILDREN: 'boM,dseng:EngInstance',
      ATTRIBUTES: 'dseng:EngInstance',
      PHYSICAL: 'dspfl:PhysicalProduct'
    },

    /** Mapeamento estados de maturidade (customize tenant) */
    MATURITY_STATES: {
      RELEASED: ['RELEASED', 'FROZEN', 'Released', 'Frozen', 'Aprovado', 'APROVADO', 'Approved'],
      IN_WORK: [
        'IN_WORK', 'PRIVATE', 'In Work', 'Work', 'Em Trabalho', 'Em trabalho',
        'Em Desenvolvimento', 'IN WORK', 'WIP', 'Em progresso'
      ],
      OBSOLETE: ['OBSOLETE', 'Obsolete', 'ABANDONED', 'Obsoleto', 'OBSOLETO']
    },

    /** Texto exibido no painel de regras (alinhado a MATURITY_STATES) */
    MATURITY_RULES_STATIC: [
      { level: 'good', label: 'Bom (verde)', states: 'Aprovado, Released, Frozen, Approved' },
      { level: 'moderate', label: 'Moderado (amarelo)', states: 'Em Trabalho, In Work, IN_WORK, Em Desenvolvimento, WIP' },
      { level: 'bad', label: 'Ruim (vermelho)', states: 'Obsoleto, OBSOLETE, Abandoned' },
      { level: 'other', label: 'Outros (cinza)', states: 'Estado vazio ou não reconhecido no tenant' }
    ],

    /** Tipos considerados assembly */
    ASSEMBLY_TYPES: [
      'VPMReference',
      'Provide',
      'dseng:EngItem',
      'Product',
      'Assembly'
    ],

    /** Tenant / collabspace extraídos do seu link 3DEXPERIENCE (override via deep-link) */
    TENANT_DEFAULTS: {
      envId: 'R1132100929518',
      securityContext: 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO',
      platformHost: 'r1132100929518-us1-ifwe.3dexperience.3ds.com',
      spaceHost: 'r1132100929518-us1-space.3dexperience.3ds.com',
      defaultPhysicalId: '132FB3CE26D70E006A18D1870000316D',
      defaultDisplayName: '01_SKA_Drone Assembly_130520208'
    },

    /**
     * Fallback nome → prd- (cloud). Prioridade: ler prd- dinâmico do Explorer (Recentes).
     */
    PILOT_SNAPSHOT_BY_STRUCTURE: {
      Mont10: 'data/mont10.json',
      '01_SKA_Drone Assembly_130520206': 'data/drone-assembly-pilot.json',
      '01_SKA_Drone': 'data/drone-assembly-pilot.json'
    },

    STRUCTURE_IDS: {
      Mont10: 'prd-R1132100929518-00511496',
      Mont10BOM: 'prd-R1132100929518-00511496',
      'prd-R1132100929518-00511496': 'prd-R1132100929518-00511496',
      '01_SKA_Drone Assembly_130520206': 'prd-R1132100929518-01172440',
      '01_SKA_Drone Assembly_130520208': 'prd-R1132100929518-01172440',
      '01_SKA_Drone': 'prd-R1132100929518-01172440',
      'prd-R1132100929518-01172440': 'prd-R1132100929518-01172440'
    },
    PRD_ID_PATTERN: 'prd-R1132100929518-',

    PLATFORM: {
      SEARCH_APP_IDS: ['ENX3DSEARCH_AP', '3DSEARCH_AP', 'SEARCH_AP'],
      EXPLORER_APP_IDS: ['ENOSCEN_AP', 'ENOPSTR_AP', 'ENX3DSEARCH_AP']
    },

    CHART_COLORS: {
      primary: '#005686',
      success: '#2e7d32',
      warning: '#ed6c02',
      danger: '#c62828',
      neutral: '#607d8b',
      palette: ['#005686', '#00838f', '#2e7d32', '#ed6c02', '#6a1b9a', '#c62828', '#455a64'],
      maturityHealth: ['#43a047', '#ffb300', '#e53935', '#78909c']
    }
  };

  var query = {};
  if (typeof global.parseEmbedQuery === 'function') {
    query = global.parseEmbedQuery();
  } else if (global.__3DX_EMBED_QUERY__) {
    query = global.__3DX_EMBED_QUERY__;
  } else {
    var search = global.location.search.replace(/^\?/, '');
    if (search) {
      search.split('&').forEach(function (pair) {
        var p = pair.split('=');
        query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
  }
  if (query.demo === 'true') {
    APP_CONFIG.DEMO_MODE = true;
  }
  if (query.maxNodes) {
    APP_CONFIG.BOM_MAX_NODES = parseInt(query.maxNodes, 10) || APP_CONFIG.BOM_MAX_NODES;
  }

  function detectRuntimeMode() {
    var _host = (global.location && global.location.hostname) ? global.location.hostname.toLowerCase() : '';
    var trusted = false;
    try {
      if (global.__3DX_TRUSTED_WIDGET__) trusted = true;
      if (typeof widget !== 'undefined' && widget) trusted = true;
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) trusted = true;
      if (typeof require !== 'undefined') trusted = true;
    } catch (e) { /* */ }

    if (query.trusted === '1') trusted = true;

    if (trusted || _host.indexOf('3dexperience.3ds.com') >= 0) {
      APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
      APP_CONFIG.CAN_USE_ENOVIA_API = true;
      APP_CONFIG.WIDGET_MODE = trusted ? 'additional_app' : '3dexperience_host';
      APP_CONFIG.SNAPSHOT_DELIVERY_MODE = false;
      APP_CONFIG.WAIT_FOR_USER_SCAN = false;
      APP_CONFIG.AUTO_SCAN_ON_SELECTION = false;
      return;
    }

    APP_CONFIG.CROSS_ORIGIN_WIDGET =
      _host.indexOf('github.io') >= 0 ||
      _host.indexOf('jsdelivr.net') >= 0 ||
      _host.indexOf('githubusercontent.com') >= 0;
    APP_CONFIG.CAN_USE_ENOVIA_API = false;
    APP_CONFIG.WIDGET_MODE = APP_CONFIG.CROSS_ORIGIN_WIDGET ? 'web_page_reader' : 'external';
  }

  function applyParentDashboardHost() {
    var onIfwe = false;
    try {
      var hosts = [global.location.hostname];
      if (global.top && global.top !== global) hosts.push(global.top.location.hostname);
      if (global.parent && global.parent !== global) hosts.push(global.parent.location.hostname);
      hosts.forEach(function (h) {
        if ((h || '').toLowerCase().indexOf('ifwe') >= 0) onIfwe = true;
      });
    } catch (e) { /* */ }
    if (onIfwe) {
      APP_CONFIG.PREFER_IFWE_FIRST = true;
      APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD = true;
      APP_CONFIG.CLOUD_PHYSICAL_ONLY = true;
      APP_CONFIG.SKIP_SPACE_PROBE = true;
    }
  }

  detectRuntimeMode();
  applyParentDashboardHost();
  global.detectRuntimeMode = detectRuntimeMode;

  if (query.snapshot || query.snap || query.data) {
    APP_CONFIG.SNAPSHOT_URL = query.snapshot || query.snap || query.data;
    APP_CONFIG.WAIT_FOR_USER_SCAN = false;
  }
  if (query.physicalid) {
    APP_CONFIG.URL_PHYSICAL_ID = query.physicalid;
  }
  if (query.demo === 'true' && query.physicalid) {
    APP_CONFIG.DEMO_ROOT_ID = query.physicalid;
  }

  function uiRoot() {
    if (global.__3DX_UI_ROOT__) return global.__3DX_UI_ROOT__;
    return null;
  }

  function byId3dx(id) {
    var mount = uiRoot();
    if (mount) {
      var inMount = mount.querySelector('#' + id);
      if (inMount) return inMount;
    }
    var el = document.getElementById(id);
    if (el) return el;
    return null;
  }

  function qs3dx(sel) {
    var mount = uiRoot();
    if (mount) {
      var inMount = mount.querySelector(sel);
      if (inMount) return inMount;
    }
    return document.querySelector(sel);
  }

  global.byId3dx = byId3dx;
  global.qs3dx = qs3dx;
  global.APP_CONFIG = APP_CONFIG;
  global.APP_QUERY = query;
})(typeof window !== 'undefined' ? window : this);

;/* --- assets\js\platform\widget-runtime.js --- */
/**
 * @file platform/widget-runtime.js
 * Runtime UWA / Additional App — deve rodar inline após scripts (widget global).
 */
(function (global) {
  'use strict';

  function hasWidget() {
    try {
      return typeof widget !== 'undefined' && widget;
    } catch (e) {
      return false;
    }
  }

  function markTrusted() {
    if (!global.APP_CONFIG) return;
    global.APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    global.APP_CONFIG.WIDGET_MODE = 'additional_app';
    global.__3DX_WIDGET_RUNTIME__ = true;
  }

  function bindWidgetEvents() {
    if (!hasWidget()) return;
    markTrusted();
    try {
      widget.addEvent('onRefresh', function () {
        var btn = document.getElementById('btnRefresh');
        if (btn) btn.click();
      });
    } catch (e1) { /* */ }
    try {
      widget.addEvent('onLoad', function () {
        if (global.App && App.refreshUI) App.refreshUI();
      });
    } catch (e2) { /* */ }
  }

  global.WidgetRuntime = {
    hasWidget: hasWidget,
    markTrusted: markTrusted,
    bindWidgetEvents: bindWidgetEvents,
    isTrusted: function () {
      return !!global.__3DX_WIDGET_RUNTIME__ || hasWidget();
    }
  };

  if (hasWidget()) {
    markTrusted();
    bindWidgetEvents();
  }
})(typeof window !== 'undefined' ? window : this);

;/* --- assets\js\platform\platform-bridge.js --- */
/**
 * @file platform/platform-bridge.js
 * Comunicação com 3DDashboard quando HTML está em domínio externo (GitHub Pages).
 */
var PlatformBridge = (function () {
  'use strict';

  function isTrustedRuntime() {
    if (APP_CONFIG && APP_CONFIG.CROSS_ORIGIN_WIDGET === false) return true;
    if (typeof WidgetRuntime !== 'undefined' && WidgetRuntime.isTrusted()) return true;
    try {
      if (typeof widget !== 'undefined' && widget) return true;
    } catch (e) { /* */ }
    if (typeof require !== 'undefined' || typeof WAFData !== 'undefined') return true;
    return false;
  }

  function isExternalWidget() {
    if (APP_CONFIG.DEMO_MODE) return false;
    if (isTrustedRuntime()) return false;
    var host = (location.hostname || '').toLowerCase();
    if (host.indexOf('3dexperience.3ds.com') >= 0) return false;
    if (host.indexOf('github.io') >= 0) return true;
    if (host.indexOf('githubusercontent.com') >= 0) return true;
    if (host.indexOf('jsdelivr.net') >= 0) return true;
    try {
      if (document.referrer && document.referrer.indexOf('3dexperience.3ds.com') >= 0) {
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function getPlatformOrigin() {
    var host = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    return 'https://' + host;
  }

  function getSpaceUrl() {
    if (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD && APP_CONFIG.TENANT_DEFAULTS.platformHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost + '/enovia';
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
      return CompassServices.ifweSpaceUrl();
    }
    var host = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return 'https://' + host + '/enovia';
  }

  /**
   * Envia busca para o 3DDashboard (barra "Pesquisar" / 3DSearch).
   * Web Page Reader repassa postMessage ao dashboard pai em muitos tenants.
   */
  function launchPlatformSearch(query) {
    var origin = getPlatformOrigin();
    var q = String(query || '').trim();
    if (!q) return { ok: false, reason: 'empty' };

    var messages = [
      { type: '3DSearch', action: 'search', query: q, searchTerm: q, text: q },
      { type: 'dashboard-search', query: q },
      { type: 'WAFSearch', value: q },
      { event: 'search', data: { query: q, searchStr: q } },
      { event: '3DXSearch', query: q },
      { name: 'setSearchQuery', value: q },
      { protocol: '3DXWidgetMessage', action: 'search', payload: { query: q } },
      { method: 'Search', args: [q] }
    ];

    messages.forEach(function (msg) {
      try { window.top.postMessage(msg, origin); } catch (e1) { /* */ }
      try { window.top.postMessage(msg, '*'); } catch (e2) { /* */ }
      try { window.parent.postMessage(msg, origin); } catch (e3) { /* */ }
      try { window.parent.postMessage(msg, '*'); } catch (e4) { /* */ }
    });

    var appIds = APP_CONFIG.PLATFORM.SEARCH_APP_IDS || [];
    appIds.forEach(function (appId) {
      try {
        window.top.postMessage({
          protocol: '3DXContent',
          action: 'launchApp',
          appId: appId,
          search: q,
          query: q
        }, origin);
      } catch (e) { /* */ }
    });

    return { ok: true, mode: 'postMessage', query: q };
  }

  /**
   * Pede ao 3DDashboard o objeto atual (Product Explorer / seleção global).
   */
  function requestExplorerStructure() {
    var origin = getPlatformOrigin();
    var appIds = APP_CONFIG.PLATFORM.EXPLORER_APP_IDS || [];
    var requests = [
      { type: '3DX_GET_STRUCTURE' },
      { type: '3DX_STRUCTURE_REQUEST' },
      { event: 'getStructureRoot' },
      { protocol: '3DXWidgetMessage', action: 'getStructureRoot' },
      { method: 'ProductExplorer.getRoot' }
    ];
    requests.forEach(function (msg) {
      try { window.top.postMessage(msg, origin); } catch (e1) { /* */ }
      try { window.top.postMessage(msg, '*'); } catch (e2) { /* */ }
    });
    appIds.forEach(function (appId) {
      try {
        window.top.postMessage({
          protocol: '3DXContent',
          action: 'getStructure',
          appId: appId
        }, origin);
      } catch (e) { /* */ }
    });
    return true;
  }

  function requestDashboardSelection() {
    var origin = getPlatformOrigin();
    var requests = [
      { type: '3DX_GET_SELECTION' },
      { type: '3DX_SELECTION_REQUEST' },
      { event: 'getSelection' },
      { protocol: '3DXWidgetMessage', action: 'getSelection' },
      { method: 'Selection.getSelection' }
    ];
    requests.forEach(function (msg) {
      try { window.top.postMessage(msg, origin); } catch (e1) { /* */ }
      try { window.top.postMessage(msg, '*'); } catch (e2) { /* */ }
    });
    return true;
  }

  function safeGetRequire() {
    if (typeof require !== 'undefined') return require;
    return null;
  }

  return {
    isExternalWidget: isExternalWidget,
    isTrustedRuntime: isTrustedRuntime,
    getPlatformOrigin: getPlatformOrigin,
    getSpaceUrl: getSpaceUrl,
    launchPlatformSearch: launchPlatformSearch,
    requestDashboardSelection: requestDashboardSelection,
    requestExplorerStructure: requestExplorerStructure,
    safeGetRequire: safeGetRequire
  };
})();

;/* --- assets\js\platform\context.js --- */
/**
 * @file platform/context.js
 * Security context, tenant e CSRF para requisições ENOVIA.
 */
var PlatformContext = (function (global) {
  'use strict';

  var state = {
    securityContext: null,
    tenant: null,
    csrfToken: null,
    platformId: null,
    collabSpace: null,
    user: null,
    ready: false
  };

  function getRequire() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isTrustedRuntime && PlatformBridge.isTrustedRuntime()) {
      if (typeof require !== 'undefined') return require;
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      return PlatformBridge.safeGetRequire();
    }
    if (typeof require !== 'undefined') return require;
    try {
      if (window.parent && window.parent !== window) {
        return window.parent['require'];
      }
    } catch (e) { /* cross-origin: não acessar parent */ }
    return null;
  }

  function applySecurityContext(ctx) {
    if (!ctx) return false;
    state.securityContext = ctx;
    state.ready = true;
    return true;
  }

  function tryPlatformApi(PAPI) {
    return new Promise(function (resolve) {
      if (!PAPI || typeof PAPI.getSecurityContext !== 'function') {
        resolve(false);
        return;
      }
      try {
        Promise.resolve(PAPI.getSecurityContext())
          .then(function (ctx) {
            if (!applySecurityContext(ctx)) {
              resolve(false);
              return;
            }
            if (typeof PAPI.getTenant !== 'function') {
              resolve(true);
              return;
            }
            return Promise.resolve(PAPI.getTenant()).then(function (tenant) {
              if (tenant) state.tenant = tenant;
              resolve(true);
            });
          })
          .catch(function () {
            resolve(false);
          });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function loadFromWidget() {
    var cached = global.__3DX_PLATFORM_API__;
    if (cached) {
      return tryPlatformApi(cached);
    }
    var req = getRequire();
    if (!req) {
      return Promise.resolve(false);
    }
    return new Promise(function (resolve) {
      try {
        req(['DS/PlatformAPI/PlatformAPI'], function (PAPI) {
          if (PAPI) global.__3DX_PLATFORM_API__ = PAPI;
          tryPlatformApi(PAPI).then(resolve);
        }, function () {
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function loadFromWAF() {
    return new Promise(function (resolve) {
      if (typeof widget === 'undefined' || !widget.wafSecurityContext) {
        resolve(false);
        return;
      }
      state.securityContext = widget.wafSecurityContext;
      state.collabSpace = widget.collabSpace || null;
      state.platformId = widget.x3dPlatformId || null;
      state.ready = !!state.securityContext;
      resolve(state.ready);
    });
  }

  function loadFrom3DXDeepLink() {
    if (typeof ThreeDXContentParser === 'undefined') return false;
    var content = ThreeDXContentParser.parseLocations();
    var ctx = ThreeDXContentParser.toPlatformContext(content);
    if (!ctx || !ctx.securityContext) return false;
    state.securityContext = ctx.securityContext;
    state.tenant = ctx.tenant || state.tenant;
    state.platformId = ctx.platformId || state.platformId;
    state.ready = true;
    return true;
  }

  function applyTenantDefaults() {
    if (!APP_CONFIG.TENANT_DEFAULTS || !APP_CONFIG.TENANT_DEFAULTS.securityContext) return;
    if (!state.securityContext) {
      state.securityContext = APP_CONFIG.TENANT_DEFAULTS.securityContext;
    }
    if (!state.tenant) {
      state.tenant = APP_CONFIG.TENANT_DEFAULTS.envId || state.tenant;
    }
    if (!state.platformId) {
      state.platformId = APP_CONFIG.TENANT_DEFAULTS.envId || state.platformId;
    }
    state.ready = !!state.securityContext;
  }

  function init() {
    if (APP_CONFIG.DEMO_MODE) {
      state.securityContext = 'ctx::VPLMProjectLeader.Company Name.Default';
      state.tenant = 'demo-tenant';
      state.user = { login: 'demo.user' };
      state.ready = true;
      return Promise.resolve(state);
    }
    if (loadFrom3DXDeepLink()) {
      return Promise.resolve(state);
    }
    applyTenantDefaults();

    return loadFromWAF().then(function () {
      if (!state.ready) {
        return loadFromWidget();
      }
      return true;
    }).then(function () {
      if (!state.ready) loadFrom3DXDeepLink();
      applyTenantDefaults();
      return state;
    });
  }

  function getHeaders() {
    var h = {
      Accept: 'application/json;charset=UTF-8, application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    if (state.securityContext) {
      h.SecurityContext = state.securityContext;
    }
    if (state.csrfToken) {
      h['X-CSRF-Token'] = state.csrfToken;
    }
    return h;
  }

  return {
    init: init,
    getState: function () { return Object.assign({}, state); },
    getHeaders: getHeaders,
    setCsrfToken: function (t) { state.csrfToken = t; },
    isReady: function () { return state.ready; }
  };
})(typeof window !== 'undefined' ? window : this);

;/* --- assets\js\platform\compass.js --- */
/**
 * @file platform/compass.js
 * Resolução de serviços 3DSpace via i3DXCompassServices.
 */
var CompassServices = (function () {
  'use strict';

  var cache = {
    spaceUrl: null,
    spaceUrlVerified: false,
    federatedUrl: null
  };

  function getRequire() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      return PlatformBridge.safeGetRequire();
    }
    if (typeof require !== 'undefined') return require;
    try {
      if (window.parent && window.parent !== window) {
        return window.parent['require'];
      }
    } catch (e) { return null; }
    return null;
  }

  function tenantSpaceUrl() {
    if (!APP_CONFIG.TENANT_DEFAULTS || !APP_CONFIG.TENANT_DEFAULTS.spaceHost) return null;
    return 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia';
  }

  function ifweSpaceUrl() {
    if (!APP_CONFIG.TENANT_DEFAULTS || !APP_CONFIG.TENANT_DEFAULTS.platformHost) return null;
    return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost + '/enovia';
  }

  /** Garante envId correto no host (evita URL errada do Compass). */
  function normalizeSpaceUrl(url) {
    var env = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId;
    var u = String(url || '').replace(/\/$/, '');
    if (!u || (env && u.indexOf(env) < 0)) {
      return tenantSpaceUrl() ? tenantSpaceUrl().replace(/\/$/, '') : u;
    }
    return u;
  }

  function runtimeHostnames() {
    var hosts = [];
    try {
      if (location.hostname) hosts.push(location.hostname);
    } catch (e) { /* */ }
    try {
      if (window.top && window.top !== window && window.top.location.hostname) {
        hosts.push(window.top.location.hostname);
      }
    } catch (e) { /* */ }
    try {
      if (window.parent && window.parent !== window && window.parent.location.hostname) {
        hosts.push(window.parent.location.hostname);
      }
    } catch (e) { /* */ }
    return hosts;
  }

  /** GitHub iframe no 3DDashboard ifwe: location é github.io, mas o tenant é ifwe. */
  function isDashboardOnIfwe() {
    try {
      var hosts = runtimeHostnames();
      for (var i = 0; i < hosts.length; i++) {
        if ((hosts[i] || '').toLowerCase().indexOf('ifwe') >= 0) return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function getVerifiedSpaceUrl() {
    return cache.spaceUrlVerified && cache.spaceUrl ? cache.spaceUrl : null;
  }

  function spaceUrlCandidates(primary) {
    var list = [];
    var seen = {};
    function add(u) {
      u = String(u || '').replace(/\/$/, '');
      if (!u || seen[u]) return;
      seen[u] = true;
      list.push(u);
    }
    if (isDashboardOnIfwe() && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      add(ifweSpaceUrl());
      return list;
    }
    if (APP_CONFIG.PREFER_IFWE_FIRST !== false && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      add(ifweSpaceUrl());
    }
    add(normalizeSpaceUrl(primary));
    if (APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      add(ifweSpaceUrl());
    }
    add(tenantSpaceUrl());
    return list;
  }

  function probeSpaceUrl(url) {
    if (!url || typeof WafClient === 'undefined') return Promise.reject(new Error('sem WafClient'));
    var ping = url.replace(/\/$/, '') + '/resources/v1/application/CSRF';
    return WafClient.get(ping).then(function () {
      return url.replace(/\/$/, '');
    });
  }

  function applyVerifiedSpaceUrl(url) {
    cache.spaceUrl = String(url || '').replace(/\/$/, '');
    cache.spaceUrlVerified = true;
    return cache.spaceUrl;
  }

  function swapUrlHost(url, fromHost, toHost) {
    if (!url || !fromHost || !toHost || url.indexOf(fromHost) < 0) return null;
    return url.replace(fromHost, toHost);
  }

  function fastConnectIfwe() {
    if (!APP_CONFIG.SPACE_FALLBACK_VIA_IFWE && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== undefined) {
      return null;
    }
    if (!isDashboardOnIfwe() && !APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD) return null;
    var ifwe = ifweSpaceUrl();
    return ifwe ? applyVerifiedSpaceUrl(ifwe) : null;
  }

  function ensureWorkingSpaceUrl(platformId) {
    if (cache.spaceUrlVerified && cache.spaceUrl) {
      return Promise.resolve(cache.spaceUrl);
    }
    if (APP_CONFIG.SKIP_SPACE_PROBE) {
      var fast = fastConnectIfwe();
      if (fast) return Promise.resolve(fast);
    }
    cache.spaceUrlVerified = false;
    return probeCandidates(spaceUrlCandidates(null)).catch(function (err) {
      if (isDashboardOnIfwe()) {
        return Promise.reject(err || new Error('API ifwe indisponível no dashboard.'));
      }
      return get3DSpaceUrl(platformId).then(function (primary) {
        return probeCandidates(spaceUrlCandidates(primary));
      });
    });
  }

  function probeCandidates(candidates) {
    var idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        return Promise.reject(new Error(
          '3DSpace inacessível (space e ifwe). Verifique DNS/VPN *-space.3dexperience.3ds.com'
        ));
      }
      var url = candidates[idx++];
      return probeSpaceUrl(url).then(function (ok) {
        return applyVerifiedSpaceUrl(ok);
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function get3DSpaceUrl(platformId) {
    if (isDashboardOnIfwe() && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      var ifwe = ifweSpaceUrl();
      if (ifwe) {
        cache.spaceUrl = ifwe;
        cache.spaceUrlVerified = true;
        return Promise.resolve(ifwe);
      }
    }
    if (APP_CONFIG.DEMO_MODE) {
      cache.spaceUrl = 'https://demo-3dspace.example.com/3dspace';
      return Promise.resolve(cache.spaceUrl);
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      cache.spaceUrl = PlatformBridge.getSpaceUrl();
      return Promise.resolve(cache.spaceUrl);
    }
    if (cache.spaceUrlVerified && cache.spaceUrl) return Promise.resolve(cache.spaceUrl);

    var fallback = tenantSpaceUrl();

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(url) {
        if (settled) return;
        settled = true;
        cache.spaceUrl = normalizeSpaceUrl(url);
        resolve(cache.spaceUrl);
      }
      function fail(err) {
        if (settled) return;
        if (fallback) {
          done(fallback);
          return;
        }
        settled = true;
        reject(err || new Error('Falha ao obter URL 3DSpace'));
      }

      window.setTimeout(function () {
        if (!settled && fallback) done(fallback);
      }, 6000);

      if (typeof __3DX_COMPASS__ !== 'undefined' && __3DX_COMPASS__.getServiceUrl) {
        __3DX_COMPASS__.getServiceUrl({
          serviceName: '3DSpace',
          platformId: platformId || undefined,
          onComplete: done,
          onFailure: function () {
            if (fallback) done(fallback);
            else fail(new Error('Compass getServiceUrl failed'));
          }
        });
        return;
      }

      var req = getRequire();
      if (!req) {
        if (fallback) done(fallback);
        else fail(new Error('RequireJS indisponível'));
        return;
      }
      req(['DS/i3DXCompassServices/i3DXCompassServices'], function (Compass) {
        Compass.getServiceUrl({
          serviceName: '3DSpace',
          platformId: platformId || undefined,
          onComplete: done,
          onFailure: fail
        });
      }, function () {
        if (fallback) done(fallback);
        else fail(new Error('Compass module failed'));
      });
    });
  }

  function buildRestBase(spaceUrl) {
    return spaceUrl + '/resources/v1/modeler';
  }

  function fetchCsrfToken(spaceUrl) {
    if (!spaceUrl) return Promise.resolve(null);
    var url = spaceUrl + '/resources/v1/application/CSRF';
    if (typeof WafClient !== 'undefined') {
      return WafClient.get(url).then(function (data) {
        var token = (data && (data.csrf && data.csrf.value)) || data.value || data.token;
        if (token && typeof PlatformContext !== 'undefined') {
          PlatformContext.setCsrfToken(token);
        }
        return token;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  return {
    tenantSpaceUrl: tenantSpaceUrl,
    ifweSpaceUrl: ifweSpaceUrl,
    fastConnectIfwe: fastConnectIfwe,
    isDashboardOnIfwe: isDashboardOnIfwe,
    getVerifiedSpaceUrl: getVerifiedSpaceUrl,
    get3DSpaceUrl: get3DSpaceUrl,
    ensureWorkingSpaceUrl: ensureWorkingSpaceUrl,
    applyVerifiedSpaceUrl: applyVerifiedSpaceUrl,
    swapUrlHost: swapUrlHost,
    normalizeSpaceUrl: normalizeSpaceUrl,
    ifweSpaceUrl: ifweSpaceUrl,
    fetchCsrfToken: fetchCsrfToken,
    buildRestBase: buildRestBase,
    clearCache: function () {
      cache.spaceUrl = null;
      cache.spaceUrlVerified = false;
      cache.federatedUrl = null;
    }
  };
})();

;/* --- assets\js\platform\waf-bootstrap.js --- */
/**
 * @file platform/waf-bootstrap.js
 * Carrega WAFData / Compass via require do 3DDashboard (obrigatório para API ENOVIA).
 */
var WafBootstrap = (function (global) {
  'use strict';

  var loadPromise = null;

  function getRequire() {
    if (typeof require !== 'undefined') return require;
    try {
      if (global.widget && global.widget.requirejs) return global.widget.requirejs;
    } catch (e1) { /* */ }
    try {
      if (global.top && global.top !== global && global.top.require) return global.top.require;
    } catch (e2) { /* */ }
    try {
      if (global.parent && global.parent !== global && global.parent.require) {
        return global.parent.require;
      }
    } catch (e3) { /* */ }
    return null;
  }

  function ensure() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) {
        resolve({ WAFData: WAFData });
        return;
      }

      var req = getRequire();
      if (!req) {
        reject(new Error(
          'WAFData indisponível. Widget deve rodar no 3DDashboard (Additional App), não no Chrome direto.'
        ));
        return;
      }

      req([
        'DS/WAFData/WAFData',
        'DS/i3DXCompassServices/i3DXCompassServices',
        'DS/PlatformAPI/PlatformAPI'
      ], function (WAF, Compass, PlatformAPI) {
        if (WAF) global.WAFData = WAF;
        if (Compass) global.__3DX_COMPASS__ = Compass;
        if (PlatformAPI) global.__3DX_PLATFORM_API__ = PlatformAPI;
        resolve({ WAFData: WAF, Compass: Compass, PlatformAPI: PlatformAPI });
      }, function (err) {
        reject(err || new Error('Falha ao carregar módulos DS (WAFData)'));
      });
    });

    return loadPromise;
  }

  return {
    ensure: ensure,
    getRequire: getRequire
  };
})(typeof window !== 'undefined' ? window : this);

;/* --- assets\js\platform\waf-client.js --- */
/**
 * @file platform/waf-client.js
 * Cliente HTTP autenticado via WAFData (nunca fetch cross-origin para 3DSpace).
 */
var WafClient = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : this;

  function getWAFData() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
    try {
      if (typeof widget !== 'undefined' && widget && widget.WAFData) return widget.WAFData;
    } catch (e) { /* */ }
    return null;
  }

  function is3DSpaceUrl(url) {
    return (url || '').indexOf('3dexperience.3ds.com') >= 0 ||
      (url || '').indexOf('/enovia') >= 0;
  }

  function ifweRetryUrl(url) {
    if (!APP_CONFIG.TENANT_DEFAULTS || APP_CONFIG.SPACE_FALLBACK_VIA_IFWE === false) return null;
    var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    if (typeof CompassServices !== 'undefined' && CompassServices.swapUrlHost) {
      return CompassServices.swapUrlHost(url, sh, ih);
    }
    if (!sh || !ih || url.indexOf(sh) < 0) return null;
    return url.replace(sh, ih);
  }

  function isNetworkZero(msg) {
    return /ResponseCode.*0|NetworkError/i.test(msg || '');
  }

  function isRetryableHttp(msg) {
    if (/ResponseCode.*406|\b406\b/i.test(msg || '')) return false;
    return /ResponseCode.*(403|400)|\b403\b|\b400\b/i.test(msg || '');
  }

  function mustUseIfweOnly() {
    if (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD) return true;
    return (
      typeof CompassServices !== 'undefined' &&
      CompassServices.isDashboardOnIfwe &&
      CompassServices.isDashboardOnIfwe()
    );
  }

  function swapSpaceIfwe(url) {
    if (mustUseIfweOnly()) return ifweRetryUrl(url);
    if (!APP_CONFIG.TENANT_DEFAULTS) return null;
    var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    if (typeof CompassServices !== 'undefined' && CompassServices.swapUrlHost) {
      if (url.indexOf(sh) >= 0) return CompassServices.swapUrlHost(url, sh, ih);
      if (url.indexOf(ih) >= 0) return CompassServices.swapUrlHost(url, ih, sh);
    }
    return null;
  }

  function normalizeRequestUrl(url) {
    if (!url) return url;
    if (mustUseIfweOnly() && APP_CONFIG.TENANT_DEFAULTS) {
      var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
      var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
      if (sh && ih && url.indexOf(sh) >= 0) {
        url = url.replace(sh, ih);
      }
    }
    if (APP_CONFIG.CLOUD_PHYSICAL_ONLY && /\/dseng\/dseng:EngItem\//i.test(url)) {
      throw new Error(
        'EngItem bloqueado (tenant cloud). Atualize o bundle: ' + (APP_CONFIG.BUILD || 'bom20260602e')
      );
    }
    return url;
  }

  function pilotApiBlocked() {
    if (!APP_CONFIG || APP_CONFIG.PILOT_BLOCK_API_UNLESS_ALLOWED === false) return false;
    if (!APP_CONFIG.PILOT_GRID_FIRST) return false;
    try {
      if (root.__3DX_FORCE_API__ || root.__3DX_ALLOW_API__) return false;
    } catch (e0) { /* */ }
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.api === '1' || q.api === 'true') return false;
    return true;
  }

  function request(method, url, options) {
    options = options || {};
    url = normalizeRequestUrl(url);
    var headers = Object.assign({}, PlatformContext.getHeaders(), options.headers || {});

    if (APP_CONFIG.DEMO_MODE) {
      return Promise.reject(new Error('DEMO_MODE: use BomService mock'));
    }

    if (pilotApiBlocked() && is3DSpaceUrl(url)) {
      return Promise.reject(
        new Error('API piloto bloqueada — clique Varrer (árvore Explorer). Build ' + (APP_CONFIG.BUILD || ''))
      );
    }

    function runOnce(targetUrl, retried) {
      var WAF = getWAFData();
      if (!WAF || !WAF.authenticatedRequest) {
        if (is3DSpaceUrl(targetUrl)) {
          return Promise.reject(new Error(
            'API ENOVIA bloqueada (sem WAFData). Use Additional App no 3DDashboard ou HTML no 3DSpace.'
          ));
        }
        return Promise.reject(new Error('WAFData não disponível para: ' + targetUrl));
      }

      return new Promise(function (resolve, reject) {
        var timeoutMs = (APP_CONFIG && APP_CONFIG.WAF_REQUEST_TIMEOUT_MS) || 15000;
        var settled = false;
        function finish(fn, val) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          fn(val);
        }
        var timer = window.setTimeout(function () {
          finish(reject, new Error('API timeout (' + timeoutMs + 'ms)'));
        }, timeoutMs);

        WAF.authenticatedRequest(targetUrl, {
          method: method,
          headers: headers,
          data: options.body,
          type: 'json',
          onComplete: function (data) {
            finish(resolve, data);
          },
          onFailure: function (err) {
            var msg = (err && (err.message || err.error)) || 'WAF request failed';
            if (!retried && (isNetworkZero(msg) || isRetryableHttp(msg))) {
              var onIfwe =
                typeof CompassServices !== 'undefined' &&
                CompassServices.isDashboardOnIfwe &&
                CompassServices.isDashboardOnIfwe();
              var alt = onIfwe ? ifweRetryUrl(targetUrl) : (ifweRetryUrl(targetUrl) || swapSpaceIfwe(targetUrl));
              if (alt && alt !== targetUrl) {
                if (typeof CompassServices !== 'undefined' && CompassServices.applyVerifiedSpaceUrl) {
                  var baseMatch = alt.match(/^(https:\/\/[^/]+\/enovia)/i);
                  var base = baseMatch ? baseMatch[1] : null;
                  if (base) {
                    CompassServices.applyVerifiedSpaceUrl(base);
                    try {
                      if (typeof EnoviaApi !== 'undefined' && EnoviaApi.init) EnoviaApi.init(base);
                      if (typeof SearchApi !== 'undefined' && SearchApi.init) SearchApi.init(base);
                    } catch (eInit) { /* */ }
                  }
                }
                runOnce(alt, true).then(function (d) { finish(resolve, d); }).catch(function (e) { finish(reject, e); });
                return;
              }
            }
            if (isNetworkZero(msg) && /space\.3dexperience/i.test(targetUrl)) {
              msg =
                'Rede bloqueou *-space. Use build ' + (APP_CONFIG.BUILD || 'bom20260602f') + ' no Additional App.';
            }
            if (isRetryableHttp(msg) && /dseng:EngItem/i.test(targetUrl)) {
              msg = 'EngItem não suportado neste tenant. Use build ' + (APP_CONFIG.BUILD || 'bom20260602f');
            }
            finish(reject, new Error(msg));
          }
        });
      });
    }

    function doRequest() {
      return runOnce(url, false);
    }

    if (typeof WafBootstrap !== 'undefined') {
      return WafBootstrap.ensure().then(doRequest).catch(function (err) {
        if (getWAFData()) return doRequest();
        throw err;
      });
    }

    return doRequest();
  }

  function get(url, headers) {
    return request('GET', url, { headers: headers });
  }

  function post(url, body, headers) {
    return request('POST', url, { body: body, headers: headers });
  }

  return {
    get: get,
    post: post,
    request: request
  };
})();

;/* --- assets\js\integration\3dx-content-parser.js --- */
/**
 * @file integration/3dx-content-parser.js
 * Lê deep-links 3DEXPERIENCE (#app:.../content:X3DContentId=...).
 */
var ThreeDXContentParser = (function () {
  'use strict';

  function normalizePhysicalId(id) {
    id = String(id || '').trim();
    if (!id) return id;
    if (/^prd-/i.test(id)) return id;
    // Hex ENOVIA legado (demo / on-prem) — sem prefixo prd-
    if (/^[0-9A-Fa-f]{16,}$/.test(id)) return id;
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NORMALIZE_PRD_IDS === false) return id;
    var prefix =
      (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.PHYSICAL_ID_PREFIX) || 'prd-';
    return prefix + id.replace(/^prd-/i, '');
  }

  function isValidPhysicalId(id) {
    if (!id) return false;
    id = normalizePhysicalId(String(id).trim());
    if (id.length < 8) return false;
    // Hex ENOVIA clássico (ex. 32 caracteres)
    if (/^[0-9A-Fa-f]{16,}$/.test(id)) return true;
    // Referência cloud com prefixo prd- (ex. prd-R1132100929518-00511496)
    if (/^prd-[A-Za-z0-9][A-Za-z0-9_.-]{6,120}$/i.test(id)) return true;
    // Referência cloud sem prefixo (ex. R1132100929518-00511496)
    if (/^R\d{10,}-[A-Za-z0-9_.-]+$/i.test(id)) return true;
    if (/^[A-Za-z0-9][A-Za-z0-9_.-]{7,127}$/.test(id)) return true;
    return false;
  }

  function tryParseJson(encoded) {
    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch (e1) {
      try {
        return JSON.parse(encoded);
      } catch (e2) {
        return null;
      }
    }
  }

  function extractFromHash(hash) {
    if (!hash) return null;
    var h = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    var marker = 'X3DContentId=';
    var idx = h.indexOf(marker);
    if (idx < 0) return null;
    var raw = h.slice(idx + marker.length);
    var end = raw.indexOf('&');
    if (end > -1) raw = raw.slice(0, end);
    return tryParseJson(raw);
  }

  function pickBestItem(items) {
    if (!items || !items.length) return null;
    var best = null;
    var bestScore = -1;
    items.forEach(function (item) {
      var id = item.objectId || item.resourceid || item.physicalid || item.id || '';
      if (!isValidPhysicalId(id)) return;
      var name = item.displayName || item.name || item.title || '';
      var score = name.length;
      var type = (item.objectType || item.type || '').toLowerCase();
      var dtype = (item.displayType || '').toLowerCase();
      if (type.indexOf('vpm') >= 0 || type.indexOf('eng') >= 0) score += 40;
      if (dtype.indexOf('physical') >= 0 || dtype.indexOf('product') >= 0) score += 30;
      if (name.indexOf('Assembly') >= 0 || name.indexOf('SKA') >= 0) score += 50;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });
    if (best) return best;
    for (var i = 0; i < items.length; i++) {
      var pid = items[i].objectId || items[i].resourceid || items[i].physicalid;
      if (isValidPhysicalId(pid)) return items[i];
    }
    return items[0];
  }

  function parseLocations() {
    var sources = [window.location.hash, window.location.search, window.location.href];
    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        sources.push(window.parent.location.hash);
        sources.push(window.parent.location.search);
        sources.push(window.parent.location.href);
      }
    } catch (e) { /* cross-origin */ }
    try {
      if (window.top && window.top.location) {
        sources.push(window.top.location.hash);
        sources.push(window.top.location.search);
        sources.push(window.top.location.href);
      }
    } catch (e2) { /* */ }
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i] || '';
      var parsed = extractFromHash(src);
      if (parsed) return parsed;
      var m = src.match(/X3DContentId=([^&]+)/);
      if (m && m[1]) {
        parsed = tryParseJson(m[1]);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  function toSelection(content) {
    if (!content || !content.data || !content.data.items || !content.data.items.length) {
      return null;
    }
    var item = pickBestItem(content.data.items);
    if (!item) return null;
    var pid = item.objectId || item.resourceid || item.physicalid || item.id;
    if (!isValidPhysicalId(pid)) return null;
    return {
      physicalid: pid,
      type: item.objectType || item.type || 'VPMReference',
      name: item.displayName || item.name || item.title || pid,
      displayName: item.displayName || item.name || item.title || pid,
      displayType: item.displayType || 'Physical Product',
      envId: item.envId || null,
      serviceId: item.serviceId || '3DSpace',
      contextId: item.contextId || null,
      i3dx: item.i3dx || null,
      widgetId: content.widgetId || null,
      source: content.source || 'hash'
    };
  }

  function toPlatformContext(content) {
    var sel = toSelection(content);
    if (!sel) return null;
    return {
      securityContext: sel.contextId,
      tenant: sel.envId,
      platformId: sel.envId
    };
  }

  function parseJsonTextLoose(text) {
    var t = String(text || '');
    var idM = t.match(/"objectId"\s*:\s*"([^"]+)"/i) ||
      t.match(/"physicalid"\s*:\s*"([^"]+)"/i) ||
      t.match(/"resourceid"\s*:\s*"([^"]+)"/i);
    if (!idM || !isValidPhysicalId(idM[1])) return null;
    var nameM = t.match(/"displayName"\s*:\s*"([^"]+)"/i);
    var typeM = t.match(/"objectType"\s*:\s*"([^"]+)"/i) ||
      t.match(/"type"\s*:\s*"([^"]+)"/i);
    return {
      physicalid: idM[1],
      type: typeM ? typeM[1] : 'VPMReference',
      name: nameM ? nameM[1] : idM[1],
      displayName: nameM ? nameM[1] : idM[1],
      displayType: 'Physical Product',
      source: 'loose-parse'
    };
  }

  function parseJsonText(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return null;

    if (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[') {
      return parseJsonTextLoose(trimmed);
    }

    var obj = tryParseJson(trimmed);
    if (!obj) return parseJsonTextLoose(trimmed);

    if (obj.protocol === '3DXContent') {
      return toSelection(obj);
    }
    if (obj.data && obj.data.items && obj.data.items.length) {
      return toSelection(obj);
    }
    if (obj.items && obj.items.length) {
      return toSelection({ data: { items: obj.items } });
    }

    var id = obj.objectId || obj.physicalid || obj.id || obj.resourceid;
    if (!isValidPhysicalId(id)) return null;

    return {
      physicalid: id,
      type: obj.objectType || obj.type || 'VPMReference',
      name: obj.displayName || obj.name || id,
      displayName: obj.displayName || obj.name || id,
      displayType: obj.displayType || 'Physical Product',
      envId: obj.envId || null,
      serviceId: obj.serviceId || '3DSpace',
      contextId: obj.contextId || obj.context || null,
      i3dx: obj.i3dx || null,
      source: obj.source || 'drop'
    };
  }

  return {
    parseLocations: parseLocations,
    parseJsonText: parseJsonText,
    parseJsonTextLoose: parseJsonTextLoose,
    toSelection: toSelection,
    toPlatformContext: toPlatformContext,
    extractFromHash: extractFromHash,
    isValidPhysicalId: isValidPhysicalId,
    normalizePhysicalId: normalizePhysicalId,
    pickBestItem: pickBestItem
  };
})();

;/* --- assets\js\integration\enovia-api.js --- */
/**
 * @file integration/enovia-api.js
 * Endpoints REST ENOVIA — Engineering Item, BOM, Physical Product.
 */
var EnoviaApi = (function () {
  'use strict';

  var restBase = null;

  function defaultSpaceUrl() {
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var verified = CompassServices.getVerifiedSpaceUrl();
      if (verified) return verified;
    }
    if (
      (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD ||
        (typeof CompassServices !== 'undefined' &&
          CompassServices.isDashboardOnIfwe &&
          CompassServices.isDashboardOnIfwe())) &&
      typeof CompassServices !== 'undefined' &&
      CompassServices.ifweSpaceUrl
    ) {
      return CompassServices.ifweSpaceUrl();
    }
    try {
      if ((location.hostname || '').toLowerCase().indexOf('ifwe') >= 0) {
        if (typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
          return CompassServices.ifweSpaceUrl();
        }
        var ih = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost;
        if (ih) return 'https://' + ih + '/enovia';
      }
    } catch (e) { /* */ }
    if (typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl && APP_CONFIG.PREFER_IFWE_FIRST !== false) {
      return CompassServices.ifweSpaceUrl();
    }
    var h = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return h ? 'https://' + h + '/enovia' : null;
  }

  function ensureRestBase() {
    if (restBase && String(restBase).indexOf('null') < 0) return restBase;
    restBase = null;
    var space = defaultSpaceUrl();
    if (space) init(space);
    if (!restBase || String(restBase).indexOf('null') >= 0) {
      throw new Error('3DSpace não conectado (URL inválida). Use os dados do snapshot Mont10.');
    }
    return restBase;
  }

  function init(spaceUrl) {
    if (!spaceUrl || spaceUrl === 'demo') {
      restBase = null;
      return null;
    }
    restBase = CompassServices.buildRestBase(spaceUrl);
    return restBase;
  }

  function apiId(physicalId) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(physicalId);
    }
    return physicalId;
  }

  function engItemUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(physicalId));
  }

  function engInstanceChildrenUrl(parentPhysicalId, skip, top) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?$skip=' + skip + '&$top=' + top
    );
  }

  function physicalProductSearchUrl(relatedEngId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE +
      '?$filter=dseng:engItem.physicalid eq \'' + relatedEngId + '\''
    );
  }

  function vpmReferenceUrl(physicalId) {
    ensureRestBase();
    return restBase + '/dsxcad/dsxcad:VPMReference/' + encodeURIComponent(apiId(physicalId));
  }

  function physicalProductUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + encodeURIComponent(apiId(physicalId));
  }

  function getEngItem(physicalId, expand) {
    var url = engItemUrl(physicalId);
    if (expand) {
      url += '?$expand=' + encodeURIComponent(expand);
    }
    return WafClient.get(url);
  }

  function getVpmReference(physicalId, expand) {
    var url = vpmReferenceUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  function getPhysicalProduct(physicalId, expand) {
    var url = physicalProductUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  function extractEngItemIdFromResponse(res) {
    if (!res) return null;
    var member = res.member || res;
    if (Array.isArray(member)) member = member[0];
    if (!member) return null;
    var eng = member['dseng:engItem'] || member.reference;
    if (eng && typeof eng === 'object') {
      return eng.physicalid || eng.id || null;
    }
    return member.physicalid || null;
  }

  function candidateRootIds(physicalId) {
    var seen = {};
    var list = [];
    function add(id) {
      id = apiId(id);
      if (!id || seen[id]) return;
      seen[id] = true;
      list.push(id);
    }
    add(physicalId);
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    Object.keys(reg).forEach(function (k) {
      if (/^prd-/i.test(k) && reg[k] && apiId(reg[k]) === apiId(physicalId)) {
        add(k);
      }
    });
    return list;
  }

  /** Cloud: Physical Product / VPM — tenta prd- e hex; sem EngItem. */
  function getProductRoot(physicalId, expand) {
    var ids = candidateRootIds(physicalId);
    function tryId(i) {
      if (i >= ids.length) {
        return Promise.reject(new Error('Physical Product não encontrado para ' + physicalId));
      }
      var id = ids[i];
      return getPhysicalProduct(id, null)
        .catch(function () { return getVpmReference(id, null); })
        .catch(function () { return tryId(i + 1); });
    }
    return tryId(0);
  }

  function getPhysicalProductChildren(parentPhysicalId, skip, top) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var id = encodeURIComponent(apiId(parentPhysicalId));
    var base = restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + id;
    var url = base + '/dspfl:Part?$skip=' + skip + '&$top=' + top;
    return WafClient.get(url).catch(function (err) {
      return Promise.reject(err || new Error('Filhos indisponíveis (406) para ' + parentPhysicalId));
    });
  }

  function getEngItemBomExpand(physicalId) {
    return getEngItem(physicalId, APP_CONFIG.EXPAND.BOM_CHILDREN);
  }

  function getEngInstanceChildren(parentPhysicalId, skip, top) {
    return WafClient.get(engInstanceChildrenUrl(parentPhysicalId, skip, top));
  }

  function getPhysicalProductsForEngItem(engPhysicalId) {
    return WafClient.get(physicalProductSearchUrl(engPhysicalId));
  }

  function extractMembers(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.infos)) return response.infos;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.items)) return response.items;
    if (response.member && Array.isArray(response.member.member)) return response.member.member;
    if (response.data && Array.isArray(response.data.items)) return response.data.items;
    if (response.data && Array.isArray(response.data.member)) return response.data.member;
    return [];
  }

  return {
    init: init,
    ensureRestBase: ensureRestBase,
    defaultSpaceUrl: defaultSpaceUrl,
    getEngItem: getEngItem,
    getVpmReference: getVpmReference,
    getPhysicalProduct: getPhysicalProduct,
    getProductRoot: getProductRoot,
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductChildren: getPhysicalProductChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemUrl: engItemUrl
  };
})();

;/* --- assets\js\integration\search-api.js --- */
/**
 * @file integration/search-api.js
 * Busca federada 3DSpace / ENOVIA (Physical Product, VPMReference).
 */
var SearchApi = (function () {
  'use strict';

  var spaceUrl = null;

  function init(base3DSpaceUrl) {
    spaceUrl = base3DSpaceUrl.replace(/\/$/, '');
  }

  function searchUrls(term, top) {
    top = top || APP_CONFIG.SEARCH.TOP;
    var enc = encodeURIComponent(term);
    var modelerBase = CompassServices.buildRestBase(spaceUrl);
    var m = APP_CONFIG.MODELERS || {};
    var eng = m.ENG_ITEM || 'dseng';
    var engType = m.ENG_ITEM_TYPE || 'dseng:EngItem';
    var titleFilter = encodeURIComponent("title co '" + term.replace(/'/g, "''") + "'");
    var nameFilter = encodeURIComponent("name co '" + term.replace(/'/g, "''") + "'");
    if (APP_CONFIG.CLOUD_PHYSICAL_ONLY || APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD) {
      return [
        modelerBase + '/dspfl/dspfl:PhysicalProduct/search?searchStr=' + enc + '&$top=' + top,
        modelerBase + '/search?searchStr=' + enc + '&$top=' + top,
        modelerBase + '/search?q=' + enc + '&$top=' + top
      ];
    }
    return [
      modelerBase + '/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/search?q=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$searchStr=' + enc + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$filter=' + titleFilter + '&$top=' + top,
      modelerBase + '/' + eng + '/' + engType + '?$filter=' + nameFilter + '&$top=' + top,
      modelerBase + '/dsxcad/dsxcad:VPMReference/search?searchStr=' + enc + '&$top=' + top,
      modelerBase + '/dsxcad/dsxcad:VPMReference?$searchStr=' + enc + '&$top=' + top,
      modelerBase + '/dspfl/dspfl:PhysicalProduct/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/modeler/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/federated/search?searchStr=' + enc + '&$top=' + top,
      spaceUrl + '/resources/v1/federated/search?q=' + enc + '&$top=' + top
    ];
  }

  function responseHitCount(data) {
    if (!data) return 0;
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) {
      return EnoviaApi.extractMembers(data).length;
    }
    if (Array.isArray(data)) return data.length;
    if (Array.isArray(data.member)) return data.member.length;
    if (Array.isArray(data.infos)) return data.infos.length;
    if (Array.isArray(data.results)) return data.results.length;
    return 0;
  }

  function trySearch(urls, index) {
    index = index || 0;
    if (index >= urls.length) {
      return Promise.reject(new Error('Nenhum endpoint de busca respondeu no tenant.'));
    }
    return WafClient.get(urls[index]).then(function (data) {
      if (responseHitCount(data) === 0 && index + 1 < urls.length) {
        return trySearch(urls, index + 1);
      }
      return data;
    }).catch(function () {
      return trySearch(urls, index + 1);
    });
  }

  function search(term, options) {
    options = options || {};
    if (!spaceUrl) {
      return Promise.reject(new Error('3DSpace não inicializado.'));
    }
    return trySearch(searchUrls(term, options.top));
  }

  return {
    init: init,
    search: search
  };
})();

;/* --- assets\js\services\product-search-service.js --- */
/**
 * @file services/product-search-service.js
 * Normaliza resultados de busca → Physical Product / VPMReference.
 */
var ProductSearchService = (function () {
  'use strict';

  var PHYSICAL_HINTS = [
    'VPMReference',
    'Physical Product',
    'PhysicalProduct',
    'dspfl:PhysicalProduct',
    'i3dx:Physical',
    'dseng:EngItem',
    'EngItem',
    'Provide',
    'Product',
    'Assembly',
    'Part'
  ];

  function isPhysicalProductHit(item) {
    var blob = [
      item.type,
      item.objectType,
      item.displayType,
      item.policy,
      item['dseno:type'],
      item.i3dx,
      (item.objectTaxonomies || []).join(' ')
    ].join(' ').toLowerCase();
    return PHYSICAL_HINTS.some(function (h) {
      return blob.indexOf(h.toLowerCase()) >= 0;
    });
  }

  function normalizeHit(raw) {
    var id =
      raw.physicalid || raw.physicalId || raw.objectId || raw.id ||
      raw.resourceid || raw.resourceId || raw.pid ||
      (raw.resource && (raw.resource.id || raw.resource.resourceid)) ||
      (raw.info && (raw.info.id || raw.info.physicalid));
    if (!id) return null;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      id = ThreeDXContentParser.normalizePhysicalId(id);
    }
    return {
      physicalid: id,
      type: raw.type || raw.objectType || 'VPMReference',
      name: raw.name || raw.title || raw.displayName || id,
      displayName: raw.displayName || raw.title || raw.name || id,
      displayType: raw.displayType || raw['dseno:displayType'] || '',
      revision: raw.revision || raw['dseno:revision'] || '',
      state: raw.state || raw.current || raw.status || '',
      owner: raw.owner || raw.creator || '',
      organization: raw.organization || '',
      collabSpace: raw.collabspace || raw.project || '',
      description: raw.description || '',
      i3dx: raw.i3dx || null
    };
  }

  function nameMatchesTerm(hit, term) {
    if (!term || !hit) return false;
    var t = String(term).toLowerCase();
    var n = (hit.name || hit.displayName || '').toLowerCase();
    return n === t || n.indexOf(t) === 0 || t.indexOf(n) === 0;
  }

  function parseResponse(response, term) {
    var members = EnoviaApi.extractMembers(response);
    if (!members.length && response && response.results) {
      members = response.results;
    }
    var all = members.map(normalizeHit).filter(Boolean);
    var physical = all.filter(isPhysicalProductHit);
    if (term) {
      var exact = all.filter(function (h) { return nameMatchesTerm(h, term); });
      if (exact.length) return exact;
    }
    return physical.length ? physical : all;
  }

  function search(term, options) {
    options = options || {};
    var t = String(term || '').trim();
    return SearchApi.search(t, options).then(function (res) {
      return parseResponse(res, t);
    });
  }

  function getDemoResults(term) {
    var all = [
      {
        physicalid: '132FB3CE26D70E006A18D1870000316D',
        type: 'VPMReference',
        name: '01_SKA_Drone Assembly_130520206',
        displayName: '01_SKA_Drone Assembly_130520206',
        displayType: 'Physical Product',
        revision: 'A',
        state: 'RELEASED',
        owner: 'demo.owner',
        organization: 'Company Name',
        collabSpace: 'CS_IMPLANTACAO'
      },
      {
        physicalid: 'DEMO_PP_002',
        type: 'VPMReference',
        name: '02_Motor_Assembly',
        displayName: '02_Motor_Assembly',
        displayType: 'Physical Product',
        revision: 'B',
        state: 'IN_WORK',
        owner: 'demo.owner',
        organization: 'Company Name',
        collabSpace: 'CS_IMPLANTACAO'
      }
    ];
    if (!term) return all;
    var t = term.toLowerCase();
    return all.filter(function (x) {
      return (x.name + x.displayName).toLowerCase().indexOf(t) >= 0;
    });
  }

  return {
    search: search,
    parseResponse: parseResponse,
    getDemoResults: getDemoResults,
    isPhysicalProductHit: isPhysicalProductHit,
    normalizeHit: normalizeHit
  };
})();

;/* --- assets\js\integration\product-explorer-bridge.js --- */
/**
 * @file integration/product-explorer-bridge.js
 * Ponte de seleção com Product Structure Explorer / widgets 3DDashboard.
 */
var ProductExplorerBridge = (function () {
  'use strict';

  var listeners = [];
  var structureListeners = [];
  var currentSelection = null;
  var structureNameHint = null;

  var MESSAGE_TYPES = [
    '3DX_SELECTION',
    '3DX_SELECTION_RESPONSE',
    'selectionChanged',
    'onSelectedObject',
    'productexplorer.selection',
    'DS/Selection/selected',
    'objectSelected',
    'selectedObjectChanged',
    'ENOSCEN_selection',
    'ENOPSTR_selection',
    '3DXContent',
    'selection',
    '3DX_STRUCTURE',
    'structureRoot',
    'getStructureRoot'
  ];

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return id;
  }

  function isValidId(id) {
    id = normalizeId(id);
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 8;
  }

  function labelText(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object') {
      return String(v.label || v.displayName || v.name || v.title || '').trim();
    }
    var s = String(v).trim();
    if (s.charAt(0) === '{' && s.indexOf('"label"') >= 0) {
      try {
        var o = JSON.parse(s);
        return String(o.label || o.name || '').trim();
      } catch (e) { /* */ }
    }
    return s;
  }

  function isPrdCloudId(id) {
    return /^prd-R\d{10,}-/i.test(String(id || ''));
  }

  function pickPrdId(id) {
    id = normalizeId(id);
    if (isPrdCloudId(id)) return id;
    return id;
  }

  function lookupRegistryIdExact(term) {
    if (!term) return null;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term).trim();
    var id = reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()];
    return id ? pickPrdId(id) : null;
  }

  function lookupRegistryId(term, allowFuzzy) {
    var exact = lookupRegistryIdExact(term);
    if (exact) return exact;
    if (!allowFuzzy) return null;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term).trim();
    var tLow = key.toLowerCase();
    var keys = Object.keys(reg);
    var i;
    var best = null;
    var bestLen = 0;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (/^prd-/i.test(k)) continue;
      var kLow = k.toLowerCase();
      if (tLow === kLow || tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
        if (k.length > bestLen) {
          bestLen = k.length;
          best = reg[k];
        }
      }
    }
    return best ? pickPrdId(best) : null;
  }

  function makeGridPhysicalId(name, idx, isRoot) {
    if (isRoot) return lookupRegistryId(name, true) || 'root_' + idx;
    var slug = String(name || 'item')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);
    return 'grid_' + idx + '_' + (slug || 'x');
  }

  function appendExplorerTextChunks(chunks, doc) {
    if (!doc || !doc.body) return;
    try {
      chunks.push(doc.body.innerText || doc.body.textContent || '');
    } catch (e) { /* */ }
    try {
      var frames = doc.querySelectorAll('iframe');
      var f;
      for (f = 0; f < frames.length; f++) {
        try {
          var inner = frames[f].contentDocument;
          if (inner && inner.body) {
            chunks.push(inner.body.innerText || inner.body.textContent || '');
          }
        } catch (e2) { /* cross-origin */ }
      }
    } catch (e3) { /* */ }
  }

  function harvestAllExplorerText() {
    var chunks = [];
    var doc = readExplorerIframeDocument();
    if (doc) appendExplorerTextChunks(chunks, doc);
    try {
      if (window.parent && window.parent.document) appendExplorerTextChunks(chunks, window.parent.document);
    } catch (eP) { /* */ }
    try {
      if (window.top && window.top.document) appendExplorerTextChunks(chunks, window.top.document);
    } catch (eT) { /* */ }
    return chunks.join('\n');
  }

  function readExplorerIframeDocument() {
    var docs = [];
    try {
      if (window.parent && window.parent.document) docs.push(window.parent.document);
    } catch (e) { /* */ }
    try {
      if (window.top && window.top.document && window.top.document !== docs[0]) {
        docs.push(window.top.document);
      }
    } catch (e2) { /* */ }
    var i;
    for (i = 0; i < docs.length; i++) {
      var frames = docs[i].querySelectorAll('iframe');
      var f;
      for (f = 0; f < frames.length; f++) {
        var frame = frames[f];
        var src = (frame.src || '').toLowerCase();
        var title = '';
        try {
          title = frame.contentDocument && frame.contentDocument.title ? frame.contentDocument.title : '';
        } catch (e3) { /* */ }
        if (
          title.indexOf('Product Structure') >= 0 ||
          title.indexOf('Structure Explorer') >= 0 ||
          src.indexOf('enxscene') >= 0 ||
          src.indexOf('enxsce') >= 0 ||
          src.indexOf('enopstr') >= 0 ||
          src.indexOf('productstructure') >= 0 ||
          src.indexOf('structure') >= 0 && src.indexOf('3dexperience') >= 0
        ) {
          try {
            return frame.contentDocument;
          } catch (e4) { /* */ }
        }
      }
    }
    return null;
  }

  /** Catálogo dinâmico nome → prd- lido do Explorer (Recentes / lista). */
  function buildPrdCatalogFromExplorer() {
    var catalog = {};
    var doc = readExplorerIframeDocument();
    if (!doc || !doc.body) return catalog;
    var text = doc.body.innerText || '';
    var lines = text.split('\n');
    var prdRe = /prd-R\d{10,}-[A-Za-z0-9]+/gi;
    var i;
    for (i = 0; i < lines.length; i++) {
      var prdMatch = lines[i].match(prdRe);
      if (!prdMatch || !prdMatch[0]) continue;
      var prdId = prdMatch[0];
      var j;
      for (j = i - 1; j >= Math.max(0, i - 5); j--) {
        var nameLine = String(lines[j] || '').trim();
        if (!nameLine || nameLine.length < 2 || nameLine.length > 120) continue;
        if (prdRe.test(nameLine)) continue;
        if (/^(recents|open |physical product|access your)/i.test(nameLine)) continue;
        if (nameLine.indexOf('|') >= 0) {
          nameLine = nameLine.split('|')[0].trim();
        }
        if (nameLine.length > 2) {
          catalog[nameLine] = prdId;
          var short = nameLine.length > 24 ? nameLine.slice(0, 24) : nameLine;
          catalog[short] = prdId;
        }
        break;
      }
    }
    return catalog;
  }

  var EXPLORER_SKIP_LINE =
    /^(physical product|em trabalho|aprovado|released|frozen|in work|approved|owner|organization|revision|type|maturity|enderson|moura|vplm|recents|open |product structure|enovia|access your|n\/d|—|-|login|user)$/i;
  var EXPLORER_PART_LINE = /^(\d{2}_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/;
  var EXPLORER_NAME_LINE = /^(Mont\d+[A-Za-z0-9_.\-]{0,40}|01_SKA_[A-Za-z0-9_.\-]{2,80})/i;

  function extractRootNameFromExplorerText(text) {
    var m =
      String(text || '').match(/Product Structure Explorer\s*[-–]\s*(.+?)(?:\n|$)/i) ||
      String(text || '').match(/Structure Explorer\s*[-–]\s*(.+?)(?:\n|$)/i);
    return m ? sanitizeStructureName(m[1].trim()) : null;
  }

  function pushGridItem(items, seen, row) {
    var key = String(row.name || '').toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    items.push(row);
  }

  function parsePartNamesFromText(text, rootName) {
    var found = {};
    var names = [];
    var rootLow = rootName ? String(rootName).toLowerCase() : '';
    var patterns = [
      /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_.]{4,80})\b/gi,
      /\b(Mont\d+[A-Za-z0-9_.]{0,40})\b/gi
    ];
    var p;
    for (p = 0; p < patterns.length; p++) {
      var re = patterns[p];
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(String(text || ''))) !== null) {
        var name = String(m[1]).replace(/\.{2,}$/, '').trim();
        if (name.length < 6) continue;
        var key = name.toLowerCase();
        if (found[key]) continue;
        if (rootLow && key === rootLow) continue;
        if (rootLow && rootLow.indexOf(key) >= 0 && key.length < rootLow.length - 2) continue;
        found[key] = true;
        names.push(name);
      }
    }
    return names;
  }

  function scrapeDashboardLeafRows(rootName, items, seen) {
    var doc = null;
    try {
      doc = window.top && window.top.document;
    } catch (e0) { /* */ }
    if (!doc) return;
    var rootLow = rootName ? String(rootName).toLowerCase() : '';
    var nodes = doc.querySelectorAll(
      'span, div, td, li, a, p, [role="treeitem"], [role="row"], [role="gridcell"], [class*="tree"], [class*="Tree"], [class*="node"]'
    );
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children && el.children.length > 6) continue;
      var text = '';
      try {
        text = (el.innerText || el.textContent || '').trim();
      } catch (e1) { /* */ }
      if (!text || text.length > 90 || text.indexOf('\n') >= 0) continue;
      var partM = text.match(EXPLORER_PART_LINE) || text.match(EXPLORER_NAME_LINE);
      if (!partM && !/^(01_SKA_|Mont\d)/i.test(text)) continue;
      var name = partM ? partM[1] : text.replace(/\.{2,}$/, '').trim();
      if (!name || name.length < 6) continue;
      var key = name.toLowerCase();
      if (seen[key]) continue;
      if (rootLow && key === rootLow) continue;
      var revision = '—';
      var maturity = '—';
      var approved = false;
      try {
        var row = el.closest('[role="row"], tr, li, div');
        if (row) {
          var rowText = (row.innerText || '').toLowerCase();
          if (/aprovado|released|frozen/.test(rowText)) {
            maturity = 'Aprovado';
            approved = true;
          } else if (/em trabalho|in work/.test(rowText)) {
            maturity = 'Em Trabalho';
          }
          var revM = (row.innerText || '').match(/\b(\d+\.\d+)\b/);
          if (revM) revision = revM[1];
        }
      } catch (e2) { /* */ }
      pushGridItem(items, seen, {
        level: 1,
        name: name,
        title: name,
        type: 'Physical Product',
        displayType: 'Physical Product',
        revision: revision,
        state: maturity,
        maturity: maturity,
        approval: approved ? 'Approved' : 'Unknown',
        physicalid: makeGridPhysicalId(name, items.length, false)
      });
    }
  }

  function scrapeExplorerTreeLines(lines, rootName, items, seen) {
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line || line.indexOf('|') >= 0 || EXPLORER_SKIP_LINE.test(line)) continue;
      var name = null;
      var partM = line.match(EXPLORER_PART_LINE) || line.match(EXPLORER_NAME_LINE);
      if (partM) name = partM[1];
      else if (/^(01_SKA_|Mont\d)/i.test(line) && line.length >= 4 && line.length <= 64) {
        name = line.replace(/\.{2,}$/, '').trim();
      }
      if (!name || name.length < 6) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var revision = '—';
      var maturity = '—';
      var j;
      for (j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        var L = String(lines[j] || '').trim();
        if (!L || L.indexOf('|') >= 0) break;
        if (EXPLORER_PART_LINE.test(L) && j > i + 1) break;
        if (/^\d+\.\d+$/.test(L)) revision = L;
        if (/em trabalho|aprovado|released|frozen|obsolete|in work/i.test(L)) maturity = L;
      }
      var approved = /aprovado|released|frozen/i.test(maturity);
      pushGridItem(items, seen, {
        level: 1,
        name: name,
        title: name,
        type: 'Physical Product',
        displayType: 'Physical Product',
        revision: revision,
        state: maturity,
        maturity: maturity,
        approval: approved ? 'Approved' : 'Unknown',
        physicalid: makeGridPhysicalId(name, items.length, false)
      });
    }
  }

  function buildRowFromName(name, level, idx, extra) {
    extra = extra || {};
    return {
      level: level,
      name: name,
      title: name,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: extra.revision || '—',
      state: extra.maturity || '—',
      maturity: extra.maturity || '—',
      approval: extra.approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
  }

  function scrapeExplorerGrid(rootName) {
    pollDashboardExplorerChrome();
    var text = harvestAllExplorerText();
    if (!text || text.length < 20) return null;
    var fromTitle = extractRootNameFromExplorerText(text);
    rootName = String(rootName || fromTitle || structureNameHint || '').trim();
    if (!rootName) return null;
    var lines = text.split('\n');
    var items = [];
    var seen = {};
    var i;

    pushGridItem(items, seen, buildRowFromName(rootName, 0, 0, {}));

    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line || line.indexOf('|') < 0) continue;
      if (/^physical product\s*\|/i.test(line)) continue;
      if (/product structure explorer/i.test(line)) continue;
      if (/^recents$/i.test(line)) continue;
      var parts = line.split('|').map(function (p) { return p.trim(); });
      if (parts.length < 3) continue;
      var name = parts[0];
      if (!name || name.length < 3 || name === rootName) continue;
      if (/^prd-R/i.test(name)) continue;
      var maturity = parts[3] || parts[2] || '—';
      var approved = /aprovado|released|frozen/i.test(maturity);
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {
        revision: parts[1] || '—',
        maturity: maturity,
        approved: approved
      }));
    }
    if (items.length < 2) scrapeExplorerTreeLines(lines, rootName, items, seen);
    if (items.length < 2) scrapeDashboardLeafRows(rootName, items, seen);

    var fromRegex = parsePartNamesFromText(text, rootName);
    fromRegex.forEach(function (name) {
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {}));
    });

    if (items.length < 2) return null;
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName, 0, true),
      items: items,
      scrapeSource: 'explorer-dom'
    };
  }

  function fetchPilotStructurePayload(rootName) {
    if (typeof BomSnapshot !== 'undefined' && BomSnapshot.getPilotPayloadForTerm) {
      var built = BomSnapshot.getPilotPayloadForTerm(rootName);
      if (built && built.items && built.items.length >= 2) return Promise.resolve(built);
    }
    var map = APP_CONFIG.PILOT_SNAPSHOT_BY_STRUCTURE || {};
    if (!rootName || typeof BomSnapshot === 'undefined') return Promise.resolve(null);
    var path = null;
    var keyName = String(rootName).trim();
    var keys = Object.keys(map);
    var i;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      var kLow = k.toLowerCase();
      var tLow = keyName.toLowerCase();
      if (tLow === kLow || tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
        path = map[k];
        break;
      }
    }
    if (!path) return Promise.resolve(null);
    var url = BomSnapshot.resolveUrl(path);
    return BomSnapshot.fetchJson(url).then(function (data) {
      return BomSnapshot.normalizePayload(data);
    }).catch(function () {
      return null;
    });
  }

  function resolveFromExplorerCatalog(term) {
    if (!term) return null;
    var catalog = buildPrdCatalogFromExplorer();
    var key = String(term).trim();
    var prd = catalog[key];
    if (!prd) {
      var tLow = key.toLowerCase();
      Object.keys(catalog).forEach(function (name) {
        if (prd) return;
        var nLow = name.toLowerCase();
        if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
          prd = catalog[name];
        }
      });
    }
    if (!prd || !isValidId(prd)) return null;
    return {
      physicalid: pickPrdId(prd),
      type: 'VPMReference',
      name: key,
      displayName: key,
      displayType: 'Physical Product',
      source: 'explorer-prd-catalog'
    };
  }

  function normalizeSelection(payload) {
    if (!payload) return null;
    var obj = payload.data || payload.object || payload.item || payload.selection || payload;
    if (obj.icon && obj.label && !obj.physicalid && !obj.objectId) return null;
    if (obj.items && obj.items.length && typeof ThreeDXContentParser !== 'undefined') {
      var fromItems = ThreeDXContentParser.toSelection({ data: { items: obj.items } });
      if (fromItems) return fromItems;
    }
    var physicalid = normalizeId(
      obj.physicalid || obj.objectId || obj.id || obj.resourceid || obj['dseno:physicalid']
    );
    var displayName = labelText(obj.displayName) || labelText(obj.title) || labelText(obj.name) || labelText(obj['dseno:name']);
    if (!isValidId(physicalid) && displayName) {
      setStructureNameHint(displayName);
      var reg = APP_CONFIG.STRUCTURE_IDS || {};
      var rid = reg[displayName] || reg[displayName.toLowerCase()] || reg[displayName.toUpperCase()];
      if (rid) physicalid = normalizeId(rid);
    }
    var nameForLookup = structureNameHint || displayName;
    if (nameForLookup) {
      var catSel = resolveFromExplorerCatalog(nameForLookup);
      if (catSel) return catSel;
      if (!isPrdCloudId(physicalid)) {
        var hintId = lookupRegistryId(nameForLookup, true);
        if (hintId) physicalid = hintId;
      }
    }
    if (!isValidId(physicalid)) return null;
    if (!displayName) {
      displayName = labelText(obj.title) || labelText(obj.name) || physicalid;
    }
    if (displayName.length <= 2 && !isNaN(displayName)) {
      displayName = labelText(obj.title) || labelText(obj.name) || physicalid;
    }
    if (!displayName || displayName.charAt(0) === '{') return null;
    return {
      physicalid: physicalid,
      type: obj.type || obj.objectType || obj['dseno:type'] || 'VPMReference',
      name: displayName || physicalid,
      displayName: displayName || physicalid,
      displayType: obj.displayType || 'Physical Product',
      source: obj.source || 'normalize'
    };
  }

  function isBadDashboardSelection(sel) {
    if (!sel) return true;
    var name = labelText(sel.displayName || sel.name || '');
    if (!name) return true;
    if (name.charAt(0) === '{' && name.indexOf('"icon"') >= 0) return true;
    if (name.indexOf('getpicture') >= 0) return true;
    if (/^(enderson|moura|login|user)/i.test(name)) return true;
    if (/moura/i.test(name) && !/mont|assembly|^m\d+$/i.test(name)) return true;
    return false;
  }

  function clearSelection() {
    currentSelection = null;
  }

  function sanitizeStructureName(name) {
    var n = String(name || '').trim();
    if (!n) return n;
    n = n.replace(/\s*BOM\s*Analytics.*$/i, '').trim();
    if (/^Mont10BOM$/i.test(n)) return 'Mont10';
    if (/BOM$/i.test(n) && n.length > 3) n = n.replace(/BOM$/i, '').trim();
    if (n.length > 80) n = n.slice(0, 80).trim();
    return n;
  }

  function extractStructureNameFromText(text) {
    var s = String(text || '');
    var m =
      s.match(/Product Structure Explorer\s*[-–]\s*(.+?)(?:\s*$|\s*BOM\s*Analytics|\s*ENOVIA)/i) ||
      s.match(/Structure Explorer\s*[-–]\s*(.+?)(?:\s*$|\s*BOM)/i) ||
      s.match(/Explorer\s*[-–]\s*([^\s<]+)/i);
    return m ? sanitizeStructureName(m[1].trim()) : null;
  }

  function notifyStructureChange(name) {
    structureListeners.forEach(function (fn) {
      try { fn(name); } catch (e) { console.error('[Bridge structure]', e); }
    });
  }

  function setStructureNameHint(name) {
    var n = String(name || '').trim();
    if (!n || n === '-') return;
    if (/^(enderson|moura|login|user)/i.test(n)) return;
    if (/BOM\s*Analytics|Varredura|Snapshot/i.test(n)) return;
    n = sanitizeStructureName(n);
    if (!n) return;
    if (n === structureNameHint) return;
    structureNameHint = n;
    notifyStructureChange(n);
  }

  function getStructureNameHint() {
    return structureNameHint;
  }

  function setSelection(sel, opts) {
    if (!sel || !sel.physicalid || isBadDashboardSelection(sel)) return;
    sel = Object.assign({}, sel, { physicalid: normalizeId(sel.physicalid) });
    if (!isValidId(sel.physicalid)) return;
    currentSelection = sel;
    if (opts && opts.silent) return;
    listeners.forEach(function (fn) {
      try { fn(sel); } catch (e) { console.error('[Bridge]', e); }
    });
  }

  function onMessage(event) {
    if (!event.data) return;
    var origin = event.origin || '';
    var okOrigin =
      !origin ||
      origin === location.origin ||
      origin.indexOf('3dexperience.3ds.com') >= 0 ||
      origin.indexOf('3ds.com') >= 0 ||
      origin.indexOf('github') >= 0;
    if (!okOrigin) return;

    var data = event.data;
    if (typeof data === 'string') {
      if (typeof ThreeDXContentParser !== 'undefined') {
        var loose = ThreeDXContentParser.parseJsonText(data);
        if (loose) {
          setSelection(loose);
          return;
        }
      }
      try { data = JSON.parse(data); } catch (e) { return; }
    }

    if (data.protocol === '3DXContent' && data.data && data.data.items) {
      var sel3dx = ThreeDXContentParser.toSelection(data);
      if (sel3dx) setSelection(sel3dx);
      return;
    }

    if (data.structureName || data.rootName || data.structure || data.productName) {
      setStructureNameHint(data.structureName || data.rootName || data.structure || data.productName);
    }
    if (data.widgetTitle || data.title || data.caption) {
      var fromTitle = extractStructureNameFromText(data.widgetTitle || data.title || data.caption);
      if (fromTitle) setStructureNameHint(fromTitle);
    }

    if (data.rootPhysicalId || data.rootId) {
      var rootSel = normalizeSelection({
        physicalid: data.rootPhysicalId || data.rootId,
        displayName: data.rootName || data.structureName || data.name,
        type: data.type || 'VPMReference'
      });
      if (rootSel) setSelection(rootSel);
      return;
    }
    if (data.physicalid || data.objectId || data.resourceid) {
      var direct = normalizeSelection(data);
      if (direct) {
        setSelection(direct);
        return;
      }
    }
    if (data.items && data.items.length) {
      var selItems = normalizeSelection({ items: data.items });
      if (selItems) setSelection(selItems);
      return;
    }
    if (data.data && data.data.items) {
      var selData = ThreeDXContentParser.toSelection(data);
      if (selData) setSelection(selData);
      return;
    }
    var type = data.type || data.event || data.name || data.messageName;
    if (MESSAGE_TYPES.indexOf(type) === -1 && !data.physicalid && !data.object && !data.objectId) return;
    var sel = normalizeSelection(data);
    if (sel) setSelection(sel);
  }

  function subscribe(fn) {
    listeners.push(fn);
    if (currentSelection) fn(currentSelection);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function readHashSelection() {
    if (typeof ThreeDXContentParser === 'undefined') return null;
    var content = ThreeDXContentParser.parseLocations();
    return content ? ThreeDXContentParser.toSelection(content) : null;
  }

  function initFromQuery() {
    if (APP_QUERY.structure || APP_QUERY.rootName) {
      setStructureNameHint(APP_QUERY.structure || APP_QUERY.rootName);
    }
    if (APP_QUERY.physicalid && isValidId(APP_QUERY.physicalid)) {
      setSelection({
        physicalid: APP_QUERY.physicalid,
        type: APP_QUERY.type || 'VPMReference',
        name: APP_QUERY.name || APP_QUERY.physicalid,
        displayName: APP_QUERY.displayName || APP_QUERY.physicalid
      });
    }
  }

  function initFrom3DXDeepLink() {
    var sel = readHashSelection();
    if (sel) setSelection(sel);
  }

  function initPlatformSelection() {
    var req = typeof require !== 'undefined' ? require : null;
    if (!req) return;
    try {
      req(['DS/Selection/Selection'], function (Selection) {
        if (Selection && Selection.getSelection) {
          Selection.getSelection().then(function (items) {
            if (!items || !items.length) return;
            var sel = normalizeSelection(items[0]);
            if (sel) setSelection(sel);
          }).catch(function () { /* */ });
        }
      });
    } catch (e) { /* */ }
    try {
      req(['DS/PlatformAPI/PlatformAPI'], function (PlatformAPI) {
        if (PlatformAPI && PlatformAPI.getSelection) {
          PlatformAPI.getSelection().then(function (items) {
            if (!items || !items.length) return;
            var sel2 = normalizeSelection(items[0]);
            if (sel2) setSelection(sel2);
          }).catch(function () { /* */ });
        }
      });
    } catch (e2) { /* */ }
  }

  function pollDashboardExplorerChrome() {
    var found = null;
    try {
      var doc = window.top && window.top.document;
      if (!doc || !doc.body) return null;
      var nodes = doc.querySelectorAll('div, span, p, h1, h2, h3, td, th, a, li');
      for (var i = 0; i < nodes.length; i++) {
        var text = (nodes[i].textContent || '').trim();
        if (text.length < 12 || text.length > 120) continue;
        if (text.indexOf('Product Structure Explorer') < 0) continue;
        var n = extractStructureNameFromText(text);
        if (n && n.length > 1) {
          found = n;
          break;
        }
      }
    } catch (e) { /* */ }
    if (found) setStructureNameHint(found);
    return found;
  }

  function pollStructureHint() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
      PlatformBridge.requestExplorerStructure();
    }
    pollDashboardExplorerChrome();
    try {
      var titles = [document.title || ''];
      if (window.widget && window.widget.getTitle) {
        try { titles.push(String(window.widget.getTitle())); } catch (eW) { /* */ }
      }
      titles.forEach(function (t) {
        var n = extractStructureNameFromText(t);
        if (n) setStructureNameHint(n);
      });
    } catch (e) { /* */ }
  }

  function subscribeStructure(fn) {
    structureListeners.push(fn);
    if (structureNameHint) fn(structureNameHint);
  }

  function pollSelection() {
    var fromHash = readHashSelection();
    if (fromHash) setSelection(fromHash);
    pollStructureHint();
    initPlatformSelection();
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
  }

  function startContentPoll() {
    if (APP_CONFIG.PILOT_GRID_FIRST) return;
    window.setInterval(pollSelection, 2000);
  }

  function init() {
    window.addEventListener('message', onMessage, false);
    initFromQuery();
    initFrom3DXDeepLink();
    pollStructureHint();
    pollDashboardExplorerChrome();
    if (!APP_CONFIG.PILOT_GRID_FIRST) {
      pollSelection();
      startContentPoll();
    }
    return {
      getSelection: function () { return currentSelection; },
      subscribe: subscribe,
      setSelection: setSelection,
      pollSelection: pollSelection
    };
  }

  return {
    init: init,
    subscribe: subscribe,
    setSelection: setSelection,
    getSelection: function () { return currentSelection; },
    getStructureNameHint: getStructureNameHint,
    setStructureNameHint: setStructureNameHint,
    extractStructureNameFromText: extractStructureNameFromText,
    clearSelection: clearSelection,
    isBadDashboardSelection: isBadDashboardSelection,
    normalizeSelection: normalizeSelection,
    pollSelection: pollSelection,
    pollStructureHint: pollStructureHint,
    pollDashboardExplorerChrome: pollDashboardExplorerChrome,
    subscribeStructure: subscribeStructure,
    readHashSelection: readHashSelection,
    buildPrdCatalogFromExplorer: buildPrdCatalogFromExplorer,
    resolveFromExplorerCatalog: resolveFromExplorerCatalog,
    readExplorerIframeDocument: readExplorerIframeDocument,
    scrapeExplorerGrid: scrapeExplorerGrid,
    fetchPilotStructurePayload: fetchPilotStructurePayload,
    harvestAllExplorerText: harvestAllExplorerText
  };
})();

;/* --- assets\js\services\attribute-service.js --- */
/**
 * @file services/attribute-service.js
 * Extração de atributos de objetos ENOVIA.
 */
var AttributeService = (function () {
  'use strict';

  function pick(obj, keys, def) {
    def = def === undefined ? '' : def;
    if (!obj) return def;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
      if (obj[k.replace(':', '_')] !== undefined) return obj[k.replace(':', '_')];
    }
    return def;
  }

  function parseDate(val) {
    if (!val) return null;
    var d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  function normalizePid(id) {
    if (!id) return id;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return id;
  }

  function extractFromMember(member) {
    var ce = member['dseno:CustomerAttributes'] || member.customerAttributes || {};
    var eng = member['dseng:EnterpriseReference'] || member.enterpriseReference || {};

    return {
      physicalid: normalizePid(pick(member, ['physicalid', 'id'])),
      name: pick(member, ['name', 'dseno:name', 'title']),
      title: pick(member, ['title', 'dseno:title', 'name']),
      description: pick(member, ['description', 'dseno:description']),
      displayType: pick(member, ['displayType', 'dseno:displayType'], 'Physical Product'),
      type: pick(member, ['type', 'dseno:type', 'policy']),
      revision: pick(member, ['revision', 'dseno:revision', 'majorrevision']),
      state: pick(member, ['state', 'current', 'dseno:current', 'status']),
      maturity: pick(member, ['maturity', 'dseno:maturityState', 'state']),
      owner: pick(member, ['owner', 'dseno:owner', 'creator']),
      organization: pick(member, ['organization', 'dseno:organization']),
      collabSpace: pick(member, ['collabspace', 'dseno:collabspace', 'project']),
      policy: pick(member, ['policy', 'policyName']),
      modified: parseDate(pick(member, ['modified', 'dseno:modified', 'lastmodified'])),
      created: parseDate(pick(member, ['originated', 'created', 'dseno:created'])),
      approval: pick(ce, ['approval', 'dseno:approval', 'Approval Status'], pick(eng, ['approvalStatus'], 'Unknown')),
      engineeringState: pick(eng, ['engineeringState', 'state'], pick(member, ['state'], 'Unknown')),
      isAssembly: false,
      quantity: 1,
      level: 0,
      parentId: null,
      childrenIds: [],
      physicalProductIds: [],
      hasPhysicalProduct: false,
      duplicateKey: null
    };
  }

  function classifyMaturity(state) {
    var raw = String(state || '').trim();
    if (!raw) return 'other';
    if (/^aprovado$/i.test(raw)) return 'released';
    if (/em\s*trabalho|em\s*desenvolvimento/i.test(raw)) return 'in_work';
    var s = raw.toUpperCase();
    var cfg = APP_CONFIG.MATURITY_STATES;
    if (cfg.RELEASED.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'released';
    if (cfg.OBSOLETE.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'obsolete';
    if (cfg.IN_WORK.some(function (x) { return s.indexOf(x.toUpperCase()) >= 0; })) return 'in_work';
    return 'other';
  }

  function isAssemblyType(type) {
    return APP_CONFIG.ASSEMBLY_TYPES.some(function (t) {
      return String(type || '').indexOf(t) >= 0;
    });
  }

  return {
    extractFromMember: extractFromMember,
    classifyMaturity: classifyMaturity,
    isAssemblyType: isAssemblyType
  };
})();

;/* --- assets\js\services\physical-product-service.js --- */
/**
 * @file services/physical-product-service.js
 * Resolução Engineering Item ↔ Physical Product.
 */
var PhysicalProductService = (function () {
  'use strict';

  var cache = {};

  function extractPhysicalIds(response) {
    var members = EnoviaApi.extractMembers(response);
    return members.map(function (m) {
      return {
        physicalid: m.physicalid || m.id,
        name: m.name || m.title || '',
        revision: m.revision || '',
        state: m.state || m.current || ''
      };
    });
  }

  function enrichNodes(index, options) {
    options = options || {};
    var batchSize = options.batchSize || 20;
    var ids = Object.keys(index);
    var queue = ids.filter(function (id) { return !cache[id]; });
    var results = {};

    function processBatch(start) {
      var slice = queue.slice(start, start + batchSize);
      if (!slice.length) return Promise.resolve(results);

      return Promise.all(slice.map(function (engId) {
        if (APP_CONFIG.DEMO_MODE) {
          var mock = index[engId].level % 3 !== 0;
          cache[engId] = mock ? [{ physicalid: 'PP_' + engId, name: 'PP-' + index[engId].name }] : [];
          return cache[engId];
        }
        return EnoviaApi.getPhysicalProductsForEngItem(engId)
          .then(extractPhysicalIds)
          .catch(function () { return []; })
          .then(function (pps) {
            cache[engId] = pps;
            return pps;
          });
      })).then(function () {
        return processBatch(start + batchSize);
      });
    }

    return processBatch(0).then(function () {
      sliceApply(index);
      return index;
    });

    function sliceApply(idx) {
      Object.keys(idx).forEach(function (id) {
        var pps = cache[id] || [];
        idx[id].physicalProductIds = pps.map(function (p) { return p.physicalid; });
        idx[id].hasPhysicalProduct = pps.length > 0;
        idx[id].physicalProductCount = pps.length;
      });
    }
  }

  function clearCache() {
    cache = {};
  }

  return {
    enrichNodes: enrichNodes,
    clearCache: clearCache
  };
})();

;/* --- assets\js\services\file-import-service.js --- */
/**
 * @file services/file-import-service.js
 * Importa estrutura Product Explorer via colar (Ctrl+C) ou arquivo opcional.
 */
var FileImportService = (function () {
  'use strict';

  var COLUMN_ALIASES = {
    level: ['nivel', 'nível', 'level', 'n', 'depth', 'profundidade'],
    name: ['name', 'nome', 'title', 'titulo', 'título', 'display name', 'displayname'],
    title: ['title', 'titulo', 'título', 'description', 'descricao'],
    type: ['type', 'tipo', 'display type', 'policy', 'tipologia', 'physical product'],
    revision: ['revision', 'revisao', 'revisão', 'rev', 'revis', 'majorrevision'],
    state: ['state', 'estado', 'current', 'status'],
    maturity: ['maturity', 'maturidade', 'estado de maturidade', 'estado maturidade', 'maturity state', 'lifecycle'],
    quantity: ['quantity', 'quantidade', 'qty', 'qtd', 'amount'],
    owner: ['owner', 'proprietario', 'proprietário', 'propriet', 'creator'],
    organization: ['organization', 'organizacao', 'organização', 'org'],
    collabSpace: ['collabspace', 'collaborative space', 'espaco', 'espaço', 'project'],
    approval: ['approval', 'aprovacao', 'aprovação', 'approval status'],
    physicalid: ['physicalid', 'physical id', 'id', 'objectid', 'object id'],
    parent: ['parent', 'pai', 'parentid', 'parent id', 'parent name']
  };

  var STATUS_LABELS = [
    'crítico', 'critico', 'atenção', 'atencao', 'ok', 'alerta', 'warning', 'info',
    'released', 'in work', 'aprovado', 'pendente', 'bloqueado', 'normal'
  ];

  /** Corrige MÃ¡quinas → Máquinas (UTF-8 lido como Latin-1). */
  function fixMojibake(s) {
    var str = String(s == null ? '' : s);
    if (!str || str.indexOf('Ã') < 0) return str;
    try {
      var bytes = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
      var fixed = new TextDecoder('utf-8').decode(bytes);
      if (fixed.indexOf('Ã') < 0 && fixed.indexOf('\uFFFD') < 0) return fixed;
    } catch (e) { /* ignore */ }
    return str
      .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ').replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç').replace(/Ãƒ/g, 'ã').replace(/Ã"/g, 'Ó');
  }

  function cleanCell(v) {
    return fixMojibake(String(v == null ? '' : v)).trim();
  }

  function isJsonBlob(s) {
    var t = cleanCell(s);
    return t.length > 2 && t.charAt(0) === '{' && t.indexOf('"') >= 0;
  }

  /** Explorer copia proprietário como JSON { icon, label }. */
  function unwrapJsonCell(s) {
    if (!isJsonBlob(s)) return cleanCell(s);
    try {
      var o = JSON.parse(s);
      return cleanCell(o.label || o.name || o.displayName || o.title || '');
    } catch (e) {
      var m = String(s).match(/"label"\s*:\s*"([^"]+)"/i);
      return m ? cleanCell(m[1]) : '';
    }
  }

  function isProductName(name) {
    var n = cleanCell(name);
    if (!n || n.length < 2) return false;
    if (isJsonBlob(n)) return false;
    if (/^physical\s*product$/i.test(n)) return false;
    return true;
  }

  function normalizeImportedState(state, approval) {
    var s = cleanCell(state);
    var a = cleanCell(approval);
    if (/aprovado|released|frozen|approved/i.test(s)) {
      return { state: s || 'Aprovado', maturity: s || 'Aprovado', approval: a && a !== 'Unknown' ? a : 'Approved' };
    }
    if (/em\s*trabalho|in\s*work|in_work|wip|private|desenvolvimento/i.test(s)) {
      return { state: s || 'Em Trabalho', maturity: s || 'Em Trabalho', approval: a || 'Unknown' };
    }
    if (/obsoleto|obsolete|abandoned/i.test(s)) {
      return { state: s || 'Obsoleto', maturity: s || 'Obsoleto', approval: a || 'Unknown' };
    }
    return { state: s, maturity: s, approval: a || 'Unknown' };
  }

  /** Varre células da linha Explorer à procura de Aprovado / Em Trabalho / etc. */
  function findMaturityInCells(row) {
    if (!row || !row.length) return '';
    for (var i = row.length - 1; i >= 0; i--) {
      var v = cleanCell(unwrapJsonCell(row[i]));
      if (!v || v.length > 40) continue;
      if (/^(aprovado|em\s*trabalho|released|in work|in_work|frozen|obsoleto|obsolete|wip|private)$/i.test(v)) {
        return v;
      }
      if (/aprovado/i.test(v) && !/desaprovado/i.test(v)) return v;
      if (/em\s*trabalho/i.test(v)) return v;
    }
    return '';
  }

  function resolveMaturityFields(row, colMap) {
    var stateRaw = cleanCell(cell(row, colMap, 'state', ''));
    var matRaw = colMap.maturity !== undefined ? cleanCell(cell(row, colMap, 'maturity', '')) : '';
    var scanned = findMaturityInCells(row);
    if (!stateRaw && matRaw) stateRaw = matRaw;
    if (!matRaw && stateRaw) matRaw = stateRaw;
    if (!stateRaw && scanned) {
      stateRaw = scanned;
      matRaw = scanned;
    }
    return normalizeImportedState(stateRaw || matRaw, cell(row, colMap, 'approval', 'Unknown'));
  }

  function normHeader(h) {
    return cleanCell(h).toLowerCase().replace(/\s+/g, ' ');
  }

  function mapColumns(headers) {
    var map = {};
    headers.forEach(function (h, i) {
      var nh = normHeader(h);
      if (!nh) return;
      if (nh.indexOf('matur') >= 0 || nh.indexOf('lifecycle') >= 0) {
        map.maturity = i;
        return;
      }
    });
    headers.forEach(function (h, i) {
      var nh = normHeader(h);
      if (!nh) return;
      Object.keys(COLUMN_ALIASES).forEach(function (key) {
        if (map[key] !== undefined) return;
        if (key === 'maturity' && map.maturity !== undefined) return;
        if (COLUMN_ALIASES[key].some(function (a) { return nh === a || nh.indexOf(a) >= 0; })) {
          map[key] = i;
        }
      });
    });
    return map;
  }

  function guessExplorerColumnMap(row) {
    var map = { name: 0, title: 1 };
    if (!row || !row.length) return map;
    if (/^\d+$/.test(String(row[0]).trim())) {
      map = { level: 0, name: 1, title: 2, type: 3, revision: 4, owner: 5, state: 6, maturity: 6 };
    }
    for (var i = 0; i < row.length; i++) {
      var v = cleanCell(unwrapJsonCell(row[i]));
      if (!v) continue;
      if (/^(aprovado|em\s*trabalho|released|in work|obsoleto|obsolete|frozen|wip)$/i.test(v) ||
          /aprovado|em\s*trabalho/i.test(v)) {
        map.maturity = i;
        map.state = i;
      }
      if (/^\d+[.,]\d+$/.test(v)) map.revision = i;
      if (/physical\s*product|^vpm/i.test(v)) map.type = i;
      if (isJsonBlob(row[i]) || /getpicture|"icon"/i.test(String(row[i]))) map.owner = i;
    }
    if (row.length >= 6 && map.maturity === undefined) {
      map.maturity = row.length - 1;
      map.state = row.length - 1;
    }
    return map;
  }

  function isStatusLabel(name) {
    var t = cleanCell(name).toLowerCase();
    if (!t || t.length > 48) return false;
    if (t.indexOf('|') >= 0 || t.indexOf('3dexperience') >= 0) return false;
    if (STATUS_LABELS.indexOf(t) >= 0) return true;
    return /^(cr[ií]tico|aten[cç][aã]o|alerta)$/i.test(t);
  }

  function cell(row, colMap, key, def) {
    if (colMap[key] === undefined) return def;
    var v = row[colMap[key]];
    return v === undefined || v === null || v === '' ? def : v;
  }

  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    var joined = row.map(function (c) { return normHeader(c); }).join(' ');
    return COLUMN_ALIASES.name.some(function (a) { return joined.indexOf(a) >= 0; }) ||
      COLUMN_ALIASES.level.some(function (a) { return joined.indexOf(a) >= 0; }) ||
      joined.indexOf('nome') >= 0 ||
      joined.indexOf('title') >= 0;
  }

  function leadingDepth(str) {
    var s = String(str || '');
    var tabs = (s.match(/^\t*/) || [''])[0].length;
    if (tabs > 0) return { depth: tabs, text: s.replace(/^\t+/, '').trim() };
    var spaces = (s.match(/^ */) || [''])[0].length;
    return { depth: Math.floor(spaces / 2), text: s.trim() };
  }

  function splitLine(line) {
    if (line.indexOf('\t') >= 0) {
      return line.split('\t').map(function (c) {
        return unwrapJsonCell(c.replace(/^"|"$/g, '').trim());
      });
    }
    if (line.indexOf(';') >= 0) {
      return line.split(';').map(function (c) { return unwrapJsonCell(c.replace(/^"|"$/g, '').trim()); });
    }
    return line.split(',').map(function (c) { return unwrapJsonCell(c.replace(/^"|"$/g, '').trim()); });
  }

  /** Linha Explorer com JSON embutido (ícone do proprietário). */
  function parseExplorerGridLine(line) {
    var raw = cleanCell(line);
    if (!raw) return null;
    if (raw.indexOf('\t') >= 0) {
      var cells = splitLine(raw);
      if (cells.length >= 2) {
        var colMap = { name: 0, title: 1, type: 2, revision: 3, state: 4 };
        if (/^\d+$/.test(String(cells[0]).trim())) {
          colMap = { level: 0, name: 1, title: 2, type: 3, revision: 4, state: 5 };
        } else if (cells.length >= 5) {
          colMap = { name: 0, revision: 1, type: 2, owner: 3, state: 4 };
        }
        try {
          var built = buildItemsFromRows([cells], colMap, true);
          if (built && built[0]) return built[0];
        } catch (e2) { /* legacy */ }
      }
    }
    var nameM = raw.match(/^(Mont\d*|M\d+)\b/i);
    if (!nameM) return null;
    var name = nameM[1];
    var revM = raw.match(/([\d]+[.,][\d]+)/);
    var revision = revM ? revM[1].replace(',', '.') : '';
    var state = /Aprovado/i.test(raw) ? 'Aprovado' : '';
    var st = normalizeImportedState(state, 'Unknown');
    return {
      physicalid: 'IMP_' + name.replace(/\W/g, '_'),
      name: name,
      title: name,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: revision,
      state: st.state,
      maturity: st.maturity,
      approval: st.approval,
      quantity: 1,
      owner: unwrapJsonCell(raw),
      level: /^mont/i.test(name) ? 0 : 1
    };
  }

  function textToRows(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) throw new Error('Nada colado. Copie linhas no Product Explorer (Ctrl+C) e cole de novo.');
    return lines.map(splitLine);
  }

  function normalizeSheetRows(rows) {
    return rows
      .map(function (row) {
        return row.map(function (c) { return cleanCell(c); });
      })
      .filter(function (row) {
        return row.some(function (c) { return c; });
      });
  }

  /** Lista vertical (1 coluna): empresa na linha N, status na N+1. */
  function buildItemsFromSingleColumn(lines) {
    var items = [];
    var start = 0;
    if (lines.length && looksLikeHeader([lines[0]])) start = 1;

    for (var i = start; i < lines.length; i++) {
      var name = cleanCell(lines[i]);
      if (!name) continue;
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      items.push({
        physicalid: 'IMP_' + (items.length + 1) + '_' + name.replace(/\W/g, '_').slice(0, 36),
        name: name,
        title: name,
        type: '',
        displayType: '',
        revision: '',
        state: '',
        maturity: '',
        quantity: 1,
        owner: '',
        organization: '',
        collabSpace: '',
        approval: 'Unknown',
        level: 0,
        parentKey: '',
        rowIndex: items.length + 1
      });
    }
    if (!items.length) {
      throw new Error('Nenhuma linha reconhecida no arquivo.');
    }
    return items;
  }

  function isMostlySingleColumn(rows) {
    if (!rows.length) return false;
    var oneCol = 0;
    rows.forEach(function (row) {
      var filled = row.filter(function (c) { return c; });
      if (filled.length <= 1) oneCol++;
    });
    return oneCol >= rows.length * 0.85;
  }

  function smartParseRows(rows) {
    rows = normalizeSheetRows(rows);
    if (!rows.length) throw new Error('Arquivo vazio.');

    if (isMostlySingleColumn(rows)) {
      var lines = rows.map(function (row) {
        var filled = row.filter(function (c) { return c; });
        return filled[0] || '';
      });
      return buildItemsFromSingleColumn(lines);
    }

    if (looksLikeHeader(rows[0])) return parseRows(rows);
    return parseRowsWithoutHeader(rows);
  }

  /** Colar da grade/árvore do Explorer (TSV, com ou sem cabeçalho). */
  function stripIconNoise(name) {
    var n = cleanCell(name);
    if (!n) return '';
    if (/^physical\s*product$/i.test(n)) return '';
    if (/^vpm/i.test(n) && n.length < 12) return '';
    return n;
  }

  /** Explorer: várias linhas no nível 0 → primeira raiz, demais filhos. */
  function inferAssemblyLevels(items) {
    if (!items || items.length < 2) return items;
    var allZero = items.every(function (it) { return !it.level || it.level === 0; });
    if (!allZero) return items;
    items[0].level = 0;
    for (var i = 1; i < items.length; i++) items[i].level = 1;
    return items;
  }

  function looksLikeExplorerPaste(text) {
    var t = String(text || '').trim();
    if (!t || t.length < 4) return false;
    if (t.indexOf('\t') >= 0) return true;
    if (/mont10|\tm1\t|\tm2\t|^m1\t|^m2\t/i.test(t)) return true;
    if (t.indexOf('Physical Product') >= 0 || t.indexOf('Produto físico') >= 0) return true;
    if (isJsonBlob(t) && t.indexOf('getpicture') >= 0 && t.indexOf('Mont') < 0) return false;
    var lines = t.split(/\r?\n/).filter(function (l) { return l.trim(); });
    return lines.length >= 2;
  }

  function validateImportedItems(items) {
    if (!items || !items.length) return;
    var names = items.map(function (it) {
      return cleanCell(it.name || it.title || '').toLowerCase();
    }).filter(Boolean);
    var hasStructure = items.some(function (it) {
      return !!(it.revision || it.type || it.state || it.maturity);
    });
    var hasProduct = names.some(function (n) {
      if (n.length < 2) return false;
      if (n.indexOf('enderson') >= 0 && n.indexOf('moura') >= 0) return false;
      return true;
    });
    var onlyOwner = names.length > 0 && names.every(function (n) {
      return n.indexOf('enderson') >= 0 || n.indexOf('moura') >= 0 || n.indexOf('propriet') >= 0;
    });
    if (!hasStructure && !hasProduct && (onlyOwner || names.length <= 2)) {
      throw new Error(
        'Parece coluna Proprietário, não a estrutura. No Explorer: Ctrl+A na grade → Ctrl+C → Importar.'
      );
    }
  }

  function parseTextFromGridLines(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return null;
    try {
      var rows = lines.map(splitLine);
      if (rows.length >= 2) {
        var parsed = smartParseRows(rows);
        if (parsed && parsed.length >= 2) {
          validateImportedItems(parsed);
          return inferAssemblyLevels(parsed);
        }
      }
    } catch (e) { /* tenta linha a linha */ }
    var items = [];
    var start = 0;
    if (lines.length && looksLikeHeader([splitLine(lines[0])])) start = 1;
    for (var i = start; i < lines.length; i++) {
      var row = parseExplorerGridLine(lines[i]);
      if (row) items.push(row);
    }
    if (items.length >= 2) {
      validateImportedItems(items);
      return inferAssemblyLevels(items);
    }
    return null;
  }

  function parseText(text) {
    if (!looksLikeExplorerPaste(text)) {
      throw new Error(
        'Clipboard não tem a grade do Explorer. No Explorer: clique na tabela → Ctrl+A → Ctrl+C → cole na caixa azul → Varrer.'
      );
    }
    var gridItems = parseTextFromGridLines(text);
    if (gridItems && gridItems.length) return gridItems;

    var rows = textToRows(text).map(function (row) {
      return row.map(function (c) { return cleanCell(unwrapJsonCell(c)); });
    });
    if (rows.length === 1 && rows[0].length === 1) {
      return buildItemsFromSingleColumn([rows[0][0]]);
    }
    var items = smartParseRows(rows);
    items.forEach(function (it) {
      it.name = stripIconNoise(it.name) || it.name;
      it.title = stripIconNoise(it.title) || it.title;
    });
    items = inferAssemblyLevels(items.filter(function (it) {
      return it.name && it.name.length > 0;
    }));
    items.forEach(function (it) {
      if (!it.maturity && !it.state) {
        var scan = findMaturityInCells([
          it.name, it.title, it.type, it.revision, it.owner, it.state, it.maturity
        ]);
        if (scan) {
          it.state = scan;
          it.maturity = scan;
        }
      } else if (it.state && !it.maturity) {
        it.maturity = it.state;
      } else if (it.maturity && !it.state) {
        it.state = it.maturity;
      }
    });
    validateImportedItems(items);
    return items;
  }

  function parseRowsWithoutHeader(rows) {
    if (rows.length && looksLikeHeader(rows[0])) {
      return parseRows(rows);
    }
    var colMap = guessExplorerColumnMap(rows[0]);
    if (!colMap.name && rows[0].length >= 5) {
      colMap = { name: 0, revision: 1, type: 2, owner: 3, state: 4, maturity: 4 };
    }
    return buildItemsFromRows(rows, colMap, true);
  }

  function parseRows(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Dados insuficientes. Copie pelo menos o cabeçalho e uma linha do Explorer.');
    }
    var headers = rows[0].map(function (c) { return String(c || ''); });
    var colMap = mapColumns(headers);
    if (colMap.name === undefined && colMap.title === undefined) {
      colMap.name = 0;
      colMap.level = colMap.level !== undefined ? colMap.level : (headers.length > 1 ? 1 : undefined);
    }
    return buildItemsFromRows(rows.slice(1), colMap, false);
  }

  function buildItemsFromRows(dataRows, colMap, inferIndent) {
    var items = [];
    var stackLevel = 0;
    for (var r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      if (!row || !row.length) continue;

      var level = 0;
      var name = '';
      if (inferIndent && colMap.level === undefined) {
        var lead = leadingDepth(row[colMap.name] !== undefined ? row[colMap.name] : row[0]);
        level = lead.depth;
        name = lead.text;
        if (colMap.name !== undefined && row[colMap.name] !== undefined) {
          row = row.slice();
          row[colMap.name] = lead.text;
        }
      } else {
        level = parseInt(cell(row, colMap, 'level', ''), 10);
        if (isNaN(level)) level = stackLevel;
      }

      if (!name) {
        name = cleanCell(cell(row, colMap, 'name', '')) || cleanCell(cell(row, colMap, 'title', ''));
      }
      name = stripIconNoise(unwrapJsonCell(name));
      if (!isProductName(name)) continue;
      if (/^physical\s*product$/i.test(name)) continue;
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      stackLevel = level;

      var pid = cell(row, colMap, 'physicalid', '') || ('IMP_' + (r + 1) + '_' + name.replace(/\W/g, '_').slice(0, 40));
      var st = resolveMaturityFields(row, colMap);
      items.push({
        physicalid: String(pid),
        name: String(name),
        title: stripIconNoise(unwrapJsonCell(cell(row, colMap, 'title', name))) || String(name),
        type: cell(row, colMap, 'type', 'VPMReference'),
        displayType: cell(row, colMap, 'type', 'Physical Product'),
        revision: cell(row, colMap, 'revision', ''),
        state: st.state,
        maturity: st.maturity,
        quantity: parseFloat(cell(row, colMap, 'quantity', '1')) || 1,
        owner: unwrapJsonCell(cell(row, colMap, 'owner', '')),
        organization: cell(row, colMap, 'organization', ''),
        collabSpace: cell(row, colMap, 'collabSpace', ''),
        approval: st.approval,
        level: level,
        parentKey: cell(row, colMap, 'parent', ''),
        rowIndex: r + 1
      });
    }
    if (!items.length) {
      throw new Error('Nenhuma linha válida. Selecione a tabela E-BOM no Explorer, Ctrl+C, cole aqui.');
    }
    return items;
  }

  function parseXlsx(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Biblioteca XLSX não carregada.'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'array' });
          var sheet = wb.Sheets[wb.SheetNames[0]];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolve(smartParseRows(rows));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Falha ao ler arquivo.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseCsv(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          resolve(parseText(e.target.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function () { reject(new Error('Falha ao ler arquivo.')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function parseTextAsync(text) {
    return Promise.resolve(parseText(text));
  }

  function parseFile(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
    if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(file);
    return Promise.reject(new Error('Formato não suportado. Cole do Explorer (Ctrl+C) ou use .txt.'));
  }

  return {
    parseFile: parseFile,
    looksLikeExplorerPaste: looksLikeExplorerPaste,
    parseText: parseText,
    parseTextAsync: parseTextAsync,
    parseRows: parseRows
  };
})();

;/* --- assets\js\services\bom-snapshot.js --- */
/**
 * @file services/bom-snapshot.js
 * Snapshot E-BOM (JSON) — coleta offline e leitura no widget GitHub.
 */
var BomSnapshot = (function () {
  'use strict';

  var FORMAT_VERSION = 1;
  var SESSION_KEY = '3dx_bom_snapshot_v1';
  var GITHUB_BASE = 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';

  /** Drone SKA embutido — não depende de fetch no iframe 3DDashboard */
  var BUILTIN_DRONE = {
    version: 1,
    productName: '01_SKA_Drone Assembly_130520206',
    exportedAt: '2026-05-28T18:00:00.000Z',
    rootPhysicalId: 'prd-R1132100929518-01172440',
    items: [
      { level: 0, physicalid: 'prd-R1132100929518-01172440', name: '01_SKA_Drone Assembly_130520206', title: '01_SKA_Drone Assembly_130520206', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_arm_l', name: '01_SKA_ArmAssembly_L', title: '01_SKA_ArmAssembly_L', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_arm_r', name: '01_SKA_ArmAssembly_R', title: '01_SKA_ArmAssembly_R', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_bearing', name: '01_SKA_BearingAssembly', title: '01_SKA_BearingAssembly', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', approval: 'Approved' },
      { level: 1, physicalid: 'grid_drone_frame', name: '01_SKA_FrameAssembly', title: '01_SKA_FrameAssembly', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_gear', name: '01_SKA_GearAssembly', title: '01_SKA_GearAssembly', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_leg_1', name: '01_SKA_LegAssembly_1', title: '01_SKA_LegAssembly_1', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_leg_2', name: '01_SKA_LegAssembly_2', title: '01_SKA_LegAssembly_2', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_leg_3', name: '01_SKA_LegAssembly_3', title: '01_SKA_LegAssembly_3', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_leg_4', name: '01_SKA_LegAssembly_4', title: '01_SKA_LegAssembly_4', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' },
      { level: 1, physicalid: 'grid_drone_impeller', name: '01_SKA_ImpellerAssembly', title: '01_SKA_ImpellerAssembly', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Em Trabalho', maturity: 'Em Trabalho', approval: 'Unknown' }
    ]
  };

  /** Mont10 embutido — funciona se fetch ao GitHub falhar no iframe 3DDashboard */
  var BUILTIN_MONT10 = {
    version: 1,
    productName: 'Mont10',
    exportedAt: '2026-05-28T12:00:00.000Z',
    rootPhysicalId: 'mont10_root',
    items: [
      { level: 0, physicalid: 'mont10_root', name: 'Mont10', title: 'Mont10', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' },
      { level: 1, physicalid: 'mont10_m1', name: 'M1', title: 'M1', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' },
      { level: 1, physicalid: 'mont10_m2', name: 'M2', title: 'M2', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' }
    ]
  };

  function resolveUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    var p = String(pathOrUrl).trim();
    if (/^https?:\/\//i.test(p)) return p;
    var base = GITHUB_BASE;
    try {
      if (typeof location !== 'undefined' && location.hostname.indexOf('github.io') >= 0) {
        var dir = location.pathname.replace(/\/[^/]*$/, '/');
        base = location.origin + dir;
      }
    } catch (e) { /* */ }
    return base + p.replace(/^\//, '');
  }

  function getParamUrl() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var raw = q.snapshot || q.snap || q.data || '';
    return raw ? resolveUrl(raw) : null;
  }

  function normalizePayload(data) {
    if (!data) return null;
    if (Array.isArray(data)) {
      return { version: FORMAT_VERSION, productName: 'E-BOM', items: data };
    }
    if (data.items && Array.isArray(data.items)) {
      return {
        version: data.version || FORMAT_VERSION,
        productName: data.productName || data.name || data.title || 'E-BOM',
        rootPhysicalId: data.rootPhysicalId || null,
        exportedAt: data.exportAt || data.exportedAt || null,
        items: data.items
      };
    }
    return null;
  }

  function itemsFromPayload(payload) {
    var norm = normalizePayload(payload);
    if (!norm || !norm.items.length) return null;
    return norm.items.map(function (it, idx) {
      var level = it.level != null ? parseInt(it.level, 10) : 0;
      if (isNaN(level)) level = 0;
      return {
        level: level,
        physicalid: it.physicalid || it.physicalId || ('snap_' + idx),
        name: it.name || it.title || 'Item ' + idx,
        title: it.title || it.name || '',
        type: it.type || it.displayType || 'Physical Product',
        displayType: it.displayType || it.type || 'Physical Product',
        revision: it.revision || '—',
        state: it.state || it.maturity || '—',
        maturity: it.maturity || it.state || '—',
        owner: it.owner || '—',
        organization: it.organization || '',
        collabSpace: it.collabSpace || '',
        approval: it.approval || 'Unknown',
        quantity: it.quantity || 1
      };
    });
  }

  function metaFromPayload(payload, items) {
    var norm = normalizePayload(payload);
    var root = norm && norm.rootPhysicalId;
    if (!root && items.length) root = items[0].physicalid;
    return {
      productName: (norm && norm.productName) || (items[0] && (items[0].title || items[0].name)) || 'E-BOM',
      rootPhysicalId: root,
      itemCount: items.length,
      exportedAt: norm && norm.exportedAt
    };
  }

  function buildFromImported(items, productName) {
    return {
      version: FORMAT_VERSION,
      productName: productName || 'E-BOM',
      exportedAt: new Date().toISOString(),
      rootPhysicalId: items.length ? items[0].physicalid : null,
      items: items
    };
  }

  function saveSession(payload) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) { /* */ }
  }

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Snapshot HTTP ' + r.status + ' — ' + url);
      return r.json();
    });
  }

  function applyPayload(payload) {
    var items = itemsFromPayload(payload);
    if (!items || !items.length) {
      return Promise.reject(new Error('Snapshot vazio ou formato inválido'));
    }
    var meta = metaFromPayload(payload, items);
    return BomService.loadFromImportedItems(items).then(function () {
      saveSession(normalizePayload(payload));
      return meta;
    });
  }

  function getBuiltinPayload() {
    try {
      if (typeof global !== 'undefined' && global.__3DX_BUILTIN_SNAPSHOT__) {
        return normalizePayload(global.__3DX_BUILTIN_SNAPSHOT__);
      }
    } catch (e) { /* */ }
    return BUILTIN_MONT10;
  }

  function applyBuiltinMont10() {
    return applyPayload(getBuiltinPayload());
  }

  function getPilotPayloadForTerm(term) {
    var t = String(term || '').toLowerCase();
    if (!t) return null;
    if (/mont10/i.test(t)) return normalizePayload(BUILTIN_MONT10);
    if (/01_ska_drone|130520206|130520208/i.test(t)) return normalizePayload(BUILTIN_DRONE);
    return null;
  }

  function applyBuiltinDroneAssembly() {
    return applyPayload(normalizePayload(BUILTIN_DRONE));
  }

  function isMont10SnapshotUrl(url) {
    if (!url) return true;
    return /mont10/i.test(String(url));
  }

  function fetchAndApply(url) {
    return fetchJson(url).catch(function (err) {
      if (!isMont10SnapshotUrl(url)) throw err;
      return applyBuiltinMont10();
    });
  }

  function downloadJson(payload, filename) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'bom-snapshot.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return {
    FORMAT_VERSION: FORMAT_VERSION,
    GITHUB_BASE: GITHUB_BASE,
    resolveUrl: resolveUrl,
    getParamUrl: getParamUrl,
    normalizePayload: normalizePayload,
    itemsFromPayload: itemsFromPayload,
    buildFromImported: buildFromImported,
    saveSession: saveSession,
    loadSession: loadSession,
    fetchJson: fetchJson,
    applyPayload: applyPayload,
    fetchAndApply: fetchAndApply,
    applyBuiltinMont10: applyBuiltinMont10,
    applyBuiltinDroneAssembly: applyBuiltinDroneAssembly,
    getPilotPayloadForTerm: getPilotPayloadForTerm,
    BUILTIN_MONT10: BUILTIN_MONT10,
    BUILTIN_DRONE: BUILTIN_DRONE,
    downloadJson: downloadJson
  };
})();

;/* --- assets\js\services\explorer-scanner.js --- */
/**
 * @file services/explorer-scanner.js
 * Varredura E-BOM via API ENOVIA (raiz dinâmica, pai/filho). Cola = fallback opcional.
 */
var ExplorerScanner = (function () {
  'use strict';

  var SESSION_ROOT_NAME = 'bom_last_root_name';

  function canUseWafApi() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    return false;
  }

  function isTrustedDashboard() {
    try {
      if (window.__3DX_TRUSTED_WIDGET__) return true;
      if (typeof widget !== 'undefined' && widget) return true;
    } catch (e) { /* */ }
    return APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API;
  }

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function isValidId(id) {
    id = normalizeId(id);
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 8;
  }

  function isPrdCloudId(id) {
    return /^prd-R\d{10,}-/i.test(normalizeId(id));
  }

  function isHexLegacyId(id) {
    return /^[0-9A-Fa-f]{16,}$/.test(normalizeId(id));
  }

  function resolveCloudRoot(term, sel) {
    if (term) {
      var regHit = resolveFromStructureRegistry(term);
      if (regHit) return regHit;
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.resolveFromExplorerCatalog) {
        var catHit = ProductExplorerBridge.resolveFromExplorerCatalog(term);
        if (catHit) return catHit;
      }
    }
    if (sel && isPrdCloudId(sel.physicalid)) return sel;
    if (APP_CONFIG.CLOUD_PHYSICAL_ONLY && sel && isHexLegacyId(sel.physicalid)) return null;
    return sel && isValidId(sel.physicalid) ? sel : null;
  }

  function clearBadSelection() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    var sel = ProductExplorerBridge.getSelection();
    if (ProductExplorerBridge.isBadDashboardSelection && ProductExplorerBridge.isBadDashboardSelection(sel)) {
      ProductExplorerBridge.clearSelection();
    }
  }

  function getSelection() {
    if (typeof ProductExplorerBridge === 'undefined') return null;
    ProductExplorerBridge.pollSelection();
    var sel = ProductExplorerBridge.getSelection();
    if (sel && ProductExplorerBridge.isBadDashboardSelection && ProductExplorerBridge.isBadDashboardSelection(sel)) {
      ProductExplorerBridge.clearSelection();
      sel = null;
    }
    if (sel && isValidId(sel.physicalid)) return sel;
    var fromHash = ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
    if (fromHash && isValidId(fromHash.physicalid)) return fromHash;
    return null;
  }

  function resolveFromUrlQuery() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var id = normalizeId(q.physicalid || APP_CONFIG.URL_PHYSICAL_ID || '');
    if (!id || !isValidId(id)) return null;
    var name = q.displayName || q.name || q.structure || q.rootName || getLabelStructureName() || id;
    return {
      physicalid: id,
      type: q.type || 'VPMReference',
      name: name,
      displayName: name,
      displayType: 'Physical Product',
      source: 'url-query'
    };
  }

  function readManualPhysicalId() {
    var el = document.getElementById('explorerObjectId');
    var id = normalizeId(el && el.value ? el.value : '');
    if (!isValidId(id)) return null;
    var nameEl = document.getElementById('explorerObjectName');
    var label = nameEl && nameEl.value ? String(nameEl.value).trim() : id;
    return {
      physicalid: id,
      type: 'VPMReference',
      name: label,
      displayName: label,
      displayType: 'Physical Product',
      source: 'manual-id'
    };
  }

  function getLabelStructureName() {
    var el = document.getElementById('selectionLabel');
    var t = el && el.textContent ? String(el.textContent).trim() : '';
    if (!t || t === '-') return null;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.isBadDashboardSelection) {
      if (ProductExplorerBridge.isBadDashboardSelection({ name: t, displayName: t })) return null;
    }
    return t;
  }

  function getExplorerRootSearchTerm() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.structure) return String(q.structure).trim();
    if (q.rootName) return String(q.rootName).trim();
    if (q.name && !isValidId(q.name)) return String(q.name).trim();
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      var hint = ProductExplorerBridge.getStructureNameHint();
      if (hint) return hint;
    }
    var fromLabel = getLabelStructureName();
    if (fromLabel) return fromLabel;
    var nameEl = document.getElementById('explorerObjectName');
    if (nameEl && nameEl.value && String(nameEl.value).trim()) {
      return String(nameEl.value).trim();
    }
    try {
      var last = sessionStorage.getItem(SESSION_ROOT_NAME);
      if (last) return last;
    } catch (e) { /* */ }
    return null;
  }

  function waitForSelection(maxAttempts, intervalMs) {
    maxAttempts = maxAttempts || 20;
    intervalMs = intervalMs || 400;
    return new Promise(function (resolve) {
      var n = 0;
      function tick() {
        if (typeof ProductExplorerBridge !== 'undefined') {
          if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
          if (ProductExplorerBridge.pollSelection) ProductExplorerBridge.pollSelection();
        }
        if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
          PlatformBridge.requestExplorerStructure();
        }
        var term = getExplorerRootSearchTerm();
        if (term) {
          var regHit = resolveFromStructureRegistry(term);
          if (regHit) return resolve(regHit);
        }
        var sel = getSelection();
        if (sel) return resolve(sel);
        n++;
        if (n >= maxAttempts) return resolve(null);
        window.setTimeout(tick, intervalMs);
      }
      tick();
    });
  }

  function resolveSingleRegistryStructure() {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var keys = Object.keys(reg).filter(function (k) {
      return reg[k] && String(reg[k]).trim();
    });
    if (keys.length !== 1) return null;
    return resolveFromStructureRegistry(keys[0]);
  }

  function resolveFromStructureRegistry(term) {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term || '').trim();
    if (!key) return null;
    var id = normalizeId(reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()]);
    var matchedKey = key;
    if (!id || !isValidId(id)) {
      var keys = Object.keys(reg);
      var tLow = key.toLowerCase();
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var kLow = k.toLowerCase();
        if (tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
          id = normalizeId(reg[k]);
          matchedKey = k;
          break;
        }
      }
    }
    if (!id || !isValidId(id)) return null;
    if (/^prd-/i.test(matchedKey)) id = matchedKey;
    return {
      physicalid: id,
      type: 'VPMReference',
      name: matchedKey,
      displayName: key,
      displayType: 'Physical Product',
      source: 'structure-registry'
    };
  }

  function pickSearchHit(term, hits) {
    if (!hits || !hits.length) return null;
    var t = String(term || '').toLowerCase();
    var exact = hits.filter(function (h) {
      var n = (h.name || h.displayName || '').toLowerCase();
      return n === t || n.indexOf(t) === 0;
    });
    return exact.length ? exact[0] : hits[0];
  }

  function resolveSelectionBySearch(term) {
    if (!term || !canUseWafApi()) return Promise.resolve(null);
    if (typeof SearchApi === 'undefined' || typeof ProductSearchService === 'undefined') {
      return Promise.resolve(null);
    }
    return ensureSpaceApi().then(function () {
      var space =
        (typeof PlatformBridge !== 'undefined' && PlatformBridge.getSpaceUrl && PlatformBridge.getSpaceUrl()) ||
        null;
      if (!space && typeof CompassServices !== 'undefined') {
        if (CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
          space = CompassServices.ifweSpaceUrl();
        } else if (CompassServices.getVerifiedSpaceUrl) {
          space = CompassServices.getVerifiedSpaceUrl();
        }
      }
      if (!space && APP_CONFIG.TENANT_DEFAULTS) {
        var host =
          typeof CompassServices !== 'undefined' &&
          CompassServices.isDashboardOnIfwe &&
          CompassServices.isDashboardOnIfwe()
            ? APP_CONFIG.TENANT_DEFAULTS.platformHost
            : APP_CONFIG.TENANT_DEFAULTS.spaceHost;
        if (host) space = 'https://' + host + '/enovia';
      }
      if (!space) return null;
      SearchApi.init(space);
      var tries = [term];
      if (term.indexOf('*') < 0) tries.push('*' + term + '*');
      function tryTerm(idx) {
        if (idx >= tries.length) return Promise.resolve([]);
        return ProductSearchService.search(tries[idx], { top: 40 }).then(function (hits) {
          if (hits && hits.length) return hits;
          return tryTerm(idx + 1);
        });
      }
      return tryTerm(0).then(function (hits) {
        var hit = pickSearchHit(term, hits);
        if (!hit || !isValidId(hit.physicalid)) return null;
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection(hit, { silent: true });
        }
        return hit;
      });
    }).catch(function (err) {
      console.warn('[ExplorerScanner] busca 3DSpace:', err && err.message ? err.message : err);
      return null;
    });
  }

  /**
   * Raiz dinâmica: seleção/hash → ID manual → busca por nome (query/sessão/campo).
   * Mont10 só entra se vier do Explorer/query — não hardcode.
   */
  function resolveSelectionFast() {
    clearBadSelection();
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      ProductExplorerBridge.pollStructureHint();
      ProductExplorerBridge.pollSelection();
    }
    var term = getExplorerRootSearchTerm();
    var cloudHit = resolveCloudRoot(term, getSelection());
    if (cloudHit) {
      if (typeof ProductExplorerBridge !== 'undefined') {
        ProductExplorerBridge.setSelection(cloudHit, { silent: true });
      }
      return Promise.resolve(cloudHit);
    }
    return waitForSelection(4, 250);
  }

  function resolveSelection() {
    clearBadSelection();
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestDashboardSelection) {
      PlatformBridge.requestDashboardSelection();
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
      PlatformBridge.requestExplorerStructure();
    }

    return waitForSelection(12, 400).then(function (sel) {
      var termFirst = getExplorerRootSearchTerm();
      if (termFirst) {
        var regFirst = resolveFromStructureRegistry(termFirst);
        if (regFirst) return regFirst;
      }
      if (sel) {
        var termAlign = getExplorerRootSearchTerm();
        if (termAlign) {
          var regAlign = resolveFromStructureRegistry(termAlign);
          if (regAlign) return regAlign;
        }
        return sel;
      }

      var manual = readManualPhysicalId();
      if (manual) return manual;

      var fromUrl = resolveFromUrlQuery();
      if (fromUrl) {
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection(fromUrl, { silent: true });
        }
        return fromUrl;
      }

      var term = getExplorerRootSearchTerm();
      if (term) {
        var regHit = resolveFromStructureRegistry(term);
        if (regHit) return regHit;
        return resolveSelectionBySearch(term).then(function (found) {
          if (found) return found;
          return Promise.reject(new Error(
            'Não encontrei "' + term + '" no 3DSpace. ' +
            'Cole o ID físico em Modo avançado ou use ?physicalid=prd-... na URL do Additional App.'
          ));
        });
      }

      if (canUseWafApi()) {
        var singleReg = resolveSingleRegistryStructure();
        if (singleReg) return singleReg;
      }

      return Promise.reject(new Error(
        'Sem seleção do Explorer. Clique na raiz Mont10 (1ª linha) → Varrer, ou URL: ?physicalid=prd-R1132100929518-00511496'
      ));
    });
  }

  function promiseTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error(label || 'Timeout na conexão API'));
        }, ms || 12000);
      })
    ]);
  }

  function ensureSpaceApi() {
    var chain = PlatformContext.init();
    if (typeof CompassServices !== 'undefined' && CompassServices.fastConnectIfwe) {
      var fast = CompassServices.fastConnectIfwe();
      if (fast && APP_CONFIG.SKIP_SPACE_PROBE) {
        chain = chain.then(function () {
          try {
            EnoviaApi.init(fast);
            if (typeof SearchApi !== 'undefined') SearchApi.init(fast);
          } catch (eFast) { /* */ }
          return fast;
        });
        return chain;
      }
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.ensureWorkingSpaceUrl) {
      chain = chain.then(function () {
        return promiseTimeout(
          CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId),
          APP_CONFIG.SCAN_CONNECT_TIMEOUT_MS || 12000,
          'Conexão API demorou — tente Varrer de novo.'
        );
      });
    } else {
      var space =
        (typeof PlatformBridge !== 'undefined' && PlatformBridge.getSpaceUrl && PlatformBridge.getSpaceUrl()) ||
        (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost
          ? 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia'
          : null);
      if (!space) return Promise.reject(new Error('URL 3DSpace não configurada'));
      chain = chain.then(function () { return space; });
    }
    return chain.then(function (space) {
      if (!space && typeof CompassServices !== 'undefined' && CompassServices.tenantSpaceUrl) {
        space = CompassServices.tenantSpaceUrl();
      }
      if (!space && typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
        space = CompassServices.ifweSpaceUrl();
      }
      if (!space) return Promise.reject(new Error('URL 3DSpace não configurada'));
      try {
        EnoviaApi.init(space);
        if (typeof SearchApi !== 'undefined') SearchApi.init(space);
      } catch (e) { /* */ }
      if (typeof CompassServices !== 'undefined' && CompassServices.fetchCsrfToken) {
        return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
      }
      return null;
    });
  }

  function saveRootName(name) {
    try {
      if (name) sessionStorage.setItem(SESSION_ROOT_NAME, name);
    } catch (e) { /* */ }
  }

  function scanViaApi(sel) {
    var term = getExplorerRootSearchTerm();
    if (term) {
      var regSel = resolveFromStructureRegistry(term);
      if (regSel) sel = regSel;
    }
    var boot =
      typeof WafBootstrap !== 'undefined' && WafBootstrap.ensure
        ? WafBootstrap.ensure()
        : Promise.resolve();
    return boot.then(function () {
      if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
      if (
        APP_CONFIG.SKIP_SPACE_PROBE &&
        typeof CompassServices !== 'undefined' &&
        CompassServices.getVerifiedSpaceUrl &&
        CompassServices.getVerifiedSpaceUrl()
      ) {
        return null;
      }
      return ensureSpaceApi();
    }).then(function () {
      var load = BomService.loadRoot(sel.physicalid);
      return promiseTimeout(load, 28000, 'Timeout ao carregar BOM via API');
    }).then(function () {
      var rootId = BomService.getRootId();
      var rootNode = BomService.getIndex()[rootId];
      var productName =
        (rootNode && (rootNode.title || rootNode.name)) ||
        sel.displayName ||
        sel.name ||
        'E-BOM';
      saveRootName(productName);
      var count = BomService.getNodeCount();
      var max = APP_CONFIG.BOM_MAX_NODES || 50000;
      var msg = 'Varredura concluída: ' + count + ' itens — ' + productName;
      if (count >= max * 0.95) {
        msg += ' (limite de memória; expanda nós na tabela se necessário)';
      }
      return {
        ok: true,
        mode: 'api',
        meta: {
          productName: productName,
          rootPhysicalId: rootId,
          itemCount: count
        },
        message: msg
      };
    });
  }

  function scanViaApiOrSelection() {
    var pick = APP_CONFIG.SKIP_SPACE_PROBE ? resolveSelectionFast : resolveSelection;
    return pick().then(function (sel) {
      if (!canUseWafApi()) {
        return Promise.reject(new Error('WAFData indisponível — abra no 3DDashboard (Additional App).'));
      }
      if (!sel || !isValidId(sel.physicalid)) {
        return Promise.reject(new Error('Nenhuma raiz/seleção com physicalId válido.'));
      }
      return scanViaApi(sel);
    });
  }

  function scanViaText(text, sourceLabel) {
    if (!text || !String(text).trim()) {
      return Promise.reject(new Error('Nenhum dado para varrer'));
    }
    return FileImportService.parseTextAsync(text).then(function (items) {
      if (!items || !items.length) {
        throw new Error('Nenhuma linha reconhecida');
      }
      var name = items[0].title || items[0].name || 'E-BOM';
      items.forEach(function (it) {
        if (it.level === 0) name = it.title || it.name || name;
      });
      var payload = BomSnapshot.buildFromImported(items, name);
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        return {
          ok: true,
          mode: sourceLabel || 'text',
          meta: meta,
          message: 'Varredura (cola): ' + meta.itemCount + ' itens — ' + meta.productName
        };
      });
    });
  }

  function scanViaPasteArea() {
    var area = document.getElementById('pasteArea');
    var text = area && area.value ? area.value.trim() : '';
    if (!text) return Promise.reject(new Error('Caixa de cola vazia'));
    return scanViaText(text, 'cola');
  }

  function withScanTimeout(promise, ms) {
    ms = ms || (APP_CONFIG.SCAN_TIMEOUT_MS || 90000);
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('Varredura demorou mais de ' + Math.round(ms / 1000) + 's (BOM grande?). Tente de novo.'));
        }, ms);
      })
    ]);
  }

  function pasteImportEnabled() {
    return APP_CONFIG.ALLOW_PASTE_FALLBACK === true;
  }

  function pasteFallbackEnabled() {
    if (isTrustedDashboard()) return pasteImportEnabled();
    return APP_CONFIG.ALLOW_PASTE_FALLBACK !== false;
  }

  function readClipboardText() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve('');
    }
    return navigator.clipboard.readText().catch(function () {
      return '';
    });
  }

  function scanViaClipboardOrPaste() {
    if (!pasteImportEnabled()) {
      return Promise.reject(new Error('Importação por cola desativada.'));
    }
    return readClipboardText().then(function (clip) {
      var text = String(clip || '').trim();
      if (!text) {
        var area = document.getElementById('pasteArea');
        text = area && area.value ? String(area.value).trim() : '';
      }
      if (!text) {
        throw new Error(
          'No Explorer: selecione a grade (Ctrl+A) → Ctrl+C → clique Importar Ctrl+C ou cole na caixa abaixo.'
        );
      }
      return scanViaText(text, 'Ctrl+C Explorer');
    });
  }

  function scanViaExplorerGrid() {
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.scrapeExplorerGrid) {
      return Promise.reject(new Error('Iframe do Explorer inacessível — abra a árvore ao lado do widget.'));
    }
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    var term = getExplorerRootSearchTerm();
    var payload = ProductExplorerBridge.scrapeExplorerGrid(term);
    function applyGrid(pl, sourceLabel) {
      if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
        return Promise.reject(new Error('Módulo snapshot indisponível'));
      }
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      return BomSnapshot.applyPayload(pl).then(function (meta) {
        var count = BomService.getNodeCount();
        if (count < 1) count = meta.itemCount || (pl.items && pl.items.length) || 0;
        saveRootName(meta.productName || term);
        return {
          ok: true,
          mode: 'explorer-grid',
          meta: meta,
          message:
            'Varredura (' +
            (sourceLabel || 'árvore Explorer') +
            '): ' +
            count +
            ' itens — ' +
            (meta.productName || term || 'E-BOM')
        };
      });
    }
    if (payload && payload.items && payload.items.length >= 2) {
      return applyGrid(payload, 'árvore Explorer');
    }
    return Promise.reject(
      new Error(
        'Não li a árvore no Explorer (iframe). Expanda os níveis, Ctrl+A na grade → Ctrl+C → Importar Ctrl+C.'
      )
    );
  }

  function scanViaBuiltinLast() {
    if (APP_CONFIG.PILOT_BUILTIN_LAST === false) {
      return Promise.reject(new Error('Sem dados embutidos para esta estrutura.'));
    }
    var term = getExplorerRootSearchTerm();
    var builtin =
      typeof BomSnapshot !== 'undefined' && BomSnapshot.getPilotPayloadForTerm
        ? BomSnapshot.getPilotPayloadForTerm(term)
        : null;
    if (builtin && builtin.items && builtin.items.length >= 2) {
      return BomSnapshot.applyPayload(builtin).then(function (meta) {
        var count = BomService.getNodeCount() || meta.itemCount || builtin.items.length;
        return {
          ok: true,
          mode: 'builtin-last',
          meta: meta,
          message: 'Demo embutido: ' + count + ' itens — ' + (meta.productName || term)
        };
      });
    }
    var fetchPilot =
      ProductExplorerBridge &&
      ProductExplorerBridge.fetchPilotStructurePayload &&
      ProductExplorerBridge.fetchPilotStructurePayload(term);
    return (fetchPilot || Promise.resolve(null)).then(function (pilot) {
      if (pilot && pilot.items && pilot.items.length >= 2) {
        return BomSnapshot.applyPayload(pilot).then(function (meta) {
          return {
            ok: true,
            mode: 'snapshot-file',
            meta: meta,
            message: 'Snapshot: ' + (meta.itemCount || pilot.items.length) + ' itens'
          };
        });
      }
      return Promise.reject(new Error('Nenhuma fonte de dados para "' + (term || 'estrutura') + '".'));
    });
  }

  /**
   * Qualquer projeto: cola/clipboard → grade visível → demo embutido (último).
   */
  function scanViaPilotGeneric() {
    return scanViaExplorerGrid().catch(function () {
      return scanViaClipboardOrPaste().catch(function () {
        return scanViaBuiltinLast();
      });
    });
  }

  function apiScanEnabled() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.api === '1' || q.api === 'true') return true;
    return APP_CONFIG.USE_API_SCAN_FIRST !== false;
  }

  /**
   * 3DDashboard piloto: grade/árvore Explorer primeiro; API só com ?api=1 ou USE_API_SCAN_FIRST.
   */
  function scan() {
    clearBadSelection();
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    }
    var timeout = APP_CONFIG.SCAN_TIMEOUT_MS || 90000;
    var apiChain = scanViaApiOrSelection();

    if (isTrustedDashboard() && APP_CONFIG.PILOT_GRID_FIRST) {
      return withScanTimeout(scanViaPilotGeneric(), timeout);
    }

    if (isTrustedDashboard() && APP_CONFIG.USE_API_SCAN_FIRST !== false) {
      return withScanTimeout(apiChain, timeout).catch(function (apiErr) {
        if (!pasteFallbackEnabled()) throw apiErr;
        return scanViaPasteArea().catch(function () {
          throw apiErr;
        });
      });
    }

    return withScanTimeout(
      apiChain.catch(function () {
        return scanViaPasteArea();
      }),
      timeout
    );
  }

  return {
    scan: scan,
    scanViaExplorerGrid: scanViaExplorerGrid,
    scanViaClipboardOrPaste: scanViaClipboardOrPaste,
    scanViaPilotGeneric: scanViaPilotGeneric,
    ensureSpaceApi: ensureSpaceApi,
    resolveSelection: resolveSelection,
    getSelection: getSelection,
    scanViaApi: scanViaApi
  };
})();

;/* --- assets\js\services\bom-service.js --- */
/**
 * @file services/bom-service.js
 * Carregamento hierárquico E-BOM com lazy loading e paginação.
 */
var BomService = (function () {
  'use strict';

  var index = {};
  var rootId = null;
  var nodeCount = 0;

  function reset() {
    index = {};
    rootId = null;
    nodeCount = 0;
    PhysicalProductService.clearCache();
  }

  function canAddNode() {
    return nodeCount < APP_CONFIG.BOM_MAX_NODES;
  }

  function addNode(attrs, parentId, level, quantity) {
    if (!canAddNode()) return null;
    var id = attrs.physicalid;
    if (index[id]) {
      index[id].quantity = (index[id].quantity || 1) + (quantity || 1);
      index[id].occurrenceCount = (index[id].occurrenceCount || 1) + 1;
      return index[id];
    }
    var node = Object.assign({}, attrs, {
      parentId: parentId,
      level: level,
      quantity: quantity || 1,
      occurrenceCount: 1,
      childrenIds: [],
      expanded: level < APP_CONFIG.BOM_INITIAL_DEPTH,
      loaded: false,
      isAssembly: AttributeService.isAssemblyType(attrs.type)
    });
    node.duplicateKey = (node.name || '') + '|' + (node.revision || '');
    index[id] = node;
    nodeCount++;
    if (parentId && index[parentId]) {
      if (index[parentId].childrenIds.indexOf(id) === -1) {
        index[parentId].childrenIds.push(id);
      }
      index[parentId].isAssembly = true;
    }
    return node;
  }

  function parseInstance(member, parentId, level) {
    var ref = member.reference || member['dseng:EngItem'] || member;
    var attrs = AttributeService.extractFromMember(ref);
    var qty = member.quantity || member['dseng:quantity'] || member.qty || 1;
    attrs.quantity = qty;
    return addNode(attrs, parentId, level, qty);
  }

  function loadChildren(parentId, level) {
    if (!index[parentId]) return Promise.resolve([]);
    if (index[parentId].loaded && APP_CONFIG.DEMO_MODE === false) {
      return Promise.resolve(index[parentId].childrenIds.map(function (id) { return index[id]; }));
    }

    if (APP_CONFIG.DEMO_MODE) {
      return loadDemoChildren(parentId, level);
    }

    var allChildren = [];
    var skip = 0;
    var top = APP_CONFIG.BOM_LAZY_BATCH_SIZE;

    function fetchPage() {
      var fetcher =
        typeof EnoviaApi.getPhysicalProductChildren === 'function'
          ? EnoviaApi.getPhysicalProductChildren.bind(EnoviaApi)
          : EnoviaApi.getEngInstanceChildren.bind(EnoviaApi);
      return fetcher(parentId, skip, top).then(function (res) {
        var members = EnoviaApi.extractMembers(res);
        members.forEach(function (m) {
          var node = parseInstance(m, parentId, level);
          if (node) allChildren.push(node);
        });
        var total = res && res.totalItems ? res.totalItems : members.length;
        skip += members.length;
        if (members.length === top && skip < total && canAddNode()) {
          return fetchPage();
        }
        index[parentId].loaded = true;
        return allChildren;
      });
    }

    return fetchPage().catch(function (err) {
      if (index[parentId]) index[parentId].loaded = true;
      return [];
    });
  }

  function loadTreeRecursive(rootPhysicalId, maxDepth, currentDepth) {
    currentDepth = currentDepth || 0;
    if (currentDepth > maxDepth || !canAddNode()) return Promise.resolve(index);

    return loadChildren(rootPhysicalId, currentDepth).then(function (children) {
      var promises = children.map(function (child) {
        if (child.isAssembly && currentDepth < maxDepth) {
          return loadTreeRecursive(child.physicalid, maxDepth, currentDepth + 1);
        }
        return Promise.resolve();
      });
      return Promise.all(promises).then(function () { return index; });
    });
  }

  /** Modo cross-origin: só raiz com dados da seleção (sem API). */
  /**
   * Monta BOM a partir de linhas importadas (Excel/CSV Product Explorer).
   */
  function loadFromImportedItems(items) {
    reset();
    if (!items || !items.length) return Promise.resolve(index);

    var stack = [];
    items.forEach(function (item, idx) {
      var level = item.level || 0;
      while (stack.length > level) stack.pop();
      var parentId = stack.length ? stack[stack.length - 1] : null;

      var attrs = {
        physicalid: item.physicalid,
        name: item.name,
        title: item.title || item.name,
        type: item.type,
        displayType: item.displayType || 'Physical Product',
        revision: item.revision,
        state: item.state,
        maturity: item.maturity || item.state,
        owner: item.owner,
        organization: item.organization,
        collabSpace: item.collabSpace,
        approval: item.approval || 'Unknown',
        hasPhysicalProduct: true
      };

      var node = addNode(attrs, parentId, level, item.quantity);
      if (node) {
        node.loaded = true;
        node.expanded = true;
        stack[level] = node.physicalid;
      }
      if (idx === 0 || level === 0) rootId = item.physicalid;
    });

    if (!rootId && items[0]) rootId = items[0].physicalid;
    return Promise.resolve(index);
  }

  /** Produto arrastado/colido (JSON 3DXContent) — raiz real + preview filhos no GitHub. */
  function loadFrom3DXProduct(sel) {
    return loadRootFromSelection({
      physicalid: sel.physicalid,
      name: sel.displayName || sel.name || sel.physicalid,
      title: sel.displayName || sel.name || sel.physicalid,
      displayType: sel.displayType || 'Physical Product',
      type: sel.type || 'VPMReference'
    }).then(function () {
      if (APP_CONFIG.CROSS_ORIGIN_WIDGET || APP_CONFIG.DEMO_MODE) {
        if (index[rootId]) {
          index[rootId].name = sel.displayName || index[rootId].name;
          index[rootId].title = sel.displayName || index[rootId].title;
          index[rootId].displayType = sel.displayType || index[rootId].displayType;
          index[rootId].isAssembly = true;
          index[rootId].expanded = true;
        }
        buildDemoSubtree(rootId, 1, 4);
        return PhysicalProductService.enrichNodes(index);
      }
      return loadRoot(sel.physicalid);
    });
  }

  function loadRootFromSelection(attrs) {
    reset();
    rootId = attrs.physicalid;
    var node = addNode({
      physicalid: attrs.physicalid,
      name: attrs.name,
      title: attrs.title || attrs.name,
      displayType: attrs.displayType || 'Physical Product',
      type: attrs.type || 'VPMReference',
      state: attrs.state || '—',
      revision: attrs.revision || '—',
      owner: attrs.owner || '—',
      approval: attrs.approval || '—'
    }, null, 0, 1);
    if (node) {
      node.hasPhysicalProduct = true;
      node.isAssembly = true;
      node.loaded = true;
      node.expanded = false;
    }
    return Promise.resolve(index);
  }

  function normalizePid(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return id;
  }

  function loadRoot(physicalId) {
    var blockApi =
      typeof window !== 'undefined' &&
      window.__3DX_BLOCK_API_LOAD__;
    if (
      APP_CONFIG.PILOT_GRID_FIRST &&
      blockApi &&
      nodeCount > 1
    ) {
      return Promise.resolve(index);
    }
    if (APP_CONFIG.PILOT_GRID_FIRST && blockApi) {
      return Promise.reject(
        new Error('Varredura em curso — API pausada (' + (APP_CONFIG.BUILD || '') + ')')
      );
    }
    physicalId = normalizePid(physicalId);
    reset();
    rootId = physicalId;

    if (APP_CONFIG.DEMO_MODE) {
      return loadDemoTree(physicalId);
    }

    return EnoviaApi.getProductRoot(physicalId, null)
      .then(function (res) {
        var member = res.member || res;
        var attrs = AttributeService.extractFromMember(Array.isArray(member) ? member[0] : member);
        if (!attrs.physicalid) attrs.physicalid = physicalId;
        attrs.hasPhysicalProduct = true;
        attrs.displayType = attrs.displayType || 'Physical Product';
        addNode(attrs, null, 0, 1);
        index[attrs.physicalid].loaded = false;
        var bomParentId = attrs.physicalid || physicalId;
        var depth =
          APP_CONFIG.PILOT_API_TREE_DEPTH ||
          APP_CONFIG.BOM_FAST_DEPTH ||
          APP_CONFIG.BOM_INITIAL_DEPTH;
        return loadTreeRecursive(bomParentId, depth, 1);
      });
  }

  function expandNode(physicalId) {
    var node = index[physicalId];
    if (!node) return Promise.resolve([]);
    if (node.loaded) {
      node.expanded = true;
      return Promise.resolve(node.childrenIds.map(function (id) { return index[id]; }));
    }
    return loadChildren(physicalId, node.level + 1).then(function (children) {
      node.expanded = true;
      node.loaded = true;
      return children;
    });
  }

  function collapseNode(physicalId) {
    if (index[physicalId]) index[physicalId].expanded = false;
  }

  /* ---------- Demo data ---------- */
  function loadDemoTree(rootPhysicalId) {
    var isDrone = rootPhysicalId === '132FB3CE26D70E006A18D1870000316D';
    var root = addNode({
      physicalid: rootPhysicalId,
      name: isDrone ? '01_SKA_Drone Assembly_130520206' : 'Root Assembly',
      title: 'Produto Principal',
      type: 'VPMReference',
      revision: 'A',
      state: 'RELEASED',
      maturity: 'Released',
      owner: 'eng.lead',
      organization: 'R&D',
      collabSpace: 'Default',
      approval: 'Approved'
    }, null, 0, 1);
    root.isAssembly = true;
    buildDemoSubtree(rootPhysicalId, 1, 4);
    return PhysicalProductService.enrichNodes(index).then(function () { return index; });
  }

  function buildDemoSubtree(parentId, level, breadth) {
    if (level > 5 || !canAddNode()) return;
    for (var i = 0; i < breadth; i++) {
      var id = parentId + '_L' + level + '_N' + i;
      var states = ['RELEASED', 'IN_WORK', 'FROZEN', 'OBSOLETE'];
      var st = states[i % states.length];
      var isAsm = level < 3 && i % 2 === 0;
      addNode({
        physicalid: id,
        name: (isAsm ? 'ASM-' : 'PRT-') + level + '-' + i,
        title: 'Item ' + level + '.' + i,
        type: isAsm ? 'VPMReference' : 'VPMPart',
        revision: String.fromCharCode(65 + (i % 3)),
        state: st,
        maturity: st,
        owner: 'user' + (i % 5),
        organization: 'Manufacturing',
        collabSpace: 'Engineering',
        approval: i % 4 === 0 ? 'Pending' : 'Approved',
        engineeringState: st
      }, parentId, level, (i % 3) + 1);
      index[id].loaded = true;
      index[id].isAssembly = isAsm;
      if (isAsm) buildDemoSubtree(id, level + 1, Math.max(2, breadth - 1));
    }
    if (index[parentId]) index[parentId].loaded = true;
  }

  function loadDemoChildren(parentId, level) {
    if (index[parentId] && index[parentId].childrenIds.length) {
      index[parentId].loaded = true;
      return Promise.resolve(index[parentId].childrenIds.map(function (id) { return index[id]; }));
    }
    buildDemoSubtree(parentId, level, 3);
    return Promise.resolve(index[parentId].childrenIds.map(function (id) { return index[id]; }));
  }

  return {
    reset: reset,
    loadRoot: loadRoot,
    loadRootFromSelection: loadRootFromSelection,
    loadFrom3DXProduct: loadFrom3DXProduct,
    loadFromImportedItems: loadFromImportedItems,
    expandNode: expandNode,
    collapseNode: collapseNode,
    getIndex: function () { return index; },
    getRootId: function () { return rootId; },
    getNodeCount: function () { return nodeCount; },
    getNode: function (id) { return index[id]; }
  };
})();

;/* --- assets\js\processing\bom-normalizer.js --- */
/**
 * @file processing/bom-normalizer.js
 * Modelo plano e hierárquico para UI e exportação.
 */
var BomNormalizer = (function () {
  'use strict';

  function toFlatList(index, rootId) {
    if (APP_CONFIG.IMPORT_MODE || APP_CONFIG.EXPLORER_ONLY) {
      return Object.keys(index).map(function (id) { return index[id]; });
    }
    var list = [];
    function walk(id) {
      var n = index[id];
      if (!n) return;
      list.push(n);
      if (n.expanded) {
        n.childrenIds.forEach(walk);
      }
    }
    if (rootId && index[rootId]) walk(rootId);
    else Object.keys(index).forEach(function (id) { list.push(index[id]); });
    return list;
  }

  function toTreeNode(index, id) {
    var n = index[id];
    if (!n) return null;
    return {
      id: n.physicalid,
      label: (n.name || n.title || n.physicalid) + ' [' + (n.revision || '-') + ']',
      level: n.level,
      expanded: n.expanded,
      hasChildren: n.childrenIds.length > 0 || n.isAssembly,
      loaded: n.loaded,
      data: n,
      children: n.expanded
        ? n.childrenIds.map(function (cid) { return toTreeNode(index, cid); }).filter(Boolean)
        : []
    };
  }

  function buildTree(index, rootId) {
    return toTreeNode(index, rootId);
  }

  return {
    toFlatList: toFlatList,
    buildTree: buildTree,
    toTreeNode: toTreeNode
  };
})();

;/* --- assets\js\processing\metrics-engine.js --- */
/**
 * @file processing/metrics-engine.js
 * KPIs e agregações gerenciais/técnicas.
 */
var MetricsEngine = (function () {
  'use strict';

  function compute(index) {
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    var byMaturity = { released: 0, in_work: 0, obsolete: 0, other: 0 };
    var byType = {};
    var byRevision = {};
    var byApproval = { approved: 0, pending: 0, other: 0 };
    var byOwner = {};
    var assemblies = 0;
    var parts = 0;
    var totalQty = 0;
    var withPP = 0;
    var withoutPP = 0;
    var maxLevel = 0;

    nodes.forEach(function (n) {
      var mat = AttributeService.classifyMaturity(n.maturity || n.state);
      byMaturity[mat] = (byMaturity[mat] || 0) + 1;

      var t = n.type || 'Unknown';
      byType[t] = (byType[t] || 0) + 1;

      var rev = n.revision || 'N/A';
      byRevision[rev] = (byRevision[rev] || 0) + 1;

      var appr = String(n.approval || '').toLowerCase();
      var matLabel = String(n.maturity || n.state || '').toLowerCase();
      if (
        (appr.indexOf('approv') >= 0 && appr.indexOf('pending') < 0) ||
        matLabel.indexOf('aprov') >= 0 ||
        matLabel === 'released' ||
        matLabel === 'frozen'
      ) {
        byApproval.approved++;
      } else if (appr.indexOf('pending') >= 0) byApproval.pending++;
      else byApproval.other++;

      if (n.isAssembly) assemblies++;
      else parts++;

      totalQty += n.quantity || 1;
      if (n.hasPhysicalProduct) withPP++;
      else withoutPP++;

      if (n.level > maxLevel) maxLevel = n.level;

      var ownerKey = ownerLabel(n.owner);
      byOwner[ownerKey] = (byOwner[ownerKey] || 0) + 1;
    });

    return {
      totalItems: nodes.length,
      totalAssemblies: assemblies,
      totalParts: parts,
      totalQuantity: totalQty,
      maxLevel: maxLevel,
      byMaturity: byMaturity,
      byType: byType,
      byRevision: byRevision,
      byApproval: byApproval,
      byOwner: byOwner,
      physicalProducts: withPP,
      withoutPhysicalProduct: withoutPP,
      released: byMaturity.released,
      inWork: byMaturity.in_work,
      obsolete: byMaturity.obsolete
    };
  }

  function ownerLabel(raw) {
    var o = String(raw || '').trim();
    if (!o) return 'Sem proprietário';
    if (o.charAt(0) === '{') {
      try {
        var j = JSON.parse(o);
        o = j.label || j.name || j.displayName || o;
      } catch (e) {
        var m = o.match(/"label"\s*:\s*"([^"]+)"/i);
        if (m) o = m[1];
      }
    }
    if (o.length > 36) o = o.slice(0, 36) + '…';
    return o;
  }

  function chartDatasets(metrics) {
    var owners = metrics.byOwner || {};
    var ownerLabels = Object.keys(owners).sort(function (a, b) {
      return owners[b] - owners[a];
    });
    return {
      owners: {
        labels: ownerLabels.slice(0, 12),
        values: ownerLabels.slice(0, 12).map(function (k) { return owners[k]; })
      },
      maturity: {
        labels: ['Bom (Aprovado)', 'Moderado (Em trabalho)', 'Ruim (Obsoleto)', 'Outros'],
        values: [
          metrics.byMaturity.released,
          metrics.byMaturity.in_work,
          metrics.byMaturity.obsolete,
          metrics.byMaturity.other
        ]
      },
      type: {
        labels: Object.keys(metrics.byType),
        values: Object.values(metrics.byType)
      },
      revision: {
        labels: Object.keys(metrics.byRevision),
        values: Object.values(metrics.byRevision)
      },
      approval: {
        labels: ['Approved', 'Pending', 'Other'],
        values: [
          metrics.byApproval.approved,
          metrics.byApproval.pending,
          metrics.byApproval.other
        ]
      }
    };
  }

  return {
    compute: compute,
    chartDatasets: chartDatasets,
    ownerLabel: ownerLabel
  };
})();

;/* --- assets\js\processing\anomaly-detector.js --- */
/**
 * @file processing/anomaly-detector.js
 * Detecção de estruturas incompletas, sem aprovação e inconsistentes.
 */
var AnomalyDetector = (function () {
  'use strict';

  function detect(index) {
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    var duplicateMap = {};
    var issues = [];

    nodes.forEach(function (n) {
      var key = n.duplicateKey || n.name;
      if (!duplicateMap[key]) duplicateMap[key] = [];
      duplicateMap[key].push(n.physicalid);
    });

    Object.keys(duplicateMap).forEach(function (key) {
      if (duplicateMap[key].length > 1) {
        issues.push({
          type: 'duplicate',
          severity: 'warning',
          message: 'Item duplicado na estrutura: ' + key,
          physicalids: duplicateMap[key]
        });
      }
    });

    nodes.forEach(function (n) {
      if (n.isAssembly && n.loaded && n.childrenIds.length === 0) {
        issues.push({
          type: 'incomplete',
          severity: 'info',
          message: 'Assembly sem filhos: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      var appr = String(n.approval || '').toLowerCase();
      if (appr.indexOf('pending') >= 0 || appr === 'unknown' || appr === '') {
        issues.push({
          type: 'no_approval',
          severity: 'warning',
          message: 'Sem aprovação: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      if (!n.hasPhysicalProduct && !n.isAssembly) {
        issues.push({
          type: 'no_physical_product',
          severity: 'warning',
          message: 'Sem Physical Product: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      var mat = AttributeService.classifyMaturity(n.state);
      if (mat === 'obsolete' && n.childrenIds.length > 0) {
        issues.push({
          type: 'inconsistent',
          severity: 'error',
          message: 'Item obsoleto com filhos ativos: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }
    });

    var summary = {
      duplicates: issues.filter(function (i) { return i.type === 'duplicate'; }).length,
      incomplete: issues.filter(function (i) { return i.type === 'incomplete'; }).length,
      noApproval: issues.filter(function (i) { return i.type === 'no_approval'; }).length,
      noPhysicalProduct: issues.filter(function (i) { return i.type === 'no_physical_product'; }).length,
      inconsistent: issues.filter(function (i) { return i.type === 'inconsistent'; }).length,
      total: issues.length
    };

    return { issues: issues, summary: summary };
  }

  return { detect: detect };
})();

;/* --- assets\js\ui\kpi-cards.js --- */
/**
 * @file ui/kpi-cards.js
 * Marcadores estatísticos (formato cards da referência).
 */
var KpiCards = (function () {
  'use strict';

  var container;
  var rulesEl;

  function init(selector) {
    container = (typeof qs3dx === 'function' ? qs3dx(selector) : document.querySelector(selector));
    rulesEl = document.getElementById('bomRulesPanel');
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 10) / 10;
  }

  function renderRules(metrics, anomalies) {
    var rules = (APP_CONFIG && APP_CONFIG.MATURITY_RULES_STATIC) || [];
    var list = rules.map(function (r) {
      return (
        '<li class="rule-' + r.level + '"><strong>' + escapeHtml(r.label) + ':</strong> ' +
        escapeHtml(r.states) + '</li>'
      );
    }).join('');
    return (
      '<div class="bom-rules-panel">' +
      '<ul class="bom-rules-list">' + list + '</ul>' +
      '<p class="bom-rules-stats">' +
      formatNum(metrics.totalItems) + ' peças · ' +
      formatNum(metrics.totalAssemblies) + ' assemblies · prof. ' + formatNum(metrics.maxLevel) +
      '</p></div>'
    );
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Cards no estilo da referência: rótulo em cima, número grande colorido. */
  function renderStatMarkers(metrics, anomalies) {
    var total = metrics.totalItems || 0;
    var goodPct = pct(metrics.released, total);
    var pending = (metrics.byApproval && metrics.byApproval.pending) || 0;
    var atRisk = (metrics.inWork || 0) + (metrics.obsolete || 0) +
      ((metrics.byMaturity && metrics.byMaturity.other) || 0);

    var markers = [
      { tone: 'blue', label: 'Total de Peças', value: metrics.totalItems },
      { tone: 'green', label: 'Média Saúde (Bom %)', value: goodPct, suffix: '%' },
      { tone: 'red', label: 'Peças em Risco', value: atRisk },
      { tone: 'purple', label: 'Aprovação Pendente', value: pending }
    ];

    return markers.map(function (m) {
      var display = formatNum(m.value) + (m.suffix || '');
      return (
        '<div class="stat-marker stat-marker-' + m.tone + '">' +
        '<span class="stat-marker-label">' + escapeHtml(m.label) + '</span>' +
        '<span class="stat-marker-value">' + display + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function render(metrics, anomalies) {
    if (!container) return;
    var clean = APP_CONFIG && APP_CONFIG.UI_CLEAN;

    if (clean) {
      container.innerHTML = renderStatMarkers(metrics, anomalies);
      if (rulesEl) rulesEl.innerHTML = renderRules(metrics, anomalies);
      return;
    }

    var legacy = [
      { label: 'Total de Itens', value: metrics.totalItems, cls: 'kpi-primary' },
      { label: 'Aprovados', value: metrics.released, cls: 'kpi-success' },
      { label: 'Em trabalho', value: metrics.inWork, cls: 'kpi-warning' },
      { label: 'Obsoletos', value: metrics.obsolete, cls: 'kpi-danger' }
    ];
    container.innerHTML = legacy.map(function (c) {
      return (
        '<div class="kpi-card ' + c.cls + '">' +
        '<span class="kpi-value">' + formatNum(c.value) + '</span>' +
        '<span class="kpi-label">' + c.label + '</span></div>'
      );
    }).join('');
  }

  function formatNum(n) {
    if (typeof n === 'number' && n % 1 !== 0) {
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return (n || 0).toLocaleString('pt-BR');
  }

  return { init: init, render: render };
})();

;/* --- assets\js\ui\dashboard-theme.js --- */
/**
 * @file ui/dashboard-theme.js
 * Alterna fundo branco / cinza com um único botão (mesmo estilo Visão Geral).
 */
var DashboardTheme = (function () {
  'use strict';

  var STORAGE_KEY = 'bom_dashboard_bg_theme';
  var onChange = null;

  function rootEl() {
    return document.querySelector('.bom-dashboard');
  }

  function getTheme() {
    var r = rootEl();
    if (r && r.classList.contains('bom-theme-white')) return 'white';
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === 'white' || s === 'gray') return s;
    } catch (e) { /* */ }
    return 'gray';
  }

  function getChartColors() {
    var t = getTheme();
    if (t === 'white') {
      return { text: '#37474f', title: '#263238', grid: '#e0e0e0', legend: '#546e7a' };
    }
    return { text: '#455a64', title: '#263238', grid: '#cfd8dc', legend: '#607d8b' };
  }

  function apply(theme) {
    theme = theme === 'white' ? 'white' : 'gray';
    var root = rootEl();
    if (!root) return;
    root.classList.remove('bom-theme-white', 'bom-theme-gray', 'bom-dark');
    root.classList.add(theme === 'white' ? 'bom-theme-white' : 'bom-theme-gray');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) { /* */ }
    window.__BOM_CHART_THEME__ = getChartColors();
    updateToggleButton(theme);
    if (typeof onChange === 'function') onChange(theme);
  }

  function toggle() {
    apply(getTheme() === 'white' ? 'gray' : 'white');
  }

  function updateToggleButton(theme) {
    var btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    btn.textContent = theme === 'white' ? 'Fundo: Branco' : 'Fundo: Cinza';
    btn.setAttribute('title', 'Clique para alternar branco / cinza');
  }

  function init(options) {
    options = options || {};
    onChange = options.onChange || null;
    var saved = 'gray';
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'gray';
    } catch (e) { /* */ }
    if (saved !== 'white') saved = 'gray';
    apply(saved);

    var btn = document.getElementById('btnThemeToggle');
    if (btn && !btn.__3DX_THEME_BOUND__) {
      btn.__3DX_THEME_BOUND__ = true;
      btn.addEventListener('click', function () {
        toggle();
      });
    }
  }

  return {
    init: init,
    apply: apply,
    toggle: toggle,
    getTheme: getTheme,
    getChartColors: getChartColors
  };
})();

;/* --- assets\js\ui\charts-manager.js --- */
/**
 * @file ui/charts-manager.js
 * Gráficos Chart.js com fallback HTML (sempre visível no 3DDashboard).
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};

  function init() {}

  function destroyAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k] && charts[k].destroy) charts[k].destroy();
    });
    charts = {};
    document.querySelectorAll('.chart-fallback').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
  }

  function themeColors() {
    if (typeof DashboardTheme !== 'undefined' && DashboardTheme.getChartColors) {
      return DashboardTheme.getChartColors();
    }
    return window.__BOM_CHART_THEME__ || { text: '#455a64', title: '#263238', grid: '#cfd8dc', legend: '#607d8b' };
  }

  function panelForCanvas(canvasId) {
    var canvas = document.getElementById(canvasId);
    return canvas ? canvas.closest('.bom-chart-panel') : null;
  }

  function showFallback(canvasId, title, html) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) canvas.style.display = 'none';
    var fb = panel.querySelector('.chart-fallback');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'chart-fallback';
      panel.appendChild(fb);
    }
    fb.innerHTML = '<h4 class="chart-fallback-title">' + title + '</h4>' + html;
    fb.style.display = 'block';
  }

  function showCanvas(canvasId) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) {
      canvas.style.display = 'block';
      canvas.style.height = '220px';
      canvas.style.width = '100%';
    }
    var fb = panel.querySelector('.chart-fallback');
    if (fb) fb.style.display = 'none';
  }

  function fallbackMaturityHtml(labels, values, colors) {
    var total = values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var bars = '';
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      var pct = Math.round((v / total) * 1000) / 10;
      var c = colors[i] || '#90a4ae';
      bars +=
        '<div class="cf-row">' +
        '<span class="cf-lbl">' + lbl + '</span>' +
        '<div class="cf-track"><div class="cf-fill" style="width:' + pct + '%;background:' + c + '"></div></div>' +
        '<span class="cf-val">' + v + ' (' + pct + '%)</span></div>';
    });
    return '<div class="cf-bars">' + bars + '</div>';
  }

  function fallbackOwnersHtml(labels, values) {
    var max = Math.max.apply(null, values.concat([1]));
    var rows = '';
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      var pct = Math.round((v / max) * 100);
      rows +=
        '<div class="cf-owner-row">' +
        '<span class="cf-owner-name">' + lbl + '</span>' +
        '<div class="cf-track"><div class="cf-fill cf-fill-blue" style="width:' + pct + '%"></div></div>' +
        '<span class="cf-val">' + v + '</span></div>';
    });
    return '<div class="cf-owners">' + rows + '</div>';
  }

  function doughnut(canvasId, labels, values, title, colors) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;
    if (typeof Chart === 'undefined') {
      showFallback(canvasId, title, fallbackMaturityHtml(labels, values, colors));
      return false;
    }
    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          animation: { duration: 400 },
          plugins: {
            title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
            legend: { position: 'bottom', labels: { color: th.legend, font: { size: 11 }, boxWidth: 12 } }
          }
        }
      });
      return true;
    } catch (e) {
      showFallback(canvasId, title, fallbackMaturityHtml(labels, values, colors));
      return false;
    }
  }

  function horizontalBar(canvasId, labels, values, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;
    if (typeof Chart === 'undefined') {
      showFallback(canvasId, title, fallbackOwnersHtml(labels, values));
      return false;
    }
    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{ data: values, backgroundColor: '#1565c0', borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true, ticks: { color: th.text, font: { size: 11 } }, grid: { color: th.grid } },
            y: { ticks: { color: th.text, font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
      return true;
    } catch (e) {
      showFallback(canvasId, title, fallbackOwnersHtml(labels, values));
      return false;
    }
  }

  function scheduleResize() {
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        if (charts[k] && charts[k].resize) charts[k].resize();
      });
    }, 120);
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        if (charts[k] && charts[k].resize) charts[k].resize();
      });
    }, 400);
  }

  function render(metrics) {
    var healthColors = (APP_CONFIG.CHART_COLORS && APP_CONFIG.CHART_COLORS.maturityHealth) ||
      ['#43a047', '#ffb300', '#e53935', '#78909c'];
    var matLabels = ['Bom', 'Moderado', 'Ruim', 'Outros'];
    var matValues = [
      metrics.released || 0,
      metrics.inWork || 0,
      metrics.obsolete || 0,
      (metrics.byMaturity && metrics.byMaturity.other) || 0
    ];
    var total = matValues.reduce(function (a, b) { return a + b; }, 0);
    if (total < 1) {
      matValues = [0, 0, 0, 1];
      matLabels = ['Sem dados', '', '', ''];
    }

    var ds = MetricsEngine.chartDatasets(metrics);
    var owners = ds.owners || { labels: ['Sem proprietário'], values: [total || 0] };
    if (!owners.labels.length) {
      owners = { labels: ['Sem proprietário'], values: [total || 0] };
    }

    doughnut('chartMaturity', matLabels, matValues, 'Saúde da Maturidade', healthColors);
    horizontalBar('chartOwners', owners.labels, owners.values, 'Lista de Proprietários');
    scheduleResize();
  }

  return { init: init, render: render, destroyAll: destroyAll, scheduleResize: scheduleResize };
})();

;/* --- assets\js\ui\filters.js --- */
/**
 * @file ui/filters.js
 */
var Filters = (function () {
  'use strict';

  var state = {
    search: '',
    maturity: 'all',
    type: 'all',
    approval: 'all',
    hasPP: 'all'
  };
  var onChange = null;
  var debounceTimer;

  function init(selectors, callback) {
    onChange = callback;
    var searchEl = document.querySelector(selectors.search);
    var maturityEl = document.querySelector(selectors.maturity);
    var typeEl = document.querySelector(selectors.type);
    var approvalEl = document.querySelector(selectors.approval);
    var ppEl = document.querySelector(selectors.hasPP);

    if (searchEl) {
      searchEl.addEventListener('input', function (e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          state.search = e.target.value.trim().toLowerCase();
          if (onChange) onChange(getState());
        }, APP_CONFIG.SEARCH_DEBOUNCE_MS);
      });
    }

    [maturityEl, typeEl, approvalEl, ppEl].forEach(function (el, idx) {
      if (!el) return;
      el.addEventListener('change', function (e) {
        var keys = ['maturity', 'type', 'approval', 'hasPP'];
        state[keys[idx]] = e.target.value;
        if (onChange) onChange(getState());
      });
    });
  }

  function getState() {
    return Object.assign({}, state);
  }

  function apply(nodes) {
    return nodes.filter(function (n) {
      if (state.search) {
        var blob = [
          n.name, n.title, n.description, n.physicalid,
          n.owner, n.type, n.revision, n.state
        ].join(' ').toLowerCase();
        if (blob.indexOf(state.search) < 0) return false;
      }
      if (state.maturity !== 'all') {
        if (AttributeService.classifyMaturity(n.maturity || n.state) !== state.maturity) return false;
      }
      if (state.type !== 'all' && String(n.type).indexOf(state.type) < 0) return false;
      if (state.approval === 'approved') {
        var a = String(n.approval || '').toLowerCase();
        if (a.indexOf('approv') < 0 || a.indexOf('pending') >= 0) return false;
      }
      if (state.approval === 'pending') {
        if (String(n.approval || '').toLowerCase().indexOf('pending') < 0) return false;
      }
      if (state.hasPP === 'yes' && !n.hasPhysicalProduct) return false;
      if (state.hasPP === 'no' && n.hasPhysicalProduct) return false;
      return true;
    });
  }

  function clearAll() {
    state.search = '';
    state.maturity = 'all';
    state.type = 'all';
    state.approval = 'all';
    state.hasPP = 'all';
    var searchEl = document.getElementById('searchInput');
    var maturityEl = document.getElementById('filterMaturity');
    var typeEl = document.getElementById('filterType');
    var approvalEl = document.getElementById('filterApproval');
    var ppEl = document.getElementById('filterPP');
    if (searchEl) searchEl.value = '';
    if (maturityEl) maturityEl.value = 'all';
    if (typeEl) typeEl.value = 'all';
    if (approvalEl) approvalEl.value = 'all';
    if (ppEl) ppEl.value = 'all';
    if (onChange) onChange(getState());
  }

  function populateTypeOptions(nodes) {
    var sel = document.getElementById('filterType');
    if (!sel) return;
    var types = {};
    nodes.forEach(function (n) { types[n.type || 'Unknown'] = true; });
    var current = sel.value;
    sel.innerHTML = '<option value="all">Todos os tipos</option>';
    Object.keys(types).sort().forEach(function (t) {
      sel.innerHTML += '<option value="' + escapeAttr(t) + '">' + escapeHtml(t) + '</option>';
    });
    sel.value = current || 'all';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  return {
    init: init,
    getState: getState,
    apply: apply,
    clearAll: clearAll,
    populateTypeOptions: populateTypeOptions
  };
})();

;/* --- assets\js\ui\data-table.js --- */
/**
 * @file ui/data-table.js
 * Tabela E-BOM — scroll nativo (sem virtualização que quebra no iframe 3DDashboard).
 */
var DataTable = (function () {
  'use strict';

  var tbody;
  var thead;
  var data = [];
  var scrollContainer;
  var columns = [];
  var initialized = false;
  var MAX_ROWS = 8000;

  function getColumns() {
    if (APP_CONFIG.UI_CLEAN && APP_CONFIG.PILOT_TABLE_COLUMNS && APP_CONFIG.PILOT_TABLE_COLUMNS.length) {
      return APP_CONFIG.PILOT_TABLE_COLUMNS;
    }
    return APP_CONFIG.PRODUCT_EXPLORER_COLUMNS || [];
  }

  function init(tableSelector) {
    columns = getColumns();
    var table = document.querySelector(tableSelector);
    if (!table) return;
    scrollContainer = table.closest('.bom-table-wrap') || table.parentElement;
    tbody = table.querySelector('tbody');
    thead = table.querySelector('thead tr');
    renderHeader();
    if (!initialized && scrollContainer) {
      scrollContainer.style.overflowY = 'auto';
      scrollContainer.style.webkitOverflowScrolling = 'touch';
      initialized = true;
    }
  }

  function renderHeader() {
    if (!thead) return;
    thead.innerHTML = columns.map(function (c) {
      return '<th>' + escapeHtml(c.label) + '</th>';
    }).join('');
  }

  function maturityLabel(n) {
    return String(n.maturity || n.state || '').trim();
  }

  function formatCell(n, col) {
    var v = n[col.key];
    if (col.format === 'bool') return v ? 'Sim' : 'Não';
    if (col.format === 'date') {
      if (!v) return '';
      try {
        return v instanceof Date ? v.toLocaleDateString('pt-BR') : new Date(v).toLocaleDateString('pt-BR');
      } catch (e) {
        return String(v);
      }
    }
    if (col.key === 'owner') {
      var o = v;
      if (typeof MetricsEngine !== 'undefined' && MetricsEngine.ownerLabel) {
        o = MetricsEngine.ownerLabel(n.owner);
      }
      return escapeHtml(o || '');
    }
    if (col.key === 'type') return escapeHtml(shortType(v));
    if (col.format === 'status' || col.key === 'state' || col.key === 'maturity') {
      var raw = maturityLabel(n);
      var matCls = AttributeService.classifyMaturity(raw);
      var status = maturityStatusBadge(matCls, raw);
      return '<span class="status-pill ' + status.cls + '">' + escapeHtml(status.text) + '</span>';
    }
    return escapeHtml(v == null ? '' : v);
  }

  function setData(nodes) {
    data = nodes || [];
    render();
  }

  function render() {
    if (!tbody) return;
    var slice = data.slice(0, MAX_ROWS);
    if (!slice.length) {
      tbody.innerHTML =
        '<tr><td colspan="' + (columns.length || 1) + '" class="bom-table-empty">' +
        'Nenhuma linha. Importe Ctrl+C no Explorer (inclua coluna Maturidade).</td></tr>';
      return;
    }
    tbody.innerHTML = slice.map(function (n) {
      var tds = columns.map(function (col) {
        return '<td>' + formatCell(n, col) + '</td>';
      }).join('');
      return '<tr data-id="' + escapeAttr(n.physicalid) + '">' + tds + '</tr>';
    }).join('');
  }

  function maturityStatusBadge(matCls, raw) {
    var r = String(raw || '').trim();
    if (matCls === 'released') return { text: r || 'Aprovado', cls: 'status-ok' };
    if (matCls === 'in_work') return { text: r || 'Em Trabalho', cls: 'status-warn' };
    if (matCls === 'obsolete') return { text: r || 'Obsoleto', cls: 'status-bad' };
    return { text: r || 'Sem maturidade', cls: 'status-neutral' };
  }

  function shortType(t) {
    if (!t) return '';
    var parts = String(t).split(':');
    return parts[parts.length - 1];
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('SheetJS não carregado.');
      return;
    }
    var rows = data.map(function (n) {
      var row = {};
      columns.forEach(function (col) {
        var v = n[col.key];
        if (col.format === 'date' && v) {
          v = v instanceof Date ? v.toISOString() : v;
        }
        if (col.format === 'bool') v = v ? 'Sim' : 'Nao';
        row[col.label] = v;
      });
      return row;
    });
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProductExplorer');
    XLSX.writeFile(wb, 'bom-analytics-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  return {
    init: init,
    setData: setData,
    exportExcel: exportExcel,
    getColumns: getColumns
  };
})();

;/* --- assets\js\ui\explorer-sync-panel.js --- */
/**
 * @file ui/explorer-sync-panel.js
 * Sincroniza com Product Explorer (aba EXPLORE) via postMessage ou ID manual.
 */
var ExplorerSyncPanel = (function () {
  'use strict';

  function el(id) {
    return typeof byId3dx === 'function' ? byId3dx(id) : document.getElementById(id);
  }

  var STORAGE_KEY = '3dx_pe_last_selection';

  function saveSelection(sel) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
    } catch (e) { /* */ }
  }

  function loadStoredSelection() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function requestSyncFromDashboard() {
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
    return true;
  }

  function applyManualId() {
    var input = el('explorerObjectId');
    if (!input) return null;
    var id = input.value.trim();
    if (!id || id.length < 10) return null;
    var nameInput = el('explorerObjectName');
    var sel = {
      physicalid: id,
      type: 'VPMReference',
      name: nameInput ? nameInput.value.trim() : id,
      displayName: nameInput ? nameInput.value.trim() : id,
      source: 'manual'
    };
    ProductExplorerBridge.setSelection(sel);
    saveSelection(sel);
    return sel;
  }

  function init(options) {
    options = options || {};
    var btnSync = el('btnSyncExplorer');
    var btnLoadId = el('btnLoadObjectId');
    var btnCopyHelp = el('btnCopyHelp');

    if (btnSync) {
      btnSync.addEventListener('click', function () {
        requestSyncFromDashboard();
        var current = ProductExplorerBridge.getSelection();
        if (current && options.onSelect) {
          options.onSelect(current);
          if (options.onStatus) {
            options.onStatus('Explorer: ' + (current.displayName || current.physicalid), 'ok');
          }
          return;
        }
        var stored = loadStoredSelection();
        if (stored && options.onSelect) {
          options.onSelect(stored);
          if (options.onStatus) {
            options.onStatus('Explorer: ' + (stored.displayName || stored.physicalid), 'ok');
          }
          return;
        }
        if (options.onStatus) {
          options.onStatus('Abra o produto no Product Structure Explorer (EXPLORE).', 'info');
        }
      });
    }

    if (btnLoadId) {
      btnLoadId.addEventListener('click', function () {
        var sel = applyManualId();
        if (!sel) {
          if (options.onStatus) options.onStatus('Cole o Physical ID do Product Explorer.', 'warn');
          return;
        }
        if (options.onSelect) options.onSelect(sel);
        if (options.onStatus) {
          options.onStatus('Objeto vinculado: ' + sel.displayName, 'ok');
        }
      });
    }

    if (btnCopyHelp) {
      btnCopyHelp.addEventListener('click', function () {
        var el = el('syncHelpText');
        if (el) el.classList.toggle('open');
      });
    }

    ProductExplorerBridge.subscribe(function (sel) {
      saveSelection(sel);
      if (el('explorerObjectId')) {
        el('explorerObjectId').value = sel.physicalid || '';
      }
      if (el('explorerObjectName')) {
        el('explorerObjectName').value = sel.displayName || sel.name || '';
      }
    });

    var stored = loadStoredSelection();
    if (stored && stored.physicalid) {
      ProductExplorerBridge.setSelection(stored);
      if (options.onSelect && APP_CONFIG.CROSS_ORIGIN_WIDGET) {
        options.onSelect(stored);
      }
    }

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      setInterval(requestSyncFromDashboard, 8000);
    }
  }

  return {
    init: init,
    applyManualId: applyManualId,
    requestSyncFromDashboard: requestSyncFromDashboard
  };
})();

;/* --- assets\js\ui\snapshot-panel.js --- */
/**
 * @file ui/snapshot-panel.js
 * Colar estrutura do Explorer ou carregar arquivo JSON no widget.
 */
var SnapshotPanel = (function () {
  'use strict';

  function init(options) {
    options = options || {};
    var btn = document.getElementById('btnImportPaste');
    var area = document.getElementById('pasteArea');
    var fileInput = document.getElementById('snapshotFileInput');
    var btnFile = document.getElementById('btnLoadSnapshotFile');

    if (btn && area) {
      btn.addEventListener('click', function () {
        importText(area.value, options);
      });
      area.addEventListener('paste', function (e) {
        var t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
        if (t) {
          e.preventDefault();
          area.value = t;
          importText(t, options);
        }
      });
    }

    if (btnFile && fileInput) {
      btnFile.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        if (!fileInput.files || !fileInput.files[0]) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            if (options.onSnapshot) options.onSnapshot(data, 'arquivo JSON');
          } catch (err) {
            if (options.onError) options.onError('JSON inválido: ' + (err.message || err));
          }
        };
        reader.readAsText(fileInput.files[0], 'UTF-8');
      });
    }
  }

  function importText(text, options) {
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      if (options.onError) options.onError('Cole a grade do Explorer (Ctrl+C).');
      return;
    }
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try {
        var data = JSON.parse(trimmed);
        if (options.onSnapshot) options.onSnapshot(data, 'JSON colado');
        return;
      } catch (e) { /* segue como TSV */ }
    }
    if (typeof FileImportService === 'undefined') {
      if (options.onError) options.onError('Parser não carregado.');
      return;
    }
    FileImportService.parseTextAsync(trimmed)
      .then(function (items) {
        if (!items.length) throw new Error('Nenhuma linha reconhecida');
        var payload = BomSnapshot.buildFromImported(items, items[0].name || items[0].title);
        if (options.onSnapshot) options.onSnapshot(payload, 'cola Explorer');
      })
      .catch(function (err) {
        if (options.onError) options.onError(err.message || err);
      });
  }

  return { init: init, importText: importText };
})();

;/* --- assets\js\app.js --- */
/**
 * @file app.js
 * Orquestração — bootstrap, seleção Product Explorer, refresh.
 */
var App = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : this;

  function byId(id) {
    if (typeof byId3dx === 'function') return byId3dx(id);
    if (root.__3DX_UI_ROOT__) {
      var m = root.__3DX_UI_ROOT__.querySelector('#' + id);
      if (m) return m;
    }
    return document.getElementById(id);
  }

  var currentMetrics = null;
  var currentAnomalies = null;
  var loading = false;
  var lastLoadedId = null;

  function setStatus(msg, type) {
    var el = byId('statusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-bar status-' + (type || 'info');
  }

  function setLoading(on) {
    loading = on;
    var overlay = byId('loadingOverlay');
    if (overlay) overlay.classList.toggle('hidden', !on);
  }

  /** URL ou registro pede produto real (Mont10 etc.) — nunca substituir por demo Drone. */
  function userRequestedRealProduct() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.physicalid || q.structure || q.rootName || APP_CONFIG.URL_PHYSICAL_ID) return true;
    var idEl = byId('explorerObjectId');
    if (idEl && idEl.value && String(idEl.value).trim().length >= 8) return true;
    return false;
  }

  function isSnapshotDeliveryMode() {
    if (APP_CONFIG.SNAPSHOT_DELIVERY_MODE === true) return true;
    if (APP_CONFIG.CAN_USE_ENOVIA_API) return false;
    return !!(APP_CONFIG.SNAPSHOT_URL || APP_CONFIG.SNAPSHOT_FIRST);
  }

  var lastSyncedStructure = null;
  var structureSyncTimer = null;

  function allowApiLoad() {
    return !!(root.__3DX_ALLOW_API__ || root.__3DX_FORCE_API__);
  }

  function apiExplicit() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    return q.api === '1' || q.api === 'true' || !!root.__3DX_FORCE_API__;
  }

  function pilotGridOnlyMode() {
    return !!(APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API && !apiExplicit());
  }

  function pollExplorerStructureLabel() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    var hint =
      ProductExplorerBridge.getStructureNameHint && ProductExplorerBridge.getStructureNameHint();
    if (hint) {
      var label = byId('selectionLabel');
      if (label) label.textContent = hint;
    }
  }

  function pilotAutoLoadFromExplorer() {
    if (!pilotGridOnlyMode()) return Promise.resolve(false);
    pollExplorerStructureLabel();
    var term =
      (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
        ? ProductExplorerBridge.getStructureNameHint()
        : null) ||
      (byId('selectionLabel') && byId('selectionLabel').textContent) ||
      '';
    if (!term || term === '-') return Promise.resolve(false);
    return pilotFallbackExplorerGrid(term);
  }

  function allowDemoOnApiFail() {
    if (APP_CONFIG.DEMO_ON_API_FAIL === false) return false;
    if (userRequestedRealProduct()) return false;
    if (APP_CONFIG.WAIT_FOR_USER_SCAN) return false;
    return true;
  }

  function structureLabelForId(id) {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key;
    for (key in reg) {
      if (reg.hasOwnProperty(key) && reg[key] === id) return key;
    }
    return null;
  }

  function githubApiBlockedMessage(id, name) {
    var label = name || structureLabelForId(id) || id || 'E-BOM';
    return (
      label + ' (' + (id || '?') + ') — API ENOVIA só no 3DDashboard (Additional App). ' +
      'GitHub não tem WAFData; aqui não carrega BOM real.'
    );
  }

  function updateLastUpdateClock() {
    var el = byId('lastUpdateClock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('pt-BR');
  }

  function updateEbomPanel(filtered, flat, metrics) {
    var pname =
      (byId('selectionLabel') && byId('selectionLabel').textContent) ||
      (byId('tableProductLabel') && byId('tableProductLabel').textContent) ||
      'E-BOM';
    var tableLbl = byId('tableProductLabel');
    if (tableLbl && pname !== '-') tableLbl.textContent = pname;
    var meta = byId('ebomMeta');
    if (meta) {
      var total = metrics.totalItems || flat.length || 0;
      meta.textContent =
        total + ' peças no arquivo · ' +
        (filtered.length) + ' visíveis com filtro · ' +
        (metrics.totalAssemblies || 0) + ' assemblies';
    }
    var pager = byId('tablePager');
    if (pager) {
      pager.textContent =
        'Exibindo ' + filtered.length + ' de ' + flat.length + ' linhas (role para navegar)';
    }
  }

  var tableInitialized = false;

  function refreshUI() {
    if (typeof KpiCards !== 'undefined' && KpiCards.init && byId('kpiGrid')) {
      KpiCards.init('#kpiGrid');
    }
    if (!tableInitialized && typeof DataTable !== 'undefined' && DataTable.init && byId('bomTable')) {
      DataTable.init('#bomTable');
      tableInitialized = true;
    }
    var index = BomService.getIndex();
    var rootId = BomService.getRootId();
    var flat = BomNormalizer.toFlatList(index, rootId);
    Filters.populateTypeOptions(flat);
    var filtered = Filters.apply(flat);

    currentMetrics = MetricsEngine.compute(index);
    currentAnomalies = AnomalyDetector.detect(index);

    KpiCards.render(currentMetrics, currentAnomalies);
    if (APP_CONFIG.SHOW_CHARTS !== false) {
      ChartsManager.destroyAll();
      ChartsManager.render(currentMetrics);
      if (ChartsManager.scheduleResize) {
        window.setTimeout(function () {
          ChartsManager.render(currentMetrics);
        }, 300);
      }
    }
    if (APP_CONFIG.SHOW_TREE !== false && byId('bomTree') && typeof BomTree !== 'undefined') {
      BomTree.refresh(index, rootId);
    }
    DataTable.setData(filtered);
    updateEbomPanel(filtered, flat, currentMetrics);
    if (BomService.getNodeCount() > 0) updateLastUpdateClock();
    renderIssues(currentAnomalies.issues);

    if (APP_CONFIG.IMPORT_MODE) {
      var pname = (byId('selectionLabel') && byId('selectionLabel').textContent) || 'E-BOM';
      var n = BomService.getNodeCount();
      if (pname && pname !== '-' && n > 0) {
        setStatus('Snapshot: ' + pname + ' — ' + n + ' itens', 'ok');
      }
    } else {
      var mode = APP_CONFIG.DEMO_MODE ? ' | DEMO' : '';
      setStatus('Estrutura: ' + BomService.getNodeCount() + ' itens | Exibindo: ' + filtered.length + mode, 'ok');
    }
  }

  function renderIssues(issues) {
    if (APP_CONFIG.SHOW_ISSUES_PANEL === false) return;
    var el = byId('issuesList');
    if (!el) return;
    var top = issues.slice(0, 50);
    if (!top.length) {
      el.innerHTML = '<li class="issue-ok">Nenhuma anomalia crítica detectada.</li>';
      return;
    }
    el.innerHTML = top.map(function (i) {
      return '<li class="issue-' + i.severity + '">[' + i.type + '] ' + escapeHtml(i.message) + '</li>';
    }).join('');
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function loadBomFromSelectionOnly(physicalId) {
    var sel = ProductExplorerBridge.getSelection() || {};
    return BomService.loadRootFromSelection({
      physicalid: physicalId,
      name: sel.name || sel.displayName || physicalId,
      title: sel.displayName || sel.name || physicalId,
      displayType: sel.displayType || 'Physical Product',
      type: sel.type || 'VPMReference',
      displayName: sel.displayName || sel.name || physicalId
    }).then(function () {
      refreshUI();
      setStatus('Modo limitado: 1 item (use Additional App widget-uwa sem iframe).', 'warn');
    });
  }

  function apiTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error(label || 'Tempo esgotado na API'));
        }, ms || 18000);
      })
    ]);
  }

  function pilotFallbackExplorerGrid(structureName) {
    if (!APP_CONFIG.PILOT_FALLBACK_SNAPSHOT || typeof ProductExplorerBridge === 'undefined') {
      return Promise.resolve(false);
    }
    if (!ProductExplorerBridge.scrapeExplorerGrid) return Promise.resolve(false);
    var payload = ProductExplorerBridge.scrapeExplorerGrid(structureName);
    function applyGrid(pl) {
      if (!pl || !pl.items || pl.items.length < 2) return Promise.resolve(false);
      return BomSnapshot.applyPayload(pl).then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        if (meta && meta.rootPhysicalId) lastLoadedId = meta.rootPhysicalId;
        refreshUI();
        var n = BomService.getNodeCount();
        if (n < 1) n = (meta && meta.itemCount) || (pl.items && pl.items.length) || 0;
        setStatus('Piloto: ' + (meta.productName || structureName) + ' — ' + n + ' itens (grade Explorer). API 406 em ajuste.', 'ok');
        return true;
      }).catch(function () {
        return false;
      });
    }
    if (builtin && builtin.items && builtin.items.length >= 2) return applyGrid(builtin);
    if (payload && payload.items.length >= 2) return applyGrid(payload);
    var fetchPilot =
      ProductExplorerBridge.fetchPilotStructurePayload &&
      ProductExplorerBridge.fetchPilotStructurePayload(structureName);
    return (fetchPilot || Promise.resolve(null)).then(function (pilot) {
      if (pilot) return applyGrid(pilot);
      return Promise.resolve(false);
    });
  }

  function pilotFallbackSnapshot(structureName) {
    if (!APP_CONFIG.PILOT_FALLBACK_SNAPSHOT || !APP_CONFIG.CAN_USE_ENOVIA_API) {
      return Promise.resolve(false);
    }
    var name = String(structureName || '').trim();
    if (!/mont10/i.test(name)) return Promise.resolve(false);
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyBuiltinMont10) {
      return Promise.resolve(false);
    }
    return BomSnapshot.applyBuiltinMont10().then(function (meta) {
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      if (meta && meta.rootPhysicalId) lastLoadedId = meta.rootPhysicalId;
      refreshUI();
      var n = (meta && meta.itemCount) || BomService.getNodeCount() || 0;
      setStatus('Piloto Mont10: ' + n + ' itens (E-BOM validado). API em ajuste.', 'ok');
      return true;
    }).catch(function () {
      return false;
    });
  }

  function runExplorerScan(btnEl) {
    if (typeof ExplorerScanner === 'undefined') {
      setStatus('Varredura falhou: módulo scanner não carregou.', 'error');
      return;
    }
    setStatus('Varrendo estrutura…', 'info');
    root.__3DX_BLOCK_AUTO_SYNC__ = true;
    root.__3DX_BLOCK_API_LOAD__ = true;
    if (structureSyncTimer) {
      window.clearTimeout(structureSyncTimer);
      structureSyncTimer = null;
    }
    loading = false;
    setLoading(false);
    var forceApiScan = btnEl && btnEl.id === 'btnLoadPhysicalId';
    if (forceApiScan) root.__3DX_FORCE_API__ = true;
    if (!pilotGridOnlyMode() || forceApiScan) root.__3DX_ALLOW_API__ = true;
    var hadSnapshot = BomService.getNodeCount() > 1 && APP_CONFIG.IMPORT_MODE;
    setLoading(true);
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Varrendo…';
    }
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
      if (ProductExplorerBridge.pollSelection) ProductExplorerBridge.pollSelection();
    }
    var gridFirst = APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API;
    setStatus(
      gridFirst
        ? 'Lendo Explorer ou Ctrl+C (qualquer projeto)…'
        : 'Conectando API (ifwe)…',
      'info'
    );
    var scanChain = ExplorerScanner.scan();
    if (!gridFirst && typeof ExplorerScanner.ensureSpaceApi === 'function') {
      scanChain = ExplorerScanner.ensureSpaceApi().then(function () {
        setStatus('Varrendo estrutura Explorer…', 'info');
        return ExplorerScanner.scan();
      });
    }
    apiTimeout(
      scanChain,
      APP_CONFIG.SCAN_CONNECT_TIMEOUT_MS || 40000,
      'Varredura cancelada (timeout). Abra Mont10 no Explorer e clique Varrer de novo.'
    )
      .then(function (res) {
        APP_CONFIG.DEMO_MODE = false;
        APP_CONFIG.IMPORT_MODE = res.mode !== 'api';
        if (
          res.mode === 'explorer-grid' ||
          res.mode === 'explorer-grid-pilot' ||
          res.mode === 'text' ||
          res.mode === 'cola' ||
          res.mode === 'builtin-last' ||
          res.mode === 'snapshot-file'
        ) {
          APP_CONFIG.IMPORT_MODE = true;
        }
        if (res.meta) {
          lastLoadedId = res.meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) {
            var pn = res.meta.productName;
            if (pn && typeof pn === 'object') pn = pn.label || pn.name || 'E-BOM';
            if (typeof pn === 'string' && pn.charAt(0) === '{') {
              try {
                var o = JSON.parse(pn);
                pn = o.label || o.name || 'E-BOM';
              } catch (e2) { pn = 'E-BOM'; }
            }
            lbl.textContent = pn || 'E-BOM';
          }
        }
        updateLastUpdateClock();
        refreshUI();
        setStatus(res.message || 'Varredura concluída.', 'ok');
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : String(err);
        if (msg.indexOf('Varredura falhou') < 0) {
          msg = 'Varredura falhou: ' + msg;
        }
        var term =
          (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
            ? ProductExplorerBridge.getStructureNameHint()
            : null) ||
          (byId('selectionLabel') && byId('selectionLabel').textContent) ||
          '';
        return pilotFallbackExplorerGrid(term).then(function (restored) {
          if (restored) return;
          return pilotFallbackSnapshot(term).then(function (restored2) {
          if (restored2) return;
          if (hadSnapshot || APP_CONFIG.SNAPSHOT_URL) {
            return restoreSnapshotAfterScanFail(msg).then(function (restored2) {
              if (!restored2) {
                setStatus(msg, 'error');
              }
            });
          }
          var short = msg;
          if (short.length > 220) short = short.slice(0, 220) + '…';
          setStatus(short, 'error');
        });
        });
      })
      .finally(function () {
        root.__3DX_ALLOW_API__ = false;
        root.__3DX_FORCE_API__ = false;
        root.__3DX_BLOCK_API_LOAD__ = false;
        root.__3DX_BLOCK_AUTO_SYNC__ = false;
        setLoading(false);
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Varrer estrutura Explorer';
        }
      });
  }

  function applySnapshotPayload(payload, sourceLabel) {
    setLoading(true);
    return BomSnapshot.applyPayload(payload)
      .then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        lastLoadedId = meta.rootPhysicalId;
        var lbl = byId('selectionLabel');
        if (lbl) lbl.textContent = meta.productName;
        var tableLbl = byId('tableProductLabel');
        if (tableLbl) tableLbl.textContent = meta.productName;
        refreshUI();
        setStatus(
          'Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens (' + (sourceLabel || 'JSON') + ')',
          'ok'
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function loadSnapshotFromUrl(url) {
    if (!url) return Promise.resolve();
    setLoading(true);
    setStatus('Carregando snapshot…', 'info');
    return BomSnapshot.fetchAndApply(url)
      .then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        lastLoadedId = meta.rootPhysicalId;
        var lbl = byId('selectionLabel');
        if (lbl) lbl.textContent = meta.productName;
        var tableLbl = byId('tableProductLabel');
        if (tableLbl) tableLbl.textContent = meta.productName;
        refreshUI();
        setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
      })
      .catch(function (err) {
        setStatus('Snapshot: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function tryLoadSnapshotFirst() {
    var url = typeof BomSnapshot !== 'undefined' && BomSnapshot.getParamUrl
      ? BomSnapshot.getParamUrl()
      : null;
    if (!url && APP_CONFIG.SNAPSHOT_URL) {
      url = BomSnapshot.resolveUrl(APP_CONFIG.SNAPSHOT_URL);
    }
    if (url) return loadSnapshotFromUrl(url);
    if (!APP_CONFIG.WAIT_FOR_USER_SCAN) {
      var cached = typeof BomSnapshot !== 'undefined' ? BomSnapshot.loadSession() : null;
      if (cached) return applySnapshotPayload(cached, 'sessão');
    }
    return Promise.resolve();
  }

  function loadBom(physicalId) {
    if (!physicalId || loading) return Promise.resolve();
    if (root.__3DX_BLOCK_API_LOAD__) return Promise.resolve();
    if (pilotGridOnlyMode() && !apiExplicit()) {
      return Promise.resolve();
    }
    if (pilotGridOnlyMode() && !allowApiLoad()) {
      return Promise.resolve();
    }
    if (isSnapshotDeliveryMode() && !allowApiLoad()) {
      return Promise.resolve();
    }
    if (physicalId === lastLoadedId && BomService.getNodeCount() > 1) {
      return Promise.resolve();
    }
    setLoading(true);
    setStatus('Carregando E-BOM…', 'info');

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.DEMO_MODE && !APP_CONFIG.IMPORT_MODE) {
      return loadBomFromSelectionOnly(physicalId).finally(function () {
        setLoading(false);
      });
    }

    return apiTimeout(BomService.loadRoot(physicalId), 18000, 'API E-BOM lenta ou indisponível')
      .then(function () {
        lastLoadedId = physicalId;
        refreshUI();
        setStatus(BomService.getNodeCount() + ' itens carregados.', 'ok');
        if (APP_CONFIG.SKIP_PP_ENRICH) return;
        return PhysicalProductService.enrichNodes(BomService.getIndex(), { batchSize: 40 })
          .then(function () { refreshUI(); });
      })
      .catch(function (err) {
        console.error(err);
        if (allowDemoOnApiFail()) {
          return loadDemoBom(
            'GitHub não acessa API ENOVIA. Demo com ~20 itens. Estrutura real: deploy 3DSpace.'
          );
        }
        if (isSnapshotDeliveryMode() || APP_CONFIG.IMPORT_MODE) {
          return restoreSnapshotAfterScanFail('Erro: ' + (err.message || err));
        }
        if (typeof BomService !== 'undefined' && BomService.reset) {
          BomService.reset();
          lastLoadedId = null;
          refreshUI();
        }
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API && userRequestedRealProduct()) {
          var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
          var pid = physicalId || q.physicalid || APP_CONFIG.URL_PHYSICAL_ID;
          setStatus(githubApiBlockedMessage(pid, q.structure || q.rootName), 'warn');
          return;
        }
        setStatus('Erro: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  var autoScanTimer = null;

  function syncOpenExplorerStructure(force) {
    if (root.__3DX_BLOCK_AUTO_SYNC__) return;
    if (!APP_CONFIG.CAN_USE_ENOVIA_API || typeof ExplorerScanner === 'undefined') return;
    if (!force && (APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0) < 1) return;
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      ProductExplorerBridge.pollStructureHint();
      ProductExplorerBridge.pollSelection();
    }
    var hint = typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
      ? ProductExplorerBridge.getStructureNameHint()
      : null;
    var sel = typeof ProductExplorerBridge !== 'undefined' ? ProductExplorerBridge.getSelection() : null;
    var key = hint || (sel && (sel.displayName || sel.name)) || '';
    if (!key) return;
    var label = byId('selectionLabel');
    if (label) label.textContent = key;
    if (!force && key === lastSyncedStructure && BomService.getNodeCount() > 1) return;
    if (loading && !force) return;
    if (structureSyncTimer) window.clearTimeout(structureSyncTimer);
    structureSyncTimer = window.setTimeout(function () {
      lastSyncedStructure = key;
      root.__3DX_ALLOW_API__ = true;
      setLoading(true);
      setStatus('Carregando estrutura aberta: ' + key + '…', 'info');
      apiTimeout(
        ExplorerScanner.scan(),
        APP_CONFIG.SCAN_TIMEOUT_MS || 90000,
        'Timeout ao carregar ' + key
      )
        .then(function (res) {
          APP_CONFIG.DEMO_MODE = false;
          APP_CONFIG.IMPORT_MODE = res.mode !== 'api';
          if (res.meta) lastLoadedId = res.meta.rootPhysicalId;
          refreshUI();
          setStatus(res.message || ('Carregado: ' + key + ' — ' + BomService.getNodeCount() + ' itens'), 'ok');
        })
        .catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err);
          return pilotFallbackExplorerGrid(key).then(function (restored) {
            if (restored) return;
            var short = msg;
            if (short.length > 220) short = short.slice(0, 220) + '…';
            setStatus(short, 'error');
          });
        })
        .finally(function () {
          root.__3DX_ALLOW_API__ = false;
          setLoading(false);
        });
    }, APP_CONFIG.STRUCTURE_SYNC_DEBOUNCE_MS || 1800);
  }

  function onSelection(sel) {
    if (!sel || !sel.physicalid) return;
    var label = byId('selectionLabel');
    if (label) {
      label.textContent = (sel.displayName || sel.name || sel.physicalid);
    }
    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) {
      return;
    }
    if (APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API) {
      return;
    }
    if (
      APP_CONFIG.CAN_USE_ENOVIA_API &&
      !APP_CONFIG.PILOT_GRID_FIRST &&
      typeof ExplorerScanner !== 'undefined'
    ) {
      syncOpenExplorerStructure(false);
      return;
    }
    if (isSnapshotDeliveryMode() && !allowApiLoad()) return;
    loadBom(sel.physicalid);
  }

  function loadPhysicalProduct(sel) {
    if (!sel || !sel.physicalid) return Promise.resolve();
    setLoading(true);
    if (typeof ProductExplorerBridge.setSelection === 'function') {
      ProductExplorerBridge.setSelection(sel, { silent: true });
    }
    byId('selectionLabel').textContent =
      (sel.displayName || sel.name) + ' (' + sel.physicalid + ')';
    return BomService.loadFrom3DXProduct(sel)
      .then(function () {
        APP_CONFIG.IMPORT_MODE = false;
        refreshUI();
        var n = BomService.getNodeCount();
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
          setStatus(
            'Carregado: ' + (sel.displayName || sel.physicalid) + ' — ' + n +
            ' itens (preview). BOM real: HTML no 3DSpace.',
            'warn'
          );
        } else {
          setStatus('Carregado: ' + (sel.displayName || sel.physicalid) + ' — ' + n + ' itens.', 'ok');
        }
      })
      .catch(function (err) {
        setStatus('Erro: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function applyUrlParamsToUI() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var id = String(q.physicalid || APP_CONFIG.URL_PHYSICAL_ID || '').trim();
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      id = ThreeDXContentParser.normalizePhysicalId(id);
    } else if (/^R\d{10,}-/i.test(id) && !/^prd-/i.test(id)) {
      id = 'prd-' + id;
    }
    if (!id) return;
    var idEl = byId('explorerObjectId');
    if (idEl) idEl.value = id;
    var lbl = byId('selectionLabel');
    var name =
      q.structure || q.rootName || structureLabelForId(id) ||
      q.displayName || q.name || id;
    if (lbl) lbl.textContent = name;
    if (typeof ProductExplorerBridge !== 'undefined' && isValidPhysicalId(id)) {
      ProductExplorerBridge.setSelection({
        physicalid: id,
        type: q.type || 'VPMReference',
        name: name,
        displayName: name,
        source: 'url-query'
      }, { silent: true });
    }
  }

  function rebindScanButton() {
    var btnScan = byId('btnScanExplorer');
    if (!btnScan || btnScan.__3DX_SCAN_BOUND__) return;
    btnScan.__3DX_SCAN_BOUND__ = true;
    btnScan.addEventListener('click', function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      runExplorerScan(btnScan);
    });
  }

  function runImportFromClipboard(btnEl) {
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaClipboardOrPaste) {
      setStatus('Importação indisponível.', 'error');
      return;
    }
    setStatus('Lendo Ctrl+C do Explorer…', 'info');
    root.__3DX_BLOCK_API_LOAD__ = true;
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Importando…';
    }
    ExplorerScanner.scanViaClipboardOrPaste()
      .then(function (res) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        if (res.meta) {
          lastLoadedId = res.meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = res.meta.productName || lbl.textContent;
        }
        updateLastUpdateClock();
        refreshUI();
        setStatus(res.message || 'Importação concluída.', 'ok');
      })
      .catch(function (err) {
        setStatus('Importação: ' + (err.message || err), 'error');
        var area = byId('pasteArea');
        if (area) area.focus();
      })
      .finally(function () {
        root.__3DX_BLOCK_API_LOAD__ = false;
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Importar Ctrl+C';
        }
      });
  }

  function rebindImportButton() {
    var btn = byId('btnImportPaste');
    if (!btn || btn.__3DX_IMPORT_BOUND__) return;
    btn.__3DX_IMPORT_BOUND__ = true;
    btn.addEventListener('click', function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      runImportFromClipboard(btn);
    });
  }

  function initUI() {
    applyUrlParamsToUI();
    KpiCards.init('#kpiGrid');
    ChartsManager.init();
    DataTable.init('#bomTable');
    tableInitialized = true;
    var treeEl = byId('bomTree');
    if (treeEl && APP_CONFIG.SHOW_TREE !== false && typeof BomTree !== 'undefined') {
      BomTree.init('#bomTree', function (id) {
        return BomService.expandNode(id);
      });
    }
    Filters.init(
      {
        search: '#searchInput',
        maturity: '#filterMaturity',
        type: '#filterType',
        approval: '#filterApproval',
        hasPP: '#filterPP'
      },
      function () {
        refreshUI();
      }
    );

    rebindScanButton();
    rebindImportButton();

    var btnClear = byId('btnClearFilters');
    if (btnClear && !btnClear.__3DX_CLEAR_BOUND__) {
      btnClear.__3DX_CLEAR_BOUND__ = true;
      btnClear.addEventListener('click', function () {
        if (typeof Filters !== 'undefined' && Filters.clearAll) Filters.clearAll();
      });
    }

    if (typeof DashboardTheme !== 'undefined') {
      DashboardTheme.init({
        onChange: function () {
          refreshUI();
        }
      });
    }
    var btnScanHide = byId('btnScanExplorer');
    if (btnScanHide && APP_CONFIG.HIDE_SCAN_BUTTON) {
      btnScanHide.classList.add('bom-hidden');
    }

    var btnLoadId = byId('btnLoadPhysicalId');
    if (btnLoadId) {
      btnLoadId.addEventListener('click', function () {
        var idEl = byId('explorerObjectId');
        var id = idEl && idEl.value ? String(idEl.value).trim() : '';
        if (!id || id.length < 16) {
          setStatus('Cole o ID físico (32 hex) da raiz no Explorer.', 'error');
          return;
        }
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection({
            physicalid: id,
            type: 'VPMReference',
            name: byId('selectionLabel') ? byId('selectionLabel').textContent : id,
            displayName: byId('selectionLabel') ? byId('selectionLabel').textContent : id,
            source: 'manual-id'
          }, { silent: true });
        }
        runExplorerScan(btnLoadId);
      });
    }

    var btnExample = byId('btnLoadExample');
    if (btnExample) {
      btnExample.addEventListener('click', function () {
        var url = BomSnapshot.resolveUrl('data/mont10-exemplo-snapshot.json');
        loadSnapshotFromUrl(url);
      });
    }

    var btnSync = byId('btnSyncExplorer');
    if (btnSync) {
      btnSync.addEventListener('click', function () {
        setStatus(
          'Sincronizar não lê a árvore no GitHub. Grade Explorer → Ctrl+C → cole abaixo → Importar.',
          'warn'
        );
        var area = byId('pasteArea');
        if (area) area.focus();
        pullExplorerSelection();
        var fromHash = ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
        var sel = fromHash || ProductExplorerBridge.getSelection();
        if (sel && isValidPhysicalId(sel.physicalid)) {
          lastLoadedId = null;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = sel.displayName || sel.physicalid;
          loadBom(sel.physicalid);
          setStatus('Explorer: ' + (sel.displayName || sel.physicalid), 'ok');
        } else {
          setStatus(
            'Clique na raiz do assembly no Explorer (01_SKA_Drone…), depois ↻ Sincronizar.',
            'warn'
          );
          loadDemoBom();
        }
      });
    }

    var btnRef = byId('btnRefresh');
    if (btnRef) {
      btnRef.addEventListener('click', function () {
        reloadFromExplorer();
      });
    }

    var btnExport = byId('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        DataTable.exportExcel();
      });
    }

    var btnExpand = byId('btnExpandAll');
    if (btnExpand) {
      btnExpand.addEventListener('click', function () {
        setStatus('Expanda níveis na árvore.', 'info');
      });
    }

    var btnDrone = byId('btnLoadDrone');
    if (btnDrone) {
      btnDrone.addEventListener('click', function () {
        loadPhysicalProduct({
          physicalid: '132FB3CE26D70E006A18D1870000316D',
          displayName: '01_SKA_Drone Assembly_130520206',
          name: '01_SKA_Drone Assembly_130520206',
          type: 'VPMReference',
          displayType: 'Physical Product'
        });
      });
    }
  }

  function stripLegacyUI() {
    var selectors = [
      '.external-banner',
      '.goal-panel',
      '.paste-panel',
      '.drop-zone',
      '.explorer-sync-panel',
      '.explorer-id-row',
      '.platform-search.panel',
      '.split-panel',
      '.issues-panel',
      '.header-actions .search-group',
      '#btnSyncExplorer'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    });
    var h1 = document.querySelector('.app-header h1');
    if (h1 && h1.textContent.indexOf('Dashboard') >= 0) {
      h1.textContent = 'BOM Analytics';
    }
    document.body.classList.add('ui-clean');
  }

  function initAppCore(spaceUrl) {
    stripLegacyUI();
    var base = spaceUrl && spaceUrl !== 'demo' ? spaceUrl : getTenantSpaceUrl();
    if (base) {
      try {
        EnoviaApi.init(base);
        if (typeof SearchApi !== 'undefined') SearchApi.init(base);
      } catch (e) { /* */ }
    }
    ProductExplorerBridge.init();
    ProductExplorerBridge.subscribe(onSelection);
    if (ProductExplorerBridge.subscribeStructure) {
      ProductExplorerBridge.subscribeStructure(function (name) {
        syncOpenExplorerStructure(false);
      });
    }
    initUI();
    if (typeof ExplorerSyncPanel !== 'undefined') {
      ExplorerSyncPanel.init({
        onSelect: onSelection,
        onStatus: setStatusPublic
      });
    }
    if (typeof SnapshotPanel !== 'undefined') {
      SnapshotPanel.init({
        onSnapshot: function (payload, label) {
          applySnapshotPayload(payload, label);
        },
        onError: function (msg) {
          setStatus(msg, 'error');
        }
      });
    }
    toggleCrossOriginUI();
    scheduleExplorerSync();
    startExplorerPoll();
  }

  function pullExplorerSelection() {
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
  }

  function scheduleExplorerSync() {
    setTimeout(pullExplorerSelection, 800);
    setTimeout(pullExplorerSelection, 2500);
  }

  function startExplorerPoll() {
    var ms = APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0;
    if (ms < 2000) return;
    setInterval(function () {
      pullExplorerSelection();
      syncOpenExplorerStructure(false);
    }, ms);
  }

  function toggleCrossOriginUI() {
    if (!APP_CONFIG.CROSS_ORIGIN_WIDGET) return;
    document.querySelectorAll('.hidden-cross-origin').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function runHealthCheck() {
    var problems = [];
    if (typeof Chart === 'undefined') problems.push('Chart.js não carregou (gráficos desativados)');
    if (problems.length) {
      setStatus('Atenção: ' + problems.join('; ') + '. Colar do Explorer (Ctrl+C) continua funcionando.', 'warn');
      return true;
    }
    return true;
  }

  /** Additional App injeta UWA/require — aguarda antes de assumir Web Page Reader. */
  function waitForTrustedWidget(ms) {
    ms = ms || 2500;
    return new Promise(function (resolve) {
      if (!APP_CONFIG.CROSS_ORIGIN_WIDGET) return resolve(true);
      var t0 = Date.now();
      function tick() {
        var hasUwa = false;
        try {
          hasUwa = (typeof WidgetRuntime !== 'undefined' && WidgetRuntime.isTrusted()) ||
            (typeof widget !== 'undefined' && widget);
        } catch (e) { /* */ }
        var hasRequire = typeof require !== 'undefined';
        var hasWaf = typeof WAFData !== 'undefined';
        if (hasUwa || hasRequire || hasWaf) {
          APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
          APP_CONFIG.WIDGET_MODE = hasUwa ? 'additional_app' : 'trusted_runtime';
          resolve(true);
          return;
        }
        if (Date.now() - t0 >= ms) {
          resolve(false);
          return;
        }
        setTimeout(tick, 150);
      }
      tick();
    });
  }

  function bootstrap() {
    setStatus('BOM Analytics v' + (APP_CONFIG.BUILD || APP_CONFIG.VERSION) + ' — iniciando…', 'info');
    var watchdog = window.setTimeout(function () {
        if (BomService.getNodeCount() <= 1) {
        if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
          pilotAutoLoadFromExplorer().then(function (ok) {
            if (!ok) {
              setStatus('Abra a montagem no Explorer → clique Varrer estrutura.', 'info');
            }
          });
        } else if (APP_CONFIG.CAN_USE_ENOVIA_API) {
          syncOpenExplorerStructure(true);
        } else if (isSnapshotDeliveryMode() && typeof BomSnapshot !== 'undefined' && BomSnapshot.applyBuiltinMont10) {
          BomSnapshot.applyBuiltinMont10().then(function (meta) {
            APP_CONFIG.IMPORT_MODE = true;
            var lbl = byId('selectionLabel');
            if (lbl) lbl.textContent = meta.productName;
            refreshUI();
            setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
          });
        } else {
          runFallback();
        }
      }
      forceStopLoading();
    }, 12000);
    var wait = isTrustedBoot() ? Promise.resolve(true) : waitForTrustedWidget(2500);
    return wait
      .then(function () { return bootstrapCore(); })
      .finally(function () {
        window.clearTimeout(watchdog);
        forceStopLoading();
      });
  }

  function runFallback() {
    if (BomService.getNodeCount() > 1) return;
    if (APP_CONFIG.AUTO_LOAD_DEMO_DRONE) {
      loadDefaultExplorerProduct();
      return;
    }
    setStatus(
      'Cole a estrutura do Explorer abaixo ou use collect.html → ?snapshot=data/arquivo.json',
      'warn'
    );
  }

  function reloadFromExplorer() {
    pullExplorerSelection();
    var sel = ProductExplorerBridge.getSelection();
    if (sel && sel.physicalid) {
      lastLoadedId = null;
      loadBom(sel.physicalid);
      return;
    }
    trySyncThenLoad();
  }

  function getApiEnoviaUrl() {
    if (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD && typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
      return CompassServices.ifweSpaceUrl();
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var verified = CompassServices.getVerifiedSpaceUrl();
      if (verified) return verified;
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
      return CompassServices.ifweSpaceUrl();
    }
    var h = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return h ? ('https://' + h + '/enovia') : null;
  }

  function getTenantSpaceUrl() {
    return getApiEnoviaUrl();
  }

  function isValidPhysicalId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 16;
  }

  function loadDemoBom(statusMsg) {
    var d = APP_CONFIG.TENANT_DEFAULTS || {};
    if (!d.defaultPhysicalId) return Promise.resolve();
    APP_CONFIG.DEMO_MODE = true;
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    var sel = {
      physicalid: d.defaultPhysicalId,
      displayName: d.defaultDisplayName || d.defaultPhysicalId,
      name: d.defaultDisplayName || d.defaultPhysicalId,
      type: 'VPMReference',
      displayType: 'Physical Product'
    };
    ProductExplorerBridge.setSelection(sel, { silent: true });
    var lbl = byId('selectionLabel');
    if (lbl) lbl.textContent = sel.displayName;
    return BomService.loadRoot(d.defaultPhysicalId).then(function () {
      lastLoadedId = d.defaultPhysicalId;
      refreshUI();
      setStatus(
        statusMsg || ('Demonstração: ' + BomService.getNodeCount() + ' itens. BOM real = 3DSpace.'),
        'warn'
      );
    });
  }

  function loadDefaultExplorerProduct() {
    if (APP_CONFIG.CAN_USE_ENOVIA_API) {
      setStatus('Selecione a raiz no Explorer → Varrer estrutura.', 'info');
      return Promise.resolve();
    }
    if (userRequestedRealProduct()) {
      applyUrlParamsToUI();
      var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
      setStatus(githubApiBlockedMessage(q.physicalid, q.structure), 'warn');
      return Promise.resolve();
    }
    if (!allowDemoOnApiFail()) return Promise.resolve();
    return loadDemoBom('Carregando demonstração do Drone…');
  }

  function trySyncThenLoad() {
    if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
      pollExplorerStructureLabel();
      setStatus('Pronto — abra a montagem no Explorer e clique Varrer estrutura.', 'info');
      return;
    }
    if (APP_CONFIG.CAN_USE_ENOVIA_API) {
      syncOpenExplorerStructure(true);
      return;
    }
    if (isSnapshotDeliveryMode()) {
      if (BomService.getNodeCount() > 1) return;
      if (typeof BomSnapshot !== 'undefined' && BomSnapshot.applyBuiltinMont10) {
        return BomSnapshot.applyBuiltinMont10().then(function (meta) {
          APP_CONFIG.IMPORT_MODE = true;
          lastLoadedId = meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = meta.productName;
          refreshUI();
          setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
        });
      }
      return;
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
    pullExplorerSelection();
    var fromHash = typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.readHashSelection
      ? ProductExplorerBridge.readHashSelection()
      : null;
    if (fromHash && isValidPhysicalId(fromHash.physicalid)) {
      ProductExplorerBridge.setSelection(fromHash, { silent: true });
      var lbl = byId('selectionLabel');
      if (lbl) lbl.textContent = fromHash.displayName || fromHash.physicalid;
      loadBom(fromHash.physicalid);
      return;
    }
    var sel = ProductExplorerBridge.getSelection();
    if (sel && isValidPhysicalId(sel.physicalid)) {
      if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) {
        var q2 = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
        setStatus(
          githubApiBlockedMessage(sel.physicalid, sel.displayName || q2.structure),
          'warn'
        );
        return;
      }
      loadBom(sel.physicalid);
      return;
    }
    if (userRequestedRealProduct()) {
      applyUrlParamsToUI();
      var q3 = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
      var pid3 = q3.physicalid || APP_CONFIG.URL_PHYSICAL_ID;
      setStatus(githubApiBlockedMessage(pid3, q3.structure || q3.rootName), 'warn');
      return;
    }
    setStatus(
      'Selecione a raiz no Product Explorer → clique Varrer estrutura (API ENOVIA).',
      'info'
    );
    if (APP_CONFIG.EXPLORER_FALLBACK_MS === 0) return;
    window.setTimeout(function () {
      if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
        pilotAutoLoadFromExplorer();
        return;
      }
      if (APP_CONFIG.CAN_USE_ENOVIA_API) {
        syncOpenExplorerStructure(true);
        return;
      }
      pullExplorerSelection();
      var later = ProductExplorerBridge.getSelection();
      if (later && later.physicalid && later.physicalid !== lastLoadedId) {
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) return;
        loadBom(later.physicalid);
      }
    }, APP_CONFIG.EXPLORER_FALLBACK_MS || 800);
  }

  function isTrustedBoot() {
    if (root.__3DX_TRUSTED_WIDGET__) return true;
    try {
      if (typeof widget !== 'undefined' && widget) return true;
    } catch (e) { /* */ }
    if (APP_CONFIG.CROSS_ORIGIN_WIDGET === false) return true;
    return false;
  }

  function hasSnapshotConfigured() {
    if (APP_CONFIG.SNAPSHOT_URL) return true;
    return typeof BomSnapshot !== 'undefined' && BomSnapshot.getParamUrl && !!BomSnapshot.getParamUrl();
  }

  function bootstrapApisBackground() {
    var chain = PlatformContext.init();
    if (typeof WafBootstrap !== 'undefined') {
      chain = WafBootstrap.ensure().then(function () {
        return PlatformContext.init();
      });
    }
    return chain
      .then(function () {
        if (CompassServices.ensureWorkingSpaceUrl) {
          return CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId);
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        var space = spaceUrl || getTenantSpaceUrl();
        if (space) initAppCore(space);
        if (space) return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
        return null;
      })
      .catch(function (err) {
        console.warn('API background:', err);
      });
  }

  function bootstrapTrustedFast() {
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    APP_CONFIG.SNAPSHOT_DELIVERY_MODE = false;
    return bootstrapTrustedFastWithApis();
  }

  function bootstrapTrustedFastWithApis() {
    setStatus('Conectando APIs 3DEXPERIENCE… v' + (APP_CONFIG.BUILD || APP_CONFIG.VERSION), 'info');

    var chain = PlatformContext.init();
    if (typeof WafBootstrap !== 'undefined') {
      chain = WafBootstrap.ensure().then(function () {
        return PlatformContext.init();
      });
    }

    return chain
      .then(function () {
        if (CompassServices.ensureWorkingSpaceUrl) {
          return CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId);
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        var space = spaceUrl || getTenantSpaceUrl();
        if (!space) {
          throw new Error('URL 3DSpace não encontrada');
        }
        initAppCore(space);
        return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
      })
      .then(function () {
        if (APP_CONFIG.SNAPSHOT_URL) {
          return tryLoadSnapshotFirst().then(function () {
            if (BomService.getNodeCount() > 1) return;
            trySyncThenLoad();
          });
        }
        setStatus('Lendo estrutura aberta no Explorer…', 'info');
        trySyncThenLoad();
        return null;
      })
      .catch(function (err) {
        console.error(err);
        try {
          initAppCore(getTenantSpaceUrl());
        } catch (eInit) { /* */ }
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() <= 1) {
            setStatus('API indisponível — cole estrutura do Explorer ou use ?snapshot=', 'warn');
          }
        });
      });
  }

  function bootstrapCore() {
    if (isTrustedBoot() && APP_CONFIG.USE_FAST_BOOT !== false) {
      return bootstrapTrustedFast();
    }

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      try {
        initAppCore(null);
        runHealthCheck();
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() > 1) return;
          trySyncThenLoad();
        });
      } catch (err) {
        console.error(err);
        setStatus('Erro: ' + (err.message || err), 'error');
      }
      return Promise.resolve();
    }

    return PlatformContext.init()
      .then(function () {
        if (APP_CONFIG.DEMO_MODE) return 'demo';
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        return CompassServices.fetchCsrfToken(spaceUrl).then(function () { return spaceUrl; });
      })
      .then(function (spaceUrl) {
        initAppCore(spaceUrl);
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() > 1) return;
          trySyncThenLoad();
        });
      })
      .catch(function (err) {
        console.error(err);
        if (APP_CONFIG.DEMO_MODE) {
          initAppCore('demo');
          return loadBom('DEMO_ROOT_001');
        }
        initAppCore(getTenantSpaceUrl());
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() <= 1) runFallback();
          setStatus('API limitada: ' + (err.message || err), 'warn');
        });
      });
  }

  function setStatusPublic(msg, type) {
    setStatus(msg, type);
  }

  function run() {
    if (typeof WidgetRuntime !== 'undefined') WidgetRuntime.markTrusted();
    if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
    stripLegacyUI();
    var modeLabel =
      APP_CONFIG.WIDGET_MODE === 'additional_app'
        ? 'Additional App — API ENOVIA ativa'
        : APP_CONFIG.WIDGET_MODE === 'web_page_reader'
          ? 'Web Page Reader — só cola/Varrer (sem API)'
          : APP_CONFIG.WIDGET_MODE;
    setStatus('Modo: ' + modeLabel + ' | build ' + (APP_CONFIG.BUILD || ''), 'info');
    var fb = document.getElementById('bom-boot-fallback');
    if (fb && fb.parentNode) fb.parentNode.removeChild(fb);
    bootstrap().catch(function (err) {
      console.error('[App] bootstrap failed', err);
      setStatus('Erro: ' + (err.message || err), 'error');
      runFallback();
      forceStopLoading();
    });
  }

  function start() {
    run();
  }

  if (!root.__3DX_BOOT_DEFER__) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  function forceStopLoading() {
    setLoading(false);
    var ov = byId('loadingOverlay');
    if (ov) ov.classList.add('hidden');
  }

  return {
    run: run,
    start: start,
    runFallback: runFallback,
    runExplorerScan: runExplorerScan,
    runImportFromClipboard: runImportFromClipboard,
    rebindScanButton: rebindScanButton,
    rebindImportButton: rebindImportButton,
    reloadFromExplorer: reloadFromExplorer,
    loadBom: loadBom,
    loadSnapshotFromUrl: loadSnapshotFromUrl,
    applySnapshotPayload: applySnapshotPayload,
    loadPhysicalProduct: loadPhysicalProduct,
    refreshUI: refreshUI,
    setStatus: setStatusPublic,
    forceStopLoading: forceStopLoading
  };
})();
