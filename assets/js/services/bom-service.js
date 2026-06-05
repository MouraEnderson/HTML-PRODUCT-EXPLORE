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
