/**
 * @file processing/bom-normalizer.js
 * Modelo plano e hierárquico para UI e exportação.
 */
var BomNormalizer = (function () {
  'use strict';

  function toFlatList(index, rootId) {
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
