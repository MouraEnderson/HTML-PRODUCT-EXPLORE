/* BOM Analytics bundle snapshot */
;/* --- assets/js/embed-query.js --- */
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

;/* --- assets/js/config.js --- */
/**
 * @file config.js
 * ConfiguraÃƒÂ§ÃƒÂ£o central Ã¢â‚¬â€ ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.2.0',
    BUILD: 'bom20260621e',
    /** One operational path: bom-waf-session-controller-bom20260621e.js. */
    SESSION_CONTROLLER_ONLY: true,
    ACTIVE_ENTRYPOINT: 'widget-v3.html',
    /** DEC-016: explorer-mirror (principal) | expand-item (diagnóstico) | full-bom-api (alternativo) */
    DATA_SOURCE: 'wafdata-dseng-session-controller',
    EXPAND_ITEM_LEVELS: 2,
    /** Validação automática Expand Item ao abrir widget (14f: false) */
    AUTO_VALIDATE_EXPAND_ITEM: false,
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
    PILOT_FALLBACK_SNAPSHOT: false,
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
    ALLOW_PASTE_FALLBACK: false,
    /** Snapshot Mont10/Drone sÃƒÂ³ se grade e cola falharem */
    PILOT_BUILTIN_LAST: false,
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
    /** Atualizar estrutura e acionado pelo usuario; o botao pode acionar copia interna do Explorer. */
    SKIP_CLIPBOARD_READ: true,
    PASTE_TRAP_ENABLED: false,
    EXPLORER_AUTO_COPY_ENABLED: false,
    /** Fallback DOM manual só até N peças */
    DOM_MIRROR_MANUAL_MAX_EXPECTED: 1000,
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
    PRIMARY_LOADER: 'api',
    /** Additional App trusted: tentar API antes de TSV no Atualizar */
    PREFER_API_ON_MANUAL_REFRESH: false,
    /** Se espelho/auto-copy falhar no Atualizar, tentar API ENOVIA (WAFData) */
    MANUAL_API_FALLBACK: true,
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
      { key: 'name', label: 'T\u00edtulo' },
      { key: 'revision', label: 'Revis\u00e3o' },
      { key: 'owner', label: 'Propriet\u00e1rio' },
      { key: 'maturity', label: 'Estado de maturidade', format: 'status' },
      { key: 'displayType', label: 'Formato' },
      { key: 'title', label: 'Descri\u00e7\u00e3o' }
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

    /** Contrato oficial dseng para obter EngInstance com objeto referenciado. */
    DSENG: {
      ENG_INSTANCE_MASK: 'dsmveng:EngInstanceMask.Details',
      ENG_INSTANCE_FIELDS: 'dsmvcfg:attribute.hasConfiguredInstance',
      EXPAND_DEPTH: -1
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

;/* --- assets/js/platform/widget-runtime.js --- */
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
        if (global.__bomWafSessionController && global.__bomWafSessionController.refresh) {
          global.__bomWafSessionController.refresh().catch(function () {});
        }
      });
    } catch (e1) { /* */ }
    try {
      widget.addEvent('onLoad', function () {
        if (global.__bomWafSessionController && global.__bomWafSessionController.boot) {
          global.__bomWafSessionController.boot();
        }
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

;/* --- assets/js/platform/platform-bridge.js --- */
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

;/* --- assets/js/platform/context.js --- */
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

;/* --- assets/js/platform/compass.js --- */
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
    ensure3DSpaceServiceUrl: ensure3DSpaceServiceUrl,
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

;/* --- assets/js/platform/waf-bootstrap.js --- */
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

;/* --- assets/js/platform/waf-client.js --- */
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

;/* --- assets/js/integration/3dx-content-parser.js --- */
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

;/* --- assets/js/integration/enovia-api.js --- */
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

  function dsengCfg() {
    return (APP_CONFIG && APP_CONFIG.DSENG) || {};
  }

  function normalizeEngInstanceOptions(options) {
    if (typeof options === 'string') return { expand: options };
    return options || {};
  }

  function appendParam(params, key, value) {
    if (value === undefined || value === null || value === '') return;
    params.push(key + '=' + encodeURIComponent(value));
  }

  function engInstanceChildrenUrl(parentPhysicalId, skip, top, options) {
    ensureRestBase();
    options = normalizeEngInstanceOptions(options);
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    var cfg = dsengCfg();
    var params = [];
    appendParam(params, '$mva', 'true');
    appendParam(params, '$skip', skip);
    appendParam(params, '$top', top);
    if (options.mask !== false) {
      appendParam(params, '$mask', options.mask || cfg.ENG_INSTANCE_MASK || 'dsmveng:EngInstanceMask.Details');
    }
    if (options.fields !== false) {
      appendParam(params, '$fields', options.fields || cfg.ENG_INSTANCE_FIELDS || 'dsmvcfg:attribute.hasConfiguredInstance');
    }
    if (options.expand) appendParam(params, '$expand', options.expand);
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance?' + params.join('&')
    );
  }

  function engInstanceDetailUrl(parentPhysicalId, instanceId, options) {
    ensureRestBase();
    options = normalizeEngInstanceOptions(options);
    var m = APP_CONFIG.MODELERS;
    var cfg = dsengCfg();
    var params = [];
    appendParam(params, '$mva', 'true');
    if (options.mask !== false) {
      appendParam(params, '$mask', options.mask || cfg.ENG_INSTANCE_MASK || 'dsmveng:EngInstanceMask.Details');
    }
    if (options.fields !== false) {
      appendParam(params, '$fields', options.fields || cfg.ENG_INSTANCE_FIELDS || 'dsmvcfg:attribute.hasConfiguredInstance');
    }
    if (options.expand) appendParam(params, '$expand', options.expand);
    var url = (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(parentPhysicalId)) +
      '/dseng:EngInstance/' + encodeURIComponent(apiId(instanceId))
    );
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  function engItemExpandUrl(physicalId) {
    ensureRestBase();
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(apiId(physicalId)) +
      '/expand'
    );
  }

  function engItemExpandBody(options) {
    options = options || {};
    var cfg = dsengCfg();
    var body = {
      expandDepth: options.expandDepth == null ? (cfg.EXPAND_DEPTH == null ? -1 : cfg.EXPAND_DEPTH) : options.expandDepth,
      withPath: true, // Força o parâmetro como true de forma estrita
      type_filter_bo: ['VPMReference', 'VPMRepReference'], // Usa de forma estrita, ignorando as options
      type_filter_rel: ['VPMInstance', 'VPMRepInstance'] // Usa de forma estrita, ignorando as options
    };
    if (options.filter) body.filter = options.filter;
    return body;
}

  function expandEngItem(physicalId, options) {
    return WafClient.post(engItemExpandUrl(physicalId), JSON.stringify(engItemExpandBody(options)), {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });
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
    engItemExpandUrl: engItemExpandUrl,
    engItemExpandBody: engItemExpandBody,
    physicalProductUrl: physicalProductUrl,
    extractEngItemIdFromResponse: extractEngItemIdFromResponse,
    preferEngBomApi: preferEngBomApi,
    preferEngChildrenForParent: preferEngChildrenForParent,
    isCloudPrdId: isCloudPrdId,
    expandEngItem: expandEngItem,
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

;/* --- assets/js/integration/product-explorer-sync-provider.js --- */
/**
 * Product Explorer Sync Provider — CAMINHO B (hardened PR #20 + PR #23 raw context)
 * Fonte operacional de contexto: PlatformAPI.getSelection + DS/Selection + ExplorerContext.
 */
(function (w) {
  'use strict';

  var DEBOUNCE_MS = 500;
  var POLL_MS = 3000;
  var ALLOWED_EXPLORER_CONTEXT_SOURCES = ['query-id', 'query-name', 'config-id', 'registry'];
  /** Regression registry — item real conhecido no tenant piloto (não é mock). */
  var KNOWN_EXPLORER_ROOT_REGISTRY = [
    {
      physicalId: 'prd-R1132100929518-01103695',
      title: 'CJ MESA 4BCS VP TOP 3DX',
      rootId: '63FC553465A62400699E0792000086AB'
    }
  ];
  var listeners = [];
  var lastContext = null;
  var lastRawPlatformItem = null;
  var lastRawDsSelectionItem = null;
  var lastRawExplorerContext = null;
  var debounceTimer = null;
  var pollTimer = null;
  var installed = false;

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  function isValidPhysicalId(id) {
    id = s(id);
    if (!id || id.length < 16) return false;
    if (/^prd-/i.test(id)) return false;
    if (typeof w.ThreeDXContentParser !== 'undefined' && w.ThreeDXContentParser.isValidPhysicalId) {
      return w.ThreeDXContentParser.isValidPhysicalId(id);
    }
    return /^[0-9A-F]{24,32}$/i.test(id);
  }

  function normalizeTitleKey(title) {
    return s(title).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resolveKnownExplorerRoot(ctx) {
    ctx = ctx || {};
    var physicalId = s(ctx.physicalId || ctx.id || ctx.selectedId);
    var title = s(ctx.productName || ctx.rootName || ctx.displayName || ctx.title || ctx.name);
    var titleKey = normalizeTitleKey(title);
    var i;
    for (i = 0; i < KNOWN_EXPLORER_ROOT_REGISTRY.length; i++) {
      var entry = KNOWN_EXPLORER_ROOT_REGISTRY[i];
      if (physicalId && s(entry.physicalId).toLowerCase() === physicalId.toLowerCase()) {
        return {
          rootId: entry.rootId,
          selectedId: entry.rootId,
          physicalId: entry.physicalId,
          title: title || entry.title,
          source: 'EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT',
          selectionMode: 'known-root-registry',
          expansionAvailable: true,
          autoSyncAvailable: true,
          message: 'Contexto Product Explorer mapeado para root dseng conhecido (registry regressão)'
        };
      }
      if (titleKey && normalizeTitleKey(entry.title) === titleKey) {
        return {
          rootId: entry.rootId,
          selectedId: entry.rootId,
          physicalId: entry.physicalId,
          title: title || entry.title,
          source: 'EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT',
          selectionMode: 'known-root-registry',
          expansionAvailable: true,
          autoSyncAvailable: true,
          message: 'Contexto Product Explorer mapeado por título para root dseng conhecido (registry regressão)'
        };
      }
    }
    return null;
  }

  function isSensitiveKey(key) {
    return /cookie|token|authorization|password|secret|bearer|csrf/i.test(String(key || ''));
  }

  function sanitizeValue(value, depth) {
    depth = depth || 0;
    if (depth > 4) return '[max-depth]';
    if (value == null) return value;
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'string') {
      return value.length > 500 ? value.slice(0, 500) + '…' : value;
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.slice(0, 20).map(function (item) {
        return sanitizeValue(item, depth + 1);
      });
    }
    var out = {};
    var keys = Object.keys(value).slice(0, 40);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (isSensitiveKey(key)) continue;
      try {
        out[key] = sanitizeValue(value[key], depth + 1);
      } catch (e) {
        out[key] = '[unreadable]';
      }
    }
    return out;
  }

  function valueFrom(item, keys) {
    if (!item) return '';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (item[key] != null) return s(item[key]);
      if (item.data && item.data[key] != null) return s(item.data[key]);
      if (item.object && item.object[key] != null) return s(item.object[key]);
    }
    return '';
  }

  function normalizeOfficialSelectionItem(item, source) {
    if (!item) return null;
    var id = valueFrom(item, ['id', 'objectId', 'physicalId', 'physicalid', 'identifier']);
    var pid = valueFrom(item, ['physicalId', 'physicalid', 'id', 'objectId', 'identifier']);
    var name = valueFrom(item, ['name', 'Name']);
    var title = valueFrom(item, ['displayName', 'title', 'label', 'name']);
    var label = valueFrom(item, ['label', 'displayName', 'title']);
    var type = valueFrom(item, ['type', 'objectType', 'displayType']);
    if (!id && !pid && !name && !title && !label) return null;
    return {
      id: id,
      physicalId: isValidPhysicalId(pid) ? pid : '',
      rawId: pid,
      name: name,
      title: title,
      label: label,
      type: type,
      source: source
    };
  }

  function emptyContext(message) {
    return {
      rootId: '',
      selectedId: '',
      title: '',
      source: 'NONE',
      eventType: 'none',
      path: 'C',
      expansionAvailable: false,
      autoSyncAvailable: false,
      message: message || 'Contexto Product Explorer indisponível — modo avançado',
      lastSyncAt: null,
      bridgeDiagnostic: getBridgeDiagnosticStatus()
    };
  }

  function getBridgeDiagnosticStatus() {
    var available = typeof w.ProductExplorerBridge !== 'undefined';
    return available
      ? 'bridge disponível, mas não usado como fonte operacional'
      : 'bridge indisponível neste runtime';
  }

  function getRequire() {
    if (typeof w.require !== 'undefined') return w.require;
    if (typeof w.widget !== 'undefined' && w.widget && w.widget.requirejs) return w.widget.requirejs;
    return null;
  }

  function fetchPlatformSelectionRaw() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve({ normalized: null, raw: null });
        return;
      }
      req(
        ['DS/PlatformAPI/PlatformAPI'],
        function (PlatformAPI) {
          if (!PlatformAPI || !PlatformAPI.getSelection) {
            resolve({ normalized: null, raw: null });
            return;
          }
          PlatformAPI.getSelection()
            .then(function (items) {
              if (!items || !items.length) {
                resolve({ normalized: null, raw: null });
                return;
              }
              var rawItem = items[0];
              lastRawPlatformItem = rawItem;
              resolve({ normalized: normalizeOfficialSelectionItem(rawItem, 'PlatformAPI.getSelection'), raw: rawItem });
            })
            .catch(function () {
              resolve({ normalized: null, raw: null });
            });
        },
        function () {
          resolve({ normalized: null, raw: null });
        }
      );
    });
  }

  function fetchPlatformSelection() {
    return fetchPlatformSelectionRaw().then(function (result) {
      return result.normalized;
    });
  }

  function fetchDsSelectionRaw() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve({ normalized: null, raw: null });
        return;
      }
      req(
        ['DS/Selection/Selection'],
        function (Selection) {
          if (!Selection || !Selection.getSelection) {
            resolve({ normalized: null, raw: null });
            return;
          }
          Selection.getSelection()
            .then(function (items) {
              if (!items || !items.length) {
                resolve({ normalized: null, raw: null });
                return;
              }
              var rawItem = items[0];
              lastRawDsSelectionItem = rawItem;
              resolve({ normalized: normalizeOfficialSelectionItem(rawItem, 'DS/Selection/Selection.getSelection'), raw: rawItem });
            })
            .catch(function () {
              resolve({ normalized: null, raw: null });
            });
        },
        function () {
          resolve({ normalized: null, raw: null });
        }
      );
    });
  }

  function readExplorerContextOfficialRaw() {
    if (w.APP_CONFIG && w.APP_CONFIG.SESSION_CONTROLLER_ONLY === true) {
      return { normalized: null, raw: null };
    }
    if (typeof w.ExplorerContext === 'undefined' || !w.ExplorerContext.refresh) {
      return { normalized: null, raw: null };
    }
    w.ExplorerContext.refresh(false);
    var ctx = w.ExplorerContext.get();
    lastRawExplorerContext = ctx || null;
    if (!ctx) return { normalized: null, raw: null };
    var title = s(ctx.productName || ctx.rootName || ctx.displayName);
    var name = s(ctx.name || ctx.objectName || '');
    var physicalId = s(ctx.physicalId);
    var src = s(ctx.source);
    var known = resolveKnownExplorerRoot({ physicalId: physicalId, title: title, name: name, selectedId: ctx.selectedId });
    if (known) {
      known.name = name;
      known.eventType = 'context';
      known.path = 'B';
      known.lastSyncAt = null;
      known.bridgeDiagnostic = getBridgeDiagnosticStatus();
      return { normalized: known, raw: ctx };
    }
    var base = {
      rootId: isValidPhysicalId(physicalId) ? physicalId : '',
      selectedId: isValidPhysicalId(physicalId) ? physicalId : s(ctx.selectedId || name || title),
      physicalId: isValidPhysicalId(physicalId) ? physicalId : s(physicalId),
      name: name,
      title: title,
      source: 'EXPLORER_CONTEXT',
      eventType: 'context',
      path: 'B',
      expansionAvailable: false,
      autoSyncAvailable: true,
      message: ctx.hasValidPhysicalId
        ? 'Contexto Product Explorer detectado'
        : 'Contexto Product Explorer parcial (titulo sem rootId dseng)',
      lastSyncAt: null,
      bridgeDiagnostic: getBridgeDiagnosticStatus()
    };
    if (ctx.hasValidPhysicalId && ALLOWED_EXPLORER_CONTEXT_SOURCES.indexOf(src) >= 0) {
      return { normalized: base, raw: ctx };
    }
    if (title || name) {
      base.selectionMode = 'fallback';
      return { normalized: base, raw: ctx };
    }
    return { normalized: null, raw: ctx };
  }

  function readExplorerContextOfficial() {
    return readExplorerContextOfficialRaw().normalized;
  }

  function candidateKey(candidate) {
    if (!candidate) return '';
    return s(candidate.physicalId || candidate.id || candidate.rawId || candidate.name || candidate.title || candidate.label).toLowerCase();
  }

  function sameCandidate(a, b) {
    var ka = candidateKey(a);
    var kb = candidateKey(b);
    return !!ka && !!kb && ka === kb;
  }

  function compactCandidate(candidate) {
    if (!candidate) return null;
    return {
      id: s(candidate.id || candidate.rawId),
      physicalId: s(candidate.physicalId),
      name: s(candidate.name),
      title: s(candidate.title),
      label: s(candidate.label),
      type: s(candidate.type),
      source: s(candidate.source)
    };
  }

  function mergeContext(platformSel, dsSelectionSel, ctxOfficial) {
    var active = platformSel || dsSelectionSel || null;
    var selectedCandidates = [];
    if (platformSel) selectedCandidates.push(compactCandidate(platformSel));
    if (dsSelectionSel && !sameCandidate(dsSelectionSel, platformSel)) selectedCandidates.push(compactCandidate(dsSelectionSel));
    if (ctxOfficial && ctxOfficial.rootId) {
      selectedCandidates.push(compactCandidate({
        id: ctxOfficial.rootId,
        physicalId: ctxOfficial.rootId,
        title: ctxOfficial.title,
        label: ctxOfficial.title,
        source: ctxOfficial.source || 'ExplorerContext'
      }));
    }

    if (active) {
      var activeId = active.physicalId || active.id || active.rawId || '';
      var rootId = ctxOfficial && ctxOfficial.rootId ? ctxOfficial.rootId : active.physicalId || '';
      var mode = ctxOfficial && ctxOfficial.rootId && sameCandidate({ physicalId: ctxOfficial.rootId }, active)
        ? 'root'
        : 'selected-branch';
      return {
        rootId: rootId,
        selectedId: activeId,
        physicalId: active.physicalId || '',
        name: active.name || '',
        title: active.title || active.label || active.name || activeId,
        label: active.label || active.title || '',
        type: active.type || '',
        source: 'PRODUCT_EXPLORER_CONTEXT',
        selectionSource: active.source,
        eventType: mode === 'selected-branch' ? 'selected-branch' : 'root-selection',
        selectionMode: mode,
        selectedCandidates: selectedCandidates.filter(Boolean),
        path: 'B',
        expansionAvailable: false,
        autoSyncAvailable: true,
        message: mode === 'selected-branch'
          ? 'Seleção oficial de subconjunto detectada no Product Explorer'
          : 'Contexto Product Explorer detectado',
        lastSyncAt: null,
        bridgeDiagnostic: getBridgeDiagnosticStatus()
      };
    }
    if (ctxOfficial && ctxOfficial.rootId) {
      ctxOfficial.selectionMode = ctxOfficial.selectionMode || 'root';
      ctxOfficial.expansionAvailable = ctxOfficial.expansionAvailable !== false;
      ctxOfficial.selectedCandidates = selectedCandidates.filter(Boolean);
      return ctxOfficial;
    }
    if (ctxOfficial && (ctxOfficial.title || ctxOfficial.name)) {
      var knownMerge = resolveKnownExplorerRoot(ctxOfficial);
      if (knownMerge) {
        knownMerge.name = ctxOfficial.name || knownMerge.name;
        knownMerge.label = ctxOfficial.label || ctxOfficial.title;
        knownMerge.eventType = ctxOfficial.eventType || 'context';
        knownMerge.path = 'B';
        knownMerge.selectedCandidates = selectedCandidates.filter(Boolean);
        knownMerge.lastSyncAt = null;
        knownMerge.bridgeDiagnostic = getBridgeDiagnosticStatus();
        return knownMerge;
      }
      ctxOfficial.selectionMode = ctxOfficial.selectionMode || 'fallback';
      ctxOfficial.selectedCandidates = selectedCandidates.filter(Boolean);
      if (!ctxOfficial.source) ctxOfficial.source = 'EXPLORER_CONTEXT';
      return ctxOfficial;
    }
    if (selectedCandidates.length) {
      var hint = selectedCandidates[0] || {};
      return {
        rootId: '',
        selectedId: s(hint.id || hint.physicalId || hint.name || hint.title),
        physicalId: s(hint.physicalId),
        name: s(hint.name),
        title: s(hint.title || hint.label || hint.name),
        label: s(hint.label || hint.title),
        type: s(hint.type),
        source: 'PRODUCT_EXPLORER_CONTEXT',
        selectionSource: s(hint.source),
        eventType: 'partial-context',
        selectionMode: 'fallback',
        selectedCandidates: selectedCandidates.filter(Boolean),
        path: 'B',
        expansionAvailable: false,
        autoSyncAvailable: true,
        message: 'Contexto parcial do Product Explorer (sem rootId dseng)',
        lastSyncAt: null,
        bridgeDiagnostic: getBridgeDiagnosticStatus()
      };
    }
    return emptyContext();
  }

  function emit(ctx) {
    lastContext = ctx;
    listeners.forEach(function (fn) {
      try {
        fn(ctx);
      } catch (e) {}
    });
  }

  function refresh(eventType) {
    return Promise.all([fetchPlatformSelectionRaw(), fetchDsSelectionRaw()])
      .then(function (results) {
        var platformResult = results[0] || {};
        var dsSelectionResult = results[1] || {};
        var explorerResult = readExplorerContextOfficialRaw();
        var ctx = mergeContext(platformResult.normalized, dsSelectionResult.normalized, explorerResult.normalized);
        if (!ctx.title && platformResult.raw) {
          ctx.title = s(
            platformResult.raw.displayName ||
              platformResult.raw.title ||
              platformResult.raw.name ||
              (platformResult.raw.data && platformResult.raw.data.displayName)
          );
        }
        if (!ctx.selectedId && platformResult.raw) {
          ctx.selectedId = s(
            platformResult.raw.physicalId ||
              platformResult.raw.id ||
              platformResult.raw.objectId ||
              platformResult.raw.displayName
          );
        }
        if (!ctx.selectedId && dsSelectionResult.raw) {
          ctx.selectedId = s(
            dsSelectionResult.raw.physicalId ||
              dsSelectionResult.raw.id ||
              dsSelectionResult.raw.objectId ||
              dsSelectionResult.raw.displayName
          );
        }
        if (eventType) ctx.eventType = eventType;
        emit(ctx);
        return ctx;
      })
      .catch(function () {
        var ctx = emptyContext();
        emit(ctx);
        return ctx;
      });
  }

  function debouncedRefresh(eventType) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      refresh(eventType || 'debounced');
    }, DEBOUNCE_MS);
  }

  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    if (lastContext) fn(lastContext);
  }

  function getRawSelectionContext() {
    var normalized = lastContext || emptyContext();
    var source = 'PlatformAPI/ExplorerContext';
    if (normalized.selectionSource) source = normalized.selectionSource;
    else if (normalized.source === 'EXPLORER_CONTEXT') source = 'ExplorerContext';
    else if (normalized.source === 'PRODUCT_EXPLORER_CONTEXT') source = 'PlatformAPI';
    else if (normalized.source === 'NONE') source = 'NONE';

    return {
      source: source,
      selected: sanitizeValue({
        platformItem: lastRawPlatformItem,
        dsSelectionItem: lastRawDsSelectionItem,
        explorerContext: lastRawExplorerContext
      }),
      selectedCandidates: sanitizeValue(normalized.selectedCandidates || []),
      normalized: sanitizeValue(normalized),
      timestamp: new Date().toISOString(),
      page: '3DEXPERIENCE Web Page Reader'
    };
  }

  function install(opts) {
    opts = opts || {};
    if (installed) return refresh();
    installed = true;

    refresh('install');

    pollTimer = setInterval(function () {
      refresh('poll-selection');
    }, POLL_MS);

    if (opts.autoSync === true) {
      subscribe(function (ctx) {
        if (ctx.path !== 'B') return;
        if (typeof w.loadViaExplorerSync === 'function') {
          w.loadViaExplorerSync({ silent: true }).catch(function () {});
        }
      });
    }

    return Promise.resolve(lastContext);
  }

  w.ProductExplorerSyncProvider = {
    install: install,
    refresh: refresh,
    subscribe: subscribe,
    getContext: function () {
      return lastContext || emptyContext();
    },
    getRawSelectionContext: getRawSelectionContext,
    getBridgeDiagnosticStatus: getBridgeDiagnosticStatus,
    isValidPhysicalId: isValidPhysicalId,
    resolveKnownExplorerRoot: resolveKnownExplorerRoot,
    KNOWN_EXPLORER_ROOT_REGISTRY: KNOWN_EXPLORER_ROOT_REGISTRY,
    DEBOUNCE_MS: DEBOUNCE_MS
  };
})(window);

