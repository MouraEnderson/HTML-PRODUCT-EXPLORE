/* BOM API safe hotfix - 20260608f */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608f';
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PRIMARY_LOADER = 'api';
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = true;
      APP_CONFIG.PILOT_API_TREE_DEPTH = Math.max(APP_CONFIG.PILOT_API_TREE_DEPTH || 0, 12);
      APP_CONFIG.BOM_FAST_DEPTH = Math.max(APP_CONFIG.BOM_FAST_DEPTH || 0, 12);
      APP_CONFIG.BOM_INITIAL_DEPTH = Math.max(APP_CONFIG.BOM_INITIAL_DEPTH || 0, 12);
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 500);
    }

    function isAssemblyLike(type) {
      var t = String(type || '').trim().toLowerCase();
      if (t === 'dsxcad:product' || t === 'product' || t === 'physical product' || t === 'vpmreference') return true;
      if (t.indexOf('assembly') >= 0 || t.indexOf('montagem') >= 0) return true;
      return false;
    }

    function members(res) {
      if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(res);
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res.member)) return res.member;
      if (Array.isArray(res.data)) return res.data;
      return [];
    }

    function firstMember(res) {
      var m = members(res);
      return m && m.length ? m[0] : (res && res.member ? res.member : res);
    }

    function refOf(instance) {
      return instance && (instance.referencedObject || instance.referenceObject || instance.child || instance.related || instance.to || instance.reference) || null;
    }

    function refId(ref) {
      if (!ref) return '';
      var id = ref.identifier || ref.id || ref.physicalid || ref.physicalId || '';
      if (!id && ref.relativePath) {
        var m = String(ref.relativePath).match(/\/([^\/?#]+)(?:[?#].*)?$/);
        if (m) id = m[1];
      }
      return String(id || '').trim();
    }

    function cleanName(s) {
      return String(s || '').replace(/\.\d+\s*$/g, '').replace(/<\d+>\s*$/g, '').trim();
    }

    function attrsFrom(member, fallbackId) {
      var a = {};
      try {
        if (typeof AttributeService !== 'undefined' && AttributeService.extractFromMember) {
          a = AttributeService.extractFromMember(member) || {};
        }
      } catch (e) { a = {}; }
      a.physicalid = a.physicalid || (member && (member.id || member.identifier || member.physicalid)) || fallbackId || '';
      a.name = cleanName(a.name || (member && (member.title || member.name)) || a.physicalid);
      a.title = a.title || (member && (member.description || member.title)) || '';
      a.type = a.type || (member && member.type) || 'VPMReference';
      a.displayType = a.displayType || a.type || 'Physical Product';
      a.revision = a.revision || (member && member.revision) || '';
      a.state = a.state || a.maturity || (member && member.state) || '';
      a.maturity = a.maturity || a.state || '';
      a.owner = a.owner || (member && member.owner) || '';
      return a;
    }

    function makeItem(attrs, level, parentKey, occ) {
      var id = String((occ && occ.id) || attrs.physicalid || ('api_' + level + '_' + Math.random())).trim();
      return {
        physicalid: id,
        sourcePhysicalId: attrs.sourcePhysicalId || attrs.physicalid || '',
        referencePhysicalId: attrs.physicalid || '',
        bomChildrenId: attrs.physicalid || '',
        name: attrs.name || attrs.physicalid || id,
        title: attrs.title || attrs.name || '',
        type: attrs.type || 'VPMReference',
        displayType: attrs.displayType || attrs.type || 'Physical Product',
        revision: attrs.revision || '',
        state: attrs.state || attrs.maturity || '',
        maturity: attrs.maturity || attrs.state || '',
        owner: attrs.owner || '',
        quantity: parseFloat((occ && (occ.quantity || occ.qty || occ['dseng:quantity'])) || 1) || 1,
        level: level,
        parentKey: parentKey || '',
        approval: attrs.approval || ''
      };
    }

    function recursiveEngInstanceLoad(physicalId, options) {
      options = options || {};
      var onProgress = options.onProgress || function () {};
      var expected = options.expectedCount || 0;
      var maxDepth = (APP_CONFIG && (APP_CONFIG.PILOT_API_TREE_DEPTH || APP_CONFIG.BOM_INITIAL_DEPTH)) || 12;
      var maxNodes = (APP_CONFIG && APP_CONFIG.BOM_MAX_NODES) || 500;
      var top = (APP_CONFIG && APP_CONFIG.BOM_LAZY_BATCH_SIZE) || 100;
      var items = [];
      var fetchedParents = {};
      var rootApiId = '';

      function report(phase) {
        try { onProgress({ phase: phase || 'loading', loaded: items.length, expected: expected || items.length }); } catch (e) {}
      }

      function getDetail(id) {
        if (!id || !EnoviaApi || !EnoviaApi.getEngItem) return Promise.resolve(null);
        return EnoviaApi.getEngItem(id).then(firstMember).catch(function () { return null; });
      }

      function loadChildrenFor(parentApiId, parentKey, level) {
        if (!parentApiId || fetchedParents[parentApiId] || level > maxDepth || items.length >= maxNodes) return Promise.resolve();
        fetchedParents[parentApiId] = true;
        var all = [];
        var skip = 0;
        function page() {
          return EnoviaApi.getEngInstanceChildren(parentApiId, skip, top).then(function (res) {
            var ms = members(res);
            all = all.concat(ms);
            var total = (res && res.totalItems) || ms.length;
            skip += ms.length;
            if (ms.length === top && skip < total && items.length < maxNodes) return page();
            return all;
          }).catch(function () { return all; });
        }
        return page().then(function (instances) {
          return instances.reduce(function (p, inst) {
            return p.then(function () {
              if (items.length >= maxNodes) return null;
              var r = refOf(inst);
              var childApiId = refId(r);
              if (!childApiId) return null;
              return getDetail(childApiId).then(function (detail) {
                var source = detail || r || {};
                var attrs = attrsFrom(source, childApiId);
                attrs.physicalid = childApiId;
                if (!attrs.name || attrs.name === childApiId) attrs.name = cleanName(inst.name) || attrs.name;
                var item = makeItem(attrs, level, parentKey, inst);
                item.bomChildrenId = childApiId;
                item.referencePhysicalId = childApiId;
                items.push(item);
                report('loading');
                return loadChildrenFor(childApiId, item.physicalid, level + 1);
              });
            });
          }, Promise.resolve());
        });
      }

      return EnoviaApi.getProductRoot(physicalId, null).then(function (res) {
        var rootMember = firstMember(res);
        rootApiId = (res && res.bomRootId) || (rootMember && rootMember.id) || physicalId;
        var rootAttrs = attrsFrom(rootMember, rootApiId);
        rootAttrs.physicalid = rootApiId;
        items.push(makeItem(rootAttrs, 0, '', null));
        report('root');
        return loadChildrenFor(rootApiId, items[0].physicalid, 1);
      }).then(function () {
        if (typeof BomService !== 'undefined' && BomService.loadFromImportedItems) {
          return BomService.loadFromImportedItems(items).then(function () {
            report('done');
            return {
              productName: items[0] && (items[0].title || items[0].name) || 'E-BOM',
              rootPhysicalId: rootApiId || physicalId,
              itemCount: items.length,
              scopeMode: 'hotfix-recursive-enginstance',
              apiDiagnostics: { expectedCount: expected, loadedByHotfix: items.length }
            };
          });
        }
        report('done');
        return { productName: 'E-BOM', rootPhysicalId: rootApiId || physicalId, itemCount: items.length };
      });
    }

    if (typeof AttributeService !== 'undefined' && !AttributeService.__BOM20260608F_PATCHED__) {
      var oldAssemblyCheck = AttributeService.isAssemblyType;
      AttributeService.isAssemblyType = function (type) {
        if (isAssemblyLike(type)) return true;
        if (typeof oldAssemblyCheck === 'function') return oldAssemblyCheck.apply(this, arguments);
        return false;
      };
      AttributeService.__BOM20260608F_PATCHED__ = true;
    }

    if (typeof BomService !== 'undefined' && !BomService.__BOM20260608F_PATCHED__) {
      BomService.loadLazyFull = recursiveEngInstanceLoad;
      BomService.loadInitialScope = recursiveEngInstanceLoad;
      BomService.__BOM20260608F_PATCHED__ = true;
    }

    global.__BOM_HOTFIX_20260608A__ = true;
    global.__BOM_HOTFIX_MODE__ = 'recursive-enginstance-crawler';
    global.__BOM_BUILD_ID__ = 'bom20260608f';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
