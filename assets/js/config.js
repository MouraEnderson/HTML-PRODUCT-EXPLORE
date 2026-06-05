/**
 * @file config.js
 * ConfiguraÃƒÂ§ÃƒÂ£o central Ã¢â‚¬â€ ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.2.0',
    BUILD: 'bom20260606w',
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
    /** clipboard.readText trava em iframe GitHub no 3DDashboard */
    SKIP_CLIPBOARD_READ: true,
    PASTE_TRAP_ENABLED: false,
    EXPLORER_AUTO_COPY_ENABLED: false,
    /** Fallback DOM manual só até N peças */
    DOM_MIRROR_MANUAL_MAX_EXPECTED: 25,
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
    EXPLORER_MIRROR_AUTO_SYNC: true,
    EXPLORER_MIRROR_BLOCK_PASTE: true,
    /** Fase C: poll Explorer (só recarrega se estrutura/contagem mudar) */
    AUTO_SYNC_EXPLORER_MS: 4000,
    /** Auto-sync: TSV/mirror com copy na grade (sem API — evita 406 em massa) */
    AUTO_SYNC_ALLOW_COPY: true,
    AUTO_SYNC_PREFER_API: true,
    AUTO_SYNC_PREFER_PASTE: false,
    /** Acima de N peças: auto-sync só com cola na área (evita tabela 0/20) */
    AUTO_SYNC_REQUIRE_PASTE_ABOVE: 12,
    AUTO_REFRESH_ON_STRUCTURE_CHANGE: true,
    /** Sprint 2.5 — TSV fast-path até N peças; acima disso API lazy */
    FAST_TSV_MAX: 500,
    PRIMARY_LOADER: 'api',
    /** Additional App trusted: tentar API antes de TSV no Atualizar */
    PREFER_API_ON_MANUAL_REFRESH: true,
    /** Sprint 2.5 item 6: espelho DOM/innerText nunca como primary */
    USE_DOM_MIRROR_PRIMARY: false,
    /** Fallback DOM só após API/TSV/cola falharem — banner amarelo */
    DOM_MIRROR_FALLBACK: true,
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
      { key: 'type', label: 'Tipo' },
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