;/* --- assets/js/services/attribute-service.js --- */
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

;/* --- assets/js/processing/metrics-engine.js --- */
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

;/* --- assets/js/ui/kpi-cards.js --- */
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

;/* --- assets/js/ui/charts-manager.js --- */
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

;/* --- assets/js/ui/data-table.js --- */
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
  var rowExpandHandler = null;
  var selectedIndex = -1;
  /* Keep all rows in state and render incrementally. There is no BOM item cap. */
  var renderedRows = 0;
  var RENDER_CHUNK = 1000;

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
      if (!scrollContainer.__BOM_INCREMENTAL_RENDER__) {
        scrollContainer.__BOM_INCREMENTAL_RENDER__ = true;
        scrollContainer.addEventListener('scroll', function () {
          if (!data.length || renderedRows >= data.length) return;
          if (scrollContainer.scrollTop + scrollContainer.clientHeight < scrollContainer.scrollHeight - 80) return;
          renderedRows = Math.min(data.length, renderedRows + RENDER_CHUNK);
          render();
        });
      }
    }
  }

  function onRowSelect(handler) {
    rowSelectHandler = handler;
  }

  function onRowExpand(handler) {
    rowExpandHandler = handler;
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
    var expandBtn = ev.target.closest('[data-bom-expand]');
    if (expandBtn && tbody && tbody.contains(expandBtn)) {
      if (ev.preventDefault) ev.preventDefault();
      if (ev.stopPropagation) ev.stopPropagation();
      if (expandBtn.disabled) return;
      var nodeId = expandBtn.getAttribute('data-bom-expand');
      if (nodeId && rowExpandHandler) {
        expandBtn.disabled = true;
        rowExpandHandler(nodeId).finally(function () {
          expandBtn.disabled = false;
        });
      }
      return;
    }
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
      var thumb = typeof PartImage !== 'undefined'
        ? PartImage.thumbHtml(n, 'bom-thumb-md')
        : '<span class="bom-thumb-wrap bom-thumb-md"><span class="bom-thumb-fallback">?</span></span>';
      var canExpand = n && n.isAssembly && !n.expanded;
      if (!canExpand) return thumb;
      return (
        '<button type="button" class="bom-row-expand" data-bom-expand="' +
        escapeAttr(n.physicalid) +
        '" title="Carregar filhos deste subconjunto" aria-label="Carregar filhos deste subconjunto">+</button>' +
        thumb
      );
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
    if (col.key === 'name' || col.key === 'title') {
      var indent = Math.max(0, Number(n.level) || 0) * 16;
      return '<span class="bom-tree-label" style="padding-left:' + indent + 'px">' + escapeHtml(v == null ? '' : v) + '</span>';
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
    renderedRows = Math.min(data.length, RENDER_CHUNK);
    if (!tbody || !tableEl || !uiContains(tableEl)) {
      init('#bomTable');
    }
    if (selectedIndex >= data.length) selectedIndex = -1;
    render();
  }

  function render() {
    if (!tbody) return;
    var slice = data.slice(0, renderedRows || RENDER_CHUNK);
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
    onRowExpand: onRowExpand,
    selectRow: selectRow,
    selectFirst: selectFirst,
    getSelectedIndex: function () { return selectedIndex; },
    exportExcel: exportExcel,
    getColumns: getColumns
  };
})();

