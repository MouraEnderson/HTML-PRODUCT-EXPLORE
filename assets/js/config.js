/**
 * @file config.js
 * Configuração central — ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.2.0',
    BUILD: 'bom20260603p',
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
    /** Oculta tag de build no widget (visível só com ?debug=1) */
    SHOW_BUILD_TAG: false,
    /** Gráficos recolhidos por padrão — tabela ocupa o widget */
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
      { key: '_thumb', label: '', format: 'thumb', width: 44 },
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
