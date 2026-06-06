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
 * ConfiguraÃƒÂ§ÃƒÂ£o central Ã¢â‚¬â€ ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.2.0',
    BUILD: 'bom20260606zg',
    /** Product Explorer conta ocorrencias; nao consolidar linhas repetidas por ID. */
    PRESERVE_OCCURRENCE_ROWS: true,
    /** Acima deste N peças, preferir API lazy mesmo sem physicalId inicial */
    API_PREFER_ABOVE: 20,
    /** Cloud FD02: dseng EngItem/EngInstance antes de dspfl/boM (evita 406) */
    API_ENG_BOM_FIRST: true,
    /** Fallback dspfl/PhysicalProduct para filhos so deve ser ligado explicitamente. */
    ALLOW_PHYSICAL_BOM_FALLBACK: false,
    /** 3DDashboard: nÃƒÂ£o espera probe CSRF (evita travar em "ConectandoÃ¢â‚¬Â¦") */
    SKIP_SPACE_PROBE: false,
    WAF_REQUEST_TIMEOUT_MS: 15000,
    SCAN_CONNECT_TIMEOUT_MS: 35000,
    /** Piloto: se API falhar no 3DDashboard, carrega snapshot validado (Mont10) */
    PILOT_FALLBACK_SNAPSHOT: true,
    /** Piloto: Varrer lÃƒÂª a ÃƒÂ¡rvore visÃƒÂ­vel do Explorer antes da API (evita 406) */
    PILOT_GRID_FIRST: false,
    /** Additional App: API dseng quando WAFData disponível */
    PILOT_BLOCK_API_UNLESS_ALLOWED: false,
    /** Tenant cloud: objetos usam prefixo prd-; BOM via dseng quando API_ENG_BOM_FIRST */
    CLOUD_PHYSICAL_ONLY: true,
    /** Fallback offline sÃƒÂ³ com ?snapshot= na URL */
    DEFAULT_SNAPSHOT_PATH: 'data/mont10.json',

    /** Se *-space falhar (DNS), tenta mesmo tenant via *-ifwe/enovia */
    SPACE_FALLBACK_VIA_IFWE: false,
    PREFER_IFWE_FIRST: false,
    ALLOW_IFWE_AS_3DSPACE: false,

    /** Tenant cloud: objetos usam prefixo prd- (ex. prd-R1132100929518-00511496) */
    PHYSICAL_ID_PREFIX: 'prd-',
    NORMALIZE_PRD_IDS: true,
    /** NÃƒÂ£o carrega BOM automÃƒÂ¡tico no boot Ã¢â‚¬â€ sÃƒÂ³ apÃƒÂ³s Varrer */
    WAIT_FOR_USER_SCAN: true,
    /** Piloto: grade Explorer primeiro; API sÃƒÂ³ com ?api=1 ou apÃƒÂ³s falha da grade */
    USE_API_SCAN_FIRST: false,
    /** 3DDashboard: Ctrl+C / ÃƒÂ¡rea de cola como fonte principal (qualquer projeto) */
    ALLOW_PASTE_FALLBACK: true,
    /** Snapshot Mont10/Drone sÃƒÂ³ se grade e cola falharem */
    PILOT_BUILTIN_LAST: true,
    SCAN_TIMEOUT_MS: 90000,
    /** Atualizar estrutura (manual): evita 90s de overlay */
    MANUAL_REFRESH_TIMEOUT_MS: 28000,
    MANUAL_REFRESH_TIMEOUT_SMALL_MS: 12000,
    /** Estruturas pequenas: sem auto-copy/scroll na grade */
    FAST_STRUCTURE_MAX: 12,
    SKIP_AUTO_COPY_BELOW: 12,
    SKIP_PRD_HTML_SCAN: true,
    /** Scroll na grade Explorer — limite para não travar o dashboard */
    SCROLL_HARVEST_MAX_STEPS: 36,
    SCROLL_HARVEST_STEP_MS: 80,
    /** TSV: espelho Explorer antes de cola (Mont10/Drone sem Ctrl+C) */
    SKIP_MIRROR_ON_TSV: false,
    /** Atualizar estrutura e acionado pelo usuario; tentar clipboard no clique e cair para Ctrl+V explicito. */
    SKIP_CLIPBOARD_READ: false,
    PASTE_TRAP_ENABLED: true,
    EXPLORER_AUTO_COPY_ENABLED: false,
    /** Fallback DOM manual só até N peças */
    DOM_MIRROR_MANUAL_MAX_EXPECTED: 12,
    AUTO_SCAN_ON_SELECTION: false,
    CAN_USE_ENOVIA_API: true,

    /** Somente Explorer Ã¢â€ â€™ grÃƒÂ¡ficos + tabela */
    EXPLORER_ONLY: true,
    UI_CLEAN: true,
    /** Oculta botÃƒÂ£o Varrer no widget (sÃƒÂ³ Importar Ctrl+C) */
    /** Oculta tag de build no widget (visÃƒÂ­vel sÃƒÂ³ com ?debug=1) */
    SHOW_BUILD_TAG: false,
    /** GrÃƒÂ¡ficos recolhidos por padrÃƒÂ£o Ã¢â‚¬â€ tabela ocupa o widget */
    CHARTS_EXPANDED: false,
    IMPORT_BUTTON_LABEL: 'Atualizar estrutura',
    SHOW_CHARTS: true,
    SHOW_RULES_PANEL: true,
    SHOW_TREE: false,
    SHOW_ISSUES_PANEL: false,
    SHOW_PLATFORM_SEARCH: false,
    AUTO_LOAD_DEMO_DRONE: false,
    DEMO_ON_API_FAIL: false,
    SNAPSHOT_FIRST: false,
    SNAPSHOT_DELIVERY_MODE: false,
    /** Poll tÃƒÂ­tulo do Explorer no dashboard (estrutura aberta) */
    /** Piloto: sync automÃƒÂ¡tico gera centenas de 406 Ã¢â‚¬â€ sÃƒÂ³ Varrer manual */
    /** Espelho Explorer: cola só se iframe inacessível */
    EXPLORER_MIRROR_AUTO_SYNC: false,
    EXPLORER_MIRROR_BLOCK_PASTE: true,
    /** Fase C: poll Explorer (só recarrega se estrutura/contagem mudar) */
    AUTO_SYNC_EXPLORER_MS: 0,
    /** Auto-sync: TSV/mirror com copy na grade (sem API — evita 406 em massa) */
    AUTO_SYNC_ALLOW_COPY: false,
    AUTO_SYNC_PREFER_API: false,
    AUTO_SYNC_PREFER_PASTE: false,
    /** Acima de N peças: auto-sync só com cola na área (evita tabela 0/20) */
    AUTO_SYNC_REQUIRE_PASTE_ABOVE: 12,
    AUTO_REFRESH_ON_STRUCTURE_CHANGE: false,
    /** Sprint 2.5 — TSV fast-path até N peças; acima disso API lazy */
    FAST_TSV_MAX: 500,
    PRIMARY_LOADER: 'tsv',
    /** Additional App trusted: tentar API antes de TSV no Atualizar */
    PREFER_API_ON_MANUAL_REFRESH: false,
    /** Sprint 2.5 item 6: espelho DOM/innerText nunca como primary */
    USE_DOM_MIRROR_PRIMARY: false,
    /** Fallback DOM reprovado como fonte de produto: iframe/grid virtualizada geram parciais. */
    DOM_MIRROR_FALLBACK: false,
    PILOT_API_TREE_DEPTH: 1,
    STRUCTURE_SYNC_DEBOUNCE_MS: 2200,
    AUTO_SYNC_TIMEOUT_MS: 24000,
    SKIP_PP_ENRICH: true,
    BOM_FAST_DEPTH: 3,
    USE_FAST_BOOT: true,
    /** Se Explorer nÃƒÂ£o responder em N ms, carrega produto padrÃƒÂ£o do tenant */
    EXPLORER_FALLBACK_MS: 3000,

    /** Limite de nÃƒÂ³s na ÃƒÂ¡rvore (proteÃƒÂ§ÃƒÂ£o memÃƒÂ³ria) */
    BOM_MAX_NODES: 1000000,

    /** Filhos carregados por requisiÃƒÂ§ÃƒÂ£o lazy */
    BOM_LAZY_BATCH_SIZE: 100,
    /** Throttle mensagens de progresso API lazy (ms) */
    API_PROGRESS_THROTTLE_MS: 350,

    /** Profundidade inicial automÃƒÂ¡tica */
    BOM_INITIAL_DEPTH: 3,

    /** Debounce busca/filtros (ms) */
    SEARCH_DEBOUNCE_MS: 280,

    /** Auto-refresh quando seleÃƒÂ§ÃƒÂ£o muda (ms); 0 = desligado */
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
     * key = campo no modelo interno; label = cabeÃƒÂ§alho na tabela.
     */
    /** Tabela compacta no modo UI_CLEAN */
    PILOT_TABLE_COLUMNS: [
      { key: '_thumb', label: '', format: 'thumb', width: 44 },
      { key: 'name', label: 'T\u00edtulo' },
      { key: 'title', label: 'Descri\u00e7\u00e3o' },
      { key: 'revision', label: 'Revis\u00e3o' },
      { key: 'owner', label: 'Propriet\u00e1rio' },
      { key: 'maturity', label: 'Estado de maturidade', format: 'status' }
    ],

    PRODUCT_EXPLORER_COLUMNS: [
      { key: 'level', label: 'N\u00edvel', width: 48 },
      { key: 'name', label: 'Nome' },
      { key: 'title', label: 'T\u00edtulo' },
      { key: 'description', label: 'Descri\u00e7\u00e3o' },
      { key: 'displayType', label: 'Tipo exibido' },
      { key: 'type', label: 'Tipo' },
      { key: 'revision', label: 'Revis\u00e3o' },
      { key: 'state', label: 'Estado' },
      { key: 'maturity', label: 'Maturidade' },
      { key: 'approval', label: 'Aprova\u00e7\u00e3o' },
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

    /** RelaÃƒÂ§ÃƒÂµes expand REST */
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
        'Em Desenvolvimento', 'IN WORK', 'WIP', 'Em progresso',
        'Em Espera', 'Em espera', 'ON HOLD', 'On Hold', 'HOLD', 'Waiting'
      ],
      OBSOLETE: ['OBSOLETE', 'Obsolete', 'ABANDONED', 'Obsoleto', 'OBSOLETO']
    },

    /** Texto exibido no painel de regras (alinhado a MATURITY_STATES) */
    MATURITY_RULES_STATIC: [
      { level: 'good', label: 'Bom (verde)', states: 'Aprovado, Released, Frozen, Approved' },
      { level: 'moderate', label: 'Moderado (amarelo)', states: 'Em Trabalho, Em Espera, In Work, IN_WORK, WIP' },
      { level: 'bad', label: 'Ruim (vermelho)', states: 'Obsoleto, OBSOLETE, Abandoned' },
      { level: 'other', label: 'Outros (cinza)', states: 'Estado vazio ou n\u00e3o reconhecido no tenant' }
    ],

    /** Tipos considerados assembly */
    ASSEMBLY_TYPES: [
      'VPMReference',
      'Provide',
      'Physical Product',
      'dspfl:PhysicalProduct',
      'dseng:EngItem',
      'Product',
      'Assembly'
    ],

    /** Tenant / collabspace extraÃƒÂ­dos do seu link 3DEXPERIENCE (override via deep-link) */
    TENANT_DEFAULTS: {
      envId: 'R1132100929518',
      securityContext: 'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO',
      platformHost: 'r1132100929518-us1-ifwe.3dexperience.3ds.com',
      spaceHost: 'r1132100929518-us1-space.3dexperience.3ds.com',
      defaultPhysicalId: '132FB3CE26D70E006A18D1870000316D',
      defaultDisplayName: '01_SKA_Drone Assembly_130520208'
    },

    /**
     * Fallback nome Ã¢â€ â€™ prd- (cloud). Prioridade: ler prd- dinÃƒÂ¢mico do Explorer (Recentes).
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

    /** Sprint 3 — visualização 3D no painel direito do widget (não widget 3DPlay separado) */
    THREE_DPLAY: {
      ENABLED: true,
      /** Additional App (GitHub iframe): módulos 3DPlay AMD não carregam — usar preview 2D */
      EMBED_PLAYER: false,
      PREFER_2D_IN_PANEL: true,
      /** Visualização só no painel do BOM — não exige widget 3DPlay no dashboard */
      ALLOW_EXTERNAL_WIDGET_FALLBACK: false,
      APP_IDS: ['SWX3DPlay_AP', 'X3DPlay_AP', 'ENX3DPlay_AP'],
      DEFAULT_OBJECT_TYPE: 'Physical Product',
      PUSH_TIMEOUT_MS: 800,
      WIDGET_HINT: 'Pré-visualização 2D no painel (3DPlay embutido indisponível neste widget).'
    },

    MEDIA: {
      AUTO_LOAD_THUMBNAILS: false,
      BUILD_GETPICTURE_URLS: false
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
    APP_CONFIG.CAN_USE_ENOVIA_API = !!(
      typeof WAFData !== 'undefined' && WAFData.authenticatedRequest
    );
    APP_CONFIG.WIDGET_MODE = APP_CONFIG.CROSS_ORIGIN_WIDGET ? 'github_pages_no_api' : 'external';
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
      APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD = true;
      APP_CONFIG.CLOUD_PHYSICAL_ONLY = true;
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
    var host = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return 'https://' + host + '/enovia';
  }

  /**
   * Envia busca para o 3DDashboard (barra "Pesquisar" / 3DSearch).
   * Additional App pode repassar postMessage ao dashboard pai em alguns tenants.
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
      Accept: 'application/json',
      'Content-Type': 'application/json',
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
    var sh = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost;
    var u = String(url || '').replace(/\/$/, '');
    if (sh && ih && u.indexOf(ih) >= 0) {
      u = u.replace(ih, sh);
    }
    if (!u || (env && u.indexOf(env) < 0)) {
      return tenantSpaceUrl() ? tenantSpaceUrl().replace(/\/$/, '') : u;
    }
    if (sh && u.indexOf(sh) >= 0 && !/\/enovia(?:\/|$)/i.test(u)) {
      u += '/enovia';
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
    add(normalizeSpaceUrl(primary));
    add(tenantSpaceUrl());
    if (APP_CONFIG.ALLOW_IFWE_AS_3DSPACE === true && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      add(ifweSpaceUrl());
    }
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
    if (APP_CONFIG.ALLOW_IFWE_AS_3DSPACE !== true) return null;
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

  function ensure3DSpaceServiceUrl(platformId) {
    if (cache.spaceUrlVerified && cache.spaceUrl) {
      return Promise.resolve(cache.spaceUrl);
    }
    cache.spaceUrlVerified = false;
    return get3DSpaceUrl(platformId).then(function (primary) {
      var candidates = spaceUrlCandidates(primary);
      if (APP_CONFIG.SKIP_SPACE_PROBE) {
        return applyVerifiedSpaceUrl(candidates[0] || primary);
      }
      return probeCandidates(candidates).catch(function () {
        if (primary) return applyVerifiedSpaceUrl(primary);
        return Promise.reject(new Error('3DSpace inacessivel via Compass.'));
      });
    });
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
      cache.spaceUrl = normalizeSpaceUrl(PlatformBridge.getSpaceUrl());
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
    ensureWorkingSpaceUrl: ensure3DSpaceServiceUrl,
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

  function getWafFromWidget() {
    try {
      if (global.widget && global.widget.WAFData && global.widget.WAFData.authenticatedRequest) {
        return global.widget.WAFData;
      }
    } catch (eW) { /* */ }
    return null;
  }

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
      var fromWidget = getWafFromWidget();
      if (fromWidget) {
        global.WAFData = fromWidget;
        resolve({ WAFData: fromWidget });
        return;
      }
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) {
        resolve({ WAFData: WAFData });
        return;
      }

      var attempts = 0;
      var maxAttempts = 24;

      function tryRequire() {
        var req = getRequire();
        if (!req) {
          attempts++;
          if (attempts < maxAttempts) {
            window.setTimeout(tryRequire, 250);
            return;
          }
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
          attempts++;
          if (attempts < maxAttempts) {
            window.setTimeout(tryRequire, 250);
            return;
          }
          reject(err || new Error('Falha ao carregar módulos DS (WAFData)'));
        });
      }

      tryRequire();
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
    if (APP_CONFIG.ALLOW_IFWE_AS_3DSPACE !== true) return null;
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
    if (/ResponseCode.*406|\b406\b/i.test(msg || '')) return true;
    return /ResponseCode.*(403|400)|\b403\b|\b400\b/i.test(msg || '');
  }

  function mustUseIfweOnly() {
    return APP_CONFIG.ALLOW_IFWE_AS_3DSPACE === true && APP_CONFIG.FORCE_IFWE_AS_3DSPACE === true;
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
    if (
      APP_CONFIG.CLOUD_PHYSICAL_ONLY &&
      APP_CONFIG.API_ENG_BOM_FIRST === false &&
      /\/dseng\/dseng:EngItem\//i.test(url)
    ) {
      throw new Error(
        'EngItem bloqueado (tenant cloud). Ative API_ENG_BOM_FIRST ou atualize o bundle: ' +
          (APP_CONFIG.BUILD || 'bom20260606f')
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
    if (String(method || '').toUpperCase() === 'GET') {
      var st =
        typeof PlatformContext !== 'undefined' && PlatformContext.getState
          ? PlatformContext.getState()
          : {};
      headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
      if (st && st.securityContext) headers.SecurityContext = st.securityContext;
    }

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
            try {
              if (!window.__3DX_API_DIAG__) window.__3DX_API_DIAG__ = [];
              window.__3DX_API_DIAG__.push({
                ts: new Date().toISOString(),
                step: 'WAF ' + method,
                ok: false,
                detail: msg,
                url: targetUrl
              });
            } catch (eDiag) { /* */ }
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
              msg =
                'EngItem não suportado neste tenant. Use build ' +
                (APP_CONFIG.BUILD || 'bom20260602f') +
                ' (' +
                msg +
                ')';
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
    try {
      if ((location.hostname || '').toLowerCase().indexOf('ifwe') >= 0) {
        if (typeof CompassServices !== 'undefined' && CompassServices.tenantSpaceUrl) {
          return CompassServices.tenantSpaceUrl();
        }
      }
    } catch (e) { /* */ }
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

  function engInstanceChildrenUrl(parentPhysicalId, skip, top, expand) {
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?$skip=' + skip + '&$top=' + top
    );
    if (expand) url += '&$expand=' + encodeURIComponent(expand);
    return url;
  }

  function engInstanceDetailUrl(parentPhysicalId, instanceId, expand) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance/' + encodeURIComponent(apiId(instanceId))
    );
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return url;
  }

  function engItemSearchUrl(term, top) {
    ensureRestBase();
    top = top || (APP_CONFIG.SEARCH && APP_CONFIG.SEARCH.TOP) || 40;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/search?searchStr=' +
      encodeURIComponent(term) + '&$top=' + top
    );
  }

  function engItemUqlSearchUrl(query, top) {
    ensureRestBase();
    top = top || (APP_CONFIG.SEARCH && APP_CONFIG.SEARCH.TOP) || 40;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/search?$searchStr=' +
      encodeURIComponent(query) + '&$top=' + top
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
    var eng = member['dseng:engItem'] || member['dseng:EngItem'] || member.reference;
    if (eng && typeof eng === 'object') {
      return eng.physicalid || eng.id || null;
    }
    return member.physicalid || member.id || null;
  }

  function textOf(obj, key) {
    return String((obj && obj[key]) || '').trim();
  }

  function lowerText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeDateMs(value) {
    if (!value) return 0;
    var d = value instanceof Date ? value : new Date(value);
    var t = d.getTime();
    return isNaN(t) ? 0 : t;
  }

  function scoreEngItemCandidate(item, expected, hints) {
    hints = hints || {};
    var score = 0;
    var exp = lowerText(expected);
    var id = textOf(item, 'id');
    var physical = textOf(item, 'physicalid');
    var name = textOf(item, 'name');
    var title = textOf(item, 'title');
    var desc = textOf(item, 'description');
    var nameLow = lowerText(name);
    var titleLow = lowerText(title);
    var descLow = lowerText(desc);

    if (id === expected || physical === expected || name === expected || title === expected) score += 1000;
    if (exp && titleLow === exp) score += 220;
    if (exp && nameLow === exp) score += 180;
    if (exp && descLow === exp) score += 80;
    /*
     * Product Structure Explorer exposes cloud physical objects as prd-R...
     * When dseng search returns several VPMReference candidates with the same
     * label, prefer the candidate whose name is the actual cloud physical id.
     */
    if (/^prd-/i.test(name)) score += 180;
    if (/^\d{6,}$/i.test(name)) score -= 20;

    var hintOwner = lowerText(hints.owner);
    var hintCollab = lowerText(hints.collabspace || hints.collabSpace);
    var hintOrg = lowerText(hints.organization);
    var hintRevision = lowerText(hints.revision);
    var hintCestamp = lowerText(hints.cestamp);

    if (hintOwner && lowerText(item.owner) === hintOwner) score += 30;
    if (hintCollab && lowerText(item.collabspace || item.collabSpace) === hintCollab) score += 30;
    if (hintOrg && lowerText(item.organization) === hintOrg) score += 12;
    if (hintRevision && lowerText(item.revision) === hintRevision) score += 12;
    if (hintCestamp && lowerText(item.cestamp) === hintCestamp) score += 25;

    var parentCreated = normalizeDateMs(hints.created);
    var itemCreated = normalizeDateMs(item.created || item.originated);
    if (parentCreated && itemCreated) {
      var days = Math.abs(parentCreated - itemCreated) / 86400000;
      if (days <= 1) score += 35;
      else if (days <= 14) score += 18;
      else if (days <= 60) score += 8;
    }

    var parentModified = normalizeDateMs(hints.modified);
    var itemModified = normalizeDateMs(item.modified);
    if (parentModified && itemModified) {
      var modDays = Math.abs(parentModified - itemModified) / 86400000;
      if (modDays <= 1) score += 20;
      else if (modDays <= 14) score += 10;
    }

    return score;
  }

  function chooseExactEngItem(res, expected, hints) {
    expected = String(expected || '').trim();
    var members = extractMembers(res);
    if (!members.length) return null;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (
        textOf(m, 'id') === expected ||
        textOf(m, 'physicalid') === expected ||
        textOf(m, 'name') === expected ||
        textOf(m, 'title') === expected
      ) {
        var score = scoreEngItemCandidate(m, expected, hints);
        if (score > bestScore) {
          best = m;
          bestScore = score;
        }
      }
    }
    if (best) return best;
    if (members.length === 1) return members[0];
    for (var j = 0; j < members.length; j++) {
      var candidateScore = scoreEngItemCandidate(members[j], expected, hints);
      if (candidateScore > bestScore) {
        best = members[j];
        bestScore = candidateScore;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function quoteUql(value) {
    return '"' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function getEngItemUqlSearch(query, top) {
    return WafClient.get(engItemUqlSearchUrl(query, top));
  }

  function findEngItemByLabel(label, top, hints) {
    var expected = String(label || '').trim();
    if (!expected) return Promise.reject(new Error('Label vazio para resolver EngItem.'));
    return getEngItemUqlSearch('label:' + quoteUql(expected), top || 20)
      .then(function (res) {
        var exact = chooseExactEngItem(res, expected, hints);
        if (!exact) throw new Error('EngItem nao encontrado por label: ' + expected);
        return exact;
      });
  }

  function resolveEngItemMember(input, titleHint) {
    input = String(input || '').trim();
    titleHint = String(titleHint || '').trim();
    if (!input && !titleHint) return Promise.reject(new Error('Raiz vazia para resolver EngItem.'));

    function byInput() {
      if (!input) return Promise.reject(new Error('Sem physicalId para busca UQL.'));
      return getEngItemUqlSearch('name:' + input, 20)
        .then(function (res) {
          var exact = chooseExactEngItem(res, input);
          if (exact) return exact;
          throw new Error('Sem match exato por name.');
        })
        .catch(function () {
          return getEngItemUqlSearch(input, 20).then(function (res) {
            var exact = chooseExactEngItem(res, input);
            if (exact) return exact;
            throw new Error('Sem match exato por physicalId.');
          });
        });
    }

    function byTitle() {
      if (!titleHint) return Promise.reject(new Error('Sem titulo para busca UQL.'));
      return findEngItemByLabel(titleHint, 20);
    }

    return byInput().catch(byTitle);
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

  function isCloudPrdId(id) {
    return /^prd-R\d{10,}-/i.test(String(id || ''));
  }

  function preferEngChildrenForParent(parentId) {
    if (APP_CONFIG.API_ENG_BOM_FIRST === false) return false;
    return true;
  }

  function preferEngBomApi() {
    return APP_CONFIG.API_ENG_BOM_FIRST !== false;
  }

  /** Cloud FD02 — dseng EngItem primeiro; Physical Product só para resolver bomRootId. */
  function getProductRoot(physicalId, expand) {
    var ids = candidateRootIds(physicalId);

    function pack(res, bomRootId) {
      return { member: res.member || res, bomRootId: bomRootId || null };
    }

    function packResolved(member) {
      var id = member && (member.id || member.physicalid);
      if (!id) return Promise.reject(new Error('EngItem resolvido sem id.'));
      return getEngItem(id, expand).then(function (res) {
        return pack(res, id);
      });
    }

    function tryResolved(i) {
      if (i >= ids.length) return Promise.reject(new Error('Raiz nao resolvida por UQL.'));
      return resolveEngItemMember(ids[i], null)
        .then(packResolved)
        .catch(function () {
          return tryResolved(i + 1);
        });
    }

    function tryEng(i) {
      if (i >= ids.length) return tryPrd(0);
      var id = ids[i];
      return getEngItem(id, expand)
        .then(function (res) {
          return pack(res, id);
        })
        .catch(function () {
          return tryEng(i + 1);
        });
    }

    function tryPrd(i) {
      if (i >= ids.length) {
        return Promise.reject(new Error('Raiz não encontrada para ' + physicalId));
      }
      var id = ids[i];
      return getPhysicalProduct(id, null)
        .then(function (res) {
          var engId = extractEngItemIdFromResponse(res) || id;
          return pack(res, engId);
        })
        .catch(function () {
          return getVpmReference(id, null)
            .then(function (res) {
              return pack(res, id);
            })
            .catch(function () {
              return tryPrd(i + 1);
            });
        });
    }

    if (isCloudPrdId(physicalId)) {
      return tryResolved(0).catch(function () {
        return tryPrd(0).catch(function () {
          return tryEng(0);
        });
      });
    }
    for (var ci = 0; ci < ids.length; ci++) {
      if (isCloudPrdId(ids[ci])) {
        return tryResolved(0).catch(function () {
          return tryPrd(0).catch(function () {
            return tryEng(0);
          });
        });
      }
    }
    if (preferEngBomApi()) return tryEng(0);
    return tryPrd(0).catch(function () {
      return tryEng(0);
    });
  }

  function getPhysicalProductChildren(parentPhysicalId, skip, top) {
    if (APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK !== true) {
      return Promise.reject(new Error('Fallback PhysicalProduct desabilitado; use dseng EngInstance.'));
    }
    ensureRestBase();
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var id = encodeURIComponent(apiId(parentPhysicalId));
    var base = restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + id;
    var urls = [
      base + '/dspfl:Part?$skip=' + skip + '&$top=' + top,
      base + '/dspfl:Instance?$skip=' + skip + '&$top=' + top,
      base + '/boM?$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Part&$skip=' + skip + '&$top=' + top,
      base + '?$expand=dspfl:Instance&$skip=' + skip + '&$top=' + top,
      base + '?$expand=boM&$skip=' + skip + '&$top=' + top,
      base + '?$expand=boM,dspfl:Part&$skip=' + skip + '&$top=' + top
    ];
    function tryUrl(i) {
      if (i >= urls.length) {
        return Promise.reject(new Error('Filhos indisponíveis (406) para ' + parentPhysicalId));
      }
      return WafClient.get(urls[i]).catch(function () {
        return tryUrl(i + 1);
      });
    }
    return tryUrl(0);
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
    engItemUrl: engItemUrl,
    engInstanceChildrenUrl: engInstanceChildrenUrl,
    engInstanceDetailUrl: engInstanceDetailUrl,
    physicalProductUrl: physicalProductUrl,
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    preferEngBomApi: preferEngBomApi,
    preferEngChildrenForParent: preferEngChildrenForParent,
    isCloudPrdId: isCloudPrdId,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductChildren: getPhysicalProductChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemSearchUrl: engItemSearchUrl,
    engItemUqlSearchUrl: engItemUqlSearchUrl,
    getEngItemUqlSearch: getEngItemUqlSearch,
    findEngItemByLabel: findEngItemByLabel,
    resolveEngItemMember: resolveEngItemMember
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

  /** Só texto do iframe Explorer — evita ingerir BOM Analytics / filtros / gráficos. */
  function harvestExplorerTextOnly() {
    var doc = readExplorerIframeDocument();
    if (doc && doc.body) {
      try {
        return String(doc.body.innerText || doc.body.textContent || '').trim();
      } catch (e0) { /* */ }
    }
    return harvestExplorerWidgetTextFromDashboard();
  }

  /** Recorta painel do widget Product Structure Explorer no dashboard (sem iframe). */
  function harvestExplorerWidgetTextFromDashboard() {
    try {
      var doc = window.top && window.top.document;
      if (!doc || !doc.body) return '';
      var nodes = doc.querySelectorAll(
        'div, section, article, [class*="widget"], [class*="Widget"], [class*="dashboard-tab"]'
      );
      var i;
      var best = '';
      var bestScore = 0;
      for (i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var t = String(el.innerText || el.textContent || '').trim();
        if (t.length < 40 || t.length > 120000) continue;
        if (t.indexOf('Product Structure Explorer') < 0 && t.indexOf('Structure Explorer') < 0) continue;
        if (t.indexOf('BOM Analytics') >= 0) continue;
        var score = 0;
        if (/t[ií]tulo/i.test(t)) score += 3;
        if (/propriet/i.test(t)) score += 2;
        if (/revis/i.test(t)) score += 1;
        if (/\d+\s*objetos?\b/i.test(t)) score += 2;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
      return best;
    } catch (e) { /* */ }
    return '';
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

  var PRD_ID_RE = /prd-R\d{10,}-[A-Za-z0-9]+/i;

  function extractPrdFromText(text) {
    var m = String(text || '').match(PRD_ID_RE);
    return m ? m[0] : '';
  }

  function extractPrdFromDomRow(row) {
    if (!row) return '';
    var fromText = extractPrdFromText(row.innerText || row.textContent || '');
    if (fromText) return fromText;
    try {
      return extractPrdFromText(row.outerHTML || '');
    } catch (e) {
      return '';
    }
  }

  function mergePrdCatalogFromText(text, catalog) {
    catalog = catalog || {};
    var lines = String(text || '').split('\n');
    var prdRe = PRD_ID_RE;
    var nameRe = /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_ENDERSW-[A-Za-z0-9\-]{2,80})\b/i;
    var lastName = '';
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line) continue;
      var nm = line.match(nameRe);
      if (nm) lastName = nm[1] || nm[0];
      var prdM = line.match(prdRe);
      if (prdM && lastName) {
        catalog[lastName] = prdM[0];
        if (lastName.length > 24) catalog[lastName.slice(0, 24)] = prdM[0];
      }
    }
    return catalog;
  }

  /** Explorer: linha prd- logo após o título da peça (copy/grid). */
  function mergePrdCatalogFromAdjacentLines(text, catalog) {
    catalog = catalog || {};
    var lines = String(text || '').split('\n');
    var pendingPrd = '';
    var lastName = '';
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = String(lines[i] || '').trim();
      if (!line) continue;
      var prdOnly = line.match(PRD_ID_RE);
      if (prdOnly && String(line).replace(prdOnly[0], '').trim().length < 4) {
        pendingPrd = prdOnly[0];
        continue;
      }
      if (isExplorerColumnHeaderLine(line) || isMirrorUiNoise(line)) continue;
      if (/^\d+\s*(?:of|de)\s*\d+\s*(?:selected|selecionado)/i.test(line)) continue;
      var partM = line.match(EXPLORER_PART_LINE) || line.match(EXPLORER_NAME_LINE);
      var displayName = '';
      if (partM) displayName = partM[1];
      else if (isValidMirrorPartName(line) && !isPersonName(line)) displayName = line;
      else if (
        line.length >= 4 && line.length <= 96 && !isPersonName(line) &&
        !/^\d+[.,]\d+/.test(line) && line.indexOf('|') < 0
      ) {
        displayName = line;
      }
      if (displayName) {
        lastName = displayName;
        var next = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
        var prdNext = extractPrdFromText(next);
        if (prdNext) {
          catalog[lastName] = prdNext;
          if (lastName.length > 24) catalog[lastName.slice(0, 24)] = prdNext;
          pendingPrd = '';
          continue;
        }
        if (pendingPrd) {
          catalog[lastName] = pendingPrd;
          if (lastName.length > 24) catalog[lastName.slice(0, 24)] = pendingPrd;
          pendingPrd = '';
        }
      }
    }
    return catalog;
  }

  function buildPrdCatalogFromExplorerHtml(doc) {
    var catalog = {};
    if (!doc) return catalog;
    try {
      var html = String(doc.documentElement && doc.documentElement.innerHTML || '');
      var maxHtml = (APP_CONFIG && APP_CONFIG.PRD_HTML_SCAN_MAX_CHARS) || 250000;
      if (html.length > maxHtml) html = html.slice(0, maxHtml);
      if (html.length < 80) return catalog;
      var re = /([\wÀ-ú][\wÀ-ú0-9 _.\-]{3,72})\D{0,48}(prd-R\d{10,}-[A-Za-z0-9]+)/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var name = String(m[1] || '').trim();
        var prd = m[2];
        if (!name || !prd || isPersonName(name)) continue;
        if (/^(physical|product|reference|title|revision)$/i.test(name)) continue;
        catalog[name] = prd;
        if (name.length > 24) catalog[name.slice(0, 24)] = prd;
      }
    } catch (eHtml) { /* */ }
    return catalog;
  }

  function buildPrdCatalogFull() {
    var catalog = buildPrdCatalogFromExplorer();
    if (!(APP_CONFIG && APP_CONFIG.SKIP_PRD_HTML_SCAN)) {
      var doc = readExplorerIframeDocument();
      if (doc) {
        var fromHtml = buildPrdCatalogFromExplorerHtml(doc);
        Object.keys(fromHtml).forEach(function (k) {
          catalog[k] = fromHtml[k];
        });
      }
    }
    var text = harvestExplorerTextOnly() || harvestExplorerWidgetTextFromDashboard() || harvestAllExplorerText();
    mergePrdCatalogFromText(text, catalog);
    mergePrdCatalogFromAdjacentLines(text, catalog);
    return catalog;
  }

  function catalogLookupPrd(catalog, name) {
    if (!name || !catalog) return '';
    var key = String(name).trim();
    if (catalog[key]) return catalog[key];
    var tLow = key.toLowerCase();
    var found = '';
    Object.keys(catalog).forEach(function (k) {
      if (found) return;
      var nLow = k.toLowerCase();
      if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
        found = catalog[k];
      }
    });
    return found;
  }

  function enrichItemWithPrd(item, catalog) {
    if (!item) return item;
    catalog = catalog || buildPrdCatalogFull();
    var names = [item.name, item.title, item.displayName].filter(Boolean);
    var prd = item.sourcePhysicalId && isPrdCloudId(item.sourcePhysicalId)
      ? item.sourcePhysicalId
      : '';
    var i;
    if (!prd) {
      for (i = 0; i < names.length; i++) {
        prd = catalogLookupPrd(catalog, names[i]) || lookupRegistryId(names[i], true) || '';
        if (prd) break;
      }
    }
    if (prd && isPrdCloudId(prd)) {
      item.sourcePhysicalId = prd;
    }
    return item;
  }

  function enrichItemsWithPrd(items) {
    if (!items || !items.length) return items;
    var catalog = buildPrdCatalogFull();
    items.forEach(function (it) {
      enrichItemWithPrd(it, catalog);
    });
    return items;
  }

  function applyPrdToIndex(index) {
    if (!index) return index;
    var catalog = buildPrdCatalogFull();
    Object.keys(index).forEach(function (k) {
      enrichItemWithPrd(index[k], catalog);
      if (typeof PartImage !== 'undefined' && PartImage.buildGetPictureUrl && index[k].sourcePhysicalId) {
        if (!index[k].iconUrl) {
          index[k].iconUrl = PartImage.buildGetPictureUrl(index[k].sourcePhysicalId);
        }
      }
    });
    return index;
  }

  function enrichNodeWithPrd(node) {
    if (!node) return node;
    enrichItemWithPrd(node, buildPrdCatalogFull());
    return node;
  }

  function lookupPrdByPartName(name) {
    if (!name) return '';
    var catalog = buildPrdCatalogFull();
    var key = String(name).trim();
    if (catalog[key]) return catalog[key];
    var tLow = key.toLowerCase();
    var found = '';
    Object.keys(catalog).forEach(function (k) {
      if (found) return;
      var nLow = k.toLowerCase();
      if (nLow === tLow || nLow.indexOf(tLow) >= 0 || tLow.indexOf(nLow) >= 0) {
        found = catalog[k];
      }
    });
    if (found) return found;
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    return reg[key] || reg[tLow] || reg[key.toUpperCase()] || '';
  }

  var EXPLORER_SKIP_LINE =
    /^(physical product|em trabalho|aprovado|released|frozen|in work|approved|owner|organization|revision|type|maturity|enderson|moura|vplm|recents|open |product structure|enovia|access your|n\/d|—|-|login|user)$/i;
  var EXPLORER_PART_LINE = /^(\d{2}_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/;
  var EXPLORER_NAME_LINE = /^(Mont\d+[A-Za-z0-9_.\-]{0,40}|01_SKA_[A-Za-z0-9_.\-]{2,80}|SKA_ENDERSW-[A-Za-z0-9][A-Za-z0-9_.\-]{2,80}|SKA_[A-Za-z0-9][A-Za-z0-9_.\-]{2,80})/i;

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
      /\b(01_SKA_[A-Za-z0-9][A-Za-z0-9_. \-]{2,80})\b/gi,
      /\b(SKA_ENDERSW-[A-Za-z0-9][A-Za-z0-9_. \-]{2,80})\b/gi,
      /\b(Mont\d+[A-Za-z0-9_.]{0,40})\b/gi
    ];
    var p;
    for (p = 0; p < patterns.length; p++) {
      var re = patterns[p];
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(String(text || ''))) !== null) {
        var name = String(m[1]).replace(/\.{2,}$/, '').trim();
        if (name.length < 5) continue;
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

  function scrapeExplorerTreeItems(doc, rootName, items, seen, rootMeta) {
    if (!doc || !doc.querySelectorAll) return 0;
    function inExplorerPanel(el) {
      var p = el;
      var depth = 0;
      while (p && depth < 14) {
        var t = String(p.innerText || p.textContent || '').slice(0, 800);
        if (t.indexOf('BOM Analytics') >= 0) return false;
        if (/Product Structure Explorer|Structure Explorer/i.test(t)) return true;
        p = p.parentElement;
        depth++;
      }
      return false;
    }
    var nodes = doc.querySelectorAll('[role="treeitem"], [role="row"]');
    var added = 0;
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!inExplorerPanel(el)) continue;
      var raw = String(el.getAttribute && el.getAttribute('aria-label') || '').trim();
      if (!raw) raw = String(el.innerText || el.textContent || '').trim();
      if (!raw || raw.length > 140) continue;
      raw = raw.split('\n')[0].replace(/\.{2,}$/, '').trim();
      if (!raw || isMirrorUiNoise(raw)) continue;
      var name = partNameFromText(raw) || raw;
      if (!isValidMirrorPartName(name)) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var rowText = String(el.innerText || el.textContent || '');
      var revM = rowText.match(/\b(\d+\.\d+)\b/);
      var maturity = '—';
      if (/aprovado|released|frozen/i.test(rowText)) maturity = 'Aprovado';
      else if (/em\s*trabalh|in\s*work/i.test(rowText)) maturity = 'Em Trabalho';
      var before = items.length;
      pushGridItem(items, seen, buildMirrorRow(name, 1, items.length, {
        title: name,
        revision: revM ? revM[1] : ((rootMeta && rootMeta.revision) || '1.1'),
        owner: (rootMeta && rootMeta.owner) || '',
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: maturity
      }));
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected) {
    if (expected > 0 && items.length >= expected) return;
    var iframeText = harvestExplorerTextOnly() || '';
    var dashText = harvestExplorerWidgetTextFromDashboard() || '';
    var allText = iframeText + '\n' + dashText;
    var doc = readExplorerIframeDocument();
    var topDoc = null;
    try {
      topDoc = window.top && window.top.document;
    } catch (eTop) { /* */ }
    if (doc) scrapeExplorerTreeItems(doc, rootName, items, seen, rootMeta);
    if (topDoc) scrapeExplorerTreeItems(topDoc, rootName, items, seen, rootMeta);
    if (dashText) {
      scrapeExplorerTreeLines(dashText.split('\n'), rootName, items, seen);
    }
    if (allText) {
      scrapeExplorerTreeLines(allText.split('\n'), rootName, items, seen);
    }
    scrapeDashboardLeafRows(rootName, items, seen);
    var fromRegex = parsePartNamesFromText(allText, rootName);
    var ri;
    for (ri = 0; ri < fromRegex.length; ri++) {
      var nm = fromRegex[ri];
      pushGridItem(items, seen, buildMirrorRow(nm, 1, items.length, {
        title: nm,
        revision: (rootMeta && rootMeta.revision) || '1.1',
        owner: (rootMeta && rootMeta.owner) || '',
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: '—'
      }));
    }
  }

  function readExplorerIframeElement() {
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
          return frame;
        }
      }
    }
    return null;
  }

  function focusExplorerGrid(doc, win) {
    if (!doc) return null;
    var grid =
      doc.querySelector('[role="grid"]') ||
      doc.querySelector('.wux-layouts-gridengine-poolcontainer-sync') ||
      doc.querySelector('.wux-layouts-gridengine-datagrid') ||
      doc.querySelector('.wux-scroller') ||
      doc.body;
    try {
      if (grid && grid.focus) grid.focus();
      if (grid && grid.click) grid.click();
    } catch (e0) { /* */ }
    try {
      if (win && win.focus) win.focus();
    } catch (e1) { /* */ }
    return grid;
  }

  function dispatchExplorerKeyCombo(win, doc, key, code, ctrlKey, metaKey) {
    if (!doc) return;
    var target = doc.activeElement || doc.body;
    var opts = {
      key: key,
      code: code,
      keyCode: key.charCodeAt(0),
      ctrlKey: !!ctrlKey,
      metaKey: !!metaKey,
      bubbles: true,
      cancelable: true
    };
    try {
      target.dispatchEvent(new win.KeyboardEvent('keydown', opts));
      target.dispatchEvent(new win.KeyboardEvent('keyup', opts));
    } catch (e0) { /* */ }
  }

  function buildMirrorPayloadFromItems(items, rootName, source, expected) {
    if (!items || !items.length) return null;
    items = sanitizeMirrorItems(items, rootName);
    applyDefaultOwnerFromRoot(items, parseExplorerRootMetaFromText(harvestExplorerTextOnly()));
    applyOwnersToItems(items);
    if (!items.length) return null;
    var quality = assessMirrorQuality(items);
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: source || 'explorer-scroll',
      mirrorQuality: quality,
      explorerExpected: expected || getExplorerObjectCount() || items.length
    };
  }

  function tryExplorerScrollHarvestAsync(rootName, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var doc = readExplorerIframeDocument();
      var expected = Math.max(
        getExplorerObjectCount() || 0,
        getExplorerSelectionCount() || 0
      );
      var maxStepsCfg = options.maxSteps || (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_MAX_STEPS) || 36;
      var stepMs = (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_STEP_MS) || 80;
      var rootMeta = parseExplorerRootMetaFromText(harvestExplorerTextOnly());
      rootName = String(rootName || structureNameHint || '').trim();
      var items = [];
      var seen = {};

      if (rootName && isValidMirrorPartName(rootName)) {
        pushGridItem(items, seen, buildMirrorRow(rootName, 0, 0, {
          title: rootName,
          revision: rootMeta.revision || '—',
          maturity: rootMeta.maturity || '—',
          owner: rootMeta.owner || '',
          type: rootMeta.type || 'Physical Product',
          approved: rootMeta.approved
        }));
      }

      function finish() {
        scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);
        var payload = buildMirrorPayloadFromItems(items, rootName, 'explorer-scroll', expected);
        if (!payload) return resolve(null);
        if (expected > 0 && payload.items.length >= expected - 1) return resolve(payload);
        if (payload.items.length >= 3 && payload.mirrorQuality && payload.mirrorQuality.ok) return resolve(payload);
        resolve(payload.items.length > 1 ? payload : null);
      }

      if (!doc || !doc.body) {
        scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);
        return resolve(buildMirrorPayloadFromItems(items, rootName, 'explorer-scroll', expected));
      }

      var scrollers = doc.querySelectorAll('.wux-scroller');
      var scroller = null;
      var si;
      for (si = 0; si < scrollers.length; si++) {
        if (scrollers[si].scrollHeight > scrollers[si].clientHeight + 20) {
          scroller = scrollers[si];
          break;
        }
      }

      if (!scroller) {
        extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
        return finish();
      }

      var initialScroll = scroller.scrollTop;
      var stepPx = Math.max(80, Math.floor(scroller.clientHeight * 0.55));
      var step = 0;
      var maxSteps = Math.min(maxStepsCfg, expected > 0 ? Math.max(24, Math.ceil(expected / 3)) : maxStepsCfg);
      var stale = 0;
      var lastLen = items.length;
      var deadline = Date.now() + ((APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_MS) || 28000) - 2000;

      function tick() {
        if (Date.now() > deadline) {
          try { scroller.scrollTop = initialScroll; } catch (eDl) { /* */ }
          return finish();
        }
        extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
        if (items.length > lastLen) stale = 0;
        else stale++;
        lastLen = items.length;
        if (expected > 0 && items.length >= expected) {
          try { scroller.scrollTop = initialScroll; } catch (eR) { /* */ }
          return finish();
        }
        if (step >= maxSteps || stale >= 4) {
          try { scroller.scrollTop = initialScroll; } catch (eR2) { /* */ }
          return finish();
        }
        scroller.scrollTop = Math.min(scroller.scrollTop + stepPx, scroller.scrollHeight);
        step++;
        window.setTimeout(tick, stepMs);
      }

      scroller.scrollTop = 0;
      window.setTimeout(tick, 60);
    });
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
      title: extra.title || extra.description || name,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: extra.revision || '—',
      state: extra.maturity || '—',
      maturity: extra.maturity || '—',
      owner: extra.owner || '',
      approval: extra.approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
  }

  function ownerFromExplorerCell(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    if (s.charAt(0) === '{') {
      try {
        var o = JSON.parse(s);
        return String(o.label || o.name || o.displayName || '').trim();
      } catch (e) {
        var m = s.match(/"label"\s*:\s*"([^"]+)"/i);
        return m ? m[1].trim() : '';
      }
    }
    if (/^\d+$/.test(s) || /^(aprovado|em\s*trabalh|released|physical\s*product)/i.test(s)) return '';
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(s)) return '';
    if (/[<>\(]/.test(s)) return '';
    return s;
  }

  function normalizePartKey(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s*\([^)]*\)\s*$/, '');
  }

  function isPartIdentifier(s) {
    s = String(s || '').trim();
    if (!s) return true;
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(s)) return true;
    if (/[<][0-9]+[>]/.test(s)) return true;
    if (/\(Peça|\(Parte|\(Part\b/i.test(s)) return true;
    if (/^physical\s*product$/i.test(s)) return true;
    return false;
  }

  function isPersonName(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    if (!s || s.length < 3 || s.length > 64) return false;
    if (isPartIdentifier(s)) return false;
    if (/^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|frozen|obsoleto|physical\s*product|vpmreference|3dshape)/i.test(s)) {
      return false;
    }
    if (/^\d+[.,]\d+$/.test(s)) return false;
    if (/^[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s.\-\/\"\'\(\)]{4,}$/.test(s) && s === s.toUpperCase()) return false;
    if (/^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+$/.test(s)) return true;
    return /^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]{2,}$/.test(s);
  }

  function extractOwnerFromDomCell(cell) {
    if (!cell) return '';
    var attrs = ['data-value', 'title', 'aria-label'];
    var ai;
    for (ai = 0; ai < attrs.length; ai++) {
      var av = labelText(cell.getAttribute(attrs[ai]));
      if (isPersonName(av)) return av;
    }
    try {
      var html = cell.innerHTML || '';
      var jsonM = html.match(/\{"icon"[\s\S]{0,400}?\}/);
      if (jsonM) {
        var fromJson = ownerFromExplorerCell(jsonM[0]);
        if (isPersonName(fromJson)) return fromJson;
      }
    } catch (e0) { /* */ }
    var text = (cell.innerText || cell.textContent || '').trim();
    if (isPersonName(text)) return text;
    var fromCell = ownerFromExplorerCell(text);
    if (isPersonName(fromCell)) return fromCell;
    return '';
  }

  function findOwnerColumnIndex(doc) {
    if (!doc) return -1;
    var headers = doc.querySelectorAll(
      '[role="columnheader"], th, .wux-controls-header-cell, [class*="HeaderCell"], [class*="header-cell"]'
    );
    var i;
    for (i = 0; i < headers.length; i++) {
      var t = (headers[i].innerText || headers[i].textContent || '').trim().toLowerCase();
      if (t.indexOf('propriet') >= 0 || t === 'owner' || /^owner\b/.test(t)) return i;
    }
    return -1;
  }

  function partNameFromText(text) {
    var s = String(text || '').trim().split('\n')[0];
    if (!s) return '';
    if (s.indexOf('|') >= 0) s = s.split('|')[0].trim();
    var m = s.match(EXPLORER_PART_LINE) || s.match(EXPLORER_NAME_LINE);
    if (m) return m[1] || m[0];
    if (/^(01_SKA_|SKA_|Mont\d)/i.test(s) && s.length >= 6 && s.length <= 96) {
      return s.replace(/<[^>]+>.*$/, '').trim();
    }
    return '';
  }

  function scrapeOwnerMapFromText(text) {
    var map = {};
    String(text || '').split('\n').forEach(function (line) {
      line = String(line || '').trim();
      if (!line) return;
      if (line.indexOf('|') >= 0) {
        var parts = line.split('|').map(function (p) { return p.trim(); });
        if (parts.length < 3) return;
        var partName = partNameFromText(parts[0]);
        if (!partName) return;
        var ownerName = '';
        var pi;
        for (pi = 1; pi < parts.length; pi++) {
          var fromJson = ownerFromExplorerCell(parts[pi]);
          if (isPersonName(fromJson)) {
            ownerName = fromJson;
            break;
          }
          if (isPersonName(parts[pi])) {
            ownerName = parts[pi];
            break;
          }
        }
        if (partName && ownerName) map[normalizePartKey(partName)] = ownerName;
        return;
      }
      var inline = line.match(/^((?:01_SKA_|SKA_|Mont\d)[^\|]{4,80})\s+([A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(?:\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+)/i);
      if (inline && isPersonName(inline[2])) {
        map[normalizePartKey(inline[1])] = inline[2].trim();
      }
    });
    return map;
  }

  function scrapeOwnerMapFromDom(doc) {
    var map = {};
    if (!doc || !doc.body) return map;
    var ownerCol = findOwnerColumnIndex(doc);
    var rows = doc.querySelectorAll(
      '[role="row"], tr.wux-controls-datagrid-row, .wux-layouts-datagrid-row, [class*="DataGridRow"]'
    );
    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (row.querySelector('[role="columnheader"]')) continue;
      var cells = row.querySelectorAll('[role="gridcell"], td, .wux-controls-datagrid-cell, [class*="DataGridCell"]');
      if (cells.length < 2) continue;
      var partName = partNameFromText(cells[0].innerText || cells[0].textContent || '');
      if (!partName && cells.length > 1) {
        partName = partNameFromText(cells[1].innerText || cells[1].textContent || '');
      }
      if (!partName) continue;
      var ownerName = '';
      if (ownerCol >= 0 && ownerCol < cells.length) {
        ownerName = extractOwnerFromDomCell(cells[ownerCol]);
      }
      if (!ownerName) {
        var ci;
        for (ci = 1; ci < cells.length; ci++) {
          if (ci === ownerCol) continue;
          var candidate = extractOwnerFromDomCell(cells[ci]);
          if (isPersonName(candidate)) {
            ownerName = candidate;
            break;
          }
        }
      }
      if (partName && ownerName) map[normalizePartKey(partName)] = ownerName;
    }
    return map;
  }

  function scrapeExplorerOwnerMap() {
    pollDashboardExplorerChrome();
    var map = {};
    var doc = readExplorerIframeDocument();
    if (doc) {
      var domMap = scrapeOwnerMapFromDom(doc);
      Object.keys(domMap).forEach(function (k) {
        map[k] = domMap[k];
      });
    }
    var textMap = scrapeOwnerMapFromText(harvestExplorerTextOnly() || harvestAllExplorerText());
    Object.keys(textMap).forEach(function (k) {
      if (!map[k]) map[k] = textMap[k];
    });
    return map;
  }

  function lookupOwnerForPart(ownerMap, partName) {
    if (!ownerMap || !partName) return '';
    var key = normalizePartKey(partName);
    if (ownerMap[key]) return ownerMap[key];
    var found = '';
    Object.keys(ownerMap).forEach(function (k) {
      if (found) return;
      if (k === key || k.indexOf(key) >= 0 || key.indexOf(k) >= 0) found = ownerMap[k];
    });
    return found;
  }

  function applyOwnersToItems(items) {
    if (!items || !items.length) return items;
    var ownerMap = scrapeExplorerOwnerMap();
    if (!Object.keys(ownerMap).length) return items;
    items.forEach(function (it) {
      var owner = lookupOwnerForPart(ownerMap, it.name || it.title);
      if (owner && isPersonName(owner)) {
        it.owner = owner;
      } else if (isPartIdentifier(it.owner) || !isPersonName(it.owner)) {
        it.owner = it.owner && isPersonName(it.owner) ? it.owner : '';
      }
    });
    return items;
  }

  function applyOwnersToIndex(index) {
    if (!index) return index;
    var items = Object.keys(index).map(function (k) { return index[k]; });
    applyOwnersToItems(items);
    return index;
  }

  function normExplorerHeader(h) {
    return String(h || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}$/, '')
      .replace(/[^\w\sà-ú]/gi, '');
  }

  function classifyExplorerHeader(h) {
    var n = normExplorerHeader(h);
    if (!n) return null;
    if (n.indexOf('titulo') >= 0 || n === 'title' || (n === 'nome' && n.indexOf('numero') < 0)) return 'name';
    if (n.indexOf('descr') >= 0 || n === 'description') return 'title';
    if (n.indexOf('revis') >= 0 || n === 'revision') return 'revision';
    if (n.indexOf('propriet') >= 0 || n === 'owner') return 'owner';
    if (n.indexOf('tipo') >= 0 || n === 'type') return 'type';
    if (n.indexOf('matur') >= 0 || n.indexOf('estado de mat') >= 0 || n === 'status' || n === 'state') {
      return 'maturity';
    }
    return null;
  }

  function mapExplorerColumnsFromHeaders(headerTexts) {
    var colMap = {};
    var i;
    for (i = 0; i < headerTexts.length; i++) {
      var key = classifyExplorerHeader(headerTexts[i]);
      if (key && colMap[key] === undefined) colMap[key] = i;
    }
    return colMap;
  }

  function defaultExplorerColumnMap() {
    return { name: 0, title: 1, revision: 2, owner: 3, type: 4, maturity: 5 };
  }

  function isMirrorUiNoise(s) {
    s = String(s || '').trim();
    if (!s) return true;
    if (EXPLORER_SKIP_LINE.test(s)) return true;
    if (/^\d+\s*objetos?\b/i.test(s)) return true;
    if (/^\d+\s*objects?\b/i.test(s)) return true;
    if (/^nenhum item selecionado$/i.test(s)) return true;
    if (/^loading\.{0,3}$/i.test(s)) return true;
    if (/^(aprovado|em\s*trabalh|released|frozen|in\s*work|obsolete)$/i.test(s)) return true;
    if (/^physical\s*product$/i.test(s)) return true;
    if (/^(t[ií]tulo|descri|revis|propriet|tipo|estado|maturidade|status)$/i.test(s)) return true;
    if (/^(todos|filtrar|pesquisar|search|filter)$/i.test(s)) return true;
    if (/^mont\d+\s*-\s*montagem$/i.test(s)) return false;
    return false;
  }

  function isRepresentationTypeLabel(name) {
    name = String(name || '').trim();
    if (!name) return true;
    if (/^physical\s*product$/i.test(name)) return true;
    if (/^produto\s*f[ií]sico$/i.test(name)) return true;
    if (/^3d\s*shape$/i.test(name)) return true;
    if (/^vpmreference$/i.test(name)) return true;
    if (/^reference$/i.test(name)) return true;
    return false;
  }

  function isValidMirrorPartName(name) {
    name = String(name || '').trim();
    if (!name || name.length < 2 || name.length > 120) return false;
    if (isMirrorUiNoise(name)) return false;
    if (isRepresentationTypeLabel(name)) return false;
    if (isPersonName(name)) return false;
    if (/^\d+[.,]\d+$/.test(name)) return false;
    if (partNameFromText(name)) return true;
    if (/^(Mont\d+[A-Za-z0-9_.\-]*|01_SKA_|SKA_)/i.test(name)) return true;
    if (/^[A-Za-z0-9][A-Za-z0-9_.\-\/]{2,}$/.test(name) && /[A-Za-z]/.test(name) && /\d/.test(name)) return true;
    if (/^Mont\d+$/i.test(name)) return true;
    if (/^[A-Z]\d+$/i.test(name)) return true;
    if (/^[A-Za-z]{1,4}\d{1,6}$/i.test(name)) return true;
    if (/^[A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9\s.\-\/\"\'\(\)]{2,118}$/.test(name)) return true;
    return false;
  }

  function isValidMirrorRevision(rev) {
    rev = String(rev || '').trim();
    if (!rev || rev === '—' || rev === '-') return true;
    if (isPersonName(rev)) return false;
    if (/^(aprovado|em\s*trabalh|physical\s*product)$/i.test(rev)) return false;
    return /^\d+[.,]\d+[A-Za-z]?$/.test(rev) || /^[A-Z]\d+$/i.test(rev) || /^Rev\.?\s*\d/i.test(rev);
  }

  function isValidMirrorType(type) {
    type = String(type || '').trim();
    if (!type) return true;
    if (isPersonName(type)) return false;
    if (/^(aprovado|em\s*trabalh|\d+[.,]\d+)$/i.test(type)) return false;
    return /product|assembly|part|component|reference|montagem|peça|parte/i.test(type);
  }

  function isValidMirrorMaturity(mat) {
    mat = String(mat || '').trim();
    if (!mat || mat === '—' || mat === '-') return true;
    if (/^physical\s*product$/i.test(mat)) return false;
    if (isPersonName(mat)) return false;
    return /aprovado|trabalh|released|frozen|work|obsolete|draft|rascunho|review|matur|estado/i.test(mat);
  }

  function validateMirrorItem(item) {
    if (!item || !item.name) return false;
    if (!isValidMirrorPartName(item.name)) return false;
    if (!isValidMirrorRevision(item.revision)) return false;
    if (!isValidMirrorType(item.type)) return false;
    if (!isValidMirrorMaturity(item.maturity)) return false;
    if (item.owner && !isPersonName(item.owner)) return false;
    if (isPersonName(item.title) && item.title !== item.name) return false;
    return true;
  }

  function mirrorItemScore(item) {
    var score = 0;
    if (/^\d+[.,]\d+/.test(String(item.revision || ''))) score += 4;
    if (isPersonName(item.owner)) score += 3;
    if (isValidMirrorMaturity(item.maturity) && item.maturity !== '—') score += 2;
    if (isValidMirrorType(item.type)) score += 1;
    if (partNameFromText(item.name)) score += 2;
    return score;
  }

  function sanitizeMirrorItems(items, rootName) {
    if (!items || !items.length) return [];
    var valid = [];
    var i;
    for (i = 0; i < items.length; i++) {
      if (validateMirrorItem(items[i])) valid.push(items[i]);
    }
    var expected = getExplorerObjectCount();
    if (expected > 0 && valid.length > expected) {
      valid.sort(function (a, b) { return mirrorItemScore(b) - mirrorItemScore(a); });
      valid = valid.slice(0, expected);
    }
    return valid;
  }

  function isExplorerColumnHeaderLine(line) {
    return /^(title|description|revision|menu|t[ií]tulo|descri|revis|propriet|tipo|estado|maturidade|owner|type|state)$/i.test(
      String(line || '').trim()
    );
  }

  function isExplorerInternalIdLine(line) {
    line = String(line || '').trim();
    if (!line) return true;
    if (/^prd-R\d/i.test(line)) return true;
    if (/^SKA_ENDERxcadmodel/i.test(line)) return true;
    if (/^SKA_[A-Z0-9_\-]{10,}$/i.test(line) && line.indexOf(' ') < 0 && line.indexOf('(') < 0) return true;
    if (/^3D Shape\d/i.test(line)) return true;
    return false;
  }

  function parseExplorerRootPipeLine(line) {
    line = String(line || '').trim();
    if (line.indexOf('|') < 0) return null;
    var parts = line.split('|').map(function (p) { return p.trim(); });
    if (parts.length < 4) return null;
    if (!/product|reference|assembly|shape|part/i.test(parts[0])) return null;
    var owner = ownerFromExplorerCell(parts[3]);
    if (!isPersonName(owner)) owner = isPersonName(parts[3]) ? parts[3] : '';
    return {
      type: parts[0],
      revision: normalizeRevisionLabel(parts[1]),
      maturity: normalizeMaturityLabel(parts[2]),
      owner: owner,
      approved: /aprovado|released|frozen/i.test(parts[2])
    };
  }

  function parseExplorerRootMetaFromText(text) {
    var lines = String(text || '').split('\n');
    var i;
    for (i = 0; i < lines.length; i++) {
      var meta = parseExplorerRootPipeLine(lines[i]);
      if (meta) return meta;
    }
    return {};
  }

  function applyDefaultOwnerFromRoot(items, rootMeta) {
    if (!items || !items.length || !rootMeta) return items;
    var owner = rootMeta.owner || '';
    if (!isPersonName(owner)) return items;
    items.forEach(function (it) {
      if (!it.owner || /^sem\s*propriet|^—$|^-$/i.test(String(it.owner).trim())) {
        it.owner = owner;
      }
    });
    return items;
  }

  function buildMirrorRow(name, level, idx, extra) {
    extra = extra || {};
    var maturity = extra.maturity || '—';
    var approved = extra.approved || /aprovado|released|frozen/i.test(maturity);
    var row = {
      level: level,
      name: name,
      title: extra.title || name,
      type: extra.type || 'Physical Product',
      displayType: extra.type || 'Physical Product',
      revision: extra.revision || '—',
      state: maturity,
      maturity: maturity,
      owner: extra.owner || '',
      approval: approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
    if (extra.sourcePhysicalId && isPrdCloudId(extra.sourcePhysicalId)) {
      row.sourcePhysicalId = extra.sourcePhysicalId;
    }
    return row;
  }

  /**
   * Formato US/EN do Explorer: NOME\\n1.1\\nNOME\\n1.1 (após bloco de IDs internos).
   */
  function extractOwnerFromExplorerRow(row, rootMeta) {
    var owner = (rootMeta && rootMeta.owner) || '';
    if (!row) return owner;
    var ownerEl = row.querySelector(
      '.enx-tile-owner, .enx-tile-subLabel-owner-label, .wux-tweakers-urlobject .wux-tweakers-string-label'
    );
    if (ownerEl) {
      var ot = String(ownerEl.innerText || ownerEl.textContent || '').trim().replace(/\s+/g, ' ');
      if (isPersonName(ot)) return ot;
    }
    return owner;
  }

  function extractMaturityFromExplorerRow(row) {
    if (!row) return '—';
    var rowText = String(row.innerText || row.textContent || '');
    if (/aprovado|released|frozen/i.test(rowText)) return 'Aprovado';
    if (/em\s*trabalh|in\s*work/i.test(rowText)) return 'Em Trabalho';
    return '—';
  }

  function extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName) {
    if (!doc || !doc.body) return 0;
    var divs = doc.querySelectorAll('div');
    var added = 0;
    var di;
    for (di = 0; di < divs.length; di++) {
      var el = divs[di];
      if (el.children.length > 8) continue;
      var t = String(el.innerText || el.textContent || '').trim();
      var m = t.match(/^([^\n]{2,120})\n(\d+[.,]\d+[A-Za-z]?)$/);
      if (!m) continue;
      var name = m[1].trim();
      if (!isValidMirrorPartName(name)) continue;
      if (rootName && name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var row = el.closest('[role="row"]') || el.parentElement;
      var item = buildMirrorRow(name, 1, items.length, {
        title: name,
        revision: normalizeRevisionLabel(m[2]),
        owner: extractOwnerFromExplorerRow(row, rootMeta),
        type: (rootMeta && rootMeta.type) || 'Physical Product',
        maturity: extractMaturityFromExplorerRow(row),
        sourcePhysicalId: extractPrdFromDomRow(row)
      });
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromExplorerDomScroll(doc, rootName, seen, items, rootMeta) {
    if (!doc || !doc.body) return 0;
    var scrollers = doc.querySelectorAll('.wux-scroller');
    var scroller = null;
    var si;
    for (si = 0; si < scrollers.length; si++) {
      if (scrollers[si].scrollHeight > scrollers[si].clientHeight + 20) {
        scroller = scrollers[si];
        break;
      }
    }
    if (!scroller) {
      return extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
    }
    var initialScroll = scroller.scrollTop;
    var totalAdded = 0;
    var maxSteps = Math.min(
      (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_MAX_STEPS) || 24,
      expected > 40 ? 28 : 24
    );
    var step = Math.max(100, Math.floor(scroller.clientHeight * 0.7));
    var stale = 0;
    var lastLen = items.length;
    var expected = getExplorerObjectCount();
    var s;
    for (s = 0; s < maxSteps; s++) {
      totalAdded += extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
      if (items.length > lastLen) stale = 0;
      else stale++;
      lastLen = items.length;
      if (expected > 0 && items.length >= expected) break;
      if (stale >= 4) break;
      var nextTop = scroller.scrollTop + step;
      if (nextTop >= scroller.scrollHeight - 5) {
        extractRowsFromExplorerDom(doc, rootMeta, seen, items, rootName);
        break;
      }
      scroller.scrollTop = nextTop;
    }
    try {
      scroller.scrollTop = initialScroll;
    } catch (eScroll) { /* */ }
    return totalAdded;
  }

  function scrapeMirrorRowsFromNameRevisionPairs(text, rootName, seen, items, rootMeta) {
    rootMeta = rootMeta || {};
    var lines = String(text || '').split('\n').map(function (l) { return String(l || '').trim(); });
    var added = 0;
    var i;

    if (rootName && isValidMirrorPartName(rootName)) {
      var rootItem = buildMirrorRow(rootName, 0, 0, {
        title: rootName,
        revision: rootMeta.revision || '—',
        maturity: rootMeta.maturity || '—',
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        approved: rootMeta.approved
      });
      var beforeRoot = items.length;
      pushGridItem(items, seen, rootItem);
      if (items.length > beforeRoot) added++;
    }

    var pendingPrd = '';
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || isExplorerColumnHeaderLine(line) || isMirrorUiNoise(line)) continue;
      if (/^\d+\s*(?:of|de)\s*\d+\s*(?:selected|selecionado)/i.test(line)) continue;
      var prdLine = extractPrdFromText(line);
      if (prdLine && String(line).replace(prdLine, '').trim().length < 4) {
        pendingPrd = prdLine;
        continue;
      }
      if (isExplorerInternalIdLine(line) && !prdLine) continue;
      if (line.indexOf('|') >= 0) continue;
      var next = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
      var revLine = next;
      var srcPrd = pendingPrd;
      if (extractPrdFromText(next)) {
        srcPrd = extractPrdFromText(next);
        revLine = i + 2 < lines.length ? String(lines[i + 2] || '').trim() : '';
        if (!/^\d+[.,]\d+[A-Za-z]?$/.test(revLine)) continue;
      } else if (!/^\d+[.,]\d+[A-Za-z]?$/.test(next)) {
        continue;
      }
      if (!isValidMirrorPartName(line)) continue;
      if (rootName && line.toLowerCase() === String(rootName).toLowerCase()) {
        pendingPrd = '';
        i++;
        continue;
      }
      var item = buildMirrorRow(line, 1, items.length, {
        title: line,
        revision: normalizeRevisionLabel(revLine),
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        maturity: '—',
        sourcePhysicalId: srcPrd
      });
      pendingPrd = '';
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) {
        added++;
        i += extractPrdFromText(next) ? 2 : 1;
      }
    }
    return added;
  }

  function assessMirrorQuality(items) {
    var list = items || [];
    var bad = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (isPersonName(it.name) && !/^SKA_/i.test(it.name)) bad++;
      if (it.owner && !isPersonName(it.owner) && !/^sem\s*propriet/i.test(String(it.owner))) bad++;
      if (it.revision && isPersonName(it.revision)) bad++;
    }
    return { ok: bad === 0, badRows: bad, total: list.length };
  }

  function normalizeMaturityLabel(raw) {
    var s = String(raw || '').trim();
    if (!s) return '—';
    if (/aprovado|released|frozen/i.test(s)) return 'Aprovado';
    if (/em\s*trabalh|in\s*work/i.test(s)) return 'Em Trabalho';
    return s;
  }

  function normalizeRevisionLabel(raw) {
    var s = String(raw || '').trim();
    if (!s) return '—';
    if (/^\d+[.,]\d+$/.test(s)) return s.replace(',', '.');
    var m = s.match(/\b(\d+\.\d+)\b/);
    return m ? m[1] : (s === '—' || s === '-' ? '—' : s);
  }

  function readMirrorField(raw, fieldKey) {
    var s = String(raw == null ? '' : raw).trim();
    if (fieldKey === 'owner') {
      var fromOwner = ownerFromExplorerCell(s);
      return isPersonName(fromOwner) ? fromOwner : (isPersonName(s) ? s : '');
    }
    if (fieldKey === 'name') {
      var name = partNameFromText(s) || s.split('\n')[0].trim();
      if (!name || isPersonName(name)) return '';
      if (isRepresentationTypeLabel(name)) return '';
      return name;
    }
    if (fieldKey === 'revision') return normalizeRevisionLabel(s);
    if (fieldKey === 'maturity') return normalizeMaturityLabel(s);
    if (fieldKey === 'type') return s || 'Physical Product';
    if (fieldKey === 'title') return s || '';
    return s;
  }

  function readMirrorFieldFromCell(cell, fieldKey) {
    if (!cell) return '';
    if (fieldKey === 'owner') {
      var fromDom = extractOwnerFromDomCell(cell);
      if (isPersonName(fromDom)) return fromDom;
      return readMirrorField(cell.innerText || cell.textContent || '', 'owner');
    }
    return readMirrorField(cell.innerText || cell.textContent || '', fieldKey);
  }

  function buildMirrorItemFromValues(values, colMap, idx, level) {
    colMap = colMap || defaultExplorerColumnMap();
    function val(key, fieldKey) {
      var ci = colMap[key];
      if (ci === undefined || ci >= values.length) return '';
      if (values[ci] && values[ci].nodeType === 1) {
        return readMirrorFieldFromCell(values[ci], fieldKey || key);
      }
      return readMirrorField(values[ci], fieldKey || key);
    }
    var name = val('name', 'name');
    var typeCol = val('type', 'type');
    if (!name && colMap.name !== 0) name = readMirrorField(values[0], 'name');
    if (isRepresentationTypeLabel(name) || (typeCol && name && name.toLowerCase() === typeCol.toLowerCase())) {
      name = val('title', 'title') || '';
      if (isRepresentationTypeLabel(name)) name = '';
    }
    if (!name || isPersonName(name) || isRepresentationTypeLabel(name)) return null;
    var title = val('title', 'title') || name;
    if (isPersonName(title) && !isPersonName(name)) title = name;
    var revision = val('revision', 'revision') || '—';
    var owner = val('owner', 'owner') || '';
    var type = val('type', 'type') || 'Physical Product';
    var maturity = val('maturity', 'maturity') || '—';
    if (typeof FileImportService !== 'undefined' && FileImportService.extractFieldsFromExplorerRow) {
      var textCells = values.map(function (v) {
        if (v && v.nodeType === 1) return v.innerText || v.textContent || '';
        return v;
      });
      var fx = FileImportService.extractFieldsFromExplorerRow(textCells);
      if (fx.name && (fx.name === name || revision.length > 12 || isRevisionText(type))) {
        name = fx.name;
        title = fx.title || title;
        revision = fx.revision || revision;
        owner = fx.owner || owner;
        type = fx.type || type;
        maturity = fx.maturity || maturity;
      }
    }
    var approved = /aprovado|released|frozen/i.test(maturity);
    var item = {
      level: level,
      name: name,
      title: title,
      type: type,
      displayType: type,
      revision: revision,
      state: maturity,
      maturity: maturity,
      owner: owner,
      approval: approved ? 'Approved' : 'Unknown',
      physicalid: makeGridPhysicalId(name, idx, level === 0)
    };
    return validateMirrorItem(item) ? item : null;
  }

  function getExplorerHeaderTexts(doc) {
    if (!doc) return [];
    var headers = doc.querySelectorAll(
      '[role="columnheader"], th, .wux-controls-header-cell, [class*="HeaderCell"], [class*="header-cell"]'
    );
    var texts = [];
    var i;
    for (i = 0; i < headers.length; i++) {
      texts.push((headers[i].innerText || headers[i].textContent || '').trim());
    }
    return texts;
  }

  function getExplorerDataRows(doc) {
    if (!doc) return [];
    return doc.querySelectorAll(
      '[role="row"], tr.wux-controls-datagrid-row, .wux-layouts-datagrid-row, [class*="DataGridRow"]'
    );
  }

  function getRowCells(row) {
    return row.querySelectorAll('[role="gridcell"], td, .wux-controls-datagrid-cell, [class*="DataGridCell"]');
  }

  function scrapeMirrorRowsFromDom(doc, rootName, seen, items) {
    if (!doc || !doc.body) return 0;
    var headerTexts = getExplorerHeaderTexts(doc);
    var colMap = mapExplorerColumnsFromHeaders(headerTexts);
    if (colMap.name === undefined) colMap = defaultExplorerColumnMap();
    var rows = getExplorerDataRows(doc);
    var added = 0;
    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (row.querySelector('[role="columnheader"]')) continue;
      var cells = getRowCells(row);
      if (cells.length < 2) continue;
      var values = [];
      var ci;
      for (ci = 0; ci < cells.length; ci++) values.push(cells[ci]);
      var item = buildMirrorItemFromValues(values, colMap, items.length, items.length === 0 ? 0 : 1);
      if (!item) continue;
      var prdRow = extractPrdFromDomRow(row);
      if (prdRow) item.sourcePhysicalId = prdRow;
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, delimiter) {
    var lines = String(text || '').split('\n');
    var headerLineIdx = -1;
    var colMap = null;
    var i;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf(delimiter) < 0) continue;
      var parts = line.split(delimiter).map(function (p) { return p.trim(); });
      var map = mapExplorerColumnsFromHeaders(parts);
      if (map.name !== undefined && (map.revision !== undefined || map.owner !== undefined || map.maturity !== undefined)) {
        headerLineIdx = i;
        colMap = map;
        break;
      }
    }
    if (headerLineIdx < 0 || !colMap) return 0;
    var added = 0;
    for (i = headerLineIdx + 1; i < lines.length; i++) {
      var dl = String(lines[i] || '').trim();
      if (!dl || dl.indexOf(delimiter) < 0) continue;
      if (/^physical product\s/i.test(dl)) continue;
      if (/product structure explorer/i.test(dl)) continue;
      var cells = dl.split(delimiter).map(function (p) { return p.trim(); });
      if (cells.length < 3) continue;
      var item = buildMirrorItemFromValues(cells, colMap, items.length, 1);
      if (!item) continue;
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) continue;
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) added++;
    }
    return added;
  }

  function scrapeMirrorRowsFromVerticalText(text, rootName, seen, items) {
    var lines = String(text || '').split('\n').map(function (l) { return String(l || '').trim(); });
    var headerIdx = -1;
    var i;
    for (i = 0; i < lines.length - 5; i++) {
      if (/^t[ií]tulo$/i.test(lines[i]) && /descri/i.test(lines[i + 1]) && /revis/i.test(lines[i + 2]) && /propriet/i.test(lines[i + 3])) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx < 0) return 0;
    var colCount = 6;
    var added = 0;
    for (i = headerIdx + colCount; i + colCount - 1 < lines.length; ) {
      var chunk = lines.slice(i, i + colCount);
      if (!chunk[0] || /^t[ií]tulo$/i.test(chunk[0]) || isMirrorUiNoise(chunk[0])) {
        i++;
        continue;
      }
      if (!isValidMirrorPartName(chunk[0])) {
        i++;
        continue;
      }
      if (!/^\d+[.,]\d+/.test(String(chunk[2] || '')) && chunk[2] !== '—') {
        i++;
        continue;
      }
      var item = buildMirrorItemFromValues(chunk, defaultExplorerColumnMap(), items.length, 1);
      if (!item) {
        i++;
        continue;
      }
      if (rootName && item.name.toLowerCase() === String(rootName).toLowerCase() && items.length > 0) {
        i += colCount;
        continue;
      }
      var before = items.length;
      pushGridItem(items, seen, item);
      if (items.length > before) {
        added++;
        i += colCount;
      } else {
        i++;
      }
    }
    return added;
  }

  /**
   * Espelho literal do Product Structure Explorer — colunas por cabeçalho, célula a célula.
   */
  function scrapeExplorerMirror(rootName) {
    pollDashboardExplorerChrome();
    pollStructureHint();
    var doc = readExplorerIframeDocument();
    var text = harvestExplorerTextOnly();
    var fromTitle = extractRootNameFromExplorerText(text) || extractRootNameFromExplorerText(harvestAllExplorerText());
    rootName = String(rootName || fromTitle || structureNameHint || '').trim();
    var items = [];
    var seen = {};
    var colMap = null;
    var expected = getExplorerObjectCount();
    var rootMeta = parseExplorerRootMetaFromText(text);

    if (rootName && isValidMirrorPartName(rootName)) {
      pushGridItem(items, seen, buildMirrorRow(rootName, 0, 0, {
        title: rootName,
        revision: rootMeta.revision || '—',
        maturity: rootMeta.maturity || '—',
        owner: rootMeta.owner || '',
        type: rootMeta.type || 'Physical Product',
        approved: rootMeta.approved
      }));
    }

    if (doc) {
      scrapeMirrorRowsFromExplorerDomScroll(doc, rootName, seen, items, rootMeta);
    }
    if (text && (items.length < 2 || (expected > 0 && items.length < expected))) {
      scrapeMirrorRowsFromNameRevisionPairs(text, rootName, seen, items, rootMeta);
    }
    if (doc && (items.length < 2 || (expected > 0 && items.length < expected))) {
      var headerTexts = getExplorerHeaderTexts(doc);
      colMap = mapExplorerColumnsFromHeaders(headerTexts);
      if (colMap.name === undefined) colMap = defaultExplorerColumnMap();
      scrapeMirrorRowsFromDom(doc, rootName, seen, items);
    }
    if (items.length < 2 && text) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '\t');
    }
    if (items.length < 2 && text) {
      scrapeMirrorRowsFromDelimitedText(text, rootName, seen, items, '|');
    }

    scrapeMirrorSupplementFromDashboard(rootName, items, seen, rootMeta, expected);

    items = sanitizeMirrorItems(items, rootName);
    applyDefaultOwnerFromRoot(items, rootMeta);
    applyOwnersToItems(items);

    if (items.length < 1) return null;

    var quality = assessMirrorQuality(items);
    if (!quality.ok) return null;

    var expectedAfter = getExplorerObjectCount();
    if (expectedAfter > 0 && items.length > expectedAfter + 3) return null;

    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: 'explorer-mirror',
      columnMap: colMap || defaultExplorerColumnMap(),
      explorerExpected: expected || items.length,
      mirrorQuality: quality
    };
  }

  function scrapeExplorerGrid(rootName) {
    var mirror = scrapeExplorerMirror(rootName);
    if (mirror && mirror.items && mirror.items.length >= 1) {
      var expected = getExplorerObjectCount();
      if (!expected || mirror.items.length <= expected + 1) return mirror;
    }

    pollDashboardExplorerChrome();
    var text = harvestExplorerTextOnly() || harvestAllExplorerText();
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
      var ownerText = '';
      var pi;
      for (pi = 1; pi < parts.length; pi++) {
        ownerText = ownerFromExplorerCell(parts[pi]);
        if (ownerText) break;
      }
      var maturity = parts[parts.length - 1] || parts[3] || parts[2] || '—';
      if (/^\d+[.,]\d+$/.test(String(maturity))) maturity = parts[parts.length - 1] || '—';
      var approved = /aprovado|released|frozen/i.test(maturity);
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {
        revision: parts[1] || '—',
        maturity: maturity,
        approved: approved,
        owner: ownerText
      }));
    }
    if (items.length < 2) scrapeExplorerTreeLines(lines, rootName, items, seen);
    if (items.length < 2) scrapeDashboardLeafRows(rootName, items, seen);

    var fromRegex = parsePartNamesFromText(text, rootName);
    fromRegex.forEach(function (name) {
      pushGridItem(items, seen, buildRowFromName(name, 1, items.length, {}));
    });

    if (items.length < 2) return null;
    applyOwnersToItems(items);
    items = sanitizeMirrorItems(items, rootName);
    if (!items.length) return null;
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
    var catalog = buildPrdCatalogFull();
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

  function itemsToMirrorPayload(items, rootName, source) {
    if (!items || !items.length) return null;
    var quality = assessMirrorQuality(items);
    return {
      version: 1,
      productName: rootName || items[0].name,
      rootPhysicalId: makeGridPhysicalId(rootName || items[0].name, 0, true),
      items: items,
      scrapeSource: source || 'explorer-auto-copy',
      mirrorQuality: quality,
      explorerExpected: getExplorerObjectCount() || items.length
    };
  }

  function readExplorerHost() {
    var doc = readExplorerIframeDocument();
    if (doc) {
      return { doc: doc, win: doc.defaultView, frame: readExplorerIframeElement() };
    }
    try {
      var topDoc = window.top && window.top.document;
      if (!topDoc || !topDoc.body) return null;
      var nodes = topDoc.querySelectorAll('[role="grid"], .wux-layouts-gridengine-datagrid');
      var i;
      for (i = 0; i < nodes.length; i++) {
        var grid = nodes[i];
        var panel = grid;
        var hop = 0;
        while (panel && hop < 12) {
          var label = String(panel.innerText || panel.textContent || '').slice(0, 4000);
          if (label.indexOf('BOM Analytics') >= 0) break;
          if (
            label.indexOf('Product Structure Explorer') >= 0 ||
            label.indexOf('Structure Explorer') >= 0
          ) {
            return { doc: topDoc, win: window.top, grid: grid, frame: null };
          }
          panel = panel.parentElement;
          hop++;
        }
      }
    } catch (eTop) { /* */ }
    return null;
  }

  /** Captura TSV no evento copy do documento Explorer (não depende de clipboard async). */
  function captureExplorerCopyText(doc, win) {
    if (APP_CONFIG && APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED !== true) return '';
    if (!doc || !win) return '';
    var captured = '';
    function onCopy(ev) {
      try {
        if (ev && ev.clipboardData) {
          captured = ev.clipboardData.getData('text/plain') || '';
        }
      } catch (e0) { /* */ }
    }
    doc.addEventListener('copy', onCopy, true);
    try {
      doc.execCommand('copy');
    } catch (e1) { /* */ }
    if (!captured || captured.length < 20) {
      dispatchExplorerKeyCombo(win, doc, 'c', 'KeyC', true, false);
    }
    try {
      doc.removeEventListener('copy', onCopy, true);
    } catch (e2) { /* */ }
    captured = String(captured || readExplorerGridSelectionText(win) || '').trim();
    return captured;
  }

  function readExplorerGridSelectionText(win) {
    if (!win) return '';
    try {
      var sel = win.getSelection();
      if (!sel || sel.rangeCount < 1) return '';
      return String(sel.toString() || '').trim();
    } catch (e) {
      return '';
    }
  }

  function looksLikeExplorerGridTsv(text) {
    if (typeof FileImportService !== 'undefined' && FileImportService.looksLikeExplorerPaste) {
      return FileImportService.looksLikeExplorerPaste(text);
    }
    text = String(text || '').trim();
    if (text.length < 40) return false;
    if (text.indexOf('\t') >= 0) return true;
    var lines = text.split(/\r?\n/).filter(function (l) {
      return String(l || '').trim().length > 0;
    });
    return lines.length >= 3;
  }

  function parseAutoCopyGridText(text, rootName, expected) {
    text = String(text || '').trim();
    if (!looksLikeExplorerGridTsv(text)) return Promise.resolve(null);
    if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
      return Promise.resolve(null);
    }
    return FileImportService.parseTextAsync(text).then(function (items) {
      if (!items || items.length < 2) return null;
      var payload = itemsToMirrorPayload(items, rootName, 'explorer-auto-copy');
      if (!payload) return null;
      var exp = expected || getExplorerObjectCount() || 0;
      if (exp > 0 && payload.items.length >= exp - 1) return payload;
      if (exp > 0 && payload.items.length < exp - 1) return null;
      if (payload.items.length >= 3 && (!exp || exp < 4)) return payload;
      if (!payload.mirrorQuality || !payload.mirrorQuality.ok) return null;
      return payload;
    });
  }

  /** Lê clipboard via paste no widget (user-gesture do clique Atualizar). */
  function tryReadClipboardViaPasteTrap() {
    if (APP_CONFIG && APP_CONFIG.PASTE_TRAP_ENABLED !== true) {
      return Promise.resolve('');
    }
    return new Promise(function (resolve) {
      var target = document.getElementById('pasteArea');
      var external = false;
      if (!target) {
        target = document.createElement('textarea');
        target.style.cssText =
          'position:fixed;left:0;top:0;width:2px;height:2px;padding:0;margin:0;border:0;opacity:0.01';
        document.body.appendChild(target);
        external = true;
      }
      var done = false;
      function finish(text) {
        if (done) return;
        done = true;
        if (external) {
          try {
            document.body.removeChild(target);
          } catch (eR) { /* */ }
        }
        resolve(String(text || '').trim());
      }
      target.addEventListener(
        'paste',
        function (ev) {
          var t = ev.clipboardData ? ev.clipboardData.getData('text/plain') || '' : '';
          finish(t);
        },
        { once: true, capture: true }
      );
      try {
        target.focus({ preventScroll: true });
      } catch (eF) {
        try {
          target.focus();
        } catch (eF2) { /* */ }
      }
      try {
        document.execCommand('paste');
      } catch (eP) { /* */ }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard
          .readText()
          .then(function (clip) {
            if (clip && String(clip).trim()) finish(clip);
          })
          .catch(function () { /* */ });
      }
      window.setTimeout(function () {
        finish('');
      }, 80);
    });
  }

  function selectExplorerGridContents(doc, win, grid) {
    dispatchExplorerKeyCombo(win, doc, 'a', 'KeyA', true, false);
    try {
      var sel = win.getSelection();
      var range = doc.createRange();
      range.selectNodeContents(grid || doc.body);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (eSel) { /* */ }
  }

  function copyExplorerGridSelection(doc, win) {
    return captureExplorerCopyText(doc, win);
  }

  function tryExplorerAutoCopyParse(rootName) {
    if (APP_CONFIG && APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED !== true) {
      return Promise.resolve(null);
    }
    return new Promise(function (resolve) {
      var host = readExplorerHost();
      if (!host || !host.doc) return resolve(null);
      var doc = host.doc;
      var win = host.win;
      var frameEl = host.frame;
      var expected = Math.max(
        getExplorerObjectCount() || 0,
        getExplorerSelectionCount() || 0
      );
      var selCount = getExplorerSelectionCount() || 0;

      try {
        if (frameEl && frameEl.contentWindow) frameEl.contentWindow.focus();
        else if (win && win.focus) win.focus();
      } catch (eF) { /* */ }

      var grid = host.grid || focusExplorerGrid(doc, win);

      function parseCaptured(text) {
        return parseAutoCopyGridText(text, rootName, expected);
      }

      function tryCopyBundle() {
        var copied = copyExplorerGridSelection(doc, win);
        if (looksLikeExplorerGridTsv(copied)) {
          return parseCaptured(copied).then(function (payload) {
            if (payload) return payload;
            return tryReadClipboardViaPasteTrap().then(function (clip) {
              if (looksLikeExplorerGridTsv(clip)) return parseCaptured(clip);
              return null;
            });
          });
        }
        return tryReadClipboardViaPasteTrap().then(function (clip) {
          if (looksLikeExplorerGridTsv(clip)) return parseCaptured(clip);
          return null;
        });
      }

      var chain;
      if (expected > 0 && selCount >= expected - 1) {
        var preSel = readExplorerGridSelectionText(win);
        if (looksLikeExplorerGridTsv(preSel)) {
          chain = parseCaptured(preSel);
        } else {
          chain = tryCopyBundle();
        }
      } else {
        selectExplorerGridContents(doc, win, grid);
        var syncSel = readExplorerGridSelectionText(win);
        if (looksLikeExplorerGridTsv(syncSel)) {
          var lineN = syncSel.split(/\r?\n/).filter(function (l) {
            return String(l || '').trim().length > 0;
          }).length;
          if (!expected || lineN >= expected - 1 || lineN >= 3) {
            chain = parseCaptured(syncSel).then(function (payload) {
              return payload || tryCopyBundle();
            });
          } else {
            chain = tryCopyBundle();
          }
        } else {
          chain = tryCopyBundle();
        }
      }

      chain.then(resolve).catch(function () {
        resolve(null);
      });
    });
  }

  function getExplorerSelectionCount() {
    pollDashboardExplorerChrome();
    var text =
      harvestExplorerTextOnly() ||
      harvestExplorerWidgetTextFromDashboard() ||
      harvestAllExplorerText();
    var m = String(text).match(/(\d+)\s*(?:de|of)\s*(\d+)\s*(?:selecionado|selected)/i);
    if (m) return parseInt(m[2], 10) || parseInt(m[1], 10) || 0;
    return 0;
  }

  function getExplorerObjectCount() {
    pollDashboardExplorerChrome();
    var text =
      harvestExplorerTextOnly() ||
      harvestExplorerWidgetTextFromDashboard() ||
      harvestAllExplorerText();
    var m =
      String(text).match(/(\d+)\s*(?:of|de)\s*(\d+)\s*(?:selected|selecionado)/i) ||
      String(text).match(/(\d+)\s*de\s*(\d+)\s*selecionad/i) ||
      String(text).match(/(\d+)\s*objetos?\b/i) ||
      String(text).match(/(\d+)\s*objects?\b/i) ||
      String(text).match(/(\d+)\s*itens?\b/i);
    if (m) return parseInt(m[2] || m[1], 10) || parseInt(m[1], 10) || 0;
    return 0;
  }

  function assessDashboardMirrorQuality(items) {
    return assessMirrorQuality(items);
  }

  function technicalApiName(name) {
    name = String(name || '').trim();
    return !name || /^prd-/i.test(name) || /xcadmodel/i.test(name) || /^vpm/i.test(name);
  }

  function copyExplorerPresentation(target, source) {
    if (!target || !source) return;
    if (source.name && (!target.name || technicalApiName(target.name) || target.isUnresolvedInstance)) {
      target.name = source.name;
    }
    if (source.title && source.title !== source.name && (!target.title || technicalApiName(target.title) || target.isUnresolvedInstance)) {
      target.title = source.title;
    }
    if (source.revision && source.revision !== 'â€”') target.revision = source.revision;
    if (source.owner && isPersonName(source.owner)) target.owner = source.owner;
    if (source.maturity && source.maturity !== 'â€”') {
      target.maturity = source.maturity;
      target.state = source.maturity;
    }
  }

  function applyExplorerPresentationToIndex(index) {
    if (!index) return index;
    var mirror = scrapeExplorerMirror();
    if (!mirror || !mirror.items || !mirror.items.length) return index;
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    if (!nodes.length) return index;
    var items = mirror.items;
    var offset = 0;
    if (
      items.length > 1 &&
      nodes.length > 1 &&
      normalizePartKey(items[0].name || items[0].title) !== normalizePartKey(nodes[0].name || nodes[0].title)
    ) {
      offset = -1;
    }
    nodes.forEach(function (node, idx) {
      var item = items[idx + offset];
      if (item) copyExplorerPresentation(node, item);
    });
    return index;
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
    buildPrdCatalogFull: buildPrdCatalogFull,
    lookupPrdByPartName: lookupPrdByPartName,
    enrichItemsWithPrd: enrichItemsWithPrd,
    applyPrdToIndex: applyPrdToIndex,
    enrichNodeWithPrd: enrichNodeWithPrd,
    resolveFromExplorerCatalog: resolveFromExplorerCatalog,
    readExplorerIframeDocument: readExplorerIframeDocument,
    scrapeExplorerGrid: scrapeExplorerGrid,
    scrapeExplorerMirror: scrapeExplorerMirror,
    scrapeExplorerOwnerMap: scrapeExplorerOwnerMap,
    applyOwnersToItems: applyOwnersToItems,
    applyOwnersToIndex: applyOwnersToIndex,
    applyExplorerPresentationToIndex: applyExplorerPresentationToIndex,
    fetchPilotStructurePayload: fetchPilotStructurePayload,
    harvestAllExplorerText: harvestAllExplorerText,
    harvestExplorerTextOnly: harvestExplorerTextOnly,
    getExplorerSelectionCount: getExplorerSelectionCount,
    getExplorerObjectCount: getExplorerObjectCount,
    assessMirrorQuality: assessMirrorQuality,
    assessDashboardMirrorQuality: assessDashboardMirrorQuality,
    tryExplorerAutoCopyParse: tryExplorerAutoCopyParse,
    tryExplorerScrollHarvestAsync: tryExplorerScrollHarvestAsync,
    tryReadClipboardViaPasteTrap: tryReadClipboardViaPasteTrap
  };
})();

;/* --- assets\js\integration\3dplay-bridge.js --- */
/**
 * @file integration/3dplay-bridge.js
 * Sprint 3 — envia seleção E-BOM para 3DPlay (widget dashboard + player embutido).
 */
var ThreeDPlayBridge = (function () {
  'use strict';

  var lastStatus = { mode: 'idle', ok: false, message: '', physicalId: '' };
  var embeddedPlayer = null;
  var embeddedHost = null;
  var loadToken = 0;

  function cfg() {
    return (APP_CONFIG && APP_CONFIG.THREE_DPLAY) || {};
  }

  function tenantId() {
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId) {
      return APP_CONFIG.TENANT_DEFAULTS.envId;
    }
    return 'R1132100929518';
  }

  function platformOrigin() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.getPlatformOrigin) {
      return PlatformBridge.getPlatformOrigin();
    }
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost;
    }
    return '';
  }

  function resolvePhysicalId(node) {
    if (!node) return '';
    if (typeof PartImage !== 'undefined' && PartImage.lookupPrdId) {
      return String(PartImage.lookupPrdId(node) || '').replace(/^prd::/i, 'prd-');
    }
    var pid = String(node.sourcePhysicalId || node.physicalid || '').trim().replace(/^prd::/i, 'prd-');
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      pid = ThreeDXContentParser.normalizePhysicalId(pid);
    }
    return pid;
  }

  function isPlayableId(pid) {
    if (!pid) return false;
    if (typeof PartImage !== 'undefined' && PartImage.isSyntheticId && PartImage.isSyntheticId(pid)) {
      return false;
    }
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(pid);
    }
    return String(pid).length >= 8;
  }

  function resolveObjectType(node, physicalId) {
    var raw = String(
      (node && (node.objectType || node.type || node.displayType)) || ''
    ).trim();
    var low = raw.toLowerCase();
    if (low.indexOf('physical product') >= 0 || low.indexOf('physicalproduct') >= 0) {
      return 'Physical Product';
    }
    if (low.indexOf('vpmreference') >= 0 || low === 'vpm reference') {
      return 'VPMReference';
    }
    if (low.indexOf('provide') >= 0) return 'Provide';
    if (/^prd-/i.test(String(physicalId || ''))) return 'Physical Product';
    return (cfg().DEFAULT_OBJECT_TYPE) || 'VPMReference';
  }

  function buildContent(node) {
    var physicalId = resolvePhysicalId(node);
    if (!isPlayableId(physicalId)) return null;
    var objectType = resolveObjectType(node, physicalId);
    var name = (node && (node.name || node.title || node.displayName)) || physicalId;
    return {
      protocol: '3DXContent',
      source: 'BOM Analytics',
      data: {
        items: [{
          envId: tenantId(),
          objectId: physicalId,
          objectType: objectType,
          displayName: name,
          name: name,
          serviceId: '3DSpace',
          contextId: (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS &&
            APP_CONFIG.TENANT_DEFAULTS.securityContext) || null
        }]
      }
    };
  }

  function setStatus(mode, ok, message, physicalId) {
    lastStatus = {
      mode: mode || 'idle',
      ok: !!ok,
      message: String(message || ''),
      physicalId: String(physicalId || '')
    };
    return lastStatus;
  }

  function getLastStatus() {
    return lastStatus;
  }

  function postToDashboard(msg) {
    var origin = platformOrigin();
    var targets = [window.top, window.parent, window];
    var i;
    var t;
    for (i = 0; i < targets.length; i++) {
      t = targets[i];
      if (!t || !t.postMessage) continue;
      try { if (origin) t.postMessage(msg, origin); } catch (e1) { /* */ }
      try { t.postMessage(msg, '*'); } catch (e2) { /* */ }
    }
  }

  function pushViaPostMessage(content) {
    var appIds = cfg().APP_IDS || ['SWX3DPlay_AP', 'X3DPlay_AP', 'ENX3DPlay_AP'];
    var payload = {
      protocol: '3DXContent',
      action: 'load',
      type: '3DXContent',
      event: 'loadObject',
      data: content.data,
      content: content
    };
    postToDashboard(payload);
    var j;
    for (j = 0; j < appIds.length; j++) {
      postToDashboard({
        protocol: '3DXContent',
        action: 'launchApp',
        appId: appIds[j],
        type: '3DXContent',
        data: content.data,
        content: content
      });
      postToDashboard({
        type: '3DXContent',
        action: 'open',
        appId: appIds[j],
        data: content.data
      });
    }
    return true;
  }

  function pushViaInterCom(content, callback) {
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req) {
      if (callback) callback(false, 'require indisponível');
      return;
    }
    req(['UWA/Utils/InterCom'], function (InterCom) {
      if (!InterCom) {
        if (callback) callback(false, 'InterCom indisponível');
        return;
      }
      try {
        if (InterCom.publish) {
          InterCom.publish({
            event: '3DXContent',
            protocol: '3DXContent',
            data: content.data,
            sender: APP_CONFIG && APP_CONFIG.APP_ID
          });
        }
        if (InterCom.broadcast) {
          InterCom.broadcast('3DXContent', content);
        }
        if (callback) callback(true, 'InterCom');
      } catch (e) {
        if (callback) callback(false, e.message || 'InterCom falhou');
      }
    }, function () {
      if (callback) callback(false, 'InterCom módulo não carregou');
    });
  }

  function pushViaPlatformApi(content, callback) {
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req) {
      if (callback) callback(false, 'require indisponível');
      return;
    }
    req(['DS/PlatformAPI/PlatformAPI'], function (PlatformAPI) {
      if (!PlatformAPI) {
        if (callback) callback(false, 'PlatformAPI indisponível');
        return;
      }
      try {
        if (PlatformAPI.publish) {
          PlatformAPI.publish('3DXContent', content);
        }
        if (PlatformAPI.setSelection && content.data && content.data.items && content.data.items[0]) {
          PlatformAPI.setSelection(content.data.items);
        }
        if (callback) callback(true, 'PlatformAPI');
      } catch (e2) {
        if (callback) callback(false, e2.message || 'PlatformAPI falhou');
      }
    }, function () {
      if (callback) callback(false, 'PlatformAPI módulo não carregou');
    });
  }

  function destroyEmbeddedPlayer() {
    if (embeddedPlayer && embeddedPlayer.destroy) {
      try { embeddedPlayer.destroy(); } catch (e) { /* */ }
    }
    embeddedPlayer = null;
    if (embeddedHost) embeddedHost.innerHTML = '';
  }

  function tryEmbeddedModule(req, modules, container, content, token, callback) {
    if (token !== loadToken) return;
    if (!modules.length) {
      if (callback) callback(false, 'player embutido indisponível');
      return;
    }
    var head = modules[0];
    var tail = modules.slice(1);
    req([head], function (Mod) {
      if (token !== loadToken) return;
      if (!Mod) {
        tryEmbeddedModule(req, tail, container, content, token, callback);
        return;
      }
      var item = content.data.items[0];
      try {
        if (Mod.createPlayer && container) {
          destroyEmbeddedPlayer();
          embeddedHost = container;
          embeddedPlayer = Mod.createPlayer({
            element: container,
            physicalId: item.objectId,
            objectId: item.objectId,
            objectType: item.objectType,
            envId: item.envId
          });
          if (callback) callback(true, 'embedded:' + head);
          return;
        }
        if (Mod.init && container) {
          destroyEmbeddedPlayer();
          embeddedHost = container;
          embeddedPlayer = Mod.init(container, {
            physicalId: item.objectId,
            objectType: item.objectType
          });
          if (callback) callback(true, 'embedded:' + head);
          return;
        }
      } catch (eInit) {
        /* try next */
      }
      tryEmbeddedModule(req, tail, container, content, token, callback);
    }, function () {
      tryEmbeddedModule(req, tail, container, content, token, callback);
    });
  }

  function loadEmbeddedPlayer(container, node, callback) {
    if (cfg().EMBED_PLAYER === false) {
      if (callback) callback(false, 'embed desligado');
      return;
    }
    var content = buildContent(node);
    if (!content) {
      if (callback) callback(false, 'ID inválido para 3D');
      return;
    }
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req || !container) {
      if (callback) callback(false, 'require/container indisponível');
      return;
    }
    var token = ++loadToken;
    container.innerHTML = '<p class="bom-3dplay-loading">A carregar 3DPlay…</p>';
    var modules = cfg().REQUIRE_MODULES || [
      'DS/Visualization/WebVizPlayer/WebVizPlayer',
      'DS/Visualization/VisuOnlinePlayer/VisuOnlinePlayer',
      'DS/ENO6WWebViz/ENO6WWebViz'
    ];
    tryEmbeddedModule(req, modules, container, content, token, callback);
  }

  /**
   * Envia peça selecionada para 3DPlay (widget + tentativa embed).
   * @param {object} node linha E-BOM
   * @param {object} opts { container?: HTMLElement, skipEmbed?: boolean }
   * @param {function} done callback(status)
   */
  function showPart(node, opts, done) {
    if (typeof opts === 'function') {
      done = opts;
      opts = {};
    }
    opts = opts || {};
    var content = buildContent(node);
    var physicalId = content ? content.data.items[0].objectId : resolvePhysicalId(node);

    if (!content) {
      setStatus('invalid', false, 'Sem physicalId válido para 3DPlay.', physicalId);
      if (done) done(lastStatus);
      return lastStatus;
    }

    setStatus('loading', false, 'A carregar visualização 3D…', physicalId);

    var allowExternal = cfg().ALLOW_EXTERNAL_WIDGET_FALLBACK === true;
    if (allowExternal) {
      pushViaPostMessage(content);
    }

    var finished = false;
    function finish(mode, ok, message) {
      if (finished) return;
      finished = true;
      setStatus(mode, ok, message, physicalId);
      if (done) done(lastStatus);
    }

    function finishPanelFallback() {
      finish('panel', false,
        '3D no painel indisponível neste build — use miniatura 2D ou estrutura com prd- (API/Explorer).');
    }

    if (allowExternal) {
      pushViaInterCom(content, function (okIc, msgIc) {
        if (okIc) finish('intercom', true, msgIc);
      });
      pushViaPlatformApi(content, function (okPa, msgPa) {
        if (okPa) finish('platform', true, msgPa);
      });
    }

    if (!opts.skipEmbed && opts.container) {
      loadEmbeddedPlayer(opts.container, node, function (okEmb, msgEmb) {
        if (okEmb) {
          finish('embedded', true, cfg().WIDGET_HINT || 'Modelo 3D no painel');
          return;
        }
        if (!finished) finishPanelFallback();
      });
      window.setTimeout(function () {
        if (!finished) finishPanelFallback();
      }, cfg().PUSH_TIMEOUT_MS || 2200);
    } else {
      window.setTimeout(function () {
        if (!finished) finishPanelFallback();
      }, cfg().PUSH_TIMEOUT_MS || 1200);
    }

    return lastStatus;
  }

  function clear() {
    loadToken++;
    destroyEmbeddedPlayer();
    setStatus('idle', false, '', '');
  }

  return {
    buildContent: buildContent,
    resolvePhysicalId: resolvePhysicalId,
    isPlayableId: isPlayableId,
    showPart: showPart,
    clear: clear,
    getLastStatus: getLastStatus,
    pushViaPostMessage: pushViaPostMessage
  };
})();

;/* --- assets\js\integration\explorer-context.js --- */
/**
 * @file integration/explorer-context.js
 * Contexto único da raiz aberta no Product Structure Explorer.
 * Sprint 2.5 — item 1: physicalId, nome, expectedCount, syncKey.
 */
var ExplorerContext = (function () {
  'use strict';

  var cached = null;

  function emptyContext() {
    return {
      physicalId: '',
      productName: '',
      displayName: '',
      rootName: '',
      expectedCount: 0,
      selectionCount: 0,
      source: 'none',
      syncKey: '',
      hasValidPhysicalId: false,
      canUseApi: false,
      updatedAt: 0
    };
  }

  function isValidId(id) {
    id = String(id || '').trim();
    if (!id) return false;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id.length >= 8;
  }

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function labelFromSelection(sel) {
    if (!sel) return '';
    return String(sel.displayName || sel.name || sel.title || '').trim();
  }

  function badSelection(sel) {
    if (!sel) return true;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.isBadDashboardSelection) {
      return ProductExplorerBridge.isBadDashboardSelection(sel);
    }
    return false;
  }

  function pollBridge() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) {
      ProductExplorerBridge.pollStructureHint();
    }
    if (ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
  }

  function readQueryContext() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var out = { physicalId: '', productName: '', source: 'none' };
    if (q.physicalid && isValidId(q.physicalid)) {
      out.physicalId = normalizeId(q.physicalid);
      out.productName = String(q.displayName || q.name || q.structure || q.rootName || '').trim();
      out.source = 'query-id';
    }
    if (!out.productName && (q.structure || q.rootName)) {
      out.productName = String(q.structure || q.rootName).trim();
      if (out.source === 'none') out.source = 'query-name';
    }
    if (!out.physicalId && APP_CONFIG && APP_CONFIG.URL_PHYSICAL_ID && isValidId(APP_CONFIG.URL_PHYSICAL_ID)) {
      out.physicalId = normalizeId(APP_CONFIG.URL_PHYSICAL_ID);
      if (out.source === 'none') out.source = 'config-id';
    }
    return out;
  }

  function readSelectionContext() {
    if (typeof ProductExplorerBridge === 'undefined') return { physicalId: '', productName: '', source: 'none' };
    var sel = ProductExplorerBridge.getSelection && ProductExplorerBridge.getSelection();
    if (sel && !badSelection(sel)) {
      var pid = normalizeId(sel.physicalid || sel.physicalId || '');
      var name = labelFromSelection(sel);
      if (isValidId(pid) || name) {
        return {
          physicalId: isValidId(pid) ? pid : '',
          productName: name,
          source: sel.source || 'selection'
        };
      }
    }
    var hashSel =
      ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
    if (hashSel && !badSelection(hashSel)) {
      var hpid = normalizeId(hashSel.physicalid || hashSel.physicalId || '');
      var hname = labelFromSelection(hashSel);
      if (isValidId(hpid) || hname) {
        return {
          physicalId: isValidId(hpid) ? hpid : '',
          productName: hname,
          source: 'hash'
        };
      }
    }
    return { physicalId: '', productName: '', source: 'none' };
  }

  function readStructureName() {
    if (typeof ProductExplorerBridge === 'undefined') return '';
    var hint =
      ProductExplorerBridge.getStructureNameHint && ProductExplorerBridge.getStructureNameHint();
    if (hint) return String(hint).trim();
    var text =
      ProductExplorerBridge.harvestExplorerTextOnly &&
      ProductExplorerBridge.harvestExplorerTextOnly();
    if (text && ProductExplorerBridge.extractStructureNameFromText) {
      var fromText = ProductExplorerBridge.extractStructureNameFromText(text);
      if (fromText) return fromText;
    }
    if (ProductExplorerBridge.extractStructureNameFromText) {
      var fromTitle = ProductExplorerBridge.extractStructureNameFromText(document.title || '');
      if (fromTitle) return fromTitle;
    }
    return '';
  }

  function resolvePhysicalIdFromName(name) {
    if (!name || typeof ProductExplorerBridge === 'undefined') return '';
    var cat =
      ProductExplorerBridge.resolveFromExplorerCatalog &&
      ProductExplorerBridge.resolveFromExplorerCatalog(name);
    if (cat && isValidId(cat.physicalid)) return normalizeId(cat.physicalid);
    var reg = APP_CONFIG && APP_CONFIG.STRUCTURE_IDS ? APP_CONFIG.STRUCTURE_IDS : {};
    var key = String(name).trim();
    var rid = reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()];
    if (rid && isValidId(rid)) return normalizeId(rid);
    if (ProductExplorerBridge.lookupPrdByPartName) {
      var prd = ProductExplorerBridge.lookupPrdByPartName(name);
      if (prd && isValidId(prd)) return normalizeId(prd);
    }
    return '';
  }

  function readCounts() {
    var expected = 0;
    var selected = 0;
    if (typeof ProductExplorerBridge === 'undefined') {
      return { expectedCount: 0, selectionCount: 0 };
    }
    if (ProductExplorerBridge.getExplorerObjectCount) {
      expected = ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    if (ProductExplorerBridge.getExplorerSelectionCount) {
      selected = ProductExplorerBridge.getExplorerSelectionCount() || 0;
    }
    if (selected > 0 && expected > 0 && selected > expected) {
      var swap = expected;
      expected = selected;
      selected = swap;
    }
    if (expected < 1 && selected > 0) expected = selected;
    return { expectedCount: expected, selectionCount: selected };
  }

  function buildSyncKey(ctx) {
    return [
      ctx.physicalId || ctx.rootName || 'explorer',
      ctx.expectedCount || 0,
      ctx.selectionCount || 0
    ].join('|');
  }

  function canUseApiFlag() {
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    } catch (e0) { /* */ }
    try {
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return true;
      }
    } catch (e1) { /* */ }
    return false;
  }

  /**
   * Atualiza contexto a partir do Explorer / dashboard (síncrono).
   * @param {boolean} [doPoll] — se true, força poll do bridge antes de ler
   */
  function refresh(doPoll) {
    if (doPoll !== false) pollBridge();

    var ctx = emptyContext();
    var q = readQueryContext();
    var sel = readSelectionContext();
    var structureName = readStructureName();
    var counts = readCounts();

    ctx.expectedCount = counts.expectedCount;
    ctx.selectionCount = counts.selectionCount;

    if (q.physicalId) {
      ctx.physicalId = q.physicalId;
      ctx.source = q.source;
    } else if (sel.physicalId) {
      ctx.physicalId = sel.physicalId;
      ctx.source = sel.source;
    }

    ctx.productName =
      q.productName ||
      sel.productName ||
      structureName ||
      '';
    ctx.displayName = ctx.productName;
    ctx.rootName = ctx.productName || structureName || '';

    if (!ctx.physicalId && ctx.rootName) {
      var resolved = resolvePhysicalIdFromName(ctx.rootName);
      if (resolved) {
        ctx.physicalId = resolved;
        if (ctx.source === 'none') ctx.source = 'registry';
      }
    }

    if (!ctx.rootName && ctx.physicalId) {
      ctx.rootName = ctx.physicalId;
    }

    ctx.hasValidPhysicalId = isValidId(ctx.physicalId);
    ctx.canUseApi = canUseApiFlag();
    ctx.updatedAt = Date.now();
    ctx.syncKey = buildSyncKey(ctx);
    cached = ctx;
    return ctx;
  }

  function get() {
    if (!cached) return refresh(true);
    return cached;
  }

  function getSyncKey() {
    return get().syncKey;
  }

  function getExpectedCount() {
    return get().expectedCount || 0;
  }

  function getPhysicalId() {
    return get().physicalId || '';
  }

  function getRootName() {
    return get().rootName || get().productName || '';
  }

  /**
   * Sugere loader para Sprint 2.5 (item 3+).
   * auto | api | tsv | paste
   */
  function suggestLoaderMode() {
    var ctx = get();
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var apiAbove = (APP_CONFIG && APP_CONFIG.API_PREFER_ABOVE) || 20;
    var primary = (APP_CONFIG && APP_CONFIG.PRIMARY_LOADER) || 'auto';
    if (primary === 'api' && ctx.canUseApi) return 'api';
    if (primary === 'tsv') return 'tsv';
    if (primary === 'paste') return 'paste';
    if (ctx.canUseApi) {
      if (ctx.hasValidPhysicalId) return 'api';
      if (ctx.expectedCount >= apiAbove) return 'api';
    }
    if (ctx.expectedCount > 0 && ctx.expectedCount <= maxTsv) return 'tsv';
    if (ctx.expectedCount > maxTsv) return 'paste';
    return 'tsv';
  }

  return {
    refresh: refresh,
    get: get,
    getSyncKey: getSyncKey,
    getExpectedCount: getExpectedCount,
    getPhysicalId: getPhysicalId,
    getRootName: getRootName,
    suggestLoaderMode: suggestLoaderMode,
    buildSyncKey: buildSyncKey
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
    if (!raw || raw === '—' || raw === '-') return 'other';
    if (/^aprovado$/i.test(raw)) return 'released';
    if (/^em\s*esper|on\s*hold|aguardando|waiting|hold\b/i.test(raw)) return 'in_work';
    if (/^em\s*trabalh|^in\s*wor/i.test(raw)) return 'in_work';
    if (/em\s*trabalh|em\s*trabalho|em\s*desenvolvimento|in\s*work|in_work|wip|private/i.test(raw)) {
      return 'in_work';
    }
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
    level: ['nivel', 'nível', 'level', 'depth', 'profundidade'],
    name: ['name', 'nome', 'titulo', 'título', 'display name', 'displayname'],
    title: ['title', 'description', 'descricao', 'descrição', 'descr', 'subtitle'],
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

  var lastImportReport = {
    parsed: 0,
    skipped: [],
    lineCount: 0,
    explorerExpected: null
  };

  function resetImportReport(lineCount) {
    lastImportReport = { parsed: 0, skipped: [], lineCount: lineCount || 0, explorerExpected: null };
  }

  function getLastImportReport() {
    return lastImportReport;
  }

  function getImportReport() {
    return {
      parsed: lastImportReport.parsed,
      skippedCount: lastImportReport.skipped.length,
      skipped: lastImportReport.skipped.slice(0, 12),
      lineCount: lastImportReport.lineCount,
      explorerExpected: lastImportReport.explorerExpected
    };
  }

  function captureExplorerExpected(pasteLineCount, hasHeader) {
    var expected = null;
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.getExplorerObjectCount) {
        var objCount = ProductExplorerBridge.getExplorerObjectCount();
        if (objCount > 0) expected = objCount;
      }
      var hint =
        ProductExplorerBridge.getStructureNameHint &&
        ProductExplorerBridge.getStructureNameHint();
      var grid = null;
      if (ProductExplorerBridge.scrapeExplorerMirror) {
        grid = ProductExplorerBridge.scrapeExplorerMirror(hint);
      }
      if ((!grid || !grid.items || !grid.items.length) && ProductExplorerBridge.scrapeExplorerGrid) {
        grid = ProductExplorerBridge.scrapeExplorerGrid(hint);
      }
      if (grid && grid.items && grid.items.length) {
        if (!expected || grid.items.length > expected) expected = grid.items.length;
      }
    }
    if (!expected && pasteLineCount > 0) {
      expected = hasHeader ? Math.max(0, pasteLineCount - 1) : pasteLineCount;
    }
    lastImportReport.explorerExpected = expected;
    return expected;
  }

  function mergeMissingGridItems(items) {
    if (!items || !items.length) return items;
    if (APP_CONFIG && APP_CONFIG.SKIP_MIRROR_ON_TSV) return items;
    if (typeof ProductExplorerBridge === 'undefined') {
      return items;
    }
    var expected = lastImportReport.explorerExpected;
    if (expected && items.length >= expected - 1) return items;
    var hint =
      ProductExplorerBridge.getStructureNameHint &&
      ProductExplorerBridge.getStructureNameHint();
    var grid = null;
    if (ProductExplorerBridge.scrapeExplorerMirror) {
      grid = ProductExplorerBridge.scrapeExplorerMirror(hint);
    }
    if ((!grid || !grid.items || !grid.items.length) && ProductExplorerBridge.scrapeExplorerGrid) {
      grid = ProductExplorerBridge.scrapeExplorerGrid(hint);
    }
    if (!grid || !grid.items || grid.items.length <= items.length) return items;
    var have = {};
    items.forEach(function (it) {
      var k = String(it.name || it.title || '').toLowerCase();
      if (k) have[k] = true;
    });
    grid.items.forEach(function (git) {
      var k = String(git.name || git.title || '').toLowerCase();
      if (!k || have[k]) return;
      have[k] = true;
      items.push(git);
    });
    return items;
  }

  function finalizeImportReport(items) {
    items = repairImportedItems(items);
    items = ensureRootItem(items);
    items = mergeMissingGridItems(items);
    items = repairImportedItems(items);
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyOwnersToItems) {
      items = ProductExplorerBridge.applyOwnersToItems(items);
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.enrichItemsWithPrd) {
      items = ProductExplorerBridge.enrichItemsWithPrd(items);
    }
    lastImportReport.parsed = items ? items.length : 0;
    return items;
  }

  function ensureRootItem(items) {
    if (!items || !items.length) return items || [];
    var rootName = '';
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      rootName = ProductExplorerBridge.getStructureNameHint() || '';
    }
    if (!rootName) rootName = items[0].name || items[0].title || '';
    rootName = cleanCell(rootName);
    if (!rootName) return items;
    var rootLow = rootName.toLowerCase();
    var hasRoot = items.some(function (it) {
      var n = cleanCell(it.name || it.title || '').toLowerCase();
      return n === rootLow;
    });
    if (hasRoot) return items;
    items.unshift({
      level: 0,
      physicalid: 'IMP_root_' + rootName.replace(/\W/g, '_').slice(0, 40),
      name: rootName,
      title: rootName,
      type: 'Physical Product',
      displayType: 'Physical Product',
      revision: '',
      state: '',
      maturity: '',
      owner: '',
      approval: 'Unknown',
      quantity: 1
    });
    return items;
  }

  function skipRow(reason, name, rowNum) {
    lastImportReport.skipped.push({ reason: reason, name: name || '', row: rowNum });
  }

  /** Corrige MÃ¡quinas → Máquinas (UTF-8 lido como Latin-1). */
  function fixMojibake(s) {
    var str = String(s == null ? '' : s);
    if (!str || str.indexOf('Ã') < 0) return str;
    var pass;
    for (pass = 0; pass < 3; pass++) {
      if (str.indexOf('Ã') < 0) break;
      try {
        var bytes = new Uint8Array(str.length);
        var i;
        for (i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
        var fixed = new TextDecoder('utf-8').decode(bytes);
        if (fixed && fixed !== str && fixed.indexOf('\uFFFD') < 0) {
          str = fixed;
          continue;
        }
      } catch (e) { /* ignore */ }
      break;
    }
    if (str.indexOf('Ã') < 0) return str;
    return str
      .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã').replace(/Ãµ/g, 'õ').replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç').replace(/Ãƒ/g, 'ã').replace(/Ã"/g, 'Ó')
      .replace(/Ã¢â‚¬â€œ/g, '—').replace(/Ã¢â‚¬Â¦/g, '…');
  }

  function cleanCell(v) {
    return fixMojibake(String(v == null ? '' : v)).trim();
  }

  function isJsonBlob(s) {
    var t = cleanCell(s);
    return t.length > 2 && t.charAt(0) === '{' && t.indexOf('"') >= 0;
  }

  /** Ícone/thumbnail 2D — getpicture ou JSON icon em qualquer célula da linha. */
  function extractIconFromRow(row) {
    if (!row || !row.length) return '';
    for (var i = 0; i < row.length; i++) {
      var raw = String(row[i] || '');
      if (!raw) continue;
      var urlMatch = raw.match(/https?:[^"\s]+getpicture[^"\s]*/i);
      if (urlMatch) return cleanCell(urlMatch[0]);
      if (isJsonBlob(raw)) {
        try {
          var o = JSON.parse(raw);
          if (o.icon && /https?|getpicture/i.test(String(o.icon))) return cleanCell(o.icon);
        } catch (e) { /* ignore */ }
      }
      if (/getpicture/i.test(raw)) {
        var m2 = raw.match(/https?:\/\/[^\s"']+/i);
        if (m2) return cleanCell(m2[0]);
      }
    }
    return '';
  }

  /** prd- em qualquer célula ou texto multi-linha da linha (copy Explorer). */
  function extractPrdFromRow(row) {
    if (!row || !row.length) return '';
    var joined = '';
    var i;
    for (i = 0; i < row.length; i++) {
      joined += ' ' + String(row[i] || '');
    }
    var m = joined.match(/prd-R\d{10,}-[A-Za-z0-9]+/i);
    return m ? m[0] : '';
  }

  /** Explorer copia proprietário como JSON { icon, label }. */
  function parseOwnerCell(raw) {
    var s = String(raw == null ? '' : raw);
    if (!isJsonBlob(s)) {
      return { label: cleanCell(s), iconUrl: '' };
    }
    try {
      var o = JSON.parse(s);
      return {
        label: cleanCell(o.label || o.name || o.displayName || ''),
        iconUrl: o.icon && /https?|getpicture/i.test(String(o.icon)) ? cleanCell(o.icon) : ''
      };
    } catch (e) {
      var iconM = s.match(/"icon"\s*:\s*"([^"]+)"/i);
      var labelM = s.match(/"label"\s*:\s*"([^"]+)"/i);
      return {
        label: labelM ? cleanCell(labelM[1]) : '',
        iconUrl: iconM ? cleanCell(iconM[1].replace(/\\\//g, '/')) : ''
      };
    }
  }

  /** JSON de proprietário tem label; JSON só de ícone da peça não. */
  function ownerJsonHasLabel(raw) {
    var s = String(raw == null ? '' : raw);
    if (!isJsonBlob(s)) return false;
    try {
      var o = JSON.parse(s);
      return !!(o.label || o.name || o.displayName);
    } catch (e) {
      return /"label"\s*:\s*"[^"]+"/i.test(s);
    }
  }

  function headerMatchesAlias(nh, alias) {
    if (!nh || !alias) return false;
    if (nh === alias) return true;
    if (alias.length < 3) return false;
    return nh.indexOf(alias) >= 0;
  }

  function isMaturityText(v) {
    v = cleanCell(unwrapJsonCell(v));
    if (!v || v.length > 48) return false;
    return /^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|in_work|frozen|obsoleto|obsolete|wip|private|on\s*hold)/i.test(v) ||
      (/aprovado/i.test(v) && !/desaprovado/i.test(v));
  }

  function isRevisionText(v) {
    v = cleanCell(v);
    return /^\d+[.,]\d+$/.test(v);
  }

  function isTypeText(v) {
    v = cleanCell(v);
    return /^physical\s*product|^produto\s*f[ií]sico|^vpm/i.test(v) || /^3d\s*shape$/i.test(v);
  }

  function isGenericRowLabel(v) {
    v = cleanCell(v);
    if (!v) return true;
    return isTypeText(v) || /^shape$/i.test(v) || /^reference$/i.test(v);
  }

  function looksLikePartIdentifier(v) {
    v = cleanCell(unwrapJsonCell(v));
    if (!v || v.length < 2) return false;
    if (isGenericRowLabel(v)) return false;
    if (looksLikePersonName(v)) return false;
    if (isRevisionText(v) || isMaturityText(v)) return false;
    if (isJsonBlob(v)) return false;
    return true;
  }

  function sanitizeOwnerValue(raw) {
    var t = cleanCell(unwrapJsonCell(raw));
    if (!t || t === '[]' || /^\[\s*\]$/.test(t)) return '';
    if (/^\d+$/.test(t)) return '';
    if (isRevisionText(t)) return '';
    if (isMaturityText(t)) return '';
    if (/^physical\s*product$/i.test(t)) return '';
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(t)) return '';
    if (/^(LONGARINA|ROLETE|PARAFUSO|SUPORTE|SAPATA|PROTE|PROTECAO|PROTEÇÃO|TRANS|FRAME|ARM|BEARING|GEAR|LEG|DRONE)\b/i.test(t)) return '';
    if (/[A-Z0-9]{2,}[-_][A-Z0-9]/.test(t)) return '';
    if (/[<][0-9]+[>]/.test(t) || /\(Peça/i.test(t)) return '';
    if (t.length > 64) return t.slice(0, 64);
    return t;
  }

  function looksLikeOwnerPerson(raw) {
    var t = sanitizeOwnerValue(raw);
    if (!t || t.length < 3) return false;
    if (/^[A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s.\-\/"'()]{4,}$/.test(t) && t === t.toUpperCase()) return false;
    return /^[A-Za-zÀ-ú][A-Za-zÀ-ú'.-]*(\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.-]*)+$/.test(t) ||
      /^[A-Za-zÀ-ú][A-Za-zÀ-ú'.-]{2,}$/.test(t);
  }

  function extractOwnerFromRow(row, colMap) {
    if (!row || !row.length) return { text: '', raw: '' };
    var tryCell = function (idx) {
      if (idx === undefined || idx < 0 || idx >= row.length) return null;
      if (colMap.level !== undefined && idx === colMap.level) return null;
      if (colMap.maturity !== undefined && idx === colMap.maturity) return null;
      if (colMap.state !== undefined && idx === colMap.state) return null;
      if (colMap.name !== undefined && idx === colMap.name) return null;
      if (colMap.revision !== undefined && idx === colMap.revision) return null;
      if (colMap.type !== undefined && idx === colMap.type) return null;
      var meta = parseOwnerCell(row[idx]);
      var text = sanitizeOwnerValue(meta.label || row[idx]);
      if (!text) return null;
      return { text: text, raw: row[idx] };
    };
    var primary = tryCell(colMap.owner);
    if (primary) return primary;
    var i;
    for (i = 0; i < row.length; i++) {
      if (!isJsonBlob(row[i]) && !ownerJsonHasLabel(row[i])) continue;
      var hit = tryCell(i);
      if (hit) return hit;
    }
    for (i = 0; i < row.length; i++) {
      var v = cleanCell(String(row[i] || ''));
      if (!v || v.length > 48 || isJsonBlob(row[i])) continue;
      if (isMaturityText(v) || isRevisionText(v) || isTypeText(v) || /^\d+$/.test(v)) continue;
      if (/^\S+\s+\S+/.test(v)) {
        return { text: sanitizeOwnerValue(v), raw: row[i] };
      }
    }
    return { text: '', raw: '' };
  }

  function inferColumnMapFromRows(rows) {
    var sample = (rows || []).slice(0, Math.min(12, rows.length));
    if (!sample.length) return { name: 0 };
    var colCount = 0;
    sample.forEach(function (r) {
      if (r && r.length > colCount) colCount = r.length;
    });
    var map = {};
    var allLevelFirst = sample.every(function (r) {
      return r && r.length && /^\d+$/.test(cleanCell(r[0]));
    });
    if (allLevelFirst) {
      map.level = 0;
      map.name = colCount > 1 ? 1 : 0;
    } else {
      map.name = 0;
    }
    var scores = [];
    var c;
    for (c = 0; c < colCount; c++) {
      scores[c] = { rev: 0, type: 0, mat: 0, owner: 0, jsonOwner: 0 };
      sample.forEach(function (r) {
        if (!r || c >= r.length) return;
        var v = r[c];
        var t = cleanCell(unwrapJsonCell(v));
        if (!t) return;
        if (isRevisionText(t)) scores[c].rev++;
        if (isTypeText(t)) scores[c].type++;
        if (isMaturityText(t)) scores[c].mat++;
        if (isJsonBlob(v) && ownerJsonHasLabel(v)) scores[c].jsonOwner++;
        if (/^\S+\s+\S+/.test(t) && sanitizeOwnerValue(t) && !isMaturityText(t) && !isRevisionText(t) && !isTypeText(t) && !/^\d+$/.test(t)) {
          scores[c].owner++;
        }
      });
    }
    function bestScore(key, minScore, skipIdx) {
      var best = -1;
      var idx = undefined;
      for (c = 0; c < colCount; c++) {
        if (skipIdx && skipIdx.indexOf(c) >= 0) continue;
        if (scores[c][key] > best && scores[c][key] >= minScore) {
          best = scores[c][key];
          idx = c;
        }
      }
      return idx;
    }
    var used = [];
    if (map.level !== undefined) used.push(map.level);
    if (map.name !== undefined) used.push(map.name);
    var revIdx = bestScore('rev', 2, used);
    if (revIdx !== undefined) { map.revision = revIdx; used.push(revIdx); }
    var typeIdx = bestScore('type', 2, used);
    if (typeIdx !== undefined) { map.type = typeIdx; used.push(typeIdx); }
    var ownerIdx = bestScore('jsonOwner', 1, used);
    if (ownerIdx === undefined) ownerIdx = bestScore('owner', 2, used);
    if (ownerIdx !== undefined) { map.owner = ownerIdx; used.push(ownerIdx); }
    var matIdx = bestScore('mat', 2, used);
    if (matIdx === undefined && colCount > 0) matIdx = colCount - 1;
    if (matIdx !== undefined && used.indexOf(matIdx) < 0) {
      map.maturity = matIdx;
      map.state = matIdx;
    }
    if (map.title === undefined && map.name !== undefined) {
      var titleIdx = map.name + 1;
      if (
        titleIdx < colCount &&
        used.indexOf(titleIdx) < 0 &&
        titleIdx !== map.owner
      ) {
        var titleLooksOwner = sample.some(function (r) {
          return r && r.length > titleIdx && looksLikePersonName(unwrapJsonCell(r[titleIdx]));
        });
        if (!titleLooksOwner) map.title = titleIdx;
      }
    }
    return map;
  }

  /** Corrige TSV Explorer: coluna Descrição com nome do proprietário em vez de M1/M2. */
  function repairImportedItems(items) {
    if (!items || !items.length) return items;
    items.forEach(function (it) {
      var nm = cleanCell(it.name || '');
      var tl = cleanCell(it.title || '');
      if (looksLikePersonName(nm) && !looksLikePersonName(tl) && tl.length >= 1) {
        it.owner = sanitizeOwnerValue(nm) || nm;
        it.name = tl;
        it.title = tl;
      } else if (looksLikePersonName(tl) && !looksLikePersonName(nm) && nm.length >= 1) {
        if (!it.owner || /^sem\s*propriet|^-$|^—$/i.test(String(it.owner).trim())) {
          it.owner = sanitizeOwnerValue(tl) || tl;
        }
        it.title = nm;
      } else if (looksLikePersonName(tl) && looksLikePersonName(nm)) {
        it.owner = sanitizeOwnerValue(tl) || tl;
        it.title = nm.split(/\s+/)[0] || nm;
      }
      if (it.name && !it.title) it.title = it.name;
      if (it.title && !it.name) it.name = it.title;
    });
    return items;
  }

  function pickOwnerColumnIndex(row, headerMap) {
    if (headerMap && headerMap.owner !== undefined) return headerMap.owner;
    if (!row || !row.length) return undefined;
    var i;
    for (i = row.length - 1; i >= 0; i--) {
      if (ownerJsonHasLabel(row[i])) return i;
    }
    for (i = 0; i < row.length; i++) {
      var v = cleanCell(String(row[i] || ''));
      if (!v || v.length > 48 || isJsonBlob(row[i])) continue;
      if (/^(aprovado|em\s*trabalh|em\s*esper|released|obsoleto|physical\s*product)/i.test(v)) continue;
      if (/^\S+\s+\S+/.test(v)) return i;
    }
    return undefined;
  }

  function isSyntheticImportId(pid) {
    var p = String(pid || '');
    return !p || p.indexOf('IMP_') === 0 || p.indexOf('grid_') === 0;
  }

  function enrichItemsWithExplorerIds(items) {
    if (!items || !items.length) return items;
    items.forEach(function (it) {
      var ownerRaw = it._ownerRaw != null ? it._ownerRaw : it.owner || '';
      if (ownerRaw) {
        var om = parseOwnerCell(ownerRaw);
        if (om.label && looksLikeOwnerPerson(om.label)) it.owner = sanitizeOwnerValue(om.label) || om.label;
        if (om.iconUrl && !it.iconUrl) it.iconUrl = om.iconUrl;
      }
      if ((!it.owner || /^sem\s*propriet|^-$|^—$/i.test(String(it.owner).trim())) && it._ownerRaw) {
        var om2 = parseOwnerCell(it._ownerRaw);
        if (om2.label && looksLikeOwnerPerson(om2.label)) it.owner = sanitizeOwnerValue(om2.label) || om2.label;
      }
      if (!it.sourcePhysicalId || isSyntheticImportId(it.sourcePhysicalId)) {
        var prd = '';
        var reg = (APP_CONFIG && APP_CONFIG.STRUCTURE_IDS) || {};
        var nm = String(it.name || it.title || '').trim();
        prd = reg[nm] || reg[nm.toLowerCase()] || reg[nm.toUpperCase()] || '';
        if (!prd && typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.lookupPrdByPartName) {
          prd = ProductExplorerBridge.lookupPrdByPartName(nm);
        }
        if (prd) it.sourcePhysicalId = String(prd).replace(/^prd::/i, 'prd-');
      }
      if (!it.iconUrl && it.sourcePhysicalId && typeof PartImage !== 'undefined' && PartImage.buildGetPictureUrl) {
        it.iconUrl = PartImage.buildGetPictureUrl(it.sourcePhysicalId);
      }
    });
    return items;
  }

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

  function looksLikePersonName(n) {
    n = cleanCell(n);
    if (!n || n.length < 3 || n.length > 64) return false;
    if (/^(01_SKA_|SKA_|Mont\d|M\d{1,4}|prd-R)/i.test(n)) return false;
    if (/^\d+[.,]\d+$/.test(n)) return false;
    if (/^(aprovado|em\s*trabalh|released|physical\s*product|vpmreference)/i.test(n)) return false;
    if (/\s/.test(n) && !/[a-zà-ú]/.test(n)) return false;
    if (/^[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*(\s+[A-Za-zÀ-ú][A-Za-zÀ-ú'.\-]*)+$/.test(n) && !/\d/.test(n)) {
      return true;
    }
    return false;
  }

  function isProductName(name) {
    var n = cleanCell(name);
    if (!n || n.length < 2) return false;
    if (isJsonBlob(n)) return false;
    if (isGenericRowLabel(n)) return false;
    if (looksLikePersonName(n)) return false;
    return true;
  }

  function normalizeImportedState(state, approval) {
    var s = cleanCell(state);
    var a = cleanCell(approval);
    if (/aprovado|released|frozen|approved/i.test(s)) {
      return { state: s || 'Aprovado', maturity: s || 'Aprovado', approval: a && a !== 'Unknown' ? a : 'Approved' };
    }
    if (/^em\s*trabalh|^in\s*wor|em\s*trabalh|em\s*trabalho|in\s*work|in_work|wip|private|desenvolvimento/i.test(s)) {
      return { state: s || 'Em Trabalho', maturity: s || 'Em Trabalho', approval: a || 'Unknown' };
    }
    if (/^em\s*esper|on\s*hold|hold|waiting|aguardando/i.test(s)) {
      return { state: s || 'Em Espera', maturity: s || 'Em Espera', approval: a || 'Unknown' };
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
      if (/^(aprovado|em\s*trabalh|em\s*esper|released|in\s*wor|in_work|frozen|obsoleto|obsolete|wip|private|on\s*hold)/i.test(v)) {
        if (/^em\s*trabalh/i.test(v)) return 'Em Trabalho';
        if (/^em\s*esper/i.test(v)) return 'Em Espera';
        if (/^in\s*wor/i.test(v)) return 'In Work';
        return v;
      }
      if (/aprovado/i.test(v) && !/desaprovado/i.test(v)) return v;
      if (/em\s*trabalh/i.test(v)) return 'Em Trabalho';
      if (/em\s*esper/i.test(v)) return 'Em Espera';
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
    return cleanCell(h)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function standardExplorerColumnMap(offset) {
    offset = offset || 0;
    return {
      name: 0 + offset,
      title: 1 + offset,
      revision: 2 + offset,
      owner: 3 + offset,
      type: 4 + offset,
      maturity: 5 + offset,
      state: 5 + offset
    };
  }

  function leadingIconColumnOffset(rows) {
    var sample = (rows || []).slice(0, Math.min(10, rows.length));
    if (!sample.length) return 0;
    var jsonFirst = 0;
    var revAt2 = 0;
    sample.forEach(function (row) {
      if (!row || !row.length) return;
      if (isJsonBlob(row[0]) || ownerJsonHasLabel(row[0])) jsonFirst++;
      if (row.length > 2 && isRevisionText(unwrapJsonCell(row[2]))) revAt2++;
    });
    if (jsonFirst >= Math.max(1, Math.ceil(sample.length * 0.5))) return 1;
    if (revAt2 >= Math.max(2, Math.ceil(sample.length * 0.35))) return 0;
    return 0;
  }

  function offsetColumnMap(colMap, shift) {
    if (!shift || !colMap) return colMap;
    var out = {};
    Object.keys(colMap).forEach(function (k) {
      if (colMap[k] !== undefined && colMap[k] >= 0) out[k] = colMap[k] + shift;
    });
    return out;
  }

  /** Explorer: só a raiz traz JSON de ícone; filhos (M1/M2) começam no Título. */
  function rowLeadingIconOffset(row) {
    if (!row || !row.length) return 0;
    if (isJsonBlob(row[0]) || ownerJsonHasLabel(row[0])) return 1;
    return 0;
  }

  function colMapForRow(baseMap, row) {
    return offsetColumnMap(baseMap, rowLeadingIconOffset(row));
  }

  /** Explorer PT: Título, Descrição, Revisão, Proprietário, Tipo, Maturidade (+ coluna ícone JSON). */
  function extractFieldsFromExplorerRow(row) {
    var cells = (row || []).map(function (c) {
      return cleanCell(unwrapJsonCell(c));
    });
    var out = {
      name: '',
      title: '',
      revision: '',
      owner: '',
      type: 'Physical Product',
      maturity: ''
    };
    var partNames = [];
    var descriptions = [];
    var i;
    var v;
    for (i = 0; i < cells.length; i++) {
      v = cells[i];
      if (!v) continue;
      if (isJsonBlob(row[i]) || ownerJsonHasLabel(row[i])) {
        var om = parseOwnerCell(row[i]);
        if (om.label && !out.owner) out.owner = sanitizeOwnerValue(om.label) || om.label;
        continue;
      }
      if (isRevisionText(v)) {
        if (!out.revision) out.revision = v.replace(',', '.');
        continue;
      }
      if (isTypeText(v)) {
        if (!out.type) out.type = v;
        continue;
      }
      if (isMaturityText(v)) {
        if (!out.maturity) out.maturity = v;
        continue;
      }
      if (looksLikePersonName(v)) {
        if (!out.owner) out.owner = sanitizeOwnerValue(v) || v;
        continue;
      }
      if (looksLikePartIdentifier(v) && v.length <= 120) {
        partNames.push(v);
        continue;
      }
      if (v.length >= 4 && /[A-Za-zÀ-ú]{2,}/.test(v) && !isRevisionText(v) && !isTypeText(v) && !looksLikePersonName(v)) {
        descriptions.push(v);
      }
    }
    out.name = partNames[0] || '';
    out.title = descriptions[0] || '';
    if (!out.title || out.title === out.name) {
      out.title = descriptions[0] || partNames[1] || out.name;
    }
    if (!out.maturity) out.maturity = findMaturityInCells(row) || '';
    if (!out.revision) {
      for (i = 0; i < cells.length; i++) {
        var rm = String(cells[i]).match(/\b(\d+[.,]\d+[A-Za-z]?)\b/);
        if (rm) {
          out.revision = rm[1].replace(',', '.');
          break;
        }
      }
    }
    return out;
  }

  function fieldsNeedContentRepair(fields) {
    if (!fields || !fields.name) return true;
    if (fields.revision && !isRevisionText(fields.revision) && fields.revision.length > 10) return true;
    if (fields.type && isRevisionText(fields.type)) return true;
    if (fields.maturity && isTypeText(fields.maturity)) return true;
    return false;
  }

  function mapColumns(headers) {
    var map = {};
    var i;
    for (i = 0; i < headers.length; i++) {
      var nh = normHeader(headers[i]);
      if (!nh) continue;
      if (nh.indexOf('titulo') >= 0) map.name = i;
      else if (nh.indexOf('descr') >= 0) map.title = i;
      else if (nh.indexOf('revis') >= 0) map.revision = i;
      else if (nh.indexOf('propriet') >= 0) map.owner = i;
      else if (nh.indexOf('tipo') >= 0 || nh === 'type') map.type = i;
      else if (nh.indexOf('matur') >= 0 || nh.indexOf('estado') >= 0) {
        map.maturity = i;
        map.state = i;
      }
    }
    if (map.name !== undefined) return map;
    headers.forEach(function (h, idx) {
      var nh = normHeader(h);
      if (!nh) return;
      if (nh.indexOf('matur') >= 0 || nh.indexOf('lifecycle') >= 0 || nh === 'status') {
        map.maturity = idx;
        map.state = idx;
      }
    });
    headers.forEach(function (h, idx) {
      var nh = normHeader(h);
      if (!nh) return;
      Object.keys(COLUMN_ALIASES).forEach(function (key) {
        if (map[key] !== undefined) return;
        if (COLUMN_ALIASES[key].some(function (a) { return headerMatchesAlias(nh, a); })) {
          map[key] = idx;
        }
      });
    });
    return map;
  }

  function guessExplorerColumnMap(row) {
    return inferColumnMapFromRows([row]);
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
      joined.indexOf('title') >= 0 ||
      joined.indexOf('título') >= 0 ||
      joined.indexOf('titulo') >= 0 ||
      joined.indexOf('propriet') >= 0 ||
      joined.indexOf('matur') >= 0;
  }

  function leadingDepth(str) {
    var s = String(str || '');
    var tabs = (s.match(/^\t*/) || [''])[0].length;
    if (tabs > 0) return { depth: tabs, text: s.replace(/^\t+/, '').trim() };
    var spaces = (s.match(/^ */) || [''])[0].length;
    return { depth: Math.floor(spaces / 2), text: s.trim() };
  }

  function splitLineRaw(line) {
    function trimCell(c) {
      return String(c == null ? '' : c).replace(/^"|"$/g, '').trim();
    }
    if (line.indexOf('\t') >= 0) return line.split('\t').map(trimCell);
    if (line.indexOf(';') >= 0) return line.split(';').map(trimCell);
    return line.split(',').map(trimCell);
  }

  function splitLine(line) {
    return splitLineRaw(line).map(function (c) { return unwrapJsonCell(c); });
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
        } else if (cells.length >= 6) {
          colMap = standardExplorerColumnMap(leadingIconColumnOffset([cells]));
        } else if (cells.length >= 5) {
          colMap = standardExplorerColumnMap(0);
        }
        try {
          var built = buildItemsFromRows([cells], colMap, true);
          if (built && built[0]) return built[0];
        } catch (e2) { /* legacy */ }
      }
    }
    var nameM = raw.match(/^(Mont\d*|M\d+|01_SKA_[A-Za-z0-9_.\-]+)\b/i);
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
    return lines.map(splitLineRaw);
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

  function firstPastedProductName(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return '';
    var row = splitLineRaw(lines[0]);
    if (looksLikeHeader(row)) return '';
    var idx = rowLeadingIconOffset(row);
    var raw = row[idx] !== undefined ? row[idx] : row[0];
    var lead = leadingDepth(raw);
    var name = stripIconNoise(unwrapJsonCell(lead.text || raw));
    return isProductName(name) ? name : '';
  }

  function firstPastedProductMeta(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return null;
    var row = splitLineRaw(lines[0]);
    if (looksLikeHeader(row)) return null;
    var name = firstPastedProductName(text);
    if (!name) return null;
    var parsed = extractFieldsFromExplorerRow(row);
    var st = normalizeImportedState(parsed.maturity || findMaturityInCells(row) || '', 'Unknown');
    return {
      name: name,
      title: parsed.title || name,
      type: parsed.type || 'Physical Product',
      displayType: parsed.type || 'Physical Product',
      revision: parsed.revision || '',
      state: st.state,
      maturity: st.maturity,
      owner: looksLikeOwnerPerson(parsed.owner) ? parsed.owner : '',
      _ownerRaw: parsed.owner || '',
      approval: st.approval || 'Unknown'
    };
  }

  function fillMissingRootMeta(root, meta) {
    if (!root || !meta) return root;
    ['title', 'type', 'displayType', 'revision', 'state', 'maturity', 'owner', '_ownerRaw', 'approval'].forEach(function (k) {
      var cur = cleanCell(root[k]);
      if (!cur || cur === '-' || cur === '—' || /^sem\s*propriet/i.test(cur)) {
        if (meta[k]) root[k] = meta[k];
      }
    });
    return root;
  }

  function ensureFirstPastedRoot(text, items) {
    if (!items || !items.length) return items;
    var rootMeta = firstPastedProductMeta(text);
    var rootName = rootMeta && rootMeta.name;
    if (!rootName) return items;
    var rootKey = rootName.toLowerCase();
    var existingRoot = null;
    items.some(function (it) {
      if (cleanCell(it.name || it.title || '').toLowerCase() === rootKey) {
        existingRoot = it;
        return true;
      }
      return false;
    });
    if (existingRoot) {
      fillMissingRootMeta(existingRoot, rootMeta);
      return items;
    }
    items.unshift({
      physicalid: 'IMP_root_' + rootName.replace(/\W/g, '_').slice(0, 40),
      name: rootName,
      title: rootName,
      type: rootMeta.type || 'Physical Product',
      displayType: rootMeta.displayType || rootMeta.type || 'Physical Product',
      revision: rootMeta.revision || '',
      state: rootMeta.state || '',
      maturity: rootMeta.maturity || '',
      owner: rootMeta.owner || '',
      _ownerRaw: rootMeta._ownerRaw || '',
      organization: '',
      collabSpace: '',
      approval: rootMeta.approval || 'Unknown',
      quantity: 1,
      level: 0
    });
    for (var i = 1; i < items.length; i++) {
      if (!items[i].level || items[i].level < 1) items[i].level = 1;
    }
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
      var rows = lines.map(splitLineRaw);
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
      else skipRow('linha_nao_parseada', lines[i].slice(0, 48), i + 1);
    }
    if (items.length >= 2) {
      validateImportedItems(items);
      return inferAssemblyLevels(items);
    }
    return null;
  }

  function parseText(text) {
    var pasteLines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    resetImportReport(pasteLines.length);
    var rowsPreview = pasteLines.length ? pasteLines.map(splitLineRaw) : [];
    var hasHeader = rowsPreview.length && looksLikeHeader(rowsPreview[0]);
    captureExplorerExpected(pasteLines.length, hasHeader);
    if (!looksLikeExplorerPaste(text)) {
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.scrapeExplorerMirror) {
        var term =
          ProductExplorerBridge.getStructureNameHint &&
          ProductExplorerBridge.getStructureNameHint();
        var mirror = ProductExplorerBridge.scrapeExplorerMirror(term || '');
        if (mirror && mirror.items && mirror.items.length >= 2) {
          return finalizeImportReport(mirror.items);
        }
      }
      throw new Error(
        'Clipboard não tem a grade do Explorer. No Explorer: clique na tabela → Ctrl+A → Ctrl+C → cole na caixa azul → Varrer.'
      );
    }
    var gridItems = parseTextFromGridLines(text);
    if (gridItems && gridItems.length) {
      gridItems = ensureFirstPastedRoot(text, gridItems);
      validateImportedItems(gridItems);
      return finalizeImportReport(enrichItemsWithExplorerIds(inferAssemblyLevels(gridItems)));
    }

    var rows = textToRows(text).map(function (row) {
      return row.map(function (c) { return cleanCell(c); });
    });
    if (rows.length === 1 && rows[0].length === 1) {
      return finalizeImportReport(buildItemsFromSingleColumn([rows[0][0]]));
    }
    var items = smartParseRows(rows);
    items.forEach(function (it) {
      it.name = stripIconNoise(it.name) || it.name;
      it.title = stripIconNoise(it.title) || it.title;
    });
    items = inferAssemblyLevels(ensureFirstPastedRoot(text, items.filter(function (it) {
      if (!it.name || !it.name.length) {
        skipRow('nome_vazio', it.title || '', it.rowIndex || 0);
        return false;
      }
      return true;
    })));
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
    return finalizeImportReport(enrichItemsWithExplorerIds(items));
  }

  function parseRowsWithoutHeader(rows) {
    if (rows.length && looksLikeHeader(rows[0])) {
      return parseRows(rows);
    }
    var iconOff = leadingIconColumnOffset(rows);
    var colMap = offsetColumnMap(inferColumnMapFromRows(rows), iconOff);
    if (!colMap.name && colMap.name !== 0) colMap.name = 0 + iconOff;
    if (rows[0] && rows[0].length >= 5) {
      colMap = standardExplorerColumnMap(iconOff);
    }
    return buildItemsFromRows(rows, colMap, colMap.level === undefined);
  }

  function parseRows(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Dados insuficientes. Copie pelo menos o cabeçalho e uma linha do Explorer.');
    }
    var headers = rows[0].map(function (c) { return String(c || ''); });
    var dataRows = rows.slice(1);
    var colMap = mapColumns(headers);
    if (colMap.name === undefined && colMap.title === undefined) {
      colMap = standardExplorerColumnMap(0);
    }
    return buildItemsFromRows(dataRows, colMap, false);
  }

  function buildItemsFromRows(dataRows, colMap, inferIndent) {
    var items = [];
    var usedIds = {};
    var stackLevel = 0;
    for (var r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      if (!row || !row.length) continue;

      var rowMap = colMapForRow(colMap, row);
      var level = 0;
      var name = '';
      if (inferIndent && rowMap.level === undefined) {
        var nameCol = rowMap.name !== undefined ? rowMap.name : 0;
        var lead = leadingDepth(row[nameCol] !== undefined ? row[nameCol] : row[0]);
        level = lead.depth;
        name = lead.text;
        if (rowMap.name !== undefined && row[nameCol] !== undefined) {
          row = row.slice();
          row[rowMap.name] = lead.text;
        }
      } else {
        level = parseInt(cell(row, rowMap, 'level', ''), 10);
        if (isNaN(level)) level = stackLevel;
      }

      var parsedEarly = extractFieldsFromExplorerRow(row);
      if (parsedEarly.name && isProductName(parsedEarly.name)) {
        name = parsedEarly.name;
      }
      if (!name) {
        name =
          cleanCell(cell(row, rowMap, 'name', '')) || cleanCell(cell(row, rowMap, 'title', ''));
      }
      name = stripIconNoise(unwrapJsonCell(name));
      if (!isProductName(name) && parsedEarly.name && isProductName(parsedEarly.name)) {
        name = parsedEarly.name;
      }
      if (!isProductName(name)) {
        skipRow('nome_invalido', String(name).slice(0, 40), r + 1);
        continue;
      }
      if (isGenericRowLabel(name)) {
        skipRow('tipo_linha', name, r + 1);
        continue;
      }
      if (isStatusLabel(name) && items.length) {
        items[items.length - 1].state = name;
        items[items.length - 1].maturity = name;
        continue;
      }
      stackLevel = level;

      var prdFromRow = extractPrdFromRow(row);
      var pidCell = cell(row, rowMap, 'physicalid', '');
      var pid = pidCell || prdFromRow || ('IMP_' + (r + 1) + '_' + name.replace(/\W/g, '_').slice(0, 40));
      pid = String(pid);
      if (usedIds[pid]) pid = pid + '__r' + (r + 1);
      usedIds[pid] = true;
      var srcPrd = prdFromRow || (/^prd-R/i.test(pidCell) ? pidCell : '');
      var st = resolveMaturityFields(row, rowMap);
      var ownerHit = extractOwnerFromRow(row, rowMap);
      var ownerText = ownerHit.text;
      var ownerCol = ownerHit.raw;
      var parsedFields = parsedEarly.name ? parsedEarly : extractFieldsFromExplorerRow(row);
      if (parsedFields.name && (parsedFields.name === name || !isProductName(name) || fieldsNeedContentRepair({
        name: name,
        title: cell(row, rowMap, 'title', name),
        revision: cell(row, rowMap, 'revision', ''),
        type: cell(row, rowMap, 'type', ''),
        maturity: cell(row, rowMap, 'maturity', '')
      }))) {
        name = parsedFields.name;
      }
      var titleVal = stripIconNoise(unwrapJsonCell(cell(row, rowMap, 'title', name))) || String(name);
      var revisionVal = cell(row, rowMap, 'revision', '');
      var typeVal = cell(row, rowMap, 'type', 'Physical Product');
      if (parsedFields.name) {
        name = parsedFields.name || name;
        if (parsedFields.title && !looksLikePersonName(parsedFields.title)) {
          titleVal = parsedFields.title;
        } else if (looksLikePersonName(titleVal) && parsedFields.name) {
          titleVal = parsedFields.name;
        }
        revisionVal = parsedFields.revision || revisionVal;
        if (!ownerText && looksLikeOwnerPerson(parsedFields.owner)) {
          ownerText = parsedFields.owner;
        }
        typeVal = parsedFields.type || typeVal;
        if (parsedFields.maturity) {
          st = normalizeImportedState(parsedFields.maturity, st.approval);
        }
      }
      if (looksLikePersonName(titleVal) && !looksLikePersonName(name)) titleVal = String(name);
      if (revisionVal && !isRevisionText(revisionVal) && parsedFields.revision) revisionVal = parsedFields.revision;
      if (isRevisionText(typeVal) && parsedFields.type) typeVal = parsedFields.type;
      if (!st.state && !st.maturity) {
        var scanned = findMaturityInCells(row);
        if (scanned) {
          st = normalizeImportedState(scanned, st.approval);
        }
      }
      items.push({
        physicalid: pid,
        sourcePhysicalId: srcPrd || (/^prd-R/i.test(pidCell) ? pidCell : ''),
        name: String(name),
        title: titleVal,
        type: typeVal || 'VPMReference',
        displayType: typeVal || 'Physical Product',
        revision: revisionVal,
        state: st.state,
        maturity: st.maturity,
        iconUrl: extractIconFromRow(row) || (ownerCol && parseOwnerCell(ownerCol).iconUrl) || '',
        quantity: parseFloat(cell(row, rowMap, 'quantity', '1')) || 1,
        owner: looksLikeOwnerPerson(ownerText) ? ownerText : '',
        _ownerRaw: ownerCol,
        organization: cell(row, rowMap, 'organization', ''),
        collabSpace: cell(row, rowMap, 'collabSpace', ''),
        approval: st.approval,
        level: level,
        parentKey: cell(row, rowMap, 'parent', ''),
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
    parseRows: parseRows,
    extractFieldsFromExplorerRow: extractFieldsFromExplorerRow,
    getImportReport: getImportReport,
    getLastImportReport: getLastImportReport,
    fixMojibake: fixMojibake
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
        owner: it.owner && it.owner !== '—' && it.owner !== '-' ? it.owner : '',
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
    items = ensureContextRoot(items, productName);
    productName = (items[0] && (items[0].title || items[0].name)) || productName;
    return {
      version: FORMAT_VERSION,
      productName: productName || 'E-BOM',
      exportedAt: new Date().toISOString(),
      rootPhysicalId: items.length ? items[0].physicalid : null,
      items: items
    };
  }

  function cleanName(s) {
    return String(s == null ? '' : s).trim();
  }

  function sameName(a, b) {
    return cleanName(a).toLowerCase() === cleanName(b).toLowerCase();
  }

  function contextRootName(fallback) {
    var root = '';
    try {
      if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
        var ctx = ExplorerContext.refresh(false);
        root = (ctx && (ctx.rootName || ctx.productName)) || '';
      }
    } catch (e0) { /* */ }
    if (!root && typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      root = ProductExplorerBridge.getStructureNameHint() || '';
    }
    root = cleanName(root || fallback || '');
    if (!root || root === '-' || /^e-?bom$/i.test(root) || /^bom analytics/i.test(root)) return '';
    return root;
  }

  function fallbackRootMeta(items) {
    var src = items && items.length ? items[0] : null;
    if (!src) return {};
    return {
      revision: src.revision || '',
      owner: src.owner || '',
      type: src.type || src.displayType || 'Physical Product',
      displayType: src.displayType || src.type || 'Physical Product'
    };
  }

  function ensureContextRoot(items, productName) {
    if (!items || !items.length) return items || [];
    var rootName = contextRootName(productName);
    if (!rootName) return items;
    var firstName = cleanName(items[0].name || items[0].title);
    if (sameName(firstName, rootName)) return items;
    var meta = fallbackRootMeta(items);
    var hasRoot = items.some(function (it) {
      return sameName(it.name || it.title, rootName);
    });
    if (hasRoot) return items;
    items = items.slice();
    items.unshift({
      level: 0,
      physicalid: 'IMP_root_' + rootName.replace(/\W/g, '_').slice(0, 40),
      name: rootName,
      title: rootName,
      type: meta.type || 'Physical Product',
      displayType: meta.displayType || meta.type || 'Physical Product',
      revision: meta.revision || '',
      state: '',
      maturity: '',
      owner: meta.owner || '',
      approval: 'Unknown',
      quantity: 1
    });
    for (var i = 1; i < items.length; i++) {
      var lv = parseInt(items[i].level, 10);
      if (isNaN(lv) || lv < 1) items[i].level = 1;
    }
    return items;
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
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyOwnersToIndex) {
        ProductExplorerBridge.applyOwnersToIndex(BomService.getIndex());
      }
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyPrdToIndex) {
        window.setTimeout(function () {
          ProductExplorerBridge.applyPrdToIndex(BomService.getIndex());
        }, 0);
      }
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
  var apiDiagnostics = {};

  function reset() {
    index = {};
    rootId = null;
    nodeCount = 0;
    apiDiagnostics = {};
    PhysicalProductService.clearCache();
  }

  function createSnapshot() {
    return {
      index: JSON.parse(JSON.stringify(index)),
      rootId: rootId,
      nodeCount: nodeCount
    };
  }

  function restoreSnapshot(snap) {
    if (!snap || !snap.index) return false;
    index = snap.index;
    rootId = snap.rootId;
    nodeCount = snap.nodeCount;
    return true;
  }

  function resetApiDiagnostics(rootPhysicalId, expected) {
    apiDiagnostics = {
      rootPhysicalId: rootPhysicalId || '',
      expectedCount: expected || 0,
      resolvedReferences: 0,
      unresolvedInstances: 0,
      parentRequests: 0,
      lastParentId: '',
      lastApiParentId: '',
      lastChildTotal: 0,
      duplicateRowsPreserved: 0,
      lastError: ''
    };
  }

  function isUnresolvedInstance(ref, member) {
    return ref === member && String(member && member.type || '') === 'VPMInstance';
  }

  function canAddNode() {
    return nodeCount < APP_CONFIG.BOM_MAX_NODES;
  }

  function addNode(attrs, parentId, level, quantity) {
    if (!canAddNode()) return null;
    var id = attrs.physicalid;
    if (index[id]) {
      if (APP_CONFIG.PRESERVE_OCCURRENCE_ROWS !== false && parentId) {
        attrs.duplicateOf = id;
        attrs.referencePhysicalId = attrs.referencePhysicalId || id;
        attrs.bomChildrenId = attrs.bomChildrenId || attrs.referencePhysicalId;
        attrs.physicalid = id + '__dup_' + parentId + '_' + level + '_' + nodeCount;
        id = attrs.physicalid;
        apiDiagnostics.duplicateRowsPreserved++;
      } else {
        index[id].quantity = (index[id].quantity || 1) + (quantity || 1);
        index[id].occurrenceCount = (index[id].occurrenceCount || 1) + 1;
        return index[id];
      }
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

  function getEmbeddedReference(member) {
    var ref =
      member.referencedObject ||
      member.referenceObject ||
      member.child ||
      member.related ||
      member.to ||
      member.reference ||
      member['dseng:EngItem'] ||
      member['dseng:referencedObject'] ||
      member['dseng:child'] ||
      member['dspfl:Part'] ||
      member['dspfl:Instance'] ||
      member;
    if (Array.isArray(ref)) ref = ref[0];
    if (ref === member && member['dseng:EngItem'] && typeof member['dseng:EngItem'] === 'object') {
      ref = member['dseng:EngItem'];
    }
    return ref;
  }

  function stripOccurrenceSuffix(name) {
    return String(name || '')
      .replace(/<\d+>\s*$/g, '')
      .replace(/\.\d+\s*$/g, '')
      .trim();
  }

  function addInstanceNode(ref, member, parentId, level) {
    var attrs = AttributeService.extractFromMember(ref);
    var qty = member.quantity || member['dseng:quantity'] || member.qty || 1;
    var unresolved = isUnresolvedInstance(ref, member);
    if (!attrs.physicalid && ref && ref.id) attrs.physicalid = ref.id;
    normalizeApiDisplayAttrs(attrs, ref);
    if (unresolved) {
      attrs.name = stripOccurrenceSuffix(member && member.name) || attrs.name || 'InstÃ¢ncia sem referÃªncia';
      attrs.title = member.description || '';
      attrs.displayType = '';
      attrs.type = '';
      attrs.revision = attrs.revision || 'â€”';
      attrs.owner = '';
      attrs.maturity = attrs.maturity || attrs.state || 'â€”';
      attrs.isUnresolvedInstance = true;
      attrs.apiResolutionStatus = 'unresolved-instance';
      apiDiagnostics.unresolvedInstances++;
    } else {
      attrs.apiResolutionStatus = 'resolved-reference';
      apiDiagnostics.resolvedReferences++;
    }
    attrs.referencePhysicalId = unresolved ? '' : attrs.physicalid;
    attrs.referenceId = attrs.referencePhysicalId;
    attrs.bomChildrenId = attrs.referencePhysicalId;
    if (member && member.id) {
      attrs.physicalid = member.id;
    } else if (attrs.referencePhysicalId) {
      attrs.physicalid = attrs.referencePhysicalId + '__occ_' + parentId + '_' + level + '_' + nodeCount;
    }
    attrs.occurrenceId = member.id || '';
    attrs.occurrenceName = member.name || '';
    attrs.occurrenceType = member.type || '';
    attrs.quantity = qty;
    return addNode(attrs, parentId, level, qty);
  }

  function normalizeApiDisplayAttrs(attrs, ref) {
    if (!attrs) return attrs;
    var rawName = String((ref && ref.name) || attrs.name || '').trim();
    var rawTitle = String((ref && ref.title) || attrs.title || '').trim();
    if (/^prd-/i.test(rawName)) {
      attrs.sourcePhysicalId = rawName;
      attrs.name = rawTitle || rawName;
      attrs.title = (ref && ref.description) || attrs.description || '';
    }
    attrs.referenceId = attrs.referenceId || attrs.referencePhysicalId || attrs.physicalid || '';
    return attrs;
  }

  function parseInstance(member, parentId, level) {
    return addInstanceNode(getEmbeddedReference(member), member, parentId, level);
  }

  function resolveEngInstance(member, parentId, level) {
    var ref = getEmbeddedReference(member);
    if (ref && ref !== member) {
      return Promise.resolve(addInstanceNode(ref, member, parentId, level));
    }

    var baseName = stripOccurrenceSuffix(member && member.name);
    if (!baseName || !EnoviaApi.findEngItemByLabel || String(member.type || '') !== 'VPMInstance') {
      return Promise.resolve(parseInstance(member, parentId, level));
    }

    var parent = index[parentId] || {};
    var hints = {
      owner: parent.owner,
      organization: parent.organization,
      collabspace: parent.collabSpace,
      revision: parent.revision,
      created: parent.created,
      modified: parent.modified,
      cestamp: member.cestamp
    };

    return EnoviaApi.findEngItemByLabel(baseName, 20, hints)
      .then(function (resolved) {
        return addInstanceNode(resolved, member, parentId, level);
      })
      .catch(function (err) {
        var node = parseInstance(member, parentId, level);
        if (node) {
          node.loadError = (err && err.message) || String(err || 'Falha ao resolver instancia.');
          node.isUnresolvedInstance = true;
        }
        return node;
      });
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
    var apiParentId = index[parentId].bomChildrenId || index[parentId].referencePhysicalId || parentId;
    apiDiagnostics.parentRequests++;
    apiDiagnostics.lastParentId = parentId;
    apiDiagnostics.lastApiParentId = apiParentId;

    function fetchPage(useEngInstance) {
      var fetcher = useEngInstance
        ? EnoviaApi.getEngInstanceChildren.bind(EnoviaApi)
        : EnoviaApi.getPhysicalProductChildren.bind(EnoviaApi);
      return fetcher(apiParentId, skip, top).then(function (res) {
        var members = EnoviaApi.extractMembers(res);
        var parsePage = useEngInstance
          ? Promise.all(members.map(function (m) { return resolveEngInstance(m, parentId, level); }))
          : Promise.resolve(members.map(function (m) { return parseInstance(m, parentId, level); }));

        return parsePage.then(function (nodes) {
          nodes.forEach(function (node) {
            if (node) allChildren.push(node);
          });
          var total = res && res.totalItems ? res.totalItems : members.length;
          apiDiagnostics.lastChildTotal = total;
          skip += members.length;
          if (members.length === top && skip < total && canAddNode()) {
            return fetchPage(useEngInstance);
          }
          index[parentId].loaded = true;
          return allChildren;
        });
      });
    }

    return fetchPage(EnoviaApi.preferEngChildrenForParent(parentId)).catch(function (firstErr) {
      if (APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK === true) {
        skip = 0;
        allChildren = [];
        return fetchPage(false);
      }
      if (index[parentId]) {
        index[parentId].loaded = false;
        index[parentId].loadError = (firstErr && firstErr.message) || String(firstErr || 'Falha ao carregar filhos.');
      }
      apiDiagnostics.lastError = (firstErr && firstErr.message) || String(firstErr || 'Falha ao carregar filhos.');
      return Promise.reject(firstErr);
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
    var usedImportIds = {};
    items.forEach(function (item, idx) {
      var level = item.level || 0;
      while (stack.length > level) stack.pop();
      var parentId = stack.length ? stack[stack.length - 1] : null;

      var pid = String(item.physicalid || ('IMP_' + idx));
      if (usedImportIds[pid]) pid = pid + '__r' + idx;
      usedImportIds[pid] = true;

      var attrs = {
        physicalid: pid,
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
        hasPhysicalProduct: true,
        iconUrl: item.iconUrl || ''
      };

      var node = addNode(attrs, parentId, level, item.quantity);
      if (node) {
        if (item.iconUrl) node.iconUrl = item.iconUrl;
        if (item.sourcePhysicalId) node.sourcePhysicalId = item.sourcePhysicalId;
        if (typeof PartImage !== 'undefined' && PartImage.lookupPrdId) {
          var prd = PartImage.lookupPrdId(node);
          var pid = String(node.sourcePhysicalId || node.physicalid || '');
          var synthetic = !pid || pid.indexOf('IMP_') === 0 || pid.indexOf('grid_') === 0;
          if (prd && synthetic) {
            node.sourcePhysicalId = prd;
          }
          if (!node.iconUrl && PartImage.buildGetPictureUrl) {
            node.iconUrl = PartImage.buildGetPictureUrl(node.sourcePhysicalId || prd);
          }
        }
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

  function buildMetaFromIndex() {
    var rootNode = index[rootId];
    var productName = (rootNode && (rootNode.title || rootNode.name)) || 'E-BOM';
    var max = APP_CONFIG.BOM_MAX_NODES || 50000;
    return {
      productName: productName,
      rootPhysicalId: rootId,
      itemCount: nodeCount,
      apiDiagnostics: Object.assign({}, apiDiagnostics),
      truncated: nodeCount >= max * 0.95
    };
  }

  function expandBfs(startId, reportFn) {
    var queue = [startId];
    var seen = {};

    function step() {
      if (!queue.length || !canAddNode()) return Promise.resolve(index);
      var parentId = queue.shift();
      if (seen[parentId]) return step();
      seen[parentId] = true;
      var node = index[parentId];
      if (!node) return step();

      return loadChildren(parentId, node.level + 1)
        .then(function (children) {
          if (index[parentId]) {
            index[parentId].loaded = true;
            index[parentId].expanded = true;
          }
          if (typeof reportFn === 'function') reportFn('loading');
          children.forEach(function (child) {
            if (child && child.isAssembly && child.physicalid && !seen[child.physicalid]) {
              queue.push(child.physicalid);
            }
          });
          return step();
        })
        .catch(function (err) {
          if (index[parentId]) {
            index[parentId].loaded = false;
            index[parentId].loadError = (err && err.message) || String(err || 'Falha ao carregar filhos.');
          }
          throw err;
        });
    }

    return step();
  }

  /**
   * Sprint 2.5 — carga API lazy BFS até BOM_MAX_NODES com progresso.
   */
  function loadLazyFull(physicalId, options) {
    options = options || {};
    var onProgress = options.onProgress || function () {};
    var expected = options.expectedCount || 0;
    var throttle = (APP_CONFIG && APP_CONFIG.API_PROGRESS_THROTTLE_MS) || 350;
    var lastReport = 0;

    function report(phase) {
      var now = Date.now();
      if (phase !== 'done' && phase !== 'root' && now - lastReport < throttle) return;
      lastReport = now;
      onProgress({
        phase: phase || 'loading',
        loaded: nodeCount,
        expected: expected || nodeCount
      });
    }

    physicalId = normalizePid(physicalId);
    var prior = createSnapshot();
    resetApiDiagnostics(physicalId, expected);

    if (APP_CONFIG.DEMO_MODE) {
      reset();
      rootId = physicalId;
      return loadDemoTree(physicalId).then(function () {
        report('done');
        return buildMetaFromIndex();
      });
    }

    return EnoviaApi.getProductRoot(physicalId, null)
      .then(function (res) {
        reset();
        rootId = physicalId;
        var member = res.member || res;
        var rootMember = Array.isArray(member) ? member[0] : member;
        var attrs = AttributeService.extractFromMember(rootMember);
        normalizeApiDisplayAttrs(attrs, rootMember);
        if (res.bomRootId) attrs.physicalid = res.bomRootId;
        if (!attrs.physicalid) attrs.physicalid = physicalId;
        attrs.hasPhysicalProduct = true;
        attrs.displayType = attrs.displayType || 'Physical Product';
        addNode(attrs, null, 0, 1);
        var bomParentId = attrs.physicalid;
        rootId = bomParentId;
        index[bomParentId].loaded = false;
        report('root');
        return expandBfs(bomParentId, report);
      })
      .then(function () {
        report('done');
        return buildMetaFromIndex();
      })
      .catch(function (err) {
        restoreSnapshot(prior);
        throw err;
      });
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
        var rootMember = Array.isArray(member) ? member[0] : member;
        var attrs = AttributeService.extractFromMember(rootMember);
        normalizeApiDisplayAttrs(attrs, rootMember);
        if (res.bomRootId) attrs.physicalid = res.bomRootId;
        if (!attrs.physicalid) attrs.physicalid = physicalId;
        attrs.hasPhysicalProduct = true;
        attrs.displayType = attrs.displayType || 'Physical Product';
        addNode(attrs, null, 0, 1);
        index[attrs.physicalid].loaded = false;
        var bomParentId = attrs.physicalid;
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
    createSnapshot: createSnapshot,
    restoreSnapshot: restoreSnapshot,
    loadRoot: loadRoot,
    loadLazyFull: loadLazyFull,
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
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
      var ctx = ExplorerContext.refresh(true);
      if (ctx && ctx.rootName) return ctx.rootName;
    }
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
        if (CompassServices.getVerifiedSpaceUrl) {
          space = CompassServices.getVerifiedSpaceUrl();
        }
      }
      if (!space && APP_CONFIG.TENANT_DEFAULTS) {
        var host = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
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
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.load) {
      var ctx =
        typeof ExplorerContext !== 'undefined' && ExplorerContext.get
          ? ExplorerContext.get()
          : null;
      return ApiBomLoader.load(ctx, sel, { expectedCount: ctx ? ctx.expectedCount : 0 });
    }
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

  var lastPasteText = '';

  function setPasteBuffer(text) {
    lastPasteText = String(text || '').trim();
  }

  function getPasteBuffer() {
    return lastPasteText;
  }

  function readFromPasteArea() {
    var area = document.getElementById('pasteArea');
    return area && area.value ? String(area.value).trim() : '';
  }

  function readClipboardText() {
    if (lastPasteText) return Promise.resolve(lastPasteText);
    var areaText = readFromPasteArea();
    if (areaText) return Promise.resolve(areaText);
    if (APP_CONFIG && APP_CONFIG.SKIP_CLIPBOARD_READ) {
      return Promise.resolve('');
    }
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve('');
    }
    return Promise.race([
      navigator.clipboard.readText().catch(function () {
        return '';
      }),
      new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve('');
        }, 1500);
      })
    ]);
  }

  function resolveImportText(clip) {
    var text = String(clip || '').trim();
    if (!text) text = lastPasteText;
    if (!text) text = readFromPasteArea();
    return text;
  }

  function scanViaClipboardOrPaste() {
    if (!pasteImportEnabled()) {
      return Promise.reject(new Error('Importação por cola desativada.'));
    }
    return readClipboardText().then(function (clip) {
      var text = resolveImportText(clip);
      if (!text) {
        throw new Error(
          'Clipboard bloqueado no iframe. No Explorer: Ctrl+A → Ctrl+C → clique no widget e Ctrl+V → Importar Ctrl+C.'
        );
      }
      return scanViaText(text, 'Ctrl+C Explorer');
    });
  }

  function domMirrorPrimaryEnabled() {
    return APP_CONFIG && APP_CONFIG.USE_DOM_MIRROR_PRIMARY === true;
  }

  function domMirrorFallbackEnabled() {
    return APP_CONFIG && APP_CONFIG.DOM_MIRROR_FALLBACK !== false;
  }

  function tagDomFallbackResult(res, term, expected) {
    if (!res) return res;
    res.loaderMode = 'dom-fallback';
    res.domFallback = true;
    var count = (res.meta && res.meta.itemCount) || BomService.getNodeCount() || 0;
    var exp = expected || 0;
    var msg = 'DOM espelho (fallback) ' + count;
    if (exp > 0) msg += '/' + exp;
    msg += ' — ' + ((res.meta && res.meta.productName) || term || 'E-BOM');
    msg += ' — prefira API ou TSV';
    res.message = msg;
    return res;
  }

  /**
   * Sprint 2.5 item 6 — espelho DOM só fallback (mirror → scroll → grid).
   */
  function scanViaDomMirrorFallback(term, expected) {
    if (!domMirrorFallbackEnabled()) {
      return Promise.reject(new Error('Espelho DOM desactivado (use API, TSV ou cola).'));
    }
    if (typeof ProductExplorerBridge === 'undefined') {
      return Promise.reject(new Error('Iframe do Explorer inacessível.'));
    }
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    term = term || getExplorerRootSearchTerm();
    expected = expected || (
      ProductExplorerBridge.getExplorerObjectCount
        ? ProductExplorerBridge.getExplorerObjectCount() || 0
        : 0
    );

    function applyGrid(pl) {
      if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
        return Promise.reject(new Error('Módulo snapshot indisponível'));
      }
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      return BomSnapshot.applyPayload(pl).then(function (meta) {
        var count = BomService.getNodeCount();
        if (count < 1) count = meta.itemCount || (pl.items && pl.items.length) || 0;
        saveRootName(meta.productName || term);
        return tagDomFallbackResult({
          ok: true,
          mode: 'dom-fallback',
          meta: meta,
          partial: expected > 0 && count < expected - 1
        }, term, expected);
      });
    }

    function pickBest(a, b) {
      if (!a || !a.items) return b;
      if (!b || !b.items) return a;
      if (expected > 0) {
        var ad = Math.abs(a.items.length - expected);
        var bd = Math.abs(b.items.length - expected);
        if (bd < ad) return b;
        if (ad < bd) return a;
      }
      return b.items.length > a.items.length ? b : a;
    }

    function needsMore(pl) {
      if (!pl || !pl.items || pl.items.length < 2) return true;
      if (expected > 0 && pl.items.length < expected - 1) return true;
      return false;
    }

    var payload = null;
    if (ProductExplorerBridge.scrapeExplorerMirror) {
      payload = ProductExplorerBridge.scrapeExplorerMirror(term);
    }
    var chain = Promise.resolve(payload);
    if (ProductExplorerBridge.tryExplorerScrollHarvestAsync && needsMore(payload)) {
      chain = chain.then(function (pl) {
        return ProductExplorerBridge.tryExplorerScrollHarvestAsync(term).then(function (scrollPl) {
          return pickBest(pl, scrollPl);
        });
      });
    }
    chain = chain.then(function (pl) {
      if (!needsMore(pl)) return pl;
      if ((!pl || !pl.items || pl.items.length < 2) && ProductExplorerBridge.scrapeExplorerGrid) {
        return pickBest(pl, ProductExplorerBridge.scrapeExplorerGrid(term));
      }
      return pl;
    });

    return chain.then(function (finalPayload) {
      if (!finalPayload || !finalPayload.items || finalPayload.items.length < 1) {
        return Promise.reject(new Error('Espelho DOM não obteve dados.'));
      }
      var itemN = finalPayload.items.length;
      if (expected > 0 && itemN < expected - 1) {
        return Promise.reject(
          new Error(
            'DOM espelho incompleto ' + itemN + '/' + expected +
            ' — use API lazy (Additional App) ou Ctrl+A+Ctrl+C na grade do Explorer.'
          )
        );
      }
      return applyGrid(finalPayload);
    });
  }

  /** Cola / clipboard — primary paste; DOM só se fallback activo. */
  function scanViaImportBestEffort() {
    if (!pasteImportEnabled()) {
      return Promise.reject(new Error('Importação por cola desativada.'));
    }

    function tryPasteBundle() {
      return readClipboardText().then(function (clip) {
        var text = resolveImportText(clip);
        if (!text) return { count: 0, text: '', items: null };
        return FileImportService.parseTextAsync(text).then(function (items) {
          return { count: items ? items.length : 0, text: text, items: items };
        });
      }).catch(function () {
        return { count: 0, text: '', items: null };
      });
    }

    return tryPasteBundle().then(function (paste) {
      if (paste.count >= 1 && paste.text) {
        return scanViaText(paste.text, 'Ctrl+C Explorer').then(function (res) {
          res.loaderMode = 'paste';
          return res;
        });
      }
      var term = getExplorerRootSearchTerm();
      var expected =
        typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount
          ? ProductExplorerBridge.getExplorerObjectCount() || 0
          : 0;
      if (
        typeof ProductExplorerBridge !== 'undefined' &&
        ProductExplorerBridge.tryExplorerAutoCopyParse
      ) {
        return ProductExplorerBridge.tryExplorerAutoCopyParse(term).then(function (payload) {
          if (!payload || !payload.items || payload.items.length < 2) {
            if (domMirrorFallbackEnabled() && !domMirrorPrimaryEnabled()) {
              return scanViaDomMirrorFallback(term, expected);
            }
            throw new Error(
              'Nenhum dado colado. No Explorer: expanda todos os níveis → Ctrl+A → Ctrl+C → Atualizar estrutura.'
            );
          }
          if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
            return Promise.reject(new Error('Módulo snapshot indisponível.'));
          }
          APP_CONFIG.IMPORT_MODE = true;
          APP_CONFIG.DEMO_MODE = false;
          return BomSnapshot.applyPayload(payload).then(function (meta) {
            var count = BomService.getNodeCount() || meta.itemCount || payload.items.length;
            saveRootName(meta.productName || term);
            return {
              ok: true,
              mode: 'paste',
              loaderMode: 'tsv',
              meta: meta,
              partial: expected > 0 && count < expected - 1,
              message: 'TSV ' + count + (expected > 0 ? '/' + expected : '') + ' — ' + (meta.productName || term)
            };
          });
        });
      }
      if (domMirrorFallbackEnabled() && !domMirrorPrimaryEnabled()) {
        return scanViaDomMirrorFallback(term, expected);
      }
      throw new Error(
        'Nenhum dado colado. No Explorer: expanda todos os níveis → Ctrl+A → Ctrl+C → Atualizar estrutura.'
      );
    });
  }

  function scanViaExplorerGrid(options) {
    options = options || {};
    var ctx =
      typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh
        ? ExplorerContext.refresh(true)
        : null;
    if (typeof TsvBomLoader !== 'undefined' && TsvBomLoader.load) {
      return TsvBomLoader.load(ctx, {
        allowAutoCopy: options.allowAutoCopy !== false,
        expectedCount: ctx ? ctx.expectedCount : 0
      });
    }
    if (domMirrorPrimaryEnabled()) {
      var term = getExplorerRootSearchTerm();
      var expected =
        typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount
          ? ProductExplorerBridge.getExplorerObjectCount() || 0
          : 0;
      return scanViaDomMirrorFallback(term, expected);
    }
    return Promise.reject(
      new Error('TSV indisponível. Use Atualizar estrutura (API/TSV) ou cole Ctrl+C.')
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
    return scanViaExplorerGrid({ allowAutoCopy: true }).catch(function () {
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
    scanViaImportBestEffort: scanViaImportBestEffort,
    scanViaPilotGeneric: scanViaPilotGeneric,
    setPasteBuffer: setPasteBuffer,
    getPasteBuffer: getPasteBuffer,
    ensureSpaceApi: ensureSpaceApi,
    resolveSelection: resolveSelection,
    getSelection: getSelection,
    scanViaDomMirrorFallback: scanViaDomMirrorFallback,
    scanViaApi: scanViaApi
  };
})();

;/* --- assets\js\services\api-bom-loader.js --- */
/**
 * @file services/api-bom-loader.js
 * Sprint 2.5 — item 3: REST ENOVIA lazy + progresso.
 */
var ApiBomLoader = (function () {
  'use strict';

  function canUse() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    return false;
  }

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function isValidId(id) {
    id = String(id || '').trim();
    if (!id) return false;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id.length >= 8;
  }

  function resolvePhysicalIdSync(ctx, sel) {
    if (sel && sel.physicalid) return normalizeId(sel.physicalid);
    if (ctx && ctx.physicalId) return normalizeId(ctx.physicalId);
    var name = (ctx && (ctx.rootName || ctx.productName)) || (sel && (sel.displayName || sel.name)) || '';
    if (!name || typeof ProductExplorerBridge === 'undefined') return null;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    var cat =
      ProductExplorerBridge.resolveFromExplorerCatalog &&
      ProductExplorerBridge.resolveFromExplorerCatalog(name);
    if (cat && isValidId(cat.physicalid)) return normalizeId(cat.physicalid);
    var prd =
      ProductExplorerBridge.lookupPrdByPartName &&
      ProductExplorerBridge.lookupPrdByPartName(name);
    if (isValidId(prd)) return normalizeId(prd);
    return null;
  }

  function resolvePhysicalId(ctx, sel) {
    var id = resolvePhysicalIdSync(ctx, sel);
    if (id) return Promise.resolve(id);
    var term = (ctx && (ctx.rootName || ctx.productName)) || (sel && (sel.displayName || sel.name)) || '';
    term = String(term || '').trim();
    if (!term || typeof ProductSearchService === 'undefined' || !ProductSearchService.search) {
      return Promise.resolve(null);
    }
    return ProductSearchService.search(term, { top: 8 }).then(function (hits) {
      if (!hits || !hits.length) return null;
      var exact = hits.filter(function (h) {
        var n = String(h.name || h.displayName || '').toLowerCase();
        var t = term.toLowerCase();
        return n === t || n.indexOf(t) >= 0 || t.indexOf(n) >= 0;
      });
      var pick = (exact.length ? exact : hits)[0];
      return pick && isValidId(pick.physicalid) ? normalizeId(pick.physicalid) : null;
    }).catch(function () {
      return null;
    });
  }

  function ensureReady() {
    var boot =
      typeof WafBootstrap !== 'undefined' && WafBootstrap.ensure
        ? WafBootstrap.ensure()
        : Promise.resolve();
    return boot.then(function () {
      if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
      if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.ensureSpaceApi) {
        return ExplorerScanner.ensureSpaceApi();
      }
      return null;
    });
  }

  function formatMessage(meta, expected) {
    var count = meta.itemCount || 0;
    var name = meta.productName || 'E-BOM';
    var msg = 'API ' + count;
    if (expected > 0) msg += '/' + expected;
    msg += ' — ' + name;
    if (expected > 0 && count < expected - 1) {
      msg += ' (E-BOM unica; Explorer pode contar ocorrencias/selecionados)';
    }
    if (meta.truncated) {
      msg += ' (estrutura truncada — limite BOM_MAX_NODES)';
    }
    return msg;
  }

  function defaultProgress(p) {
    if (!p) return;
    var msg;
    if (p.phase === 'connect') msg = 'Conectando API ENOVIA…';
    else if (p.phase === 'root') msg = 'Raiz carregada — expandindo estrutura…';
    else {
      msg = 'API';
      if (p.expected > 0) msg += ' ' + p.loaded + '/' + p.expected;
      else msg += ' ' + p.loaded;
      msg += ' carregados…';
    }
    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus(msg, 'info');
    } else {
      var el = document.getElementById('statusBar');
      if (el) {
        el.textContent = msg;
        el.className = 'status-bar status-info';
      }
    }
  }

  /**
   * @param {object} [ctx] ExplorerContext snapshot
   * @param {object} [sel] selection { physicalid, name, displayName }
   * @param {{ expectedCount?: number, onProgress?: function }} [options]
   */
  function load(ctx, sel, options) {
    options = options || {};
    sel = sel || {};
    if (!canUse()) {
      return Promise.reject(
        new Error('WAFData indisponível — abra no 3DDashboard (Additional App).')
      );
    }
    if (typeof BomService === 'undefined' || !BomService.loadLazyFull) {
      return Promise.reject(new Error('BomService.loadLazyFull indisponível.'));
    }

    var expected = (ctx && ctx.expectedCount) || options.expectedCount || 0;
    var onProgress = options.onProgress || defaultProgress;

    return ensureReady()
      .then(function () {
        onProgress({ phase: 'connect', loaded: 0, expected: expected });
        return resolvePhysicalId(ctx, sel);
      })
      .then(function (physicalId) {
        if (!physicalId) {
          return Promise.reject(
            new Error(
              'Raiz sem physicalId para API — selecione a raiz no Explorer ou use Ctrl+A+Ctrl+C.'
            )
          );
        }
        return BomService.loadLazyFull(physicalId, {
          expectedCount: expected,
          onProgress: onProgress
        });
      })
      .then(function (meta) {
        var count = meta && meta.itemCount ? meta.itemCount : 0;
        var partial = expected > 0 && count < expected - 1;
        var diag = (meta && meta.apiDiagnostics) || {};
        return {
          ok: true,
          mode: 'api',
          loaderMode: 'api',
          meta: meta,
          partial: partial,
          diagnostic: {
            rootPhysicalId: diag.rootPhysicalId || physicalId,
            expectedCount: expected,
            itemCount: count,
            resolvedReferences: diag.resolvedReferences || 0,
            unresolvedInstances: diag.unresolvedInstances || 0,
            parentRequests: diag.parentRequests || 0,
            lastParentId: diag.lastParentId || '',
            lastApiParentId: diag.lastApiParentId || '',
            lastChildTotal: diag.lastChildTotal || 0,
            duplicateRowsPreserved: diag.duplicateRowsPreserved || 0,
            lastError: diag.lastError || ''
          },
          message: formatMessage(meta, expected)
        };
      });
  }

  return {
    load: load,
    canUse: canUse
  };
})();

;/* --- assets\js\services\api-diagnostic.js --- */
/**
 * @file services/api-diagnostic.js
 * Diagnostico isolado: WAFData, Compass, 3DSpace e dseng sem fallback de estrutura.
 */
var ApiDiagnostic = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : global;
  var lastReport = null;

  function push(entry) {
    if (!window.__3DX_API_DIAG__) window.__3DX_API_DIAG__ = [];
    window.__3DX_API_DIAG__.push(entry);
    return entry;
  }

  function parseStatus(text) {
    var s = String(text || '');
    var m = s.match(/\b(400|401|403|404|406|409|412|500|502|503)\b/);
    if (m) return parseInt(m[1], 10);
    m = s.match(/ResponseCode[^0-9]*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function summarizeExtra(extra) {
    if (!extra) return '';
    var parts = [];
    if (extra.url) parts.push('url=' + extra.url);
    if (extra.status) parts.push('status=' + extra.status);
    if (extra.count != null) parts.push('count=' + extra.count);
    if (extra.total != null) parts.push('total=' + extra.total);
    if (extra.hasNext != null) parts.push('hasNext=' + extra.hasNext);
    return parts.length ? ' [' + parts.join(' | ') + ']' : '';
  }

  function log(step, ok, detail, extra) {
    var row = {
      ts: new Date().toISOString(),
      step: step,
      ok: !!ok,
      detail: String(detail || ''),
      extra: extra || null
    };
    push(row);
    return row;
  }

  function wafOk() {
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return true;
      }
    } catch (e) { /* */ }
    return false;
  }

  function getWAFData() {
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return widget.WAFData;
      }
    } catch (e) { /* */ }
    return null;
  }

  function ctxSnapshot() {
    if (typeof ExplorerContext === 'undefined' || !ExplorerContext.refresh) {
      return null;
    }
    return ExplorerContext.refresh(true);
  }

  function formatReport(rows) {
    return rows
      .map(function (r) {
        return (r.ok ? 'OK' : 'FAIL') + '  ' + r.step + ' - ' + r.detail + summarizeExtra(r.extra);
      })
      .join('\n');
  }

  function extractMembers(response) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) {
      return EnoviaApi.extractMembers(response);
    }
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    return [];
  }

  function jsonSnippet(value, limit) {
    if (value == null) return '';
    limit = limit || 220;
    try {
      var s = typeof value === 'string' ? value : JSON.stringify(value);
      return s.length > limit ? s.slice(0, limit) + '...' : s;
    } catch (e) {
      return String(value).slice(0, limit);
    }
  }

  function shortJson(value) {
    return jsonSnippet(value, 220);
  }

  function payloadShape(value) {
    if (value == null) return 'null';
    if (typeof value === 'string') return 'string(' + value.length + ')';
    if (Array.isArray(value)) return 'array(' + value.length + ')';
    if (typeof value === 'object') {
      var keys = Object.keys(value).slice(0, 8);
      return 'object{' + keys.join(',') + '}';
    }
    return typeof value;
  }

  function responseTotal(response, count) {
    if (!response) return count || 0;
    return response.totalItems || response.total || response.count || count || 0;
  }

  function requestStep(step, url, requestFn, inspectFn) {
    log(step + ' URL', true, url, { url: url });
    return requestFn()
      .then(function (res) {
        var extra = inspectFn ? inspectFn(res) : {};
        extra = extra || {};
        extra.url = url;
        extra.status = extra.status || 200;
        return log(step + ' GET', true, extra.detail || 'OK', extra);
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : String(err || 'erro');
        return log(step + ' GET', false, msg, { url: url, status: parseStatus(msg) });
      });
  }

  function rawWafCall(step, url, reqOptions) {
    reqOptions = reqOptions || {};
    var WAF = getWAFData();
    if (!WAF || !WAF.authenticatedRequest) {
      return Promise.resolve({
        row: log(step, false, 'WAFData indisponivel', { url: url }),
        data: null,
        error: null
      });
    }
    return new Promise(function (resolve) {
      var timeoutMs = reqOptions.timeoutMs || 12000;
      var settled = false;
      function finish(row, data, error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({ row: row, data: data || null, error: error || null });
      }
      var timer = window.setTimeout(function () {
        finish(log(step, false, 'timeout ' + timeoutMs + 'ms', { url: url }), null, 'timeout');
      }, timeoutMs);

      var opts = {
        method: reqOptions.method || 'GET',
        onComplete: function (data) {
          var row = log(
            step,
            true,
            'OK ' + payloadShape(data),
            {
              url: url,
              status: 200,
              type: reqOptions.type || '',
              responseType: reqOptions.responseType || '',
              sample: shortJson(data)
            }
          );
          finish(row, data);
        },
        onFailure: function (err) {
          var raw = shortJson(err);
          var msg =
            (err && (err.message || err.error || err.statusText || err.responseText)) ||
            raw ||
            'WAF request failed';
          var row = log(
            step,
            false,
            msg,
            {
              url: url,
              status: parseStatus(msg) || (err && (err.status || err.responseCode)) || null,
              type: reqOptions.type || '',
              responseType: reqOptions.responseType || '',
              raw: raw
            }
          );
          finish(row, null, err);
        }
      };
      if (reqOptions.headers) opts.headers = reqOptions.headers;
      if (reqOptions.type) opts.type = reqOptions.type;
      if (reqOptions.responseType) opts.responseType = reqOptions.responseType;
      if (reqOptions.data) opts.data = reqOptions.data;
      try {
        WAF.authenticatedRequest(url, opts);
      } catch (e) {
        finish(log(step, false, e.message || String(e), { url: url }), null, e);
      }
    });
  }

  function rawWafRequest(step, url, reqOptions) {
    return rawWafCall(step, url, reqOptions).then(function (result) {
      return result.row;
    });
  }

  function minimalHeaders() {
    var h = { Accept: 'application/json' };
    try {
      var st = typeof PlatformContext !== 'undefined' && PlatformContext.getState && PlatformContext.getState();
      if (st && st.securityContext) h.SecurityContext = st.securityContext;
    } catch (e) { /* */ }
    return h;
  }

  function fullHeaders() {
    if (typeof PlatformContext !== 'undefined' && PlatformContext.getHeaders) {
      return PlatformContext.getHeaders();
    }
    return minimalHeaders();
  }

  function probeCompass(rows) {
    if (typeof CompassServices === 'undefined') {
      rows.push(log('CompassServices', false, 'modulo indisponivel'));
      return Promise.resolve(null);
    }
    var platformState =
      typeof PlatformContext !== 'undefined' &&
      PlatformContext.getState &&
      PlatformContext.getState();
    var platformId = platformState && platformState.platformId;

    rows.push(log('platformId', !!platformId, platformId || 'sem platformId'));

    return CompassServices.get3DSpaceUrl(platformId)
      .then(function (raw) {
        rows.push(log('Compass getServiceUrl(3DSpace)', !!raw, raw || 'sem URL', { url: raw || '' }));
        return CompassServices.ensureWorkingSpaceUrl(platformId).then(function (space) {
          var isIfwe =
            space &&
            APP_CONFIG &&
            APP_CONFIG.TENANT_DEFAULTS &&
            APP_CONFIG.TENANT_DEFAULTS.platformHost &&
            String(space).indexOf(APP_CONFIG.TENANT_DEFAULTS.platformHost) >= 0;
          rows.push(
            log(
              '3DSpace verificado',
              !!space && !isIfwe,
              isIfwe ? 'URL aponta para IFWE; nao usar como 3DSpace' : (space || 'sem URL'),
              { url: space || '' }
            )
          );
          return space;
        });
      })
      .catch(function (err) {
        rows.push(log('Compass/3DSpace', false, err.message || String(err)));
        return null;
      });
  }

  function probeRawModelerVariants(rows, urls) {
    urls = urls || {};
    var jobs = [];
    if (urls.csrf) {
      jobs.push(function () { return rawWafRequest('RAW CSRF json minimal', urls.csrf, {
        type: 'json',
        headers: { Accept: 'application/json' }
      }); });
      jobs.push(function () { return rawWafRequest('RAW CSRF text minimal', urls.csrf, {
        type: 'text',
        responseType: 'text',
        headers: { Accept: 'text/plain,application/json,*/*' }
      }); });
    }
    if (urls.engItem) {
      jobs.push(function () { return rawWafRequest('RAW EngItem json minimal', urls.engItem, {
        type: 'json',
        headers: minimalHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngItem json full headers', urls.engItem, {
        type: 'json',
        headers: fullHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngItem text minimal', urls.engItem, {
        type: 'text',
        responseType: 'text',
        headers: minimalHeaders()
      }); });
    }
    if (urls.engInstance) {
      jobs.push(function () { return rawWafRequest('RAW EngInstance json minimal', urls.engInstance, {
        type: 'json',
        headers: minimalHeaders()
      }); });
      jobs.push(function () { return rawWafRequest('RAW EngInstance text minimal', urls.engInstance, {
        type: 'text',
        responseType: 'text',
        headers: minimalHeaders()
      }); });
    }
    if (!jobs.length) return Promise.resolve();
    rows.push(log('RAW WAF variants', true, jobs.length + ' request(s) controladas'));
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return job().then(function (row) {
          rows.push(row);
        });
      });
    }, Promise.resolve());
  }

  function modelerBaseUrl() {
    if (typeof CompassServices === 'undefined' || !CompassServices.getVerifiedSpaceUrl) return '';
    var space = CompassServices.getVerifiedSpaceUrl();
    return space ? String(space).replace(/\/$/, '') + '/resources/v1/modeler' : '';
  }

  function addPrdMatches(text, out, seen) {
    var re = /prd-R[0-9]+-[A-Za-z0-9._-]+/g;
    var m;
    while ((m = re.exec(String(text || '')))) {
      if (!seen[m[0]]) {
        seen[m[0]] = true;
        out.push({ id: m[0], type: '', name: '' });
      }
    }
  }

  function isUsableCandidateId(value) {
    if (value == null) return false;
    var s = String(value);
    if (!s || s.length < 8 || s.length > 180) return false;
    if (/^https?:\/\//i.test(s)) return false;
    if (/[{}[\]\s]/.test(s)) return false;
    if (s.indexOf('/') >= 0) return false;
    return true;
  }

  function candidateFromObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var id =
      obj.physicalid ||
      obj.physicalId ||
      obj.objectId ||
      obj.resourceid ||
      obj.resourceId ||
      obj.pid ||
      obj.id;
    if (!isUsableCandidateId(id)) return null;
    return {
      id: String(id),
      type: String(obj.type || obj.displayType || obj.kind || obj['@type'] || ''),
      name: String(obj.name || ''),
      title: String(obj.title || obj.label || ''),
      description: String(obj.description || '')
    };
  }

  function collectCandidates(value, out, seen, depth) {
    out = out || [];
    seen = seen || {};
    depth = depth || 0;
    if (value == null || depth > 5) return out;
    if (typeof value === 'string') {
      addPrdMatches(value, out, seen);
      return out;
    }
    if (Array.isArray(value)) {
      value.slice(0, 40).forEach(function (item) {
        collectCandidates(item, out, seen, depth + 1);
      });
      return out;
    }
    if (typeof value === 'object') {
      var direct = candidateFromObject(value);
      if (direct && !seen[direct.id]) {
        seen[direct.id] = true;
        out.push(direct);
      }
      Object.keys(value).slice(0, 80).forEach(function (key) {
        collectCandidates(value[key], out, seen, depth + 1);
      });
    }
    return out;
  }

  function mergeCandidates(target, candidates, seen) {
    candidates.forEach(function (candidate) {
      if (candidate && candidate.id && !seen[candidate.id]) {
        seen[candidate.id] = true;
        target.push(candidate);
      }
    });
  }

  function mergePriorityCandidates(primary, secondary) {
    var out = [];
    var seen = {};
    [primary || [], secondary || []].forEach(function (list) {
      list.forEach(function (candidate) {
        if (candidate && candidate.id && !seen[candidate.id]) {
          seen[candidate.id] = true;
          out.push(candidate);
        }
      });
    });
    return out;
  }

  function candidateSummary(candidates) {
    if (!candidates || !candidates.length) return 'nenhum ID candidato encontrado';
    return candidates.slice(0, 6).map(function (c) {
      var label = c.name || c.title || c.description || '';
      return c.id + (c.type ? ' (' + c.type + ')' : '') + (label ? ' ' + label : '');
    }).join('; ');
  }

  function memberSummary(data, sampleLimit) {
    var members = extractMembers(data);
    sampleLimit = sampleLimit || 220;
    if (!members.length) return 'member=0; sample=' + jsonSnippet(data, sampleLimit);
    return 'member=' + members.length + '; sample=' + jsonSnippet(members.slice(0, 2), sampleLimit);
  }

  function idsFromValue(value, out, seen, depth) {
    out = out || [];
    seen = seen || {};
    depth = depth || 0;
    if (value == null || depth > 5) return out;
    if (typeof value === 'string') {
      if (isUsableCandidateId(value) && !seen[value]) {
        seen[value] = true;
        out.push(value);
      }
      var re = /prd-R[0-9]+-[A-Za-z0-9._-]+/g;
      var m;
      while ((m = re.exec(value))) {
        if (!seen[m[0]]) {
          seen[m[0]] = true;
          out.push(m[0]);
        }
      }
      return out;
    }
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach(function (item) {
        idsFromValue(item, out, seen, depth + 1);
      });
      return out;
    }
    if (typeof value === 'object') {
      ['id', 'physicalid', 'physicalId', 'resourceid', 'resourceId', 'objectId', 'pid'].forEach(function (key) {
        if (value[key]) idsFromValue(String(value[key]), out, seen, depth + 1);
      });
      Object.keys(value).slice(0, 120).forEach(function (key) {
        idsFromValue(value[key], out, seen, depth + 1);
      });
    }
    return out;
  }

  function referenceLikeFields(obj, prefix, out, depth) {
    out = out || [];
    prefix = prefix || '';
    depth = depth || 0;
    if (!obj || typeof obj !== 'object' || depth > 3) return out;
    Object.keys(obj).slice(0, 120).forEach(function (key) {
      var path = prefix ? prefix + '.' + key : key;
      var value = obj[key];
      if (/ref|reference|referenced|eng|item|child|target|source|from|to/i.test(key)) {
        out.push(path + '=' + jsonSnippet(value, 120));
      }
      if (value && typeof value === 'object') referenceLikeFields(value, path, out, depth + 1);
    });
    return out;
  }

  function instanceContractSummary(member) {
    if (!member) return 'sem member';
    var ids = idsFromValue(member).slice(0, 12);
    var refFields = referenceLikeFields(member).slice(0, 10);
    return [
      'type=' + (member.type || member['@type'] || ''),
      'name=' + (member.name || ''),
      'id=' + (member.id || member.physicalid || ''),
      'ids=' + (ids.length ? ids.join(',') : 'nenhum'),
      'refFields=' + (refFields.length ? refFields.join(' | ') : 'nenhum')
    ].join('; ');
  }

  function relationContractSummary(data) {
    var members = extractMembers(data);
    if (!members.length) return 'sem instancias';
    return members.slice(0, 3).map(function (member, idx) {
      return '#' + (idx + 1) + ' ' + instanceContractSummary(member);
    }).join('\n');
  }

  function stripOccurrenceSuffix(value) {
    return String(value || '')
      .replace(/<[^>]*>\s*$/g, '')
      .replace(/\.\d+\s*$/g, '')
      .trim();
  }

  function engItemUqlUrl(term, top) {
    var base = modelerBaseUrl();
    if (!base || !term) return null;
    top = top || 20;
    return base + '/dseng/dseng:EngItem/search?$searchStr=' + encodeURIComponent(term) + '&$top=' + top;
  }

  function probeResolvedChildEngItems(rows, candidates) {
    if (!EnoviaApi.engItemUrl || !EnoviaApi.engInstanceChildrenUrl) return Promise.resolve();
    var ids = (candidates || [])
      .filter(function (candidate) { return candidate && candidate.id; })
      .slice(0, 5);
    if (!ids.length) {
      rows.push(log('RAW Resolved child recursion probes', false, 'sem filhos resolvidos para testar'));
      return Promise.resolve();
    }

    rows.push(log('RAW Resolved child recursion probes', true, ids.length + ' filho(s) resolvidos', {
      count: ids.length
    }));

    return ids.reduce(function (chain, candidate) {
      return chain.then(function () {
        var childId = candidate.id;
        return rawWafCall('RAW Resolved child EngItem ' + childId, EnoviaApi.engItemUrl(childId), {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (itemResult) {
          rows.push(itemResult.row);
          if (itemResult.row.ok) {
            rows.push(log('RAW Resolved child EngItem ' + childId + ' payload', true, memberSummary(itemResult.data, 1500), {
              url: EnoviaApi.engItemUrl(childId),
              count: extractMembers(itemResult.data).length
            }));
          }
          var childUrl = EnoviaApi.engInstanceChildrenUrl(childId, 0, 5);
          return rawWafCall('RAW Resolved child EngInstance ' + childId, childUrl, {
            type: 'json',
            headers: minimalHeaders()
          }).then(function (instResult) {
            rows.push(instResult.row);
            if (instResult.row.ok) {
              rows.push(log('RAW Resolved child EngInstance ' + childId + ' payload', true, memberSummary(instResult.data, 2500), {
                url: childUrl,
                count: extractMembers(instResult.data).length,
                total: responseTotal(instResult.data, extractMembers(instResult.data).length)
              }));
            }
          });
        });
      });
    }, Promise.resolve());
  }

  function probeCandidateChildTotals(rows, candidates, label) {
    var ids = (candidates || [])
      .filter(function (candidate) { return candidate && candidate.id; })
      .slice(0, 6);
    if (!ids.length || !EnoviaApi.engInstanceChildrenUrl) return Promise.resolve();

    return ids.reduce(function (chain, candidate) {
      return chain.then(function () {
        var url = EnoviaApi.engInstanceChildrenUrl(candidate.id, 0, 5);
        return rawWafCall('RAW Label candidate child total ' + label + ' -> ' + candidate.id, url, {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          rows.push(result.row);
          if (result.row.ok) {
            var members = extractMembers(result.data);
            rows.push(log('RAW Label candidate child total payload ' + label + ' -> ' + candidate.id, true, 'filhos=' + members.length + ', total=' + responseTotal(result.data, members.length), {
              url: url,
              count: members.length,
              total: responseTotal(result.data, members.length)
            }));
          }
        });
      });
    }, Promise.resolve());
  }

  function probeChildResolutionByInstanceName(rows, parentId, childData) {
    var members = extractMembers(childData);
    if (!members.length) {
      rows.push(log('RAW Child resolution by instance name', false, 'sem instancias para pesquisar'));
      return Promise.resolve();
    }

    var jobs = [];
    var resolved = [];
    var resolvedSeen = {};
    members.slice(0, 5).forEach(function (member) {
      var rawName = member && member.name;
      var baseName = stripOccurrenceSuffix(rawName);
      if (!baseName) return;
      jobs.push({
        step: 'RAW Child search label ' + baseName,
        url: engItemUqlUrl('label:"' + baseName + '"', 20),
        terms: [baseName]
      });
    });
    jobs = jobs.filter(function (job) { return !!job.url; });

    rows.push(log('RAW Child resolution by instance name', !!jobs.length, jobs.length + ' request(s) controladas', {
      count: jobs.length,
      parentId: parentId
    }));

    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return rawWafCall(job.step, job.url, {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          rows.push(result.row);
          if (result.row.ok) {
            var exact = collectExactCandidates(result.data, job.terms);
            mergeCandidates(resolved, exact, resolvedSeen);
            rows.push(log(job.step + ' payload', true, memberSummary(result.data, 2500), {
              url: job.url,
              count: extractMembers(result.data).length
            }));
            rows.push(log(job.step + ' exact matches', !!exact.length, candidateSummary(exact), {
              url: job.url,
              count: exact.length
            }));
            if (exact.length > 1) {
              rows.push(log('RAW Label ambiguity ' + job.terms[0], false, exact.length + ' candidatos exatos; label nao e identidade', {
                url: job.url,
                count: exact.length
              }));
            }
            return probeCandidateChildTotals(rows, exact, job.terms[0]);
          }
          return null;
        });
      });
    }, Promise.resolve()).then(function () {
      return probeResolvedChildEngItems(rows, resolved);
    });
  }

  function probeEngInstanceRelationship(rows, parentId, childData) {
    if (!EnoviaApi.engInstanceChildrenUrl || !EnoviaApi.engInstanceDetailUrl) return Promise.resolve();
    var members = extractMembers(childData);
    if (!members.length) {
      rows.push(log('RAW EngInstance relationship probes', false, 'sem instancias para detalhar'));
      return Promise.resolve();
    }

    var jobs = [
      {
        step: 'RAW EngInstance list expand dseng:EngItem ' + parentId,
        url: EnoviaApi.engInstanceChildrenUrl(parentId, 0, 5, 'dseng:EngItem')
      },
      {
        step: 'RAW EngInstance list expand referencedObject ' + parentId,
        url: EnoviaApi.engInstanceChildrenUrl(parentId, 0, 5, 'dseng:referencedObject')
      }
    ];

    members.slice(0, 2).forEach(function (member) {
      var instanceId = member && member.id;
      if (!instanceId) return;
      jobs.push({
        step: 'RAW EngInstance detail ' + instanceId,
        url: EnoviaApi.engInstanceDetailUrl(parentId, instanceId)
      });
      jobs.push({
        step: 'RAW EngInstance detail expand dseng:EngItem ' + instanceId,
        url: EnoviaApi.engInstanceDetailUrl(parentId, instanceId, 'dseng:EngItem')
      });
      jobs.push({
        step: 'RAW EngInstance detail expand referencedObject ' + instanceId,
        url: EnoviaApi.engInstanceDetailUrl(parentId, instanceId, 'dseng:referencedObject')
      });
    });

    rows.push(log('RAW EngInstance relationship probes', true, jobs.length + ' request(s) controladas', {
      count: jobs.length
    }));

    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return rawWafCall(job.step, job.url, {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          rows.push(result.row);
          if (result.row.ok) {
            rows.push(log(job.step + ' payload', true, memberSummary(result.data, 5000), {
              url: job.url,
              count: extractMembers(result.data).length,
              total: responseTotal(result.data, extractMembers(result.data).length)
            }));
            rows.push(log(job.step + ' contract scan', true, relationContractSummary(result.data), {
              url: job.url,
              count: extractMembers(result.data).length,
              total: responseTotal(result.data, extractMembers(result.data).length)
            }));
          }
        });
      });
    }, Promise.resolve()).then(function () {
      return probeChildResolutionByInstanceName(rows, parentId, childData);
    });
  }

  function lc(value) {
    return String(value || '').toLowerCase();
  }

  function candidateMatches(candidate, terms) {
    var fields = [
      candidate.id,
      candidate.name,
      candidate.title,
      candidate.description,
      candidate.type
    ].map(lc);
    return terms.some(function (term) {
      var t = lc(term);
      if (!t) return false;
      return fields.some(function (field) {
        return field === t || field.indexOf(t) >= 0;
      });
    });
  }

  function collectExactCandidates(data, terms) {
    var out = [];
    var seen = {};
    extractMembers(data).forEach(function (member) {
      var candidate = candidateFromObject(member);
      if (candidate && !seen[candidate.id] && candidateMatches(candidate, terms)) {
        seen[candidate.id] = true;
        out.push(candidate);
      }
    });
    return out;
  }

  function buildResolutionJobs(spaceBase, term, physicalId) {
    var jobs = [];
    var encodedTerm = encodeURIComponent(term || '');
    if (physicalId) {
      jobs.push({
        step: 'RAW PhysicalProduct direct',
        url: spaceBase + '/dspfl/dspfl:PhysicalProduct/' + encodeURIComponent(physicalId)
      });
      jobs.push({
        step: 'RAW VPMReference direct',
        url: spaceBase + '/dsxcad/dsxcad:VPMReference/' + encodeURIComponent(physicalId)
      });
    }
    if (encodedTerm) {
      jobs.push({
        step: 'RAW modeler search searchStr',
        url: spaceBase + '/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW modeler search q',
        url: spaceBase + '/search?q=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW PhysicalProduct search',
        url: spaceBase + '/dspfl/dspfl:PhysicalProduct/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem search',
        url: spaceBase + '/dseng/dseng:EngItem/search?searchStr=' + encodedTerm + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem UQL label root',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('label:"' + term + '"') + '&$top=20'
      });
      jobs.push({
        step: 'RAW EngItem UQL name root',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('name:"' + term + '"') + '&$top=20'
      });
      jobs.push({
        step: 'RAW VPMReference search',
        url: spaceBase + '/dsxcad/dsxcad:VPMReference/search?searchStr=' + encodedTerm + '&$top=10'
      });
    }
    if (physicalId) {
      jobs.push({
        step: 'RAW EngItem search physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?searchStr=' + encodeURIComponent(physicalId) + '&$top=10'
      });
      jobs.push({
        step: 'RAW EngItem $searchStr physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' + encodeURIComponent(physicalId) + '&$top=20'
      });
      jobs.push({
        step: 'RAW EngItem UQL name physicalId',
        url: spaceBase + '/dseng/dseng:EngItem/search?$searchStr=' +
          encodeURIComponent('name:' + physicalId) + '&$top=20'
      });
    }
    return jobs;
  }

  function probeCandidateEngItems(rows, candidates, originalPhysicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.engItemUrl) return Promise.resolve();
    var seen = {};
    var ids = candidates
      .map(function (candidate) { return candidate.id; })
      .filter(function (id) {
        if (!id || id === originalPhysicalId || seen[id]) return false;
        seen[id] = true;
        return true;
      })
      .slice(0, 3);
    if (!ids.length) {
      rows.push(log('RAW Candidate EngItem', false, 'nenhum candidato alternativo para testar'));
      return Promise.resolve();
    }
    return ids.reduce(function (chain, id, idx) {
      return chain.then(function () {
        return rawWafCall('RAW Candidate EngItem ' + id, EnoviaApi.engItemUrl(id), {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          rows.push(result.row);
          if (result.row.ok) {
            rows.push(log('RAW Candidate EngItem ' + id + ' payload', true, memberSummary(result.data), {
              url: EnoviaApi.engItemUrl(id),
              count: extractMembers(result.data).length
            }));
          }
          if (!EnoviaApi.engInstanceChildrenUrl) return null;
          var childUrl = EnoviaApi.engInstanceChildrenUrl(id, 0, 5);
          return rawWafCall('RAW Candidate EngInstance ' + id, childUrl, {
            type: 'json',
            headers: minimalHeaders()
          }).then(function (childResult) {
            rows.push(childResult.row);
            if (childResult.row.ok) {
              rows.push(log('RAW Candidate EngInstance ' + id + ' payload', true, memberSummary(childResult.data, 5000), {
                url: childUrl,
                count: extractMembers(childResult.data).length,
                total: responseTotal(childResult.data, extractMembers(childResult.data).length)
              }));
            }
            if (idx === 0 && childResult.row.ok) {
              return probeEngInstanceRelationship(rows, id, childResult.data);
            }
          });
        });
      });
    }, Promise.resolve());
  }

  function probeObjectResolution(rows, ctx, physicalId) {
    var base = modelerBaseUrl();
    if (!base) {
      rows.push(log('RAW object resolution', false, '3DSpace/modeler base indisponivel'));
      return Promise.resolve();
    }
    var term = (ctx && (ctx.rootName || ctx.title || ctx.name)) || '';
    var jobs = buildResolutionJobs(base, term, physicalId);
    var candidates = [];
    var exactCandidates = [];
    var seen = {};
    var exactSeen = {};
    var exactTerms = [physicalId, term].filter(function (v) { return !!v; });
    rows.push(log('RAW object resolution', true, jobs.length + ' request(s) de resolucao'));
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        return rawWafCall(job.step, job.url, {
          type: 'json',
          headers: minimalHeaders()
        }).then(function (result) {
          var found = collectCandidates(result.data);
          rows.push(result.row);
          if (result.row.ok) {
            var exact = collectExactCandidates(result.data, exactTerms);
            mergeCandidates(exactCandidates, exact, exactSeen);
            mergeCandidates(candidates, exact, seen);
            mergeCandidates(candidates, found, seen);
            rows.push(log(job.step + ' payload', true, memberSummary(result.data), {
              url: job.url,
              count: extractMembers(result.data).length
            }));
            rows.push(log(job.step + ' exact matches', !!exact.length, candidateSummary(exact), {
              url: job.url,
              count: exact.length
            }));
            rows.push(log(job.step + ' candidates', !!found.length, candidateSummary(found), {
              url: job.url,
              count: found.length
            }));
          }
        });
      });
    }, Promise.resolve()).then(function () {
      var prioritized = mergePriorityCandidates(exactCandidates, candidates);
      rows.push(log('RAW object exact candidates total', !!exactCandidates.length, candidateSummary(exactCandidates), {
        count: exactCandidates.length
      }));
      rows.push(log('RAW object candidates total', !!candidates.length, candidateSummary(candidates), {
        count: candidates.length
      }));
      rows.push(log('RAW object prioritized candidates', !!prioritized.length, candidateSummary(prioritized), {
        count: prioritized.length
      }));
      return probeCandidateEngItems(rows, prioritized, physicalId);
    });
  }

  function probeCsrf(rows, spaceUrl) {
    if (!spaceUrl || typeof CompassServices === 'undefined' || !CompassServices.fetchCsrfToken) {
      rows.push(log('CSRF', false, 'sem 3DSpace verificado'));
      return Promise.resolve();
    }
    var url = String(spaceUrl).replace(/\/$/, '') + '/resources/v1/application/CSRF';
    rows.push(log('CSRF URL', true, url, { url: url }));
    return CompassServices.fetchCsrfToken(spaceUrl)
      .then(function (token) {
        rows.push(log('CSRF GET', !!token, token ? 'token recebido' : 'sem token', { url: url, status: 200 }));
      })
      .catch(function (err) {
        var msg = err.message || String(err);
        rows.push(log('CSRF GET', false, msg, { url: url, status: parseStatus(msg) }));
      });
  }

  function probeEngItem(rows, physicalId) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngItem) {
      rows.push(log('dseng:EngItem', false, 'EnoviaApi indisponivel'));
      return Promise.resolve();
    }
    var url = EnoviaApi.engItemUrl ? EnoviaApi.engItemUrl(physicalId) : physicalId;
    return requestStep('dseng:EngItem', url, function () {
      return EnoviaApi.getEngItem(physicalId, null);
    }, function (res) {
      var members = extractMembers(res);
      return {
        detail: 'OK (' + (members.length || 1) + ' member(s))',
        count: members.length || 1
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function probeEngInstance(rows, physicalId, top) {
    if (typeof EnoviaApi === 'undefined' || !EnoviaApi.getEngInstanceChildren) {
      rows.push(log('dseng:EngInstance', false, 'EnoviaApi indisponivel'));
      return Promise.resolve();
    }
    top = top || 5;
    var url = EnoviaApi.engInstanceChildrenUrl
      ? EnoviaApi.engInstanceChildrenUrl(physicalId, 0, top)
      : physicalId;
    return requestStep('dseng:EngInstance page 0', url, function () {
      return EnoviaApi.getEngInstanceChildren(physicalId, 0, top);
    }, function (res) {
      var members = extractMembers(res);
      var total = responseTotal(res, members.length);
      return {
        detail: 'filhos=' + members.length + ', total=' + total,
        count: members.length,
        total: total,
        hasNext: members.length === top && members.length < total
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function probePhysicalProductResolver(rows, physicalId) {
    if (
      typeof EnoviaApi === 'undefined' ||
      !EnoviaApi.isCloudPrdId ||
      !EnoviaApi.isCloudPrdId(physicalId) ||
      !EnoviaApi.getPhysicalProduct
    ) {
      return Promise.resolve();
    }
    var url = EnoviaApi.physicalProductUrl ? EnoviaApi.physicalProductUrl(physicalId) : physicalId;
    return requestStep('dspfl:PhysicalProduct resolver', url, function () {
      return EnoviaApi.getPhysicalProduct(physicalId, null);
    }, function (res) {
      var eng =
        EnoviaApi.extractEngItemIdFromResponse &&
        EnoviaApi.extractEngItemIdFromResponse(res);
      return {
        detail: eng ? 'engItem=' + eng : 'OK, sem engItem extraido',
        resolvedEngItem: eng || ''
      };
    }).then(function (row) {
      rows.push(row);
    });
  }

  function resolveId(ctx) {
    ctx = ctx || ctxSnapshot();
    if (!ctx) return Promise.resolve(null);
    if (ctx.physicalId) return Promise.resolve(ctx.physicalId);
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.resolvePhysicalId) {
      return ApiBomLoader.resolvePhysicalId(ctx, null);
    }
    return Promise.resolve(null);
  }

  /**
   * Executa diagnostico isolado no Additional App.
   * @returns {Promise<{ rows: object[], summary: string, physicalId: string }>}
   */
  function run(options) {
    options = options || {};
    window.__3DX_API_DIAG__ = [];
    var rows = [];
    root.__3DX_ALLOW_API__ = true;
    root.__3DX_FORCE_API__ = true;

    rows.push(log('WAFData', wafOk(), wafOk() ? 'authenticatedRequest disponivel' : 'WAFData ausente'));

    var pCtx =
      typeof PlatformContext !== 'undefined' && PlatformContext.init
        ? PlatformContext.init()
        : Promise.resolve();

    return pCtx
      .then(function () {
        var st =
          typeof PlatformContext !== 'undefined' &&
          PlatformContext.getState &&
          PlatformContext.getState();
        rows.push(
          log(
            'SecurityContext',
            !!(st && st.securityContext),
            (st && st.securityContext) || 'sem SecurityContext'
          )
        );
        return probeCompass(rows);
      })
      .then(function (spaceUrl) {
        if (spaceUrl && typeof EnoviaApi !== 'undefined' && EnoviaApi.init) {
          EnoviaApi.init(spaceUrl);
        }
        return probeCsrf(rows, spaceUrl);
      })
      .then(function () {
        var ctx = ctxSnapshot();
        if (!ctx) {
          rows.push(log('ExplorerContext', false, 'ExplorerContext indisponivel'));
          return null;
        }
        rows.push(
          log(
            'Estrutura',
            !!(ctx.rootName || ctx.expectedCount || ctx.physicalId),
            (ctx.rootName || '?') +
              ' - expected ' +
              (ctx.expectedCount || 0) +
              ' - physicalId ' +
              (ctx.physicalId || '(vazio)'),
            {
              expectedCount: ctx.expectedCount || 0,
              selectionCount: ctx.selectionCount || 0,
              source: ctx.source || ''
            }
          )
        );
        return resolveId(ctx).then(function (pid) {
          if (!pid) {
            rows.push(
              log(
                'physicalId',
                false,
                'nao resolvido - clique raiz no Explorer ou preencha ID em Avancado'
              )
            );
            return null;
        }
        rows.push(log('physicalId', true, pid));
          var urls = {};
          try {
            var spaceState =
              typeof CompassServices !== 'undefined' &&
              CompassServices.getVerifiedSpaceUrl &&
              CompassServices.getVerifiedSpaceUrl();
            if (spaceState) urls.csrf = String(spaceState).replace(/\/$/, '') + '/resources/v1/application/CSRF';
            if (typeof EnoviaApi !== 'undefined' && EnoviaApi.engItemUrl) urls.engItem = EnoviaApi.engItemUrl(pid);
            if (typeof EnoviaApi !== 'undefined' && EnoviaApi.engInstanceChildrenUrl) {
              urls.engInstance = EnoviaApi.engInstanceChildrenUrl(pid, 0, options.top || 5);
            }
          } catch (eUrls) { /* */ }
          return probeRawModelerVariants(rows, urls)
            .then(function () {
              return probeObjectResolution(rows, ctx, pid);
            })
            .then(function () {
              return probeEngItem(rows, pid);
            })
            .then(function () {
              return probeEngInstance(rows, pid, options.top || 5);
            })
            .then(function () {
              return probePhysicalProductResolver(rows, pid);
            })
            .then(function () {
              return pid;
            });
        });
      })
      .finally(function () {
        root.__3DX_ALLOW_API__ = false;
        root.__3DX_FORCE_API__ = false;
      })
      .then(function (physicalId) {
        var summary = formatReport(rows);
        lastReport = { rows: rows, summary: summary, physicalId: physicalId || '' };
        return lastReport;
      });
  }

  function getLastReport() {
    return lastReport;
  }

  return {
    run: run,
    getLastReport: getLastReport,
    formatReport: formatReport
  };
})();

;/* --- assets\js\services\tsv-bom-loader.js --- */
/**
 * @file services/tsv-bom-loader.js
 * Sprint 2.5 — item 4: fast-path TSV (auto-copy Explorer) até FAST_TSV_MAX.
 */
var TsvBomLoader = (function () {
  'use strict';

  var SESSION_ROOT_NAME = 'bom_last_root_name';

  function saveRootName(name) {
    try {
      if (name) sessionStorage.setItem(SESSION_ROOT_NAME, name);
    } catch (e) { /* */ }
  }

  function rootTerm(ctx) {
    if (ctx && ctx.rootName) return ctx.rootName;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      return ProductExplorerBridge.getStructureNameHint() || '';
    }
    return '';
  }

  function resolveExpected(ctx) {
    if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
      return ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    return 0;
  }

  function pollExplorer() {
    if (typeof ProductExplorerBridge === 'undefined') return false;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    return true;
  }

  function canUse(ctx) {
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = resolveExpected(ctx);
    if (expected > maxTsv) return false;
    return typeof ProductExplorerBridge !== 'undefined';
  }

  function needsMore(pl, expected) {
    if (!pl || !pl.items || pl.items.length < 1) return true;
    if (expected > 0 && pl.items.length < expected - 1) return true;
    return false;
  }

  function formatMessage(meta, count, expected, term, partial) {
    var msg = 'TSV ' + count;
    if (expected > 0) msg += '/' + expected;
    msg += ' — ' + (meta.productName || term || 'E-BOM');
    if (partial) msg += ' - parcial (expanda mais no Explorer e clique Atualizar estrutura)';
    return msg;
  }

  function setStatus(msg) {
    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus(msg, 'info');
      return;
    }
    var el = document.getElementById('statusBar');
    if (el) {
      el.textContent = msg;
      el.className = 'status-bar status-info';
    }
  }

  function withinExpectedCount(n, expected) {
    if (expected < 1) return true;
    var slack = expected >= 40 ? 3 : expected >= 15 ? 2 : 1;
    return n >= expected - slack && n <= expected + 1;
  }

  function normalizeStructureToken(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function payloadRootMatches(payload, term) {
    if (!payload || !payload.items || !payload.items.length) return false;
    if (!term) return true;
    var hint = normalizeStructureToken(term);
    if (hint.length < 4) return true;
    var root = payload.items[0];
    var rootText = normalizeStructureToken(
      root.title || root.name || payload.productName || ''
    );
    if (!rootText) return true;
    var parts = hint.split(/\s+/).filter(function (t) {
      return t.length >= 4;
    });
    for (var i = 0; i < parts.length; i++) {
      if (rootText.indexOf(parts[i]) >= 0) return true;
    }
    parts = rootText.split(/\s+/).filter(function (t) {
      return t.length >= 4;
    });
    for (var j = 0; j < parts.length; j++) {
      if (hint.indexOf(parts[j]) >= 0) return true;
    }
    return false;
  }

  function payloadInSync(payload, term, expected) {
    if (!payload || !payload.items || !payload.items.length) return false;
    if (!withinExpectedCount(payload.items.length, expected)) return false;
    return payloadRootMatches(payload, term);
  }

  function applyPayload(pl, term, expected, options) {
    options = options || {};
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
      return Promise.reject(new Error('Módulo snapshot indisponível.'));
    }
    var itemN = pl && pl.items ? pl.items.length : 0;
    var slack = expected >= 40 ? 3 : expected >= 15 ? 2 : 1;
    if (expected > 0 && itemN < expected - slack && options.allowPartial !== true) {
      return Promise.reject(
        new Error(
          'TSV parcial ' + itemN + '/' + expected +
          ' — expanda todos os níveis no Explorer, Ctrl+A+Ctrl+C, ou aguarde API lazy.'
        )
      );
    }
    if (expected > 0 && itemN > expected + 1) {
      return Promise.reject(
        new Error(
          'TSV de estrutura antiga ' + itemN + '/' + expected +
          ' — clique na raiz no Explorer e Atualizar estrutura (limpa clipboard SKA/Drone).'
        )
      );
    }
    if (!payloadRootMatches(pl, term)) {
      return Promise.reject(
        new Error(
          'TSV não corresponde à estrutura aberta no Explorer — Atualizar estrutura de novo.'
        )
      );
    }
    APP_CONFIG.IMPORT_MODE = true;
    APP_CONFIG.DEMO_MODE = false;
    return BomSnapshot.applyPayload(pl).then(function (meta) {
      var count = BomService.getNodeCount();
      if (count < 1) count = meta.itemCount || itemN || 0;
      if (expected > 0 && count < expected - 1 && options.allowPartial !== true) {
        return Promise.reject(
          new Error(
            'TSV parcial ' + count + '/' + expected +
            ' — expanda todos os níveis no Explorer, Ctrl+A+Ctrl+C, ou aguarde API lazy.'
          )
        );
      }
      saveRootName(meta.productName || term);
      return {
        ok: true,
        mode: 'tsv',
        loaderMode: 'tsv',
        meta: meta,
        partial: expected > 0 && count < expected - 1,
        message: formatMessage(meta, count, expected, term, expected > 0 && count < expected - 1)
      };
    });
  }

  function buildPayloadFromItems(items, term) {
    if (!items || !items.length || typeof BomSnapshot === 'undefined') return null;
    var name = items[0].title || items[0].name || term || 'E-BOM';
    items.forEach(function (it) {
      if (it.level === 0) name = it.title || it.name || name;
    });
    var payload = BomSnapshot.buildFromImported(items, name);
    if (payload) payload.scrapeSource = 'tsv-clipboard';
    return payload;
  }

  function tryScrollHarvest(term, partialPayload, expected) {
    if (!needsMore(partialPayload, expected)) return Promise.resolve(partialPayload);
    if (expected > 40) return Promise.resolve(partialPayload);
    if (
      typeof ProductExplorerBridge === 'undefined' ||
      !ProductExplorerBridge.tryExplorerScrollHarvestAsync
    ) {
      return Promise.resolve(partialPayload);
    }
    setStatus('Varrendo grade Explorer (scroll)…');
    return ProductExplorerBridge.tryExplorerScrollHarvestAsync(term, { maxSteps: (APP_CONFIG && APP_CONFIG.SCROLL_HARVEST_MAX_STEPS) || 36 })
      .then(function (scrollPl) {
        if (!scrollPl || !scrollPl.items || !scrollPl.items.length) return partialPayload;
        if (!partialPayload || !partialPayload.items || !partialPayload.items.length) return scrollPl;
        return scrollPl.items.length >= partialPayload.items.length ? scrollPl : partialPayload;
      })
      .catch(function () {
        return partialPayload;
      });
  }

  function pickBestPayload(a, b, expected, term) {
    function keep(p) {
      if (!p || !p.items) return null;
      if (!payloadInSync(p, term, expected)) return null;
      return p;
    }
    a = keep(a);
    b = keep(b);
    if (!a) return b;
    if (!b) return a;
    if (expected > 0) {
      var ad = Math.abs(a.items.length - expected);
      var bd = Math.abs(b.items.length - expected);
      if (bd < ad) return b;
      if (ad < bd) return a;
    }
    return b.items.length > a.items.length ? b : a;
  }

  function tryAutoCopy(term, allowAutoCopy) {
    if (!allowAutoCopy) return Promise.resolve(null);
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.tryExplorerAutoCopyParse) {
      return Promise.resolve(null);
    }
    setStatus('Lendo TSV do Explorer (Ctrl+A+copy)…');
    return ProductExplorerBridge.tryExplorerAutoCopyParse(term);
  }

  function readPasteText() {
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      var buf = ExplorerScanner.getPasteBuffer();
      if (buf) return Promise.resolve(buf);
    }
    var area = document.getElementById('pasteArea');
    if (area && area.value && String(area.value).trim()) {
      return Promise.resolve(String(area.value).trim());
    }
    if (APP_CONFIG && APP_CONFIG.SKIP_CLIPBOARD_READ) {
      return Promise.resolve('');
    }
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve('');
    }
    return Promise.race([
      navigator.clipboard.readText().catch(function () {
        return '';
      }),
      new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve('');
        }, 1500);
      })
    ]);
  }

  function tryClipboardTsv(term) {
    setStatus('Lendo TSV da área de transferência…');
    return readPasteText().then(function (text) {
      text = String(text || '').trim();
      if (!text || text.indexOf('\t') < 0) return null;
      if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
        return null;
      }
      return FileImportService.parseTextAsync(text).then(function (items) {
        if (!items || items.length < 1) return null;
        return buildPayloadFromItems(items, term);
      });
    });
  }

  /**
   * @param {object} [ctx] ExplorerContext snapshot
   * @param {{ allowAutoCopy?: boolean, expectedCount?: number }} [options]
   */
  function load(ctx, options) {
    options = options || {};
    ctx = ctx || null;

    if (!pollExplorer()) {
      return Promise.reject(
        new Error('Iframe do Explorer inacessível — abra a árvore ao lado do widget.')
      );
    }

    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = options.expectedCount || resolveExpected(ctx);
    if (expected > maxTsv) {
      return Promise.reject(
        new Error('Estrutura com ' + expected + ' peças — use API lazy (limite TSV ' + maxTsv + ').')
      );
    }

    var term = rootTerm(ctx);
    var skipCopyBelow = (APP_CONFIG && APP_CONFIG.SKIP_AUTO_COPY_BELOW) || 12;
    var fastStructure = expected > 0 && expected <= ((APP_CONFIG && APP_CONFIG.FAST_STRUCTURE_MAX) || 12);
    var allowAutoCopy = options.allowAutoCopy === true && (!fastStructure || expected > skipCopyBelow);

    function finish(payload) {
      if (options.allowPartial === true) {
        if (!payload || !payload.items || payload.items.length < 1) {
          return Promise.reject(
            new Error('TSV indisponível. No Explorer: expanda a estrutura e clique Atualizar estrutura.')
          );
        }
        if (!payloadRootMatches(payload, term)) {
          return Promise.reject(
            new Error('TSV não corresponde à estrutura aberta no Explorer — clique Atualizar estrutura de novo.')
          );
        }
        return applyPayload(payload, term, expected, options);
      }
      if (!payloadInSync(payload, term, expected)) {
        return Promise.reject(
          new Error(
            'TSV não bate com Explorer (' +
              (payload && payload.items ? payload.items.length : 0) +
              '/' +
              expected +
              '). Clique na raiz no Explorer → Atualizar estrutura.'
          )
        );
      }
      if (!payload || !payload.items || payload.items.length < 1) {
        return Promise.reject(
          new Error(
            'TSV indisponível. No Explorer: expanda a estrutura → Ctrl+A na grade → Ctrl+C → Atualizar estrutura.'
          )
        );
      }
      return applyPayload(payload, term, expected, options);
    }

    function tryMirrorFirst() {
      if (APP_CONFIG && APP_CONFIG.SKIP_MIRROR_ON_TSV) {
        return Promise.resolve(null);
      }
      if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.scrapeExplorerMirror) {
        return Promise.resolve(null);
      }
      var mirror = ProductExplorerBridge.scrapeExplorerMirror(term);
      if (!mirror || !mirror.items || mirror.items.length < 1) return Promise.resolve(null);
      if (expected > 0 && mirror.items.length < expected - 1 && options.allowPartial !== true) return Promise.resolve(null);
      if (!payloadRootMatches(mirror, term)) return Promise.resolve(null);
      return Promise.resolve(mirror);
    }

    function tryCopyFirst() {
      if (!allowAutoCopy) return Promise.resolve(null);
      return tryAutoCopy(term, true);
    }

    function tryPasteBufferFirst() {
      return readPasteText().then(function (text) {
        text = String(text || '').trim();
        if (!text || text.indexOf('\t') < 0) return null;
        if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
          return null;
        }
        return FileImportService.parseTextAsync(text).then(function (items) {
          if (!items || items.length < 1) return null;
          return buildPayloadFromItems(items, term);
        });
      });
    }

    function runCopyScrollFinish(partialPayload) {
      return tryCopyFirst().then(function (copyPayload) {
        return tryClipboardTsv(term).then(function (clipPayload) {
          var best = pickBestPayload(copyPayload, clipPayload, expected, term);
          if (partialPayload) {
            var merged = pickBestPayload(partialPayload, best, expected, term);
            if (merged) best = merged;
          }
          if (best && payloadInSync(best, term, expected)) return finish(best);
          if (options.allowPartial === true && best && payloadRootMatches(best, term)) return finish(best);
          return tryScrollHarvest(term, best || copyPayload || partialPayload, expected).then(
            function (harvested) {
              if (harvested && payloadInSync(harvested, term, expected)) return finish(harvested);
              if (options.allowPartial === true) {
                var partial = harvested || best || copyPayload || partialPayload;
                if (partial && partial.items && partial.items.length >= 1 && payloadRootMatches(partial, term)) {
                  return finish(partial);
                }
              }
              var n = (harvested && harvested.items && harvested.items.length) ||
                (best && best.items && best.items.length) ||
                0;
              return Promise.reject(
                new Error(
                  'TSV incompleto ' +
                    n +
                    '/' +
                    expected +
                    ' — expanda todos os níveis no Explorer → Ctrl+A → Ctrl+C → Atualizar estrutura.'
                )
              );
            }
          );
        });
      });
    }

    function runHarvestChain() {
      var pasteFirst =
        options.pasteFirst === true ||
        (options.source === 'auto' && APP_CONFIG.AUTO_SYNC_PREFER_PASTE !== false);

      function afterPaste(pastePayload) {
        if (pastePayload && payloadInSync(pastePayload, term, expected)) {
          return finish(pastePayload);
        }
        return runCopyScrollFinish(pastePayload);
      }

      if (pasteFirst) {
        return tryPasteBufferFirst().then(afterPaste);
      }

      return tryMirrorFirst().then(function (mirrorPayload) {
        if (mirrorPayload && payloadInSync(mirrorPayload, term, expected)) {
          return finish(mirrorPayload);
        }
        return tryPasteBufferFirst().then(afterPaste);
      });
    }

    return runHarvestChain();
  }

  return {
    load: load,
    canUse: canUse
  };
})();

;/* --- assets\js\services\paste-bom-loader.js --- */
/**
 * @file services/paste-bom-loader.js
 * Fonte unica para o botao Atualizar estrutura: TSV vindo de Ctrl+C/Ctrl+V.
 */
var PasteBomLoader = (function () {
  'use strict';

  function readPasteText() {
    var text = '';
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      text = ExplorerScanner.getPasteBuffer() || '';
    }
    if (!text) {
      var area = document.getElementById('pasteArea');
      if (area && area.value) text = String(area.value);
    }
    text = String(text || '').trim();
    if (text) return Promise.resolve(text);
    if (APP_CONFIG && APP_CONFIG.SKIP_CLIPBOARD_READ) return Promise.resolve('');
    if (!navigator.clipboard || !navigator.clipboard.readText) return Promise.resolve('');
    return Promise.race([
      navigator.clipboard.readText().catch(function () { return ''; }),
      new Promise(function (resolve) {
        window.setTimeout(function () { resolve(''); }, 1800);
      })
    ]).then(function (clip) {
      return String(clip || '').trim();
    });
  }

  function expectedCount(ctx, options) {
    if (options && options.expectedCount > 0) return options.expectedCount;
    if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
      return ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    return 0;
  }

  function rootName(ctx) {
    if (ctx && (ctx.rootName || ctx.productName)) return ctx.rootName || ctx.productName;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      return ProductExplorerBridge.getStructureNameHint() || '';
    }
    return '';
  }

  function buildPayload(items, term) {
    var name = term || 'E-BOM';
    items.forEach(function (it, idx) {
      if (idx === 0 || it.level === 0) name = it.title || it.name || name;
    });
    return BomSnapshot.buildFromImported(items, name);
  }

  function loadStrictPaste(ctx, options) {
    if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
      return Promise.reject(new Error('Parser de importacao indisponivel.'));
    }
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
      return Promise.reject(new Error('Modulo snapshot indisponivel.'));
    }
    var expected = expectedCount(ctx, options);
    var term = rootName(ctx);
    return readPasteText().then(function (text) {
      if (!text || text.indexOf('\t') < 0) {
        throw new Error(
          'Nenhum TSV completo no clipboard. No Explorer: expanda todos os niveis -> Ctrl+A -> Ctrl+C -> Atualizar estrutura.'
        );
      }
      return FileImportService.parseTextAsync(text);
    }).then(function (items) {
      if (!items || !items.length) {
        throw new Error('Nenhuma linha reconhecida no TSV do Explorer.');
      }
      if (expected > 0 && items.length !== expected) {
        throw new Error(
          'TSV incompleto ' + items.length + '/' + expected +
          '. Expanda todos os niveis no Explorer, selecione a grade inteira e copie novamente.'
        );
      }
      var payload = buildPayload(items, term);
      if (!payload || !payload.items || !payload.items.length) {
        throw new Error('Falha ao normalizar TSV do Explorer.');
      }
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        var count = BomService.getNodeCount() || meta.itemCount || items.length;
        return {
          ok: true,
          mode: 'paste',
          loaderMode: 'paste',
          meta: meta,
          partial: false,
          message:
            'TSV ' + count + (expected > 0 ? '/' + expected : '') +
            ' - ' + (meta.productName || term || 'E-BOM')
        };
      });
    });
  }

  function load(ctx, options) {
    options = options || {};
    if (options.forceLoader === 'paste') {
      return loadStrictPaste(ctx, options);
    }
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaClipboardOrPaste) {
      return Promise.reject(new Error('Nenhuma fonte de cola disponivel.'));
    }
    return ExplorerScanner.scanViaClipboardOrPaste().then(function (res) {
      if (!res) return res;
      res.loaderMode = 'paste';
      return res;
    });
  }

  return { load: load };
})();

;/* --- assets\js\services\bom-orchestrator.js --- */
/**
 * @file services/bom-orchestrator.js
 * Sprint 2.5 — item 2: fluxo único Atualizar estrutura (contexto → loader → snapshot).
 */
var BomOrchestrator = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : global;

  function hasExplorerPasteBuffer() {
    var text = '';
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      text = ExplorerScanner.getPasteBuffer() || '';
    }
    if (!text) {
      var area = document.getElementById('pasteArea');
      if (area && area.value) text = String(area.value);
    }
    text = String(text || '').trim();
    return text.indexOf('\t') >= 0 && text.split(/\r?\n/).filter(function (l) {
      return l.trim();
    }).length >= 2;
  }

  function getContext(refresh) {
    if (typeof ExplorerContext === 'undefined' || !ExplorerContext.refresh) {
      return null;
    }
    return ExplorerContext.refresh(refresh !== false);
  }

  function selectionFromContext(ctx) {
    if (!ctx || !ctx.hasValidPhysicalId) return null;
    return {
      physicalid: ctx.physicalId,
      name: ctx.productName || ctx.rootName || ctx.physicalId,
      displayName: ctx.displayName || ctx.productName || ctx.physicalId,
      type: 'VPMReference',
      source: ctx.source || 'explorer-context'
    };
  }

  function pickLoaderMode(ctx, options) {
    options = options || {};
    if (options.forceLoader) return options.forceLoader;
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = ctx.expectedCount || 0;
    var primary = (APP_CONFIG && APP_CONFIG.PRIMARY_LOADER) || 'auto';

    if (options.source === 'auto') {
      if (ctx.canUseApi && options.preferApi !== false) return 'api';
      if (hasExplorerPasteBuffer()) return 'paste';
      return 'tsv';
    }

    if (options.source === 'manual' && options.forceLoader === 'paste' && hasExplorerPasteBuffer()) {
      return 'paste';
    }

    var preferApiManual =
      options.preferApi === true ||
      (options.preferApi !== false &&
        APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH !== false &&
        options.source === 'manual' &&
        ctx.canUseApi);

    if (options.source === 'manual' && expected <= maxTsv && !preferApiManual && options.preferApi === false) {
      return 'tsv';
    }
    if (options.source === 'manual' && expected > maxTsv && !preferApiManual && options.preferApi === false) {
      return 'paste';
    }

    if (ctx.canUseApi) {
      if (preferApiManual || (options.preferApi === true && (options.source === 'manual' || primary === 'api'))) {
        return 'api';
      }
      if (primary === 'api' && options.preferApi !== false) return 'api';
      if (typeof ExplorerContext !== 'undefined' && ExplorerContext.suggestLoaderMode) {
        var suggested = ExplorerContext.suggestLoaderMode();
        if (suggested === 'api' && options.preferApi !== false) return 'api';
      }
    }

    if (options.source === 'manual' && expected <= maxTsv) {
      return 'tsv';
    }
    if (options.preferApi && ctx.canUseApi) return 'api';
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.suggestLoaderMode) {
      return ExplorerContext.suggestLoaderMode();
    }
    if (expected > maxTsv) return 'paste';
    return 'tsv';
  }

  /** SKA 79+: quando expectedCount > maxTsv o suggestLoaderMode escolhe paste/API lazy. */

  function withTimeout(promise, ms) {
    ms = ms || (APP_CONFIG && APP_CONFIG.SCAN_TIMEOUT_MS) || 90000;
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('Atualização demorou mais de ' + Math.round(ms / 1000) + 's.'));
        }, ms);
      })
    ]);
  }

  function runApiLoader(ctx, options) {
    options = options || {};
    var sel = selectionFromContext(ctx);
    if (!sel && ctx && ctx.hasValidPhysicalId) {
      sel = {
        physicalid: ctx.physicalId,
        name: ctx.rootName || ctx.productName,
        displayName: ctx.displayName || ctx.productName
      };
    }
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.load) {
      return ApiBomLoader.load(ctx, sel, {
        expectedCount: ctx.expectedCount,
        onProgress: options.onProgress
      });
    }
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Scanner indisponível.'));
    }
    if (sel && ExplorerScanner.scanViaApi) {
      return ExplorerScanner.scanViaApi(sel);
    }
    if (ExplorerScanner.scanViaApiOrSelection) {
      return ExplorerScanner.scanViaApiOrSelection();
    }
    return Promise.reject(new Error('API ENOVIA indisponível neste widget.'));
  }

  function runTsvLoader(ctx, options) {
    options = options || {};
    if (typeof TsvBomLoader !== 'undefined' && TsvBomLoader.load) {
      var allowAutoCopy =
        options.allowAutoCopy === true ||
        (options.source === 'manual' && options.allowAutoCopy !== false) ||
        (options.source === 'auto' &&
          APP_CONFIG.AUTO_SYNC_ALLOW_COPY !== false &&
          options.allowAutoCopy !== false);
      return TsvBomLoader.load(ctx, {
        allowAutoCopy: allowAutoCopy,
        expectedCount: ctx.expectedCount
      });
    }
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaExplorerGrid) {
      return Promise.reject(new Error('Leitura da grade Explorer indisponível.'));
    }
    return ExplorerScanner.scanViaExplorerGrid({ allowAutoCopy: options.allowAutoCopy === true });
  }

  function runPasteLoader(ctx, options) {
    if (typeof PasteBomLoader !== 'undefined' && PasteBomLoader.load) {
      return PasteBomLoader.load(ctx, options);
    }
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Importação indisponível.'));
    }
    if (ExplorerScanner.scanViaImportBestEffort) {
      return ExplorerScanner.scanViaImportBestEffort();
    }
    if (ExplorerScanner.scanViaClipboardOrPaste) {
      return ExplorerScanner.scanViaClipboardOrPaste();
    }
    return Promise.reject(new Error('Nenhuma fonte de cola disponível.'));
  }

  function runDomFallbackLoader(ctx) {
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaDomMirrorFallback) {
      return Promise.reject(new Error('Espelho DOM indisponível.'));
    }
    return ExplorerScanner.scanViaDomMirrorFallback(ctx.rootName, ctx.expectedCount);
  }

  function runLoaderMode(mode, ctx, options) {
    if (mode === 'api') return runApiLoader(ctx, options);
    if (mode === 'paste') return runPasteLoader(ctx, options);
    if (mode === 'dom-fallback') return runDomFallbackLoader(ctx);
    return runTsvLoader(ctx, options);
  }

  function runManualFallbackChain(ctx, options, failedMode, firstErr) {
    return Promise.reject(
      firstErr ||
        new Error(
          'Fonte unica falhou. Use Explorer expandido -> Ctrl+A -> Ctrl+C, depois clique Atualizar estrutura.'
        )
    );
  }

  /** Auto-sync: cola → TSV (copy/scroll) → DOM — sem API (evita 406 e tabela vazia). */
  function runAutoFallbackChain(ctx, options, failedMode, firstErr) {
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var order = [];
    if (failedMode !== 'paste') order.push('paste');
    if (failedMode !== 'tsv' && ctx.expectedCount <= maxTsv) order.push('tsv');
    var domMax = (APP_CONFIG && APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED) || 25;
    if (
      APP_CONFIG.DOM_MIRROR_FALLBACK !== false &&
      failedMode !== 'dom-fallback' &&
      (ctx.expectedCount || 0) <= domMax
    ) {
      order.push('dom-fallback');
    }

    function attempt(i, lastErr) {
      if (i >= order.length) {
        return Promise.reject(lastErr || firstErr || new Error('Sync automático incompleto.'));
      }
      var mode = order[i];
      var runOpts = {
        source: 'auto',
        allowAutoCopy: options.allowAutoCopy !== false,
        preferApi: false,
        pasteFirst: APP_CONFIG.AUTO_SYNC_PREFER_PASTE !== false,
        onProgress: options.onProgress
      };
      if (mode === 'tsv') {
        runOpts.allowAutoCopy = true;
      }
      return runLoaderMode(mode, ctx, runOpts).catch(function (err) {
        return attempt(i + 1, err);
      });
    }

    return attempt(0, firstErr);
  }

  function enrichResult(res, ctx, loaderMode) {
    if (!res) return res;
    if (!res.loaderMode) res.loaderMode = loaderMode;
    res.refreshSource = res.refreshSource || '';
    res.context = {
      physicalId: ctx.physicalId,
      productName: ctx.productName,
      expectedCount: ctx.expectedCount,
      selectionCount: ctx.selectionCount,
      syncKey: ctx.syncKey
    };
    return res;
  }

  function resultCount(res) {
    if (res && res.meta && res.meta.itemCount) return res.meta.itemCount;
    if (typeof BomService !== 'undefined' && BomService.getNodeCount) return BomService.getNodeCount();
    return 0;
  }

  function maybeImprovePartialApi(res, ctx, options, mode) {
    if (!res || !res.partial || ((res.loaderMode || mode) !== 'api')) return Promise.resolve(res);
    if (!ctx || ctx.expectedCount < 2) return Promise.resolve(res);
    var beforeCount = resultCount(res);
    var apiSnap =
      typeof BomService !== 'undefined' && BomService.createSnapshot
        ? BomService.createSnapshot()
        : null;
    return runManualFallbackChain(ctx, options || {}, 'api', new Error('API parcial'))
      .then(function (fallback) {
        var afterCount = resultCount(fallback);
        if (afterCount > beforeCount) {
          fallback.partial = ctx.expectedCount > 0 && afterCount < ctx.expectedCount - 1;
          return fallback;
        }
        if (apiSnap && typeof BomService !== 'undefined' && BomService.restoreSnapshot) {
          BomService.restoreSnapshot(apiSnap);
        }
        return res;
      })
      .catch(function () {
        if (apiSnap && typeof BomService !== 'undefined' && BomService.restoreSnapshot) {
          BomService.restoreSnapshot(apiSnap);
        }
        return res;
      });
  }

  function updateSelectionLabel(ctx) {
    if (!ctx || !ctx.rootName) return;
    var label = document.getElementById('selectionLabel');
    if (label) {
      label.textContent = ctx.rootName;
      label.setAttribute('title', ctx.rootName);
    }
  }

  function formatFailureMessage(err, ctx) {
    var msg = (err && err.message) ? err.message : String(err || 'Falha na importação.');
    if (/Ctrl\+A|Ctrl\+C|Atualizar estrutura/i.test(msg)) return msg;
    if (/406|API parcial|TSV parcial|DOM espelho incompleto|incompleto|parcial/i.test(msg)) {
      return (
        msg +
        ' — No Explorer: expanda todos os níveis → Ctrl+A → Ctrl+C → Atualizar estrutura.'
      );
    }
    if (ctx && ctx.expectedCount > 20) {
      return msg + ' — Alternativa: Ctrl+A → Ctrl+C na grade → Atualizar estrutura.';
    }
    return msg;
  }

  /**
   * @param {object} [options]
   * @param {'manual'|'auto'} [options.source]
   * @param {boolean} [options.allowAutoCopy]
   * @param {boolean} [options.preferApi]
   * @param {string} [options.forceLoader] api|tsv|paste
   */
  function refreshStructure(options) {
    options = options || {};
    var ctx = getContext(true);
    if (!ctx || (!ctx.rootName && !ctx.expectedCount && !ctx.hasValidPhysicalId)) {
      return Promise.reject(
        new Error('Abra uma estrutura no Product Structure Explorer ao lado do widget.')
      );
    }
    updateSelectionLabel(ctx);
    if (options.source === 'manual' && typeof BomService !== 'undefined' && BomService.reset) {
      BomService.reset();
    }

    var dashCount =
      typeof BomService !== 'undefined' && BomService.getNodeCount ? BomService.getNodeCount() : 0;
    var contextMismatch =
      ctx.expectedCount > 0 &&
      dashCount > 0 &&
      Math.abs(dashCount - ctx.expectedCount) > 1;
    var priorIndex = null;
    if (
      dashCount > 0 &&
      typeof BomService !== 'undefined' &&
      BomService.createSnapshot
    ) {
      priorIndex = BomService.createSnapshot();
    }

    var mode = options.source === 'manual' ? (options.forceLoader || 'paste') : pickLoaderMode(ctx, options);
    var chain;
    var apiFlag = mode === 'api';

    if (apiFlag) root.__3DX_ALLOW_API__ = true;
    chain = runLoaderMode(mode, ctx, options);

    if (options.source === 'manual' && options.allowFallback === true) {
      chain = chain.catch(function (firstErr) {
        if (apiFlag) {
          apiFlag = false;
          root.__3DX_ALLOW_API__ = false;
        }
        return runManualFallbackChain(ctx, options, mode, firstErr);
      });
    } else if (options.source === 'auto') {
      chain = chain.catch(function (firstErr) {
        return runAutoFallbackChain(ctx, options, mode, firstErr);
      });
    }

    var timeoutMs = options.timeoutMs;
    if (!timeoutMs && options.source === 'manual') {
      var smallMax = (APP_CONFIG && APP_CONFIG.FAST_STRUCTURE_MAX) || 12;
      if (ctx.expectedCount > 0 && ctx.expectedCount <= smallMax) {
        timeoutMs = (APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_SMALL_MS) || 12000;
      } else {
        timeoutMs = (APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_MS) || 28000;
      }
    }
    if (!timeoutMs && options.source === 'auto') {
      timeoutMs = (APP_CONFIG && APP_CONFIG.AUTO_SYNC_TIMEOUT_MS) || 24000;
    }
    return withTimeout(chain, timeoutMs)
      .then(function (res) {
        var usedMode = (res && res.loaderMode) || mode;
        if (res) res.refreshSource = options.source || 'manual';
        return maybeImprovePartialApi(res, ctx, options, usedMode).then(function (best) {
          var bestMode = (best && best.loaderMode) || usedMode;
          if (best) best.refreshSource = options.source || 'manual';
          return enrichResult(best, ctx, bestMode);
        });
      })
      .catch(function (err) {
        if (
          priorIndex &&
          priorIndex.nodeCount > 0 &&
          typeof BomService !== 'undefined' &&
          BomService.restoreSnapshot
        ) {
          BomService.restoreSnapshot(priorIndex);
        }
        return Promise.reject(new Error(formatFailureMessage(err, ctx)));
      })
      .finally(function () {
        if (apiFlag) root.__3DX_ALLOW_API__ = false;
      });
  }

  return {
    refreshStructure: refreshStructure,
    pickLoaderMode: pickLoaderMode,
    getContext: function () {
      return getContext(true);
    }
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

  function aggregateNodes(nodes) {
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

    return aggregateResult(nodes, byMaturity, byType, byRevision, byApproval, byOwner, assemblies, parts, totalQty, withPP, withoutPP, maxLevel);
  }

  function aggregateResult(nodes, byMaturity, byType, byRevision, byApproval, byOwner, assemblies, parts, totalQty, withPP, withoutPP, maxLevel) {
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

  function compute(index) {
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    return aggregateNodes(nodes);
  }

  /** KPIs/gráficos sobre linhas filtradas (dinâmico com filtros). */
  function computeFromFlat(flatNodes) {
    return aggregateNodes(flatNodes || []);
  }

  function ownerLabel(raw) {
    var o = String(raw || '').trim();
    if (!o || o === '-' || o === '—' || o === '[]' || /^\[\s*\]$/.test(o) || /^sem\s*propriet/i.test(o)) {
      return 'Sem proprietário';
    }
    if (/^\d+$/.test(o) || /^\d+[.,]\d+$/.test(o)) {
      return 'Sem proprietário';
    }
    if (/^(01_SKA_|SKA_|Mont\d|prd-R)/i.test(o) || /[<][0-9]+[>]/.test(o)) {
      return 'Sem proprietário';
    }
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

  function groupOwnersForChart(byOwner, topN) {
    topN = topN || 8;
    var keys = Object.keys(byOwner || {}).sort(function (a, b) {
      return (byOwner[b] || 0) - (byOwner[a] || 0);
    });
    var legend = keys.map(function (k) {
      return { label: k, value: byOwner[k] || 0 };
    });
    var chartLabels = [];
    var chartValues = [];
    keys.slice(0, topN).forEach(function (k) {
      chartLabels.push(k);
      chartValues.push(byOwner[k] || 0);
    });
    var rest = keys.slice(topN);
    if (rest.length) {
      var otherSum = rest.reduce(function (acc, k) {
        return acc + (byOwner[k] || 0);
      }, 0);
      chartLabels.push('Outros (' + rest.length + ')');
      chartValues.push(otherSum);
    }
    return {
      chart: { labels: chartLabels, values: chartValues },
      legend: legend
    };
  }

  function chartDatasets(metrics) {
    var owners = metrics.byOwner || {};
    var grouped = groupOwnersForChart(owners, 8);
    return {
      owners: grouped.chart,
      ownersLegend: grouped.legend,
      maturity: {
        labels: ['Bom (Aprovado)', 'Moderado (Trabalho/Espera)', 'Ruim (Obsoleto)', 'Outros'],
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
    computeFromFlat: computeFromFlat,
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
    return Math.round((part / total) * 1000) / 10;
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
    var atRisk = (metrics.inWork || 0) + (metrics.obsolete || 0);

    var markers = [
      { tone: 'blue', label: 'Total Peças', value: metrics.totalItems },
      { tone: 'green', label: 'Média Saúde', value: goodPct, suffix: '%' },
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
 * Gráficos de pizza (Chart.js ou fallback CSS) — sempre visíveis no 3DDashboard.
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};
  var OWNER_COLORS = [
    '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f',
    '#c62828', '#4527a0', '#558b2f', '#ad1457', '#0277bd', '#4e342e', '#37474f'
  ];

  function init() {}

  function destroyAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k] && charts[k].destroy) charts[k].destroy();
    });
    charts = {};
    document.querySelectorAll('.chart-fallback').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    document.querySelectorAll('.cf-pie-quad-holder').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    var leg = document.getElementById('ownersLegendScroll');
    if (leg) leg.innerHTML = '';
    var matLeg = document.getElementById('maturityLegendScroll');
    if (matLeg) matLeg.innerHTML = '';
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

  function compactPieGradient(labels, values, colors) {
    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) slices = emptySlice();
    var total = slices.values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var gradientParts = [];
    var acc = 0;
    slices.labels.forEach(function (lbl, i) {
      var v = slices.values[i];
      var pct = (v / total) * 100;
      var end = acc + pct;
      gradientParts.push(slices.colors[i] + ' ' + acc.toFixed(2) + '% ' + end.toFixed(2) + '%');
      acc = end;
    });
    return { total: total, gradient: gradientParts.join(', ') };
  }

  function showCompactPieInBox(canvasId, labels, values, colors) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var box = canvas.closest('.bom-chart-canvas-box');
    if (!box) return;
    var pie = compactPieGradient(labels, values, colors);
    canvas.style.display = 'none';
    var panel = panelForCanvas(canvasId);
    if (panel) {
      var fb = panel.querySelector('.chart-fallback');
      if (fb) fb.style.display = 'none';
    }
    box.querySelectorAll('.cf-pie-quad-holder').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    var holder = document.createElement('div');
    holder.className = 'cf-pie-quad-holder';
    holder.innerHTML =
      '<div class="cf-pie cf-pie-quad" style="background:conic-gradient(' + pie.gradient + ')">' +
      '<div class="cf-pie-hole cf-pie-hole-quad">' + pie.total + '</div></div>';
    box.appendChild(holder);
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

  function clampCanvasBox(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var box = canvas.closest('.bom-chart-canvas-box');
    if (!box) return;
    box.style.height = '110px';
    box.style.maxHeight = '110px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.maxHeight = '110px';
    canvas.style.display = 'block';
    var wrap = box.firstElementChild;
    if (wrap && wrap !== canvas) {
      wrap.style.position = 'absolute';
      wrap.style.left = '0';
      wrap.style.top = '0';
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.maxHeight = '110px';
    }
    if (charts[canvasId] && charts[canvasId].resize) {
      charts[canvasId].resize();
    }
  }

  function showCanvas(canvasId) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) {
      canvas.style.display = 'block';
      if (canvas.closest('.bom-chart-canvas-box')) {
        canvas.style.height = '100%';
        canvas.style.width = '100%';
      } else {
        canvas.style.height = '180px';
        canvas.style.width = '100%';
      }
    }
    var fb = panel.querySelector('.chart-fallback');
    if (fb) fb.style.display = 'none';
  }

  function filterSlices(labels, values, colors) {
    var outL = [];
    var outV = [];
    var outC = [];
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      if (v > 0 && lbl) {
        outL.push(lbl);
        outV.push(v);
        outC.push((colors && colors[i]) || OWNER_COLORS[outC.length % OWNER_COLORS.length]);
      }
    });
    return { labels: outL, values: outV, colors: outC };
  }

  function emptySlice() {
    return { labels: ['Sem dados'], values: [1], colors: ['#cfd8dc'] };
  }

  function fallbackPieHtml(labels, values, colors) {
    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) slices = emptySlice();

    var total = slices.values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var gradientParts = [];
    var acc = 0;
    var legend = '';

    slices.labels.forEach(function (lbl, i) {
      var v = slices.values[i];
      var pct = (v / total) * 100;
      var end = acc + pct;
      gradientParts.push(slices.colors[i] + ' ' + acc.toFixed(2) + '% ' + end.toFixed(2) + '%');
      acc = end;
      var pctLabel = Math.round(pct * 10) / 10;
      legend +=
        '<div class="cf-pie-item">' +
        '<span class="cf-pie-dot" style="background:' + slices.colors[i] + '"></span>' +
        '<span class="cf-pie-lbl">' + lbl + '</span>' +
        '<span class="cf-pie-val">' + v + ' (' + pctLabel + '%)</span></div>';
    });

    return (
      '<div class="cf-pie-wrap">' +
      '<div class="cf-pie" style="background:conic-gradient(' + gradientParts.join(', ') + ')">' +
      '<div class="cf-pie-hole">' + total + '</div></div>' +
      '<div class="cf-pie-legend cf-pie-legend-scroll">' + legend + '</div></div>'
    );
  }

  function legendItemsHtml(items, total, colorAt) {
    if (!items || !items.length) return '';
    total = total || items.reduce(function (a, it) {
      return a + (it.value != null ? it.value : 0);
    }, 0) || 1;
    return items.map(function (it, i) {
      var val = it.value != null ? it.value : 0;
      var pct = Math.round((val / total) * 1000) / 10;
      var c = colorAt(i, it);
      return (
        '<div class="owners-legend-item">' +
        '<span class="cf-pie-dot" style="background:' + c + '"></span>' +
        '<span class="owners-legend-name">' + it.label + '</span>' +
        '<span class="owners-legend-val">' + val + ' (' + pct + '%)</span></div>'
      );
    }).join('');
  }

  function renderOwnersLegend(items, total) {
    var el = document.getElementById('ownersLegendScroll');
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = ''; return; }
    el.innerHTML = legendItemsHtml(items, total, function (i) {
      return OWNER_COLORS[i % OWNER_COLORS.length];
    });
  }

  function renderMaturityLegend(labels, values, colors) {
    var el = document.getElementById('maturityLegendScroll');
    if (!el) return;
    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) { el.innerHTML = ''; return; }
    var items = slices.labels.map(function (lbl, i) {
      return { label: lbl, value: slices.values[i] };
    });
    var total = slices.values.reduce(function (a, b) { return a + b; }, 0) || 1;
    el.innerHTML = legendItemsHtml(items, total, function (i) {
      return slices.colors[i];
    });
  }

  function pieChart(canvasId, labels, values, title, colors, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) slices = emptySlice();
    var quadCharts = !!document.querySelector('.bom-charts-row-quad');

    if (typeof Chart === 'undefined') {
      if (quadCharts) {
        showCompactPieInBox(canvasId, slices.labels, slices.values, slices.colors);
      } else {
        showFallback(canvasId, title, fallbackPieHtml(slices.labels, slices.values, slices.colors));
      }
      return false;
    }

    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: slices.labels,
          datasets: [{ data: slices.values, backgroundColor: slices.colors, borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '52%',
          animation: { duration: 450, animateRotate: true, animateScale: true },
          plugins: {
            title: {
              display: opts.hideTitle !== true,
              text: title,
              color: th.title,
              font: { size: 14, weight: '600' },
              padding: { top: 2, bottom: 4 }
            },
            legend: {
              display: opts.hideLegend !== true,
              position: 'bottom',
              labels: { color: th.legend, font: { size: 13 }, boxWidth: 14, padding: 10 }
            },
            tooltip: {
              callbacks: {
                label: function (c) {
                  var sum = c.dataset.data.reduce(function (a, b) { return a + b; }, 0) || 1;
                  var pct = Math.round((c.raw / sum) * 1000) / 10;
                  return c.label + ': ' + c.raw + ' (' + pct + '%)';
                }
              }
            }
          }
        }
      });
      return true;
    } catch (e) {
      if (quadCharts) {
        showCompactPieInBox(canvasId, slices.labels, slices.values, slices.colors);
      } else {
        showFallback(canvasId, title, fallbackPieHtml(slices.labels, slices.values, slices.colors));
      }
      return false;
    } finally {
      clampCanvasBox(canvasId);
    }
  }

  function ownerColors(count) {
    var list = [];
    for (var i = 0; i < count; i++) list.push(OWNER_COLORS[i % OWNER_COLORS.length]);
    return list;
  }

  function scheduleResize() {
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        clampCanvasBox(k);
      });
      resetChartsScroll();
    }, 120);
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        clampCanvasBox(k);
      });
      resetChartsScroll();
    }, 400);
  }

  function resetChartsScroll() {
    var sc = document.querySelector('.bom-zone-3 .bom-charts-unified-scroll');
    if (sc) sc.scrollTop = 0;
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

    var ds = MetricsEngine.chartDatasets(metrics);
    var owners = ds.owners || { labels: [], values: [] };
    var ownersLegend = ds.ownersLegend || [];
    if (!owners.labels.length) {
      owners = { labels: ['Sem proprietário'], values: [metrics.totalItems || 0] };
      ownersLegend = [{ label: 'Sem proprietário', value: metrics.totalItems || 0 }];
    }
    if (!owners.values.some(function (v) { return v > 0; })) {
      owners = { labels: ['Sem proprietário'], values: [metrics.totalItems || 1] };
    }

    var quadCharts = !!document.querySelector('.bom-charts-row-quad');
    var chartOpts = quadCharts ? { hideLegend: true, hideTitle: true } : {};

    if (quadCharts) {
      var hMat = document.querySelector('.bom-chart-panel .bom-chart-heading');
      var hOwn = document.querySelector('.bom-chart-owners .bom-chart-heading');
      if (hMat) hMat.textContent = 'Sa\u00fade da Maturidade';
      if (hOwn) hOwn.textContent = 'Propriet\u00e1rios';
    }

    pieChart('chartMaturity', matLabels, matValues, 'Sa\u00fade da Maturidade', healthColors, chartOpts);
    pieChart(
      'chartOwners',
      owners.labels,
      owners.values,
      'Propriet\u00e1rios',
      ownerColors(owners.labels.length),
      chartOpts
    );
    if (quadCharts) {
      renderMaturityLegend(matLabels, matValues, healthColors);
    } else {
      var matLeg = document.getElementById('maturityLegendScroll');
      if (matLeg) matLeg.innerHTML = '';
    }
    renderOwnersLegend(ownersLegend, metrics.totalItems || 0);
    resetChartsScroll();
    scheduleResize();
  }

  return { init: init, render: render, destroyAll: destroyAll, scheduleResize: scheduleResize };
})();

;/* --- assets\js\ui\part-image.js --- */
/**
 * @file ui/part-image.js
 * Thumbnail 2D — getpicture + WAF autenticado + fallback visual.
 */
var PartImage = (function () {
  'use strict';

  var blobCache = {};

  function mediaCfg() {
    return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.MEDIA) || {};
  }

  function allowGetPictureUrls() {
    return mediaCfg().BUILD_GETPICTURE_URLS === true;
  }

  function allowNetworkThumbs() {
    return mediaCfg().AUTO_LOAD_THUMBNAILS === true;
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isSyntheticId(pid) {
    var p = String(pid || '');
    return !p || p.indexOf('IMP_') === 0 || p.indexOf('grid_') === 0 || p.indexOf('snap_') === 0 ||
      p.indexOf('mont10_') === 0;
  }

  function platformBase() {
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost;
    }
    try {
      if (window.parent && window.parent.location && window.parent.location.hostname.indexOf('3dexperience') >= 0) {
        return window.parent.location.protocol + '//' + window.parent.location.hostname;
      }
    } catch (eP) { /* cross-origin */ }
    if (typeof location !== 'undefined' && location.hostname.indexOf('3dexperience') >= 0) {
      return location.protocol + '//' + location.hostname;
    }
    return '';
  }

  function spaceBase() {
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var v = CompassServices.getVerifiedSpaceUrl();
      if (v) return String(v).replace(/\/$/, '');
    }
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/3dspace';
    }
    return '';
  }

  function tenantId() {
    return (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId) || 'R1132100929518';
  }

  function buildGetPictureUrl(physicalId) {
    if (!allowGetPictureUrls()) return '';
    var pid = String(physicalId || '').trim();
    if (!pid || isSyntheticId(pid)) return '';

    var tenant = tenantId();
    var q = '?tenant=' + encodeURIComponent(tenant) + '&pid=' + encodeURIComponent(pid);
    var ifwe = platformBase();
    if (ifwe) return ifwe.replace(/\/$/, '') + '/enovia/resources/getpicture' + q;

    var space = spaceBase();
    if (space) return space + '/resources/getpicture' + q;
    return '';
  }

  function lookupPrdId(node) {
    if (!node) return '';
    var pid = String(node.sourcePhysicalId || node.physicalid || '').trim();
    if (pid && !isSyntheticId(pid)) return pid;

    var names = [node.name, node.title, node.displayName].filter(Boolean);
    var i;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.lookupPrdByPartName) {
      for (i = 0; i < names.length; i++) {
        var hit = ProductExplorerBridge.lookupPrdByPartName(names[i]);
        if (hit) return hit;
      }
    }

    var reg = (APP_CONFIG && APP_CONFIG.STRUCTURE_IDS) || {};
    for (i = 0; i < names.length; i++) {
      if (reg[names[i]]) return reg[names[i]];
      var low = String(names[i]).toLowerCase();
      if (reg[low]) return reg[low];
    }
    return '';
  }

  function resolveUrl(node) {
    if (!allowNetworkThumbs()) return '';
    if (!node) return '';
    if (node.iconUrl && /https?:|getpicture/i.test(String(node.iconUrl))) {
      return String(node.iconUrl);
    }
    return buildGetPictureUrl(lookupPrdId(node));
  }

  function initialChar(node) {
    var n = String((node && (node.title || node.name)) || '?').trim();
    var m = n.match(/[A-Za-zÀ-ú]/);
    if (m) return m[0].toUpperCase();
    return n.charAt(0).toUpperCase() || '?';
  }

  function getWaf() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
    try {
      if (typeof widget !== 'undefined' && widget && widget.WAFData && widget.WAFData.authenticatedRequest) {
        return widget.WAFData;
      }
    } catch (e) { /* */ }
    return null;
  }

  function fetchViaWaf(url, callback) {
    if (blobCache[url]) {
      callback(blobCache[url]);
      return;
    }
    var WAF = getWaf();
    if (!WAF) {
      callback(null);
      return;
    }
    WAF.authenticatedRequest(url, {
      method: 'GET',
      headers: { Accept: 'image/png,image/jpeg,image/gif,image/*,*/*' },
      type: 'json',
      onComplete: function (data, status, headers, xhr) {
        try {
          var buf = xhr && xhr.response;
          if (buf instanceof ArrayBuffer && buf.byteLength > 32) {
            var blobUrl = URL.createObjectURL(new Blob([buf], { type: 'image/png' }));
            blobCache[url] = blobUrl;
            callback(blobUrl);
            return;
          }
        } catch (e) { /* */ }
        callback(null);
      },
      onFailure: function () {
        callback(null);
      }
    });
  }

  function loadIntoImg(img, url, fallbackEl, callback) {
    if (!img || !url) {
      if (callback) callback(false);
      return;
    }
    function ok(src) {
      img.src = src;
      img.style.display = '';
      img.classList.remove('bom-thumb-hidden');
      if (fallbackEl) fallbackEl.style.display = 'none';
      if (callback) callback(true);
    }
    img.onload = function () { ok(url); };
    img.onerror = function () {
      fetchViaWaf(url, function (blobUrl) {
        if (blobUrl) {
          img.onload = function () { ok(blobUrl); };
          img.onerror = function () { if (callback) callback(false); };
          img.src = blobUrl;
        } else if (callback) {
          callback(false);
        }
      });
    };
    img.style.display = 'none';
    img.classList.add('bom-thumb-hidden');
    img.src = url;
  }

  /** Preenche container com thumbnail (preview grande). */
  function mountThumb(container, node, sizeClass, callback) {
    if (!container) return;
    sizeClass = sizeClass || 'bom-thumb-lg';
    var init = initialChar(node);
    var url = resolveUrl(node);
    container.innerHTML =
      '<span class="bom-thumb-wrap ' + sizeClass + '">' +
      (url
        ? '<img class="bom-thumb-img bom-thumb-hidden" alt="' + escapeAttr(node.title || node.name || 'Peça') + '" />'
        : '') +
      '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>';
    if (!url) {
      if (callback) callback(false);
      return;
    }
    var img = container.querySelector('.bom-thumb-img');
    var fb = container.querySelector('.bom-thumb-fallback');
    loadIntoImg(img, url, fb, callback);
  }

  /** HTML thumbnail estático — use hydrateThumbs após render da tabela. */
  function thumbHtml(node, sizeClass) {
    sizeClass = sizeClass || 'bom-thumb-md';
    var url = resolveUrl(node);
    var init = initialChar(node);
    var alt = escapeAttr(node && (node.title || node.name) || 'Peça');
    if (url) {
      return (
        '<span class="bom-thumb-wrap ' + sizeClass + '" data-picture-url="' + escapeAttr(url) + '">' +
        '<img class="bom-thumb-img bom-thumb-hidden" alt="' + alt + '" />' +
        '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>'
      );
    }
    return (
      '<span class="bom-thumb-wrap ' + sizeClass + '">' +
      '<span class="bom-thumb-fallback">' + escapeHtml(init) + '</span></span>'
    );
  }

  function hydrateThumbs(root) {
    var scope = root || document;
    var wraps = scope.querySelectorAll ? scope.querySelectorAll('.bom-thumb-wrap[data-picture-url]') : [];
    var i;
    for (i = 0; i < wraps.length; i++) {
      (function (wrap) {
        if (wrap.__3DX_HYDRATED__) return;
        wrap.__3DX_HYDRATED__ = true;
        var url = wrap.getAttribute('data-picture-url');
        var img = wrap.querySelector('.bom-thumb-img');
        var fb = wrap.querySelector('.bom-thumb-fallback');
        loadIntoImg(img, url, fb);
      })(wraps[i]);
    }
  }

  return {
    resolveUrl: resolveUrl,
    lookupPrdId: lookupPrdId,
    buildGetPictureUrl: buildGetPictureUrl,
    isSyntheticId: isSyntheticId,
    thumbHtml: thumbHtml,
    mountThumb: mountThumb,
    hydrateThumbs: hydrateThumbs,
    initialChar: initialChar
  };
})();

;/* --- assets\js\ui\3dplay-viewer.js --- */
/**
 * @file ui/3dplay-viewer.js
 * Sprint 3 — painel de preview ao clicar numa linha da E-BOM (2D WAF + tentativa 3DPlay).
 */
var ThreeDPlayViewer = (function () {
  'use strict';

  var hostEl = null;
  var statusEl = null;
  var thumbEl = null;
  var currentNode = null;

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function cfg() {
    return (APP_CONFIG && APP_CONFIG.THREE_DPLAY) || {};
  }

  function prefer2dPanel() {
    if (cfg().PREFER_2D_IN_PANEL === true) return true;
    if (cfg().EMBED_PLAYER === false) return true;
    try {
      if (typeof location !== 'undefined' && location.hostname.indexOf('github.io') >= 0) return true;
    } catch (e) { /* */ }
    return false;
  }

  function bind(container) {
    if (typeof container === 'string') {
      hostEl = uiRoot().querySelector(container);
    } else {
      hostEl = container;
    }
    if (!hostEl) return false;
    if (!hostEl.querySelector('.bom-3dplay-host')) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-shell">' +
        '<div class="bom-3dplay-host" id="bom3DPlayHost" aria-label="Visualizador 3DPlay"></div>' +
        '<p class="bom-3dplay-status" id="bom3DPlayStatus"></p>' +
        '<div class="bom-3dplay-thumb" id="bom3DPlayThumb"></div>' +
        '</div>';
    }
    hostEl = hostEl.querySelector('.bom-3dplay-host') || hostEl.querySelector('#bom3DPlayHost') || hostEl;
    statusEl = uiRoot().querySelector('#bom3DPlayStatus');
    thumbEl = uiRoot().querySelector('#bom3DPlayThumb');
    return !!hostEl;
  }

  function init(containerSelector) {
    var wrap = uiRoot().querySelector(containerSelector || '#partPreviewImage');
    if (!wrap) return;
    bind(wrap);
  }

  function renderStatus(text, kind) {
    if (!statusEl) statusEl = uiRoot().querySelector('#bom3DPlayStatus');
    if (!statusEl) return;
    statusEl.textContent = String(text || '');
    statusEl.className = 'bom-3dplay-status';
    if (kind === 'ok') statusEl.classList.add('bom-3dplay-status-ok');
    if (kind === 'warn') statusEl.classList.add('bom-3dplay-status-warn');
    if (kind === 'err') statusEl.classList.add('bom-3dplay-status-err');
  }

  function renderThumb(node, sizeClass) {
    if (!thumbEl) thumbEl = uiRoot().querySelector('#bom3DPlayThumb');
    if (!thumbEl || !node) return;
    sizeClass = sizeClass || 'bom-thumb-sm';
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      thumbEl.innerHTML = '<div class="bom-3dplay-thumb-inner"></div>';
      PartImage.mountThumb(thumbEl.querySelector('.bom-3dplay-thumb-inner'), node, sizeClass);
    } else {
      thumbEl.innerHTML = '';
    }
  }

  function show2dInHost(node) {
    if (!hostEl) return;
    hostEl.innerHTML = '<div class="bom-3dplay-2d-panel"></div>';
    var panel = hostEl.querySelector('.bom-3dplay-2d-panel');
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb && panel) {
      PartImage.mountThumb(panel, node, 'bom-thumb-xl');
    } else if (panel) {
      panel.innerHTML = '<p class="bom-3dplay-empty">Miniatura indisponível.</p>';
    }
    renderThumb(node, 'bom-thumb-sm');
  }

  function showUnavailable(node, sub) {
    if (!hostEl) return;
    hostEl.innerHTML =
      '<div class="bom-3dplay-empty">' +
      '<p>Pré-visualização 3D indisponível para esta linha.</p>' +
      '<p class="bom-3dplay-empty-sub">' + (sub || '') + '</p>' +
      '</div>';
    renderThumb(node);
  }

  function show(node) {
    if (!hostEl) init('#partPreviewImage');
    if (!hostEl) return;
    currentNode = node;
    if (!node) {
      clear();
      return;
    }

    var resolvedId = typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.resolvePhysicalId
      ? ThreeDPlayBridge.resolvePhysicalId(node)
      : String(node.sourcePhysicalId || node.physicalid || '');
    var playable = typeof ThreeDPlayBridge !== 'undefined' &&
      ThreeDPlayBridge.isPlayableId &&
      ThreeDPlayBridge.isPlayableId(resolvedId);

    if (!playable) {
      showUnavailable(
        node,
        'IDs de importação (IMP_/grid_) só mostram metadados. Carregue com Ctrl+C para obter prd-.'
      );
      renderStatus('Sem ID 3D — só metadados.', 'warn');
      return;
    }

    if (prefer2dPanel()) {
      show2dInHost(node);
      renderStatus(
        cfg().WIDGET_HINT || 'Pré-visualização 2D no painel (3DPlay embutido indisponível no Additional App).',
        'warn'
      );
      return;
    }

    hostEl.innerHTML = '<div class="bom-3dplay-loading">A preparar 3DPlay…</div>';
    renderStatus('A carregar modelo 3D…', '');

    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.showPart) {
      ThreeDPlayBridge.showPart(node, { container: hostEl }, function (st) {
        if (!st) return;
        if (st.mode === 'embedded' && st.ok) {
          renderStatus('3DPlay embutido', 'ok');
          renderThumb(node);
          return;
        }
        show2dInHost(node);
        renderStatus(st.message || 'Pré-visualização 2D (3DPlay indisponível)', 'warn');
      });
    } else {
      show2dInHost(node);
      renderStatus('Pré-visualização 2D', 'warn');
    }
  }

  function clear() {
    currentNode = null;
    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.clear) {
      ThreeDPlayBridge.clear();
    }
    if (hostEl) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-empty">' +
        '<p>Clique numa linha da E-BOM para visualizar a peça.</p>' +
        '</div>';
    }
    renderStatus('', '');
    if (thumbEl) thumbEl.innerHTML = '';
  }

  return { init: init, show: show, clear: clear, bind: bind };
})();

;/* --- assets\js\ui\part-preview.js --- */
/**
 * @file ui/part-preview.js
 * Painel de visualização 3D (3DPlay) + metadados ao clicar numa linha da E-BOM.
 */
var PartPreview = (function () {
  'use strict';

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function bindRefs() {
    var panel = uiRoot().querySelector('#partPreviewPanel');
    if (!panel) return null;
    return {
      panel: panel,
      bodyEl: panel.querySelector('.bom-preview-body') || panel,
      imageWrap: panel.querySelector('#partPreviewImage') || panel.querySelector('.bom-preview-image'),
      metaEl: panel.querySelector('#partPreviewMeta') || panel.querySelector('.bom-preview-meta'),
      titleEl: panel.querySelector('#partPreviewTitle') || panel.querySelector('.bom-preview-title'),
      hintEl: panel.querySelector('.bom-preview-hint')
    };
  }

  var refs = null;

  function init(selector) {
    refs = bindRefs();
    if (!refs && selector) {
      refs = { panel: uiRoot().querySelector(selector) };
      if (refs.panel) {
        refs.imageWrap = refs.panel.querySelector('#partPreviewImage');
        refs.metaEl = refs.panel.querySelector('#partPreviewMeta');
        refs.titleEl = refs.panel.querySelector('#partPreviewTitle');
        refs.hintEl = refs.panel.querySelector('.bom-preview-hint');
      }
    }
    if (typeof ThreeDPlayViewer !== 'undefined') {
      ThreeDPlayViewer.init('#partPreviewImage');
    }
  }

  function isNarrowLayout() {
    var host = uiRoot();
    return !!(host && host.classList && host.classList.contains('bom-widget-narrow'));
  }

  function reflow() {
    if (typeof LayoutFit !== 'undefined' && LayoutFit.apply) {
      window.setTimeout(function () { LayoutFit.apply(); }, 0);
      window.setTimeout(function () { LayoutFit.apply(); }, 120);
    }
  }

  function openPanel(r) {
    if (!r || !r.panel) return;
    if (typeof r.panel.open === 'boolean') r.panel.open = true;
  }

  function closePanel(r) {
    if (!r || !r.panel) return;
    if (isNarrowLayout() && typeof r.panel.open === 'boolean') r.panel.open = false;
  }

  function ensureRefs() {
    if (!refs || !refs.panel || !document.body.contains(refs.panel)) {
      refs = bindRefs();
    }
    return refs;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function ownerText(node) {
    if (typeof MetricsEngine !== 'undefined' && MetricsEngine.ownerLabel) {
      return MetricsEngine.ownerLabel(node.owner);
    }
    return String(node.owner || '—');
  }

  function maturityText(node) {
    return String(node.maturity || node.state || '—').trim() || '—';
  }

  function renderMeta(node, r) {
    if (!r.metaEl) return;
    r.metaEl.innerHTML =
      '<dl class="bom-preview-dl">' +
      '<dt>Revisão</dt><dd>' + escapeHtml(node.revision || '—') + '</dd>' +
      '<dt>Proprietário</dt><dd>' + escapeHtml(ownerText(node)) + '</dd>' +
      '<dt>Maturidade</dt><dd>' + escapeHtml(maturityText(node)) + '</dd>' +
      '<dt>ID</dt><dd class="bom-preview-id">' + escapeHtml(
        (typeof PartImage !== 'undefined' && PartImage.lookupPrdId
          ? PartImage.lookupPrdId(node)
          : '') || node.sourcePhysicalId || node.physicalid || '—'
      ) + '</dd>' +
      '</dl>';
  }

  function showVisual(node, r) {
    if (!r.imageWrap) return;
    if (typeof ThreeDPlayViewer !== 'undefined' && ThreeDPlayViewer.show) {
      ThreeDPlayViewer.show(node);
      return;
    }
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      r.imageWrap.innerHTML = '<div class="bom-preview-visual"></div>';
      PartImage.mountThumb(r.imageWrap.querySelector('.bom-preview-visual'), node, 'bom-thumb-lg');
      return;
    }
    r.imageWrap.innerHTML = '<span class="bom-preview-placeholder">Visualização indisponível</span>';
  }

  function show(node) {
    var r = ensureRefs();
    if (!r || !r.panel) return;
    if (!node) {
      clear();
      return;
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.enrichNodeWithPrd) {
      ProductExplorerBridge.enrichNodeWithPrd(node);
    }
    if (r.hintEl) r.hintEl.style.display = 'none';
    if (r.titleEl) r.titleEl.textContent = node.title || node.name || 'Peça';
    renderMeta(node, r);
    showVisual(node, r);
    r.panel.classList.add('bom-preview-active');
    openPanel(r);
    reflow();
  }

  function clear() {
    var r = ensureRefs();
    if (!r || !r.panel) return;
    r.panel.classList.remove('bom-preview-active');
    closePanel(r);
    if (r.titleEl) r.titleEl.textContent = 'Visualização da peça';
    if (r.metaEl) r.metaEl.innerHTML = '';
    if (typeof ThreeDPlayViewer !== 'undefined' && ThreeDPlayViewer.clear) {
      ThreeDPlayViewer.clear();
    } else if (r.imageWrap) {
      r.imageWrap.innerHTML =
        '<span class="bom-preview-placeholder">Clique numa linha da E-BOM para visualização 3D</span>';
    }
    if (r.hintEl) r.hintEl.style.display = 'block';
    reflow();
  }

  return { init: init, show: show, clear: clear, ensureRefs: ensureRefs };
})();

;/* --- assets\js\ui\layout-fit.js --- */
/**
 * @file ui/layout-fit.js
 * Layout 5 zonas — grid no .bom-layout-page (inline CSS no widget-v2).
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var MID_ROW_RATIO = 0.30;

  function hostEl() {
    return window.__3DX_UI_ROOT__ || document.body;
  }

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 640,
      h: window.innerHeight || document.documentElement.clientHeight || 640
    };
  }

  function applyMode(host, vp) {
    host.classList.toggle('bom-widget-narrow', vp.w < 620);
    host.classList.toggle('bom-widget-wide', vp.w >= 620);
    host.classList.toggle('bom-widget-compact', vp.h < 780 || vp.w < 680);
  }

  function applyPageGrid(host, vp) {
    var page = host.querySelector('.bom-layout-page');
    if (!page) return;

    var hostBox = host.getBoundingClientRect();
    var avail = Math.max(160, Math.floor(hostBox.top + vp.h - hostBox.top - 2));
    var header = page.querySelector('.bom-zone-1');
    var headerBtn = header && header.querySelector('#btnImportPaste');
    var headerH = headerBtn ? headerBtn.offsetHeight + 6 : (header ? header.offsetHeight : 32);
    headerH = Math.max(28, Math.min(headerH, 40));
    if (header) {
      header.style.minHeight = '0';
      page.style.gridTemplateRows = headerH + 'px auto 1fr';
    }

    var bodyH = Math.max(120, avail - headerH - 4);
    var zone2 = page.querySelector('.bom-zone-2-scroll');
    var zone3row = page.querySelector('.bom-charts-row-quad');
    var zone3scroll = page.querySelector('.bom-charts-unified-scroll');
    var needMid = 72;
    if (zone2) needMid = Math.max(needMid, zone2.scrollHeight + 6);
    if (zone3row) needMid = Math.max(needMid, zone3row.offsetHeight + 8);
    else if (zone3scroll) needMid = Math.max(needMid, zone3scroll.offsetHeight + 8);
    var midCap = Math.max(88, Math.floor(bodyH * 0.34));
    var midH = Math.max(68, Math.min(midCap, needMid));
    var botH = Math.max(80, bodyH - midH - 4);

    page.style.display = 'grid';
    page.style.height = avail + 'px';
    page.style.maxHeight = avail + 'px';
    page.style.gridTemplateRows = headerH + 'px ' + midH + 'px ' + botH + 'px';

    if (zone3scroll) zone3scroll.scrollTop = 0;

    applyEbom(host, botH);
    applyView3d(host, botH);
  }

  function applyEbom(host, rowH) {
    var list = host.querySelector('.bom-zone-4 .bom-ebom-list');
    var tableWrap = host.querySelector('.bom-zone-4 .bom-table-wrap');
    var pager = host.querySelector('.bom-zone-4 .bom-table-pager');
    var head = host.querySelector('.bom-zone-4 .bom-ebom-head');
    if (!list || !tableWrap) return;
    var headH = head ? head.offsetHeight : 0;
    var listH = Math.max(48, rowH - headH - 4);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';
    var pagerH = pager ? pager.offsetHeight : 22;
    tableWrap.style.height = Math.max(40, listH - pagerH) + 'px';
    tableWrap.style.maxHeight = tableWrap.style.height;
  }

  function applyView3d(host, rowH) {
    var body = host.querySelector('.bom-zone-5 .bom-preview-body');
    if (!body) return;
    body.style.height = Math.max(56, rowH - 4) + 'px';
    body.style.maxHeight = body.style.height;
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var vp = viewport();

    host.style.height = vp.h + 'px';
    host.style.maxHeight = vp.h + 'px';
    host.style.overflow = 'hidden';
    host.style.padding = '0';
    host.style.margin = '0';

    applyMode(host, vp);
    applyPageGrid(host, vp);

    if (typeof ChartsManager !== 'undefined' && ChartsManager.scheduleResize) {
      ChartsManager.scheduleResize();
    }
  }

  function init() {
    if (bound) { apply(); return; }
    bound = true;
    apply();
    window.addEventListener('resize', apply);
    window.setTimeout(apply, 200);
    window.setTimeout(apply, 800);
  }

  return { init: init, apply: apply };
})();

;/* --- assets\js\ui\sync-banner.js --- */
/**
 * @file ui/sync-banner.js
 * Sprint 2.5 — banner honesto: modo (API/TSV/Cola) + contagem Explorer vs Dashboard.
 */
var SyncBanner = (function () {
  'use strict';

  var lastLoad = {
    loaderMode: '',
    refreshSource: '',
    partial: false,
    truncated: false,
    domFallback: false,
    expected: 0,
    diagnostic: null
  };

  function byId(id) {
    if (typeof byId3dx === 'function') return byId3dx(id);
    var root = window.__3DX_UI_ROOT__;
    if (root) {
      var el = root.querySelector('#' + id);
      if (el) return el;
    }
    return document.getElementById(id);
  }

  function clearLoad() {
    lastLoad.loaderMode = '';
    lastLoad.refreshSource = '';
    lastLoad.partial = false;
    lastLoad.truncated = false;
    lastLoad.domFallback = false;
    lastLoad.expected = 0;
    lastLoad.diagnostic = null;
  }

  function setLoadResult(res) {
    if (!res) return;
    lastLoad.loaderMode = res.loaderMode || res.mode || lastLoad.loaderMode;
    lastLoad.refreshSource = res.refreshSource || lastLoad.refreshSource;
    lastLoad.partial = !!res.partial;
    lastLoad.truncated = !!(res.meta && res.meta.truncated);
    lastLoad.domFallback =
      !!res.domFallback ||
      lastLoad.loaderMode === 'dom-fallback' ||
      String(res.mode || '').indexOf('mirror') >= 0 ||
      String(res.mode || '').indexOf('grid') >= 0;
    if (res.context && res.context.expectedCount > 0) {
      lastLoad.expected = res.context.expectedCount;
    }
    lastLoad.diagnostic = res.diagnostic || (res.meta && res.meta.apiDiagnostics) || null;
  }

  function parseExplorerCount() {
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
      var ctx = ExplorerContext.refresh(true);
      if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    }
    if (typeof ProductExplorerBridge === 'undefined') return null;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.getExplorerObjectCount) {
      var objN = ProductExplorerBridge.getExplorerObjectCount();
      if (objN > 0) return objN;
    }
    if (ProductExplorerBridge.getExplorerSelectionCount) {
      var n = ProductExplorerBridge.getExplorerSelectionCount();
      if (n > 0) return n;
    }
    return null;
  }

  function modeLabel(mode) {
    mode = String(mode || '').toLowerCase();
    if (mode === 'api') return 'API';
    if (mode === 'tsv' || mode.indexOf('explorer') >= 0 || mode === 'text') return 'TSV';
    if (mode === 'paste' || mode === 'cola' || mode.indexOf('clipboard') >= 0 || mode.indexOf('ctrl') >= 0) {
      return 'Cola';
    }
    if (mode === 'dom-fallback' || mode.indexOf('mirror') >= 0 || mode.indexOf('grid') >= 0) {
      return 'DOM';
    }
    if (mode === 'builtin-last' || mode === 'snapshot-file') return 'Snapshot';
    return mode ? mode.toUpperCase() : '';
  }

  function dashboardQuality() {
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.assessMirrorQuality) {
      return { ok: true, badRows: 0 };
    }
    if (typeof BomService === 'undefined' || !BomService.getFlatItems) {
      return { ok: true, badRows: 0 };
    }
    return ProductExplorerBridge.assessMirrorQuality(BomService.getFlatItems());
  }

  function countLine(mode, dash, explorer) {
    var line = mode || 'Import';
    if (explorer > 0 && explorer === dash + 1) {
      return line + ' ' + dash + ' filhos + raiz (' + explorer + ' no Explorer)';
    }
    line += ' ' + dash;
    if (explorer > 0) line += '/' + explorer;
    return line;
  }

  function update(dashboardCount) {
    var el = byId('syncBanner');
    if (!el) return;

    var explorer = parseExplorerCount();
    if (!explorer && lastLoad.expected > 0) explorer = lastLoad.expected;
    if (!explorer && typeof FileImportService !== 'undefined' && FileImportService.getImportReport) {
      var rep = FileImportService.getImportReport();
      if (rep && rep.explorerExpected > 0) explorer = rep.explorerExpected;
    }

    var dash = dashboardCount || 0;
    if (typeof BomService !== 'undefined' && BomService.getNodeCount && BomService.getNodeCount() > 0) {
      dash = BomService.getNodeCount();
    }

    var mode = modeLabel(lastLoad.loaderMode);

    if (!explorer && dash < 1) {
      el.className = 'bom-sync-banner bom-sync-info';
      el.innerHTML =
        'Nenhuma estrutura carregada. Abra o Product Structure Explorer ao lado e clique ' +
        '<strong>Atualizar estrutura</strong>.';
      return;
    }

    if (!explorer && dash > 0) {
      el.className = 'bom-sync-banner bom-sync-ok';
      el.innerHTML =
        (mode ? '<strong>' + mode + '</strong> ' : '') +
        'Dashboard: <strong>' + dash + '</strong> peças.';
      return;
    }

    var quality = dashboardQuality();
    var diff = explorer > 0 ? Math.abs(explorer - dash) : 0;
    var partial = lastLoad.partial || (explorer > 0 && dash < explorer - 1);

    if (lastLoad.domFallback) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>DOM espelho (fallback)</strong> ' + countLine(mode || 'DOM', dash, explorer) +
        ' — dados podem estar incompletos; prefira <strong>API</strong> ou <strong>TSV</strong>.';
      return;
    }

    if (lastLoad.truncated) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>' + countLine(mode || 'API', dash, explorer) + '</strong>' +
        ' — estrutura truncada (limite BOM_MAX_NODES). Filtre ou aumente o limite.';
      return;
    }

    if (partial) {
      if (mode === 'API') {
        var diag = lastLoad.diagnostic || {};
        var diagText =
          ' Raiz: ' + (diag.rootPhysicalId || '-') +
          ' · pais consultados: ' + (diag.parentRequests || 0) +
          ' · refs: ' + (diag.resolvedReferences || 0) +
          ' · instâncias sem referência: ' + (diag.unresolvedInstances || 0) +
          ' · ocorrências preservadas: ' + (diag.duplicateRowsPreserved || 0) +
          (diag.lastError ? ' · erro: ' + diag.lastError : '');
        el.className = 'bom-sync-banner bom-sync-info';
        el.innerHTML =
          '<strong>API ' + dash + '/' + explorer + '</strong>' +
          ' — carga parcial diagnosticada.' + diagText;
        return;
      }
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>Parcial ' + dash + '/' + explorer + '</strong>' +
        (mode ? ' (' + mode + ')' : '') +
        ' — expanda todos os níveis no Explorer ou use <strong>API</strong>. ' +
        'Clique <strong>Atualizar estrutura</strong>.';
      return;
    }

    if (!quality.ok && quality.badRows > 0) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>' + countLine(mode, dash, explorer) + '</strong>' +
        ' — contagem ' + (diff === 0 ? 'OK' : 'difere') +
        ', mas <strong>' + quality.badRows + '</strong> linha(s) com colunas erradas.';
      return;
    }

    if (explorer > 0 && diff <= 1) {
      el.className = 'bom-sync-banner bom-sync-ok';
      var autoTag =
        lastLoad.refreshSource === 'auto' ? ' · <span class="bom-sync-auto">sync auto</span>' : '';
      el.innerHTML =
        '<strong>' + countLine(mode || 'TSV', dash, explorer) + '</strong> — sincronizado' + autoTag;
      return;
    }

    el.className = 'bom-sync-banner bom-sync-warn';
    el.innerHTML =
      'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
      '</strong>' +
      (mode ? ' · modo <strong>' + mode + '</strong>' : '') +
      ' — diferença de <strong>' + diff +
      '</strong>. Clique <strong>Atualizar estrutura</strong>.';
  }

  return {
    update: update,
    setLoadResult: setLoadResult,
    clearLoad: clearLoad,
    parseExplorerCount: parseExplorerCount
  };
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
 * Tabela E-BOM — thumbnails, scroll, clique → preview.
 */
var DataTable = (function () {
  'use strict';

  var tbody;
  var thead;
  var tableEl;
  var data = [];
  var scrollContainer;
  var columns = [];
  var rowSelectHandler = null;
  var selectedIndex = -1;
  var MAX_ROWS = 8000;

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function getColumns() {
    if (APP_CONFIG.UI_CLEAN && APP_CONFIG.PILOT_TABLE_COLUMNS && APP_CONFIG.PILOT_TABLE_COLUMNS.length) {
      return APP_CONFIG.PILOT_TABLE_COLUMNS;
    }
    return APP_CONFIG.PRODUCT_EXPLORER_COLUMNS || [];
  }

  function uiContains(el) {
    if (!el) return false;
    var root = uiRoot();
    return root === el || (root.contains && root.contains(el));
  }

  function init(tableSelector) {
    columns = getColumns();
    var sel = tableSelector || '#bomTable';
    tableEl = uiRoot().querySelector(sel);
    if (!tableEl) return;
    tbody = tableEl.querySelector('tbody');
    thead = tableEl.querySelector('thead tr');
    scrollContainer = tableEl.closest('.bom-table-wrap') || tableEl.parentElement;
    renderHeader();
    bindRowClicks();
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'scroll';
      scrollContainer.style.overflowX = 'auto';
      scrollContainer.style.webkitOverflowScrolling = 'touch';
    }
  }

  function onRowSelect(handler) {
    rowSelectHandler = handler;
  }

  function highlightRow(index) {
    if (!syncTableRefs() || !tbody) return;
    selectedIndex = index;
    tbody.querySelectorAll('tr.bom-row-selected').forEach(function (r) {
      r.classList.remove('bom-row-selected');
    });
    var tr = tbody.querySelector('tr[data-row-index="' + index + '"]');
    if (tr) {
      tr.classList.add('bom-row-selected');
      if (tr.scrollIntoView) {
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function selectRow(index, silent) {
    if (!data.length || index < 0 || index >= data.length) return null;
    highlightRow(index);
    if (!silent && rowSelectHandler) rowSelectHandler(data[index]);
    return data[index];
  }

  function selectFirst(silent) {
    return selectRow(0, silent);
  }

  function syncTableRefs() {
    var el = uiRoot().querySelector('#bomTable');
    if (!el) return false;
    if (el !== tableEl) {
      tableEl = el;
      tbody = tableEl.querySelector('tbody');
      thead = tableEl.querySelector('thead tr');
      scrollContainer = tableEl.closest('.bom-table-wrap') || tableEl.parentElement;
    }
    return !!(tableEl && tbody);
  }

  function handleRowPointer(ev) {
    if (!ev || !ev.target || !ev.target.closest) return;
    if (!syncTableRefs()) return;
    var tr = ev.target.closest('tr.bom-table-row[data-row-index]');
    if (!tr || !tbody || !tbody.contains(tr)) return;
    var idx = parseInt(tr.getAttribute('data-row-index'), 10);
    if (isNaN(idx)) return;
    if (ev.type === 'click' || ev.type === 'pointerup') {
      if (ev.button != null && ev.button !== 0) return;
    }
    selectRow(idx, false);
  }

  function exposeRowPicker() {
    var root = typeof window !== 'undefined' ? window : null;
    if (!root) return;
    root.__bomPickRow = function (idx) {
      var n = parseInt(idx, 10);
      if (isNaN(n)) return;
      selectRow(n, false);
    };
  }

  function bindRowClicks() {
    syncTableRefs();
    exposeRowPicker();
    var root = uiRoot();
    if (!root || !root.addEventListener) return;
    if (root.__3DX_ROW_HANDLER__) {
      root.removeEventListener('click', root.__3DX_ROW_HANDLER__, true);
      root.removeEventListener('pointerup', root.__3DX_ROW_HANDLER__, true);
    }
    root.__3DX_ROW_HANDLER__ = handleRowPointer;
    root.__3DX_ROW_ROOT_BOUND__ = true;
    root.addEventListener('click', handleRowPointer, true);
    root.addEventListener('pointerup', handleRowPointer, true);
    if (scrollContainer && !scrollContainer.__3DX_ROW_BOUND__) {
      scrollContainer.__3DX_ROW_BOUND__ = true;
      scrollContainer.addEventListener('pointerup', handleRowPointer);
      scrollContainer.addEventListener('click', handleRowPointer);
    }
  }

  function renderHeader() {
    if (!thead) return;
    thead.innerHTML = '';
    columns.forEach(function (c) {
      var th = document.createElement('th');
      if (c.format === 'thumb') th.className = 'bom-col-thumb';
      th.textContent = c.label || '';
      thead.appendChild(th);
    });
  }

  function maturityLabel(n) {
    return String(n.maturity || n.state || '').trim();
  }

  function formatCell(n, col) {
    if (col.format === 'thumb' || col.key === '_thumb') {
      if (typeof PartImage !== 'undefined') return PartImage.thumbHtml(n, 'bom-thumb-md');
      return '<span class="bom-thumb-wrap bom-thumb-md"><span class="bom-thumb-fallback">?</span></span>';
    }
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
    if (!tbody || !tableEl || !uiContains(tableEl)) {
      init('#bomTable');
    }
    if (selectedIndex >= data.length) selectedIndex = -1;
    render();
  }

  function render() {
    if (!tbody) return;
    var slice = data.slice(0, MAX_ROWS);
    if (!slice.length) {
      selectedIndex = -1;
      tbody.innerHTML =
        '<tr><td colspan="' + (columns.length || 1) + '" class="bom-table-empty">' +
        'Nenhuma linha. Abra uma estrutura no Product Structure Explorer e clique Atualizar estrutura.</td></tr>';
      return;
    }
    tbody.innerHTML = slice.map(function (n, idx) {
      var tds = columns.map(function (col) {
        var tdCls = col.format === 'thumb' ? ' class="bom-col-thumb"' : '';
        return '<td' + tdCls + '>' + formatCell(n, col) + '</td>';
      }).join('');
      var sel = selectedIndex === idx ? ' bom-row-selected' : '';
      return (
        '<tr class="bom-table-row' + sel + '" data-row-index="' + idx + '" data-id="' +
        escapeAttr(n.physicalid) + '" tabindex="0" role="row"' +
        ' onclick="window.__bomPickRow&&window.__bomPickRow(' + idx + ')"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.__bomPickRow&&window.__bomPickRow(' + idx + ');}">' +
        tds + '</tr>'
      );
    }).join('');
    if (typeof PartImage !== 'undefined' && PartImage.hydrateThumbs) {
      PartImage.hydrateThumbs(tbody);
    }
    bindRowClicks();
    if (selectedIndex >= 0) highlightRow(selectedIndex);
  }

  function maturityStatusBadge(matCls, raw) {
    var r = String(raw || '').trim();
    if (!r) return { text: 'Sem maturidade', cls: 'status-neutral' };
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
        if (col.format === 'thumb') return;
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
    onRowSelect: onRowSelect,
    selectRow: selectRow,
    selectFirst: selectFirst,
    getSelectedIndex: function () { return selectedIndex; },
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
    if (overlay) overlay.classList.toggle('bom-hidden', !on);
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
  var lastFailedSyncKey = null;
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
    var selLbl = byId('selectionLabel');
    if (tableLbl && pname !== '-') {
      tableLbl.textContent = pname;
      tableLbl.setAttribute('title', pname);
    }
    if (selLbl && pname !== '-') {
      selLbl.textContent = pname;
      selLbl.setAttribute('title', pname);
    }
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
    if (typeof SyncBanner !== 'undefined' && SyncBanner.update) {
      SyncBanner.update(BomService.getNodeCount() || flat.length || metrics.totalItems || 0);
    }
  }

  var tableInitialized = false;

  function refreshUI() {
    if (typeof KpiCards !== 'undefined' && KpiCards.init && byId('kpiGrid')) {
      KpiCards.init('#kpiGrid');
    }
    if (typeof DataTable !== 'undefined' && DataTable.init && byId('bomTable')) {
      DataTable.init('#bomTable');
    }
    if (typeof PartPreview !== 'undefined') PartPreview.init('#partPreviewPanel');
    var index = BomService.getIndex();
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyOwnersToIndex) {
      ProductExplorerBridge.applyOwnersToIndex(index);
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyExplorerPresentationToIndex) {
      ProductExplorerBridge.applyExplorerPresentationToIndex(index);
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyOwnersToIndex) {
      ProductExplorerBridge.applyOwnersToIndex(index);
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.applyPrdToIndex) {
      window.setTimeout(function () {
        ProductExplorerBridge.applyPrdToIndex(BomService.getIndex());
      }, 0);
    }
    var rootId = BomService.getRootId();
    var flat = BomNormalizer.toFlatList(index, rootId);
    Filters.populateTypeOptions(flat);
    var filtered = Filters.apply(flat);

    currentMetrics = MetricsEngine.computeFromFlat(filtered);
    currentAnomalies = AnomalyDetector.detect(index);

    KpiCards.render(currentMetrics, currentAnomalies);
    if (APP_CONFIG.SHOW_CHARTS !== false) {
      ChartsManager.destroyAll();
      ChartsManager.render(currentMetrics);
    }
    if (APP_CONFIG.SHOW_TREE !== false && byId('bomTree') && typeof BomTree !== 'undefined') {
      BomTree.refresh(index, rootId);
    }
    DataTable.setData(filtered);
    DataTable.onRowSelect(function (node) {
      if (typeof PartPreview !== 'undefined') PartPreview.show(node);
    });
    if (filtered.length) {
      var si = typeof DataTable.getSelectedIndex === 'function' ? DataTable.getSelectedIndex() : -1;
      if (si >= 0 && si < filtered.length && typeof DataTable.selectRow === 'function') {
        DataTable.selectRow(si, false);
      } else if (typeof DataTable.selectFirst === 'function') {
        DataTable.selectFirst(false);
      }
    } else if (typeof PartPreview !== 'undefined') {
      PartPreview.clear();
    }
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
    if (typeof LayoutFit !== 'undefined') LayoutFit.apply();
    repairUiMojibake();
    window.setTimeout(function () {
      if (typeof LayoutFit !== 'undefined') LayoutFit.apply();
    }, 350);
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
    if (!APP_CONFIG.DOM_MIRROR_FALLBACK || APP_CONFIG.DOM_MIRROR_FALLBACK === false) {
      return Promise.resolve(false);
    }
    var expected = 0;
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
      var ctx = ExplorerContext.refresh(true);
      if (ctx && ctx.expectedCount > 0) expected = ctx.expectedCount;
    }
    if (!expected && typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
      expected = ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    var minComplete = (APP_CONFIG && APP_CONFIG.API_PREFER_ABOVE) || 20;
    if (expected >= minComplete) {
      return Promise.resolve(false);
    }
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.scanViaDomMirrorFallback) {
      return ExplorerScanner.scanViaDomMirrorFallback(structureName, expected).then(function (res) {
        applyOrchestratorResult(res);
        setStatus(res.message || 'DOM espelho (fallback).', 'warn');
        return true;
      }).catch(function () {
        return false;
      });
    }
    return Promise.resolve(false);
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

  function applyOrchestratorResult(res, opts) {
    opts = opts || {};
    APP_CONFIG.DEMO_MODE = false;
    var loader = (res && res.loaderMode) || (res && res.mode) || '';
    APP_CONFIG.IMPORT_MODE = loader !== 'api';
    if (res && res.meta) {
      lastLoadedId = res.meta.rootPhysicalId;
      if (opts.updateLabel !== false) {
        var lbl = byId('selectionLabel');
        if (lbl && res.meta.productName) lbl.textContent = res.meta.productName;
      }
    }
    if (typeof SyncBanner !== 'undefined' && SyncBanner.setLoadResult) {
      SyncBanner.setLoadResult(res);
    }
    if (opts.updateClock) updateLastUpdateClock();
    refreshUI();
    if (opts.layoutFit && typeof LayoutFit !== 'undefined') LayoutFit.apply();
  }

  function hasPasteBufferForSync() {
    var text = '';
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      text = ExplorerScanner.getPasteBuffer() || '';
    }
    if (!text) {
      var area = byId('pasteArea');
      if (area && area.value) text = String(area.value);
    }
    text = String(text || '').trim();
    return text.indexOf('\t') >= 0 && text.split(/\r?\n/).filter(function (l) {
      return l.trim();
    }).length >= 2;
  }

  function syncOpenExplorerStructure(force, reason) {
    if (root.__3DX_BLOCK_AUTO_SYNC__) return;
    if (!force && reason === 'poll' && (APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0) < 1) return;

    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      ProductExplorerBridge.pollStructureHint();
      ProductExplorerBridge.pollSelection();
    }
    var ctx =
      typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh
        ? ExplorerContext.refresh(true)
        : null;
    var hint = ctx ? ctx.rootName : (
      typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
        ? ProductExplorerBridge.getStructureNameHint()
        : null
    );
    var explorerCount = ctx ? ctx.expectedCount : (
      typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount
        ? ProductExplorerBridge.getExplorerObjectCount() || 0
        : 0
    );
    var key = hint || '';
    if (!key && !explorerCount) return;
    var syncKey = ctx ? ctx.syncKey : (key || 'explorer') + '|' + explorerCount;
    var label = byId('selectionLabel');
    if (label && key) label.textContent = key;

    if (!force) {
      if (key || explorerCount) {
        setStatus(
          'Estrutura detectada' +
            (key ? ': ' + key : '') +
            (explorerCount ? ' (' + explorerCount + ' objetos)' : '') +
            ' — expanda no Explorer e clique Atualizar estrutura.',
          'info'
        );
      }
      return;
    }

    if (typeof BomOrchestrator === 'undefined' || !BomOrchestrator.refreshStructure) return;

    var dashCount =
      typeof BomService !== 'undefined' && BomService.getNodeCount ? BomService.getNodeCount() : 0;
    var slack = explorerCount >= 40 ? 3 : explorerCount >= 15 ? 2 : 1;
    var countMismatch =
      explorerCount > 0 &&
      dashCount > 0 &&
      Math.abs(dashCount - explorerCount) > slack;
    var structureChanged = syncKey !== lastSyncedStructure;
    var autoRefreshOn =
      force && APP_CONFIG.AUTO_REFRESH_ON_STRUCTURE_CHANGE !== false;

    if (
      structureChanged &&
      lastSyncedStructure &&
      typeof BomService !== 'undefined' &&
      BomService.getNodeCount &&
      ctx &&
      ctx.expectedCount > 0
    ) {
      var staleCount = BomService.getNodeCount();
      if (staleCount > 0 && Math.abs(staleCount - ctx.expectedCount) > slack) {
        BomService.reset();
        refreshUI();
        if (typeof SyncBanner !== 'undefined' && SyncBanner.clearLoad) SyncBanner.clearLoad();
        setStatus(
          'Nova estrutura detectada (' +
            (ctx.rootName || key) +
            ', ' +
            ctx.expectedCount +
            ' peças) — carregando…',
          'info'
        );
      }
    }

    if (!force) {
      if (!autoRefreshOn && reason !== 'context') return;
      if (!structureChanged && !countMismatch) return;
      if (syncKey === lastSyncedStructure && !countMismatch) return;
      if (syncKey === lastFailedSyncKey) return;
      var skipAutoLarge =
        (APP_CONFIG.AUTO_SYNC_REQUIRE_PASTE_ABOVE || 12) &&
        explorerCount > (APP_CONFIG.AUTO_SYNC_REQUIRE_PASTE_ABOVE || 12) &&
        dashCount < 1 &&
        !hasPasteBufferForSync();
      if (skipAutoLarge) {
        if (reason === 'context' || structureChanged) {
          setStatus(
            'Drone/SKA: expanda a árvore no Explorer → Ctrl+A → Ctrl+C → Atualizar estrutura.',
            'info'
          );
        }
        return;
      }
    }
    if (loading && !force) return;
    if (structureSyncTimer) window.clearTimeout(structureSyncTimer);

    var isManual = !!force;
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var allowAutoCopy =
      isManual ||
      (APP_CONFIG.AUTO_SYNC_ALLOW_COPY !== false &&
        explorerCount > 0 &&
        explorerCount <= maxTsv);
    var preferApiManual =
      isManual &&
      ctx &&
      ctx.canUseApi &&
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH !== false;
    var preferApiAuto = false;

    structureSyncTimer = window.setTimeout(function () {
      if (force) setLoading(true);
      if (force) setStatus('Atualizando estrutura' + (key ? ': ' + key : '') + '…', 'info');
      else if (structureChanged) {
        setStatus('Sync Explorer: ' + (key || 'estrutura') + '…', 'info');
      }
      BomOrchestrator.refreshStructure({
        source: isManual ? 'manual' : 'auto',
        allowAutoCopy: allowAutoCopy,
        preferApi: preferApiManual || preferApiAuto
      })
        .then(function (res) {
          lastSyncedStructure = syncKey;
          lastFailedSyncKey = null;
          applyOrchestratorResult(res);
          var n =
            typeof BomService !== 'undefined' && BomService.getNodeCount
              ? BomService.getNodeCount()
              : 0;
          var tag = isManual ? '' : ' (sync auto)';
          setStatus(
            res.message || ('Atualizado: ' + n + ' itens' + tag),
            res.partial || res.domFallback ? 'warn' : 'ok'
          );
        })
        .catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err);
          if (!isManual) lastFailedSyncKey = syncKey;
          if (typeof SyncBanner !== 'undefined' && SyncBanner.clearLoad) SyncBanner.clearLoad();
          if (typeof BomService !== 'undefined' && BomService.getNodeCount() > 0) {
            refreshUI();
          }
          if (!isManual && /Ctrl\+C|cola|clipboard|TSV|grade|parcial/i.test(msg)) {
            setStatus(
              'Sync automático incompleto — expanda a árvore, Ctrl+C na grade, depois Atualizar estrutura.',
              'warn'
            );
            return;
          }
          var short = msg;
          if (short.length > 220) short = short.slice(0, 220) + '…';
          setStatus(short, isManual ? 'error' : 'warn');
        })
        .finally(function () {
          if (force) setLoading(false);
        });
    }, APP_CONFIG.STRUCTURE_SYNC_DEBOUNCE_MS || 2200);
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
      syncOpenExplorerStructure(false, 'context');
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

  function runApiDiagnostic(btnEl) {
    if (typeof ApiDiagnostic === 'undefined' || !ApiDiagnostic.run) {
      setStatus('Diagnóstico API indisponível neste build.', 'error');
      return;
    }
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Diagnosticando…';
    }
    setStatus('Diagnóstico API ENOVIA…', 'info');
    ApiDiagnostic.run()
      .then(function (report) {
        var box = byId('apiDiagReport');
        if (box) {
          box.value = report.summary || '';
          box.classList.remove('bom-hidden');
        }
        var fails = (report.rows || []).filter(function (r) {
          return !r.ok;
        });
        setStatus(
          fails.length
            ? 'Diagnóstico: ' + fails.length + ' falha(s) — veja Avançado'
            : 'Diagnóstico API OK — tente Atualizar estrutura',
          fails.length ? 'error' : 'ok'
        );
        console.log('[BOM API DIAG]', report);
      })
      .catch(function (err) {
        setStatus('Diagnóstico: ' + (err.message || err), 'error');
      })
      .finally(function () {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Diagnosticar API';
        }
      });
  }

  function runImportFromClipboard(btnEl) {
    if (typeof BomOrchestrator === 'undefined' || !BomOrchestrator.refreshStructure) {
      setStatus('Importação indisponível.', 'error');
      return;
    }
    if (loading) return;
    setLoading(true);
    setStatus('Lendo Explorer…', 'info');
    root.__3DX_BLOCK_AUTO_SYNC__ = true;
    root.__3DX_ALLOW_API__ = false;
    lastSyncedStructure = null;
    lastFailedSyncKey = null;
    if (typeof SyncBanner !== 'undefined' && SyncBanner.clearLoad) SyncBanner.clearLoad();
    if (typeof BomService !== 'undefined' && BomService.reset) {
      BomService.reset();
      refreshUI();
    }
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    }
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Atualizando…';
    }
    function startRefresh() {
      var expected = 0;
      if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
        expected = ExplorerContext.refresh(true).expectedCount || 0;
      }
      return BomOrchestrator.refreshStructure({
        source: 'manual',
        forceLoader: 'paste',
        allowAutoCopy: false,
        preferApi: false,
        allowPartial: false,
        allowFallback: false
      });
    }
    function primePasteBuffer() {
      if (APP_CONFIG && APP_CONFIG.PASTE_TRAP_ENABLED !== true) {
        return Promise.resolve();
      }
      if (
        typeof ProductExplorerBridge === 'undefined' ||
        !ProductExplorerBridge.tryReadClipboardViaPasteTrap
      ) {
        return Promise.resolve();
      }
      return ProductExplorerBridge.tryReadClipboardViaPasteTrap().then(function (text) {
        text = String(text || '').trim();
        if (text && typeof ExplorerScanner !== 'undefined' && ExplorerScanner.setPasteBuffer) {
          ExplorerScanner.setPasteBuffer(text);
        }
        var area = byId('pasteArea');
        if (text && area) area.value = text;
      });
    }
    Promise.resolve()
      .then(function () {
        return primePasteBuffer();
      })
      .then(function () {
        return startRefresh();
      })
      .then(function (res) {
        applyOrchestratorResult(res, { updateClock: true, layoutFit: true });
        lastSyncedStructure =
          typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh
            ? ExplorerContext.refresh(true).syncKey
            : null;
        setStatus(res.message || 'Importação concluída.', res.partial || res.domFallback ? 'warn' : 'ok');
      })
      .catch(function (err) {
        if (typeof SyncBanner !== 'undefined' && SyncBanner.clearLoad) SyncBanner.clearLoad();
        if (typeof BomService !== 'undefined' && BomService.getNodeCount() > 0) {
          refreshUI();
        }
        setStatus('Importação: ' + (err.message || err), 'error');
        var area = byId('pasteArea');
        var details = document.querySelector('.bom-topbar-more') || document.querySelector('.bom-sidebar-more');
        if (details && !details.open) details.open = true;
        if (area) {
          area.focus();
          area.placeholder = 'Cole aqui com Ctrl+V (Explorer → Ctrl+A → Ctrl+C) e clique Importar de novo';
        }
      })
      .finally(function () {
        root.__3DX_ALLOW_API__ = false;
        root.__3DX_BLOCK_AUTO_SYNC__ = false;
        setLoading(false);
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = (APP_CONFIG && APP_CONFIG.IMPORT_BUTTON_LABEL) || 'Atualizar estrutura';
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

  function bindPasteCapture() {
    var host = root.__3DX_UI_ROOT__ || document.body;
    if (!host || host.__3DX_PASTE_BOUND__) return;
    host.__3DX_PASTE_BOUND__ = true;
    host.addEventListener('paste', function (e) {
      var text = e.clipboardData ? e.clipboardData.getData('text/plain') || '' : '';
      if (!text || !String(text).trim()) return;
      if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.setPasteBuffer) {
        ExplorerScanner.setPasteBuffer(text);
      }
      var area = byId('pasteArea');
      if (area) area.value = text;
      setStatus('Dados colados — clique Atualizar estrutura para carregar.', 'info');
    });
  }

  function initUI() {
    applyUrlParamsToUI();
    KpiCards.init('#kpiGrid');
    ChartsManager.init();
    if (typeof PartPreview !== 'undefined') PartPreview.init('#partPreviewPanel');
    DataTable.init('#bomTable');
    tableInitialized = true;
    DataTable.onRowSelect(function (node) {
      if (typeof PartPreview !== 'undefined') PartPreview.show(node);
    });
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
    bindPasteCapture();
    if (typeof LayoutFit !== 'undefined') LayoutFit.init();

    var importBtn = byId('btnImportPaste');
    if (importBtn && APP_CONFIG.IMPORT_BUTTON_LABEL) {
      importBtn.textContent = APP_CONFIG.IMPORT_BUTTON_LABEL;
    }

    var buildTag = byId('buildTag');
    if (buildTag) {
      var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
      var showBuild =
        APP_CONFIG.SHOW_BUILD_TAG === true || q.debug === '1' || q.debug === 'true';
      buildTag.classList.toggle('bom-hidden', !showBuild);
    }

    var chartsSection = byId('chartsSection');
    if (chartsSection) {
      if (APP_CONFIG.CHARTS_EXPANDED === true) {
        chartsSection.setAttribute('open', 'open');
      } else {
        chartsSection.removeAttribute('open');
      }
      if (!chartsSection.__3DX_CHARTS_TOGGLE__) {
        chartsSection.__3DX_CHARTS_TOGGLE__ = true;
        chartsSection.addEventListener('toggle', function () {
          if (typeof LayoutFit !== 'undefined') LayoutFit.apply();
          if (typeof ChartsManager !== 'undefined' && ChartsManager.scheduleResize) {
            ChartsManager.scheduleResize();
          }
        });
      }
    }

    if (typeof SyncBanner !== 'undefined' && SyncBanner.update) {
      SyncBanner.update(0);
    }

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
        var area = byId('pasteArea');
        var pasted = area && area.value ? String(area.value).trim() : '';
        if (pasted.indexOf('\t') >= 0) {
          runImportFromClipboard(btnLoadId);
          return;
        }
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

    var btnApiDiag = byId('btnApiDiagnostic');
    if (btnApiDiag && !btnApiDiag.__3DX_DIAG_BOUND__) {
      btnApiDiag.__3DX_DIAG_BOUND__ = true;
      btnApiDiag.addEventListener('click', function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        var details = document.querySelector('.bom-topbar-more');
        if (details && !details.open) details.open = true;
        runApiDiagnostic(btnApiDiag);
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

  function repairUiMojibake() {
    if (typeof FileImportService === 'undefined' || !FileImportService.fixMojibake) return;
    var fix = FileImportService.fixMojibake;
    var root = window.__3DX_UI_ROOT__ || document.body;
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(
      '.bom-chart-heading, .bom-filter-item > span, .bom-ebom-head h2, .bom-st, ' +
      '.bom-table-pager, .bom-preview-hint, .bom-loading, .bom-sync-banner, summary, label span, h2, h3, p'
    ).forEach(function (el) {
      var t = el.textContent;
      if (t && t.indexOf('Ã') >= 0) el.textContent = fix(t);
    });
    root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(function (el) {
      ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && v.indexOf('Ã') >= 0) el.setAttribute(attr, fix(v));
      });
    });
    var hMat = root.querySelector('.bom-chart-panel .bom-chart-heading');
    var hOwn = root.querySelector('.bom-chart-owners .bom-chart-heading');
    if (hMat) hMat.textContent = 'Sa\u00fade da Maturidade';
    if (hOwn) hOwn.textContent = 'Propriet\u00e1rios';
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
    repairUiMojibake();
    var base = spaceUrl && spaceUrl !== 'demo' ? spaceUrl : getTenantSpaceUrl();
    if (base) {
      try {
        EnoviaApi.init(base);
        if (typeof SearchApi !== 'undefined') SearchApi.init(base);
      } catch (e) { /* */ }
    }
    ProductExplorerBridge.init();
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
      ExplorerContext.refresh(true);
    }
    ProductExplorerBridge.subscribe(onSelection);
    if (ProductExplorerBridge.subscribeStructure) {
      ProductExplorerBridge.subscribeStructure(function (name) {
        syncOpenExplorerStructure(false, 'context');
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
      if (root.__3DX_BLOCK_AUTO_SYNC__ || loading) return;
      try {
        if (document.hidden) return;
      } catch (eHidden) { /* */ }
      pullExplorerSelection();
      syncOpenExplorerStructure(false, 'poll');
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

  /** Additional App injeta UWA/require; aguarda antes de assumir GitHub Pages sem API. */
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
          pollExplorerStructureLabel();
          setStatus('Abra/expanda a montagem no Explorer e clique Atualizar estrutura.', 'info');
        } else if (APP_CONFIG.CAN_USE_ENOVIA_API) {
          pollExplorerStructureLabel();
          setStatus('Abra/expanda a montagem no Explorer e clique Atualizar estrutura.', 'info');
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
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var verified = CompassServices.getVerifiedSpaceUrl();
      if (verified) return verified;
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
      return CompassServices.tenantSpaceUrl ? CompassServices.tenantSpaceUrl() : null;
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
      setStatus('Pronto — abra/expanda a montagem no Explorer e clique Atualizar estrutura.', 'info');
      return;
    }
    if (APP_CONFIG.CAN_USE_ENOVIA_API) {
      pollExplorerStructureLabel();
      setStatus('Pronto — abra/expanda a montagem no Explorer e clique Atualizar estrutura.', 'info');
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
      'Selecione/expanda a raiz no Product Explorer e clique Atualizar estrutura.',
      'info'
    );
    if (APP_CONFIG.EXPLORER_FALLBACK_MS === 0) return;
    window.setTimeout(function () {
      if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
        pollExplorerStructureLabel();
        setStatus('Pronto — clique Atualizar estrutura para carregar.', 'info');
        return;
      }
      if (APP_CONFIG.CAN_USE_ENOVIA_API) {
        pollExplorerStructureLabel();
        setStatus('Pronto — clique Atualizar estrutura para carregar.', 'info');
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
    setStatus('BOM Analytics v' + (APP_CONFIG.BUILD || APP_CONFIG.VERSION) + ' — pronto', 'info');
    try {
      initAppCore(getTenantSpaceUrl());
    } catch (eCore) {
      try {
        initAppCore(null);
      } catch (eCore2) { /* */ }
    }

    var chain = PlatformContext.init();
    if (typeof WafBootstrap !== 'undefined') {
      chain = WafBootstrap.ensure()
        .then(function () {
          return PlatformContext.init();
        })
        .catch(function (wafErr) {
          console.warn('WAF opcional:', wafErr);
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
        if (space) {
          try {
            EnoviaApi.init(space);
            if (typeof SearchApi !== 'undefined') SearchApi.init(space);
          } catch (eApi) { /* */ }
          return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
        }
        return null;
      })
      .then(function () {
        if (APP_CONFIG.SNAPSHOT_URL) {
          return tryLoadSnapshotFirst().then(function () {
            if (BomService.getNodeCount() > 1) return;
            trySyncThenLoad();
          });
        }
        trySyncThenLoad();
        return null;
      })
      .catch(function (err) {
        console.warn('API background:', err);
        trySyncThenLoad();
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
        : APP_CONFIG.WIDGET_MODE === 'github_pages_no_api'
          ? 'GitHub Pages sem API ENOVIA'
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
    if (ov) ov.classList.add('bom-hidden');
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