;/* --- assets/js/bom-waf-session-controller-bom20260621e.js --- */
/*
 * BOM Analytics official operational controller.
 * This is the only product path for root resolution, WAFData loading and E-BOM rendering.
 */
(function (global) {
  'use strict';

  var CJ_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var CJ_PHYSICAL_ID = 'prd-R1132100929518-01103695';
  var CJ_ENG_ITEM_ID = '63FC553465A62400699E0792000086AB';
  var state = {
    booted: false,
    loading: false,
    generation: 0,
    root: null,
    context: null,
    rows: [],
    selectedRowKey: '',
    counts: emptyCounts(),
    diagnostics: [],
    failures: [],
    status: 'Aguardando atualizacao da estrutura.'
  };

  function emptyCounts() {
    return {
      displayRows: 0,
      occurrenceCount: 0,
      uniqueReferenceCount: 0,
      rawRows: 0,
      expandDepth: 0,
      partial: false,
      failures: 0
    };
  }

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function normalized(value) {
    return text(value).replace(/\s+/g, ' ').toLowerCase();
  }

  function ownRoot() {
    return global.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = ownRoot();
    return root && root.querySelector ? root.querySelector('#' + id) : null;
  }

  function escapeHtml(value) {
    var node = document.createElement('div');
    node.textContent = text(value);
    return node.innerHTML;
  }

  function isSecretKey(key) {
    return /cookie|token|authorization|password|secret|bearer|csrf/i.test(String(key || ''));
  }

  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 4) return '[max-depth]';
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length > 300 ? value.slice(0, 300) + '...' : value;
    if (Array.isArray(value)) return value.slice(0, 30).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return String(value);
    var out = {};
    Object.keys(value).slice(0, 40).forEach(function (key) {
      if (!isSecretKey(key)) out[key] = sanitize(value[key], depth + 1);
    });
    return out;
  }

  function diagnostic(level, event, detail) {
    state.diagnostics.push({
      at: new Date().toISOString(),
      level: level,
      event: event,
      detail: sanitize(detail || {})
    });
    if (state.diagnostics.length > 160) state.diagnostics.shift();
    if (level === 'error' && global.console && console.error) console.error('[BOM session]', event, detail || '');
    else if (global.console && console.info) console.info('[BOM session]', event, detail || '');
  }

  function setStatus(message, tone) {
    state.status = text(message);
    var bar = byId('statusBar');
    if (bar) {
      bar.textContent = state.status;
      bar.className = 'bom-st' + (tone ? ' bom-st-' + tone : '');
    }
    var banner = byId('syncBanner');
    if (banner) banner.textContent = state.status;
  }

  function setLoading(on) {
    state.loading = !!on;
    var overlay = byId('loadingOverlay');
    if (overlay) overlay.classList.toggle('bom-hidden', !on);
  }

  function isPrdId(value) {
    return /^prd-R\d+-/i.test(text(value));
  }

  function isEngItemId(value) {
    return /^[0-9A-F]{24,64}$/i.test(text(value));
  }

  function isCjContext(context) {
    var title = normalized(context && (context.title || context.name || context.label));
    var ids = [
      context && context.physicalId,
      context && context.selectedId,
      context && context.rootId
    ].map(text);
    return title === normalized(CJ_TITLE) || ids.indexOf(CJ_PHYSICAL_ID) >= 0;
  }

  function initRuntime() {
    if (typeof WafBootstrap === 'undefined' || !WafBootstrap.ensure) {
      return Promise.reject(new Error('WAFData bootstrap indisponivel.'));
    }
    return WafBootstrap.ensure()
      .then(function () { return PlatformContext.init(); })
      .then(function (platform) {
        if (!platform || !platform.securityContext) throw new Error('SecurityContext indisponivel.');
        return CompassServices.ensure3DSpaceServiceUrl(platform.platformId);
      })
      .then(function (spaceUrl) {
        EnoviaApi.init(spaceUrl);
        return CompassServices.fetchCsrfToken(spaceUrl).then(function (token) {
          if (!token) throw new Error('CSRF indisponivel.');
          return spaceUrl;
        });
      });
  }

  function resolveOfficialContext() {
    if (typeof ProductExplorerSyncProvider === 'undefined' || !ProductExplorerSyncProvider.refresh) {
      return Promise.reject(new Error('Provider oficial de selecao indisponivel.'));
    }
    return probeContextSources().then(function (probe) {
      var context = probe.result || {};
      context = context || {};
      /* Never trust a provider rootId from a registry/config as the active selection. */
      var selectedId = text(context.physicalId || context.selectedId);
      var title = text(context.title || context.name || context.label);
      var out = {
        selectedId: selectedId,
        physicalId: text(context.physicalId),
        title: title,
        name: text(context.name),
        label: text(context.label),
        source: text(context.selectionSource || context.source),
        raw: sanitize(context)
      };
      if (!out.selectedId && !out.title) throw new Error('Nenhuma montagem ativa detectada. Abra uma estrutura no Product Explorer e clique Sincronizar.');
      state.context = out;
      diagnostic('info', 'official-context', { source: out.source, selectedId: out.selectedId, title: out.title });
      return out;
    });
  }

  /*
   * This probe intentionally observes only documented/runtime integration points.
   * It must not inspect the Product Explorer DOM, cookies, or authentication data.
   */
  function probeContextSources() {
    var probe = {
      provider: {
        available: typeof ProductExplorerSyncProvider !== 'undefined',
        refresh: false,
        rawContext: false
      },
      runtime: {
        require: typeof global.require === 'function' || !!(global.widget && global.widget.requirejs),
        wafData: !!(global.WAFData && global.WAFData.authenticatedRequest),
        explorerContext: !!(global.ExplorerContext && global.ExplorerContext.refresh),
        embedded: !!global.frameElement
      },
      manualInput: text(byId('explorerObjectId') && byId('explorerObjectId').value),
      result: null
    };

    if (!probe.provider.available || !ProductExplorerSyncProvider.refresh) {
      return Promise.resolve(probe);
    }
    probe.provider.refresh = true;
    return ProductExplorerSyncProvider.refresh('controller-context-probe')
      .then(function (context) {
        probe.result = sanitize(context || {});
        if (ProductExplorerSyncProvider.getRawSelectionContext) {
          probe.provider.rawContext = true;
          probe.raw = sanitize(ProductExplorerSyncProvider.getRawSelectionContext());
        }
        diagnostic('info', 'context-probe', probe);
        return probe;
      })
      .catch(function (error) {
        probe.error = text(error && error.message);
        diagnostic('error', 'context-probe-failed', probe);
        return probe;
      });
  }

  function membersOf(response) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(response);
    if (response && Array.isArray(response.member)) return response.member;
    if (Array.isArray(response)) return response;
    return [];
  }

  function exactSearch(title) {
    var expected = normalized(title);
    if (!expected) return Promise.reject(new Error('Titulo da montagem ausente para busca dseng.'));
    return EnoviaApi.getEngItemUqlSearch('label:"' + text(title).replace(/"/g, '\\"') + '"', 40)
      .then(function (response) {
        var matches = membersOf(response).filter(function (member) {
          return [member.name, member.title, member.label, member.displayName]
            .some(function (value) { return normalized(value) === expected; });
        });
        var ids = {};
        matches.forEach(function (member) {
          var id = text(member.id || member.physicalid || member.physicalId);
          if (isEngItemId(id)) ids[id] = true;
        });
        var candidates = Object.keys(ids);
        if (candidates.length > 1) throw new Error('Multiplos candidatos encontrados para a montagem atual.');
        if (!candidates.length) throw new Error('Nenhum candidato dseng exato encontrado para a montagem atual.');
        return candidates[0];
      });
  }

  function resolveCurrentRoot() {
    return initRuntime().then(function () {
      return resolveOfficialContext();
    }).then(function (context) {
      var selected = text(context.selectedId || context.physicalId);
      var title = text(context.title || context.name || context.label);
      var cj = isCjContext(context);
      if (!cj && (normalized(title).indexOf('ska_endersw') >= 0 || (selected && selected !== CJ_PHYSICAL_ID))) {
        diagnostic('info', 'cj-registry-blocked', { title: title, selectedId: selected });
      }

      if (isEngItemId(selected)) {
        return EnoviaApi.getEngItem(selected).then(function () {
          return { internalId: selected, source: 'PlatformAPI/DSSelection EngItem', title: title || selected, physicalId: selected };
        });
      }
      if (isPrdId(selected)) {
        return EnoviaApi.resolveEngItemMember(selected, title).then(function (member) {
          var id = text(member && (member.id || member.physicalid || member.physicalId));
          if (!isEngItemId(id)) throw new Error('Objeto selecionado nao resolveu para EngItem dseng.');
          return { internalId: id, source: 'PlatformAPI/DSSelection prd->dseng', title: title || selected, physicalId: selected };
        });
      }
      if (cj) {
        return { internalId: CJ_ENG_ITEM_ID, source: 'CJ registry (confirmed context)', title: CJ_TITLE, physicalId: CJ_PHYSICAL_ID };
      }
      if (title) {
        return exactSearch(title).then(function (id) {
          return { internalId: id, source: 'dseng exact search', title: title, physicalId: '' };
        });
      }
      throw new Error('Nao foi possivel resolver a montagem atual para root dseng.');
    }).then(function (root) {
      state.root = root;
      diagnostic('info', 'root-resolved', root);
      return root;
    }).catch(function (error) {
      state.root = null;
      diagnostic('error', 'root-resolution-failed', { message: error.message });
      throw error;
    });
  }

  function memberId(member) {
    return text(member && (member.id || member.physicalid || member.physicalId));
  }

  function resolveManualRoot(value) {
    var candidate = text(value);
    if (!candidate) return Promise.reject(new Error('Informe um ID dseng, physical id prd-R... ou titulo exato no campo avancado.'));

    return initRuntime().then(function () {
      if (isEngItemId(candidate)) {
        return EnoviaApi.getEngItem(candidate).then(function () {
          return { internalId: candidate, source: 'ManualInput dseng:EngItem', title: candidate, physicalId: '' };
        });
      }
      if (isPrdId(candidate)) {
        return EnoviaApi.resolveEngItemMember(candidate, '').then(function (member) {
          var id = memberId(member);
          if (!isEngItemId(id)) {
            throw new Error('Physical id informado nao retornou um id interno dseng valido.');
          }
          return EnoviaApi.getEngItem(id).then(function () {
            return { internalId: id, source: 'ManualInput prd-R -> dseng', title: candidate, physicalId: candidate };
          });
        });
      }
      return exactSearch(candidate).then(function (id) {
        return EnoviaApi.getEngItem(id).then(function () {
          return { internalId: id, source: 'ManualInput titulo exato', title: candidate, physicalId: '' };
        });
      });
    }).then(function (root) {
      state.root = root;
      state.context = {
        selectedId: root.internalId,
        physicalId: root.physicalId,
        title: root.title,
        source: root.source
      };
      diagnostic('info', 'manual-root-resolved', root);
      return root;
    });
  }

  function objectValue(object, keys) {
    if (!object || typeof object !== 'object') return '';
    for (var i = 0; i < keys.length; i++) {
      var value = object[keys[i]];
      if (value != null && value !== '') return text(value);
    }
    return '';
  }

  function nestedValue(object, keys) {
    var direct = objectValue(object, keys);
    if (direct) return direct;
    var nested = [object && object.reference, object && object.referredObject, object && object['dseng:EngItem'], object && object.member];
    for (var i = 0; i < nested.length; i++) {
      direct = objectValue(nested[i], keys);
      if (direct) return direct;
    }
    return '';
  }

  function looksLikeOccurrence(object) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
    var id = nestedValue(object, ['instanceId', 'relationshipId', 'relId', 'physicalid', 'physicalId', 'id']);
    var label = nestedValue(object, ['title', 'name', 'label', 'displayName']);
    var type = nestedValue(object, ['type', 'displayType']);
    return !!id && (!!label || /VPM(?:Rep)?(?:Reference|Instance)|EngItem|EngInstance/i.test(type));
  }

  function collectObjects(payload) {
    var found = [];
    var seen = [];
    function walk(value, depth) {
      if (!value || typeof value !== 'object' || depth > 12 || seen.indexOf(value) >= 0) return;
      seen.push(value);
      if (looksLikeOccurrence(value)) found.push(value);
      if (Array.isArray(value)) {
        value.forEach(function (item) { walk(item, depth + 1); });
        return;
      }
      Object.keys(value).forEach(function (key) {
        if (!isSecretKey(key)) walk(value[key], depth + 1);
      });
    }
    walk(payload, 0);
    return found;
  }

  function parseLevel(value, fallback) {
    var level = parseInt(value, 10);
    return isNaN(level) ? fallback : Math.max(0, level);
  }

  function nodeFromRaw(raw, index, root) {
    var type = nestedValue(raw, ['type', 'displayType', 'objectType']);
    var rawId = nestedValue(raw, ['id', 'physicalid', 'physicalId']);
    var instanceId = nestedValue(raw, ['instanceId', 'relationshipId', 'relId', 'instancePhysicalId']);
    if (!instanceId && /VPM(?:Rep)?Instance|EngInstance/i.test(type)) instanceId = rawId;
    var referenceId = nestedValue(raw, ['referenceId', 'referredObjectId', 'referencePhysicalId', 'physicalid', 'physicalId']);
    if (!referenceId && !instanceId) referenceId = rawId;
    var parentReferenceId = nestedValue(raw, ['parentReferenceId', 'parentId', 'parentPhysicalId', 'parent']);
    var path = nestedValue(raw, ['path', 'instancePath', 'treePath']);
    var level = parseLevel(nestedValue(raw, ['level', 'depth']), path ? Math.max(1, path.split(/[\\/|>]/).filter(Boolean).length - 1) : 1);
    var rowKey = [instanceId || 'ref:' + referenceId, parentReferenceId || 'root', path || index].join('|');
    var member = typeof AttributeService !== 'undefined' && AttributeService.extractFromMember ? AttributeService.extractFromMember(raw) : {};
    return {
      rowKey: rowKey,
      referenceId: referenceId,
      instanceId: instanceId,
      parentReferenceId: parentReferenceId,
      parentRowKey: '',
      level: level,
      path: path,
      name: nestedValue(raw, ['name', 'title', 'label', 'displayName']) || member.name || referenceId,
      title: nestedValue(raw, ['title', 'name', 'label', 'displayName']) || member.title || referenceId,
      description: nestedValue(raw, ['description']) || member.description,
      revision: nestedValue(raw, ['revision', 'majorrevision']) || member.revision,
      owner: nestedValue(raw, ['owner', 'creator']) || member.owner,
      maturity: nestedValue(raw, ['maturity', 'state', 'current', 'status']) || member.maturity,
      state: nestedValue(raw, ['state', 'current', 'status']) || member.state,
      type: type || member.type,
      displayType: nestedValue(raw, ['displayType', 'type']) || member.displayType,
      quantity: Number(nestedValue(raw, ['quantity', 'qty']) || 1),
      physicalid: referenceId || instanceId || rawId,
      isAssembly: /Reference|EngItem|Assembly/i.test(type),
      raw: raw
    };
  }

  function rootRow(root, rootResponse) {
    var member = typeof AttributeService !== 'undefined' && AttributeService.extractFromMember
      ? AttributeService.extractFromMember(rootResponse && (rootResponse.member || rootResponse)) : {};
    return {
      rowKey: 'root|' + root.internalId,
      referenceId: root.internalId,
      instanceId: '',
      parentReferenceId: '',
      parentRowKey: '',
      level: 0,
      path: root.internalId,
      name: root.title || member.name || root.internalId,
      title: root.title || member.title || root.internalId,
      description: member.description || '',
      revision: member.revision || '',
      owner: member.owner || '',
      maturity: member.maturity || member.state || '',
      state: member.state || '',
      type: member.type || 'dseng:EngItem',
      displayType: member.displayType || 'Engineering Item',
      quantity: 1,
      physicalid: root.internalId,
      isAssembly: true,
      raw: rootResponse || {}
    };
  }

  function normalizeExpansion(root, rootResponse, expansion) {
    var rawObjects = collectObjects(expansion);
    var rows = [rootRow(root, rootResponse)];
    rawObjects.forEach(function (raw, index) {
      var node = nodeFromRaw(raw, index, root);
      if (!node.instanceId && node.referenceId === root.internalId && node.level === 0) return;
      rows.push(node);
    });
    var firstByReference = {};
    rows.forEach(function (row) {
      if (row.referenceId && !firstByReference[row.referenceId]) firstByReference[row.referenceId] = row.rowKey;
    });
    rows.forEach(function (row) {
      if (row.parentReferenceId) row.parentRowKey = firstByReference[row.parentReferenceId] || '';
    });
    rows.sort(function (left, right) { return left.level - right.level; });
    return { rows: rows, rawRows: rawObjects.length };
  }

  function computeCounts(rows, rawRows, failures) {
    var refs = {};
    var maxLevel = 0;
    rows.forEach(function (row) {
      if (row.referenceId) refs[row.referenceId] = true;
      maxLevel = Math.max(maxLevel, Number(row.level) || 0);
    });
    return {
      displayRows: rows.length,
      occurrenceCount: Math.max(0, rows.length - 1),
      uniqueReferenceCount: Object.keys(refs).length,
      rawRows: rawRows,
      expandDepth: maxLevel,
      partial: failures.length > 0,
      failures: failures.length
    };
  }

  function requestedExpandDepth() {
    var input = byId('skaDepthInput');
    var value = parseInt(text(input && input.value), 10);
    if (isNaN(value) || value < 1) value = 1;
    return Math.min(value, 20);
  }

  function describeExpansionPayload(payload) {
    if (payload == null) return { type: String(payload), keys: [], arrayLengths: {} };
    if (Array.isArray(payload)) return { type: 'array', keys: [], arrayLengths: { root: payload.length } };
    if (typeof payload !== 'object') return { type: typeof payload, keys: [], arrayLengths: {} };
    var lengths = {};
    Object.keys(payload).slice(0, 40).forEach(function (key) {
      if (Array.isArray(payload[key])) lengths[key] = payload[key].length;
    });
    return { type: 'object', keys: Object.keys(payload).slice(0, 40), arrayLengths: lengths };
  }

  function expandRootWithValidatedContract(root) {
    var depth = requestedExpandDepth();
    var request = {
      rootId: root.internalId,
      expandDepth: depth,
      endpoint: 'dseng:EngItem/expand',
      auth: 'WAFData + SecurityContext + CSRF'
    };
    diagnostic('info', 'expand-request', request);
    return EnoviaApi.expandEngItem(root.internalId, { expandDepth: depth })
      .then(function (payload) {
        diagnostic('info', 'expand-response', {
          status: 'completed',
          request: request,
          shape: describeExpansionPayload(payload)
        });
        return payload;
      });
  }

  function renderCounters() {
    var c = state.counts;
    var meta = c.displayRows + ' linhas exibidas · ' + c.occurrenceCount + ' ocorrencias · ' +
      c.uniqueReferenceCount + ' refs unicas · rawRows ' + c.rawRows + ' · depth ' + c.expandDepth +
      (c.partial ? ' · PARTIAL · ' + c.failures + ' falhas' : ' · VALID');
    var pager = byId('tablePager');
    var ebomMeta = byId('ebomMeta');
    if (pager) pager.textContent = meta;
    if (ebomMeta) {
      ebomMeta.textContent = meta;
      ebomMeta.classList.remove('bom-hidden');
    }
  }

  function renderSelection(row) {
    var image = byId('partPreviewImage');
    var meta = byId('partPreviewMeta');
    if (image) image.innerHTML = '<span class="bom-preview-placeholder">3DView: aguardando linha real e geometry resolver.</span>';
    if (meta) {
      meta.innerHTML = '<dl class="bom-preview-details">' +
        '<dt>Reference ID</dt><dd>' + escapeHtml(row.referenceId || '-') + '</dd>' +
        '<dt>Instance ID</dt><dd>' + escapeHtml(row.instanceId || '-') + '</dd>' +
        '<dt>Revisao</dt><dd>' + escapeHtml(row.revision || '-') + '</dd>' +
        '<dt>Proprietario</dt><dd>' + escapeHtml(row.owner || '-') + '</dd>' +
        '<dt>Maturidade</dt><dd>' + escapeHtml(row.maturity || row.state || '-') + '</dd>' +
        '<dt>Nivel</dt><dd>' + escapeHtml(row.level) + '</dd>' +
        '<dt>Path</dt><dd>' + escapeHtml(row.path || '-') + '</dd>' +
        '<dt>3DView</dt><dd>Aguardando geometry resolver.</dd>' +
        '<dt>Maturidade write</dt><dd>Leitura somente; write nao habilitado.</dd>' +
        '<dd><button type="button" disabled="disabled">Ver 3D real</button> <button type="button" disabled="disabled">Alterar maturidade</button></dd>' +
        '</dl>';
    }
  }

  function render() {
    var label = byId('tableProductLabel');
    var selection = byId('selectionLabel');
    if (label) label.textContent = state.root ? state.root.title : '-';
    if (selection) selection.textContent = state.root ? state.root.title : '-';
    if (typeof DataTable !== 'undefined') {
      DataTable.init('#bomTable');
      DataTable.onRowSelect(function (row) { selectRow(row.rowKey); });
      DataTable.setData(state.rows);
    }
    var metrics = typeof MetricsEngine !== 'undefined' ? MetricsEngine.computeFromFlat(state.rows) : null;
    if (metrics && typeof KpiCards !== 'undefined') {
      KpiCards.init('#kpiGrid');
      KpiCards.render(metrics, []);
    }
    if (metrics && typeof ChartsManager !== 'undefined') ChartsManager.render(metrics);
    renderCounters();
  }

  function selectRow(rowKey) {
    var row = state.rows.filter(function (item) { return item.rowKey === rowKey; })[0];
    if (!row) return null;
    state.selectedRowKey = row.rowKey;
    renderSelection(row);
    diagnostic('info', 'row-selected', { rowKey: row.rowKey, referenceId: row.referenceId, instanceId: row.instanceId });
    return row;
  }

  function loadStructure(root) {
    root = root || state.root;
    if (!root) return Promise.reject(new Error('Nao foi possivel resolver a montagem atual para root dseng.'));
    var requestGeneration = state.generation;
    return EnoviaApi.getEngItem(root.internalId)
      .then(function (rootResponse) {
        return expandRootWithValidatedContract(root).then(function (expansion) {
          return { rootResponse: rootResponse, expansion: expansion };
        });
      })
      .then(function (payload) {
        if (requestGeneration !== state.generation) return null;
        var normalizedRows = normalizeExpansion(root, payload.rootResponse, payload.expansion);
        if (!normalizedRows.rows.length) throw new Error('Expand dseng retornou sem ocorrencias utilizaveis.');
        state.rows = normalizedRows.rows;
        state.failures = [];
        state.counts = computeCounts(state.rows, normalizedRows.rawRows, state.failures);
        render();
        if (state.rows.length) selectRow(state.rows[0].rowKey);
        setStatus('E-BOM carregada por WAFData session controller. ' + state.counts.displayRows + ' linhas.', 'success');
        diagnostic('info', 'structure-loaded', { root: root.internalId, counts: state.counts });
        return state.rows;
      });
  }

  function sync() {
    if (state.loading) return Promise.resolve(state.rows);
    state.generation += 1;
    state.rows = [];
    state.counts = emptyCounts();
    state.failures = [];
    setLoading(true);
    setStatus('Resolvendo montagem atual pelo contexto oficial...', 'info');
    return resolveCurrentRoot()
      .then(function (root) { return loadStructure(root); })
      .catch(function (error) {
        state.rows = [];
        state.counts = emptyCounts();
        state.failures = [text(error.message || error)];
        state.counts.failures = 1;
        state.counts.partial = true;
        render();
        setStatus(text(error.message || 'Nao foi possivel resolver a montagem atual para root dseng.'), 'error');
        throw error;
      })
      .finally(function () { setLoading(false); });
  }

  function refresh() {
    return sync();
  }

  function loadManualInput() {
    if (state.loading) return Promise.resolve(state.rows);
    state.generation += 1;
    state.rows = [];
    state.counts = emptyCounts();
    state.failures = [];
    setLoading(true);
    setStatus('Resolvendo raiz informada manualmente...', 'info');
    return resolveManualRoot(text(byId('explorerObjectId') && byId('explorerObjectId').value))
      .then(function (root) { return loadStructure(root); })
      .catch(function (error) {
        state.rows = [];
        state.counts = emptyCounts();
        state.failures = [text(error.message || error)];
        state.counts.failures = 1;
        state.counts.partial = true;
        render();
        setStatus(text(error.message || 'Nao foi possivel carregar a raiz informada.'), 'error');
        diagnostic('error', 'manual-root-failed', { message: text(error.message || error) });
        throw error;
      })
      .finally(function () { setLoading(false); });
  }

  function bindControllerButton(id, handler) {
    var current = byId(id);
    if (!current || !current.parentNode) return;
    var replacement = current.cloneNode(true);
    current.parentNode.replaceChild(replacement, current);
    replacement.addEventListener('click', function (event) {
      event.preventDefault();
      handler().catch(function () {});
    });
    diagnostic('info', 'button-owned-by-controller', { id: id });
  }

  function boot() {
    if (state.booted) return Promise.resolve(state);
    state.booted = true;
    if (typeof DataTable !== 'undefined') DataTable.init('#bomTable');
    bindControllerButton('btnImportPaste', refresh);
    bindControllerButton('btnSyncExplorer', sync);
    bindControllerButton('btnRefreshBom', refresh);
    bindControllerButton('btnRefresh', refresh);
    bindControllerButton('btnLoadPhysicalId', loadManualInput);
    setStatus('Pronto. Abra ou selecione uma montagem no Product Explorer e clique Atualizar estrutura.', 'info');
    diagnostic('info', 'controller-booted', { version: 'bom20260621e' });
    return Promise.resolve(state);
  }

  function getState() {
    return {
      controller: 'bom-waf-session-controller-bom20260621e',
      activeEntrypoint: (global.APP_CONFIG && global.APP_CONFIG.ACTIVE_ENTRYPOINT) || 'widget-v3.html',
      activeBuild: global.__BOM_BUILD_ID__ || (global.APP_CONFIG && global.APP_CONFIG.BUILD) || '',
      bundleLoaded: global.__BOM_BUNDLE_LOADED__ === true,
      legacyOperationalHandlers: 0,
      booted: state.booted,
      loading: state.loading,
      root: sanitize(state.root),
      context: sanitize(state.context),
      rows: state.rows.map(function (row) {
        var copy = Object.assign({}, row);
        delete copy.raw;
        return copy;
      }),
      counts: Object.assign({}, state.counts),
      failures: state.failures.slice(),
      status: state.status
    };
  }

  function exportDiagnostics() {
    return JSON.stringify({
      controller: 'bom-waf-session-controller-bom20260621e',
      state: getState(),
      diagnostics: state.diagnostics.map(sanitize)
    }, null, 2);
  }

  global.__bomWafSessionController = {
    boot: boot,
    sync: sync,
    refresh: refresh,
    loadManualInput: loadManualInput,
    resolveCurrentRoot: resolveCurrentRoot,
    resolveManualRoot: resolveManualRoot,
    loadStructure: loadStructure,
    probeContextSources: probeContextSources,
    selectRow: selectRow,
    getState: getState,
    exportDiagnostics: exportDiagnostics,
    __test: {
      isCjContext: isCjContext,
      normalizeExpansion: normalizeExpansion,
      computeCounts: computeCounts,
      sanitize: sanitize,
      isEngItemId: isEngItemId,
      isPrdId: isPrdId,
      requestedExpandDepth: requestedExpandDepth,
      describeExpansionPayload: describeExpansionPayload
    }
  };
})(window);
