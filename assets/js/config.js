/**
 * @file config.js
 * Configuração central — ajuste por tenant/release ENOVIA.
 */
(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_ID: '3DX_BOM_ANALYTICS_DASHBOARD',
    VERSION: '1.0.0',

    /** Limite de nós na árvore (proteção memória) */
    BOM_MAX_NODES: 50000,

    /** Filhos carregados por requisição lazy */
    BOM_LAZY_BATCH_SIZE: 100,

    /** Profundidade inicial automática */
    BOM_INITIAL_DEPTH: 2,

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
      ATTRIBUTES: 'all',
      PHYSICAL: 'dspfl:PhysicalProduct'
    },

    /** Mapeamento estados de maturidade (customize tenant) */
    MATURITY_STATES: {
      RELEASED: ['RELEASED', 'FROZEN', 'Released', 'Frozen'],
      IN_WORK: ['IN_WORK', 'PRIVATE', 'In Work', 'Work'],
      OBSOLETE: ['OBSOLETE', 'Obsolete', 'ABANDONED']
    },

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
      spaceHost: 'r1132100929518-us1-space.3dexperience.3ds.com'
    },

    PLATFORM: {
      SEARCH_APP_IDS: ['ENX3DSEARCH_AP', '3DSEARCH_AP', 'SEARCH_AP']
    },

    CHART_COLORS: {
      primary: '#005686',
      success: '#2e7d32',
      warning: '#ed6c02',
      danger: '#c62828',
      neutral: '#607d8b',
      palette: ['#005686', '#00838f', '#2e7d32', '#ed6c02', '#6a1b9a', '#c62828', '#455a64']
    }
  };

  function parseQuery() {
    var q = {};
    var search = global.location.search.replace(/^\?/, '');
    if (!search) return q;
    search.split('&').forEach(function (pair) {
      var p = pair.split('=');
      q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return q;
  }

  var query = parseQuery();
  if (query.demo === 'true') {
    APP_CONFIG.DEMO_MODE = true;
  }
  if (query.maxNodes) {
    APP_CONFIG.BOM_MAX_NODES = parseInt(query.maxNodes, 10) || APP_CONFIG.BOM_MAX_NODES;
  }

  var _host = (global.location && global.location.hostname) ? global.location.hostname.toLowerCase() : '';
  APP_CONFIG.WIDGET_MODE = 'unknown';

  if (_host.indexOf('3dexperience.3ds.com') >= 0) {
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    APP_CONFIG.WIDGET_MODE = '3dexperience_host';
  } else {
    APP_CONFIG.CROSS_ORIGIN_WIDGET =
      _host.indexOf('github.io') >= 0 ||
      _host.indexOf('jsdelivr.net') >= 0 ||
      _host.indexOf('githubusercontent.com') >= 0;
    APP_CONFIG.WIDGET_MODE = APP_CONFIG.CROSS_ORIGIN_WIDGET ? 'web_page_reader' : 'external';
  }

  try {
    if (typeof widget !== 'undefined' && widget) {
      APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
      APP_CONFIG.WIDGET_MODE = 'additional_app';
    }
  } catch (e) { /* */ }

  if (query.trusted === '1') {
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    APP_CONFIG.WIDGET_MODE = 'forced_trusted';
  }

  if (query.physicalid) {
    APP_CONFIG.URL_PHYSICAL_ID = query.physicalid;
  }
  if (query.demo === 'true' && query.physicalid) {
    APP_CONFIG.DEMO_ROOT_ID = query.physicalid;
  }

  global.APP_CONFIG = APP_CONFIG;
  global.APP_QUERY = query;
})(typeof window !== 'undefined' ? window : this);
