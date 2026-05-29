/**
 * @file ui/bom-tree.js
 * Tree view E-BOM com expand/collapse lazy.
 */
var BomTree = (function () {
  'use strict';

  var container;
  var onExpandRequest = null;

  function init(selector, expandCallback) {
    container = document.querySelector(selector);
    onExpandRequest = expandCallback;
    if (container) {
      container.addEventListener('click', onClick);
    }
  }

  function onClick(e) {
    var toggle = e.target.closest('[data-action]');
    if (!toggle || !container) return;
    var action = toggle.getAttribute('data-action');
    var id = toggle.getAttribute('data-id');
    if (!id) return;

    if (action === 'expand') {
      if (onExpandRequest) {
        toggle.classList.add('loading');
        onExpandRequest(id).then(function () {
          toggle.classList.remove('loading');
          refresh(BomService.getIndex(), BomService.getRootId());
        });
      }
    } else if (action === 'collapse') {
      BomService.collapseNode(id);
      refresh(BomService.getIndex(), BomService.getRootId());
    }
  }

  function refresh(index, rootId) {
    if (!container) return;
    var tree = BomNormalizer.buildTree(index, rootId);
    if (!tree) {
      container.innerHTML = '<p class="empty-msg">Nenhuma estrutura carregada.</p>';
      return;
    }
    container.innerHTML = renderNode(tree);
  }

  function renderNode(node, depth) {
    depth = depth || 0;
    var n = node.data;
    var hasKids = node.hasChildren;
    var expanded = n.expanded;
    var indent = depth * 16;

    var toggle = '';
    if (hasKids) {
      if (expanded) {
        toggle = '<button type="button" class="tree-toggle" data-action="collapse" data-id="' + n.physicalid + '">▼</button>';
      } else {
        toggle = '<button type="button" class="tree-toggle" data-action="expand" data-id="' + n.physicalid + '">▶</button>';
      }
    } else {
      toggle = '<span class="tree-leaf">•</span>';
    }

    var html =
      '<div class="tree-row" style="padding-left:' + indent + 'px">' +
      toggle +
      '<span class="tree-label">' + escapeHtml(node.label) + '</span>' +
      '<span class="tree-meta">Qtd:' + (n.quantity || 1) + '</span>' +
      '</div>';

    if (expanded && node.children.length) {
      html += '<div class="tree-children">';
      node.children.forEach(function (ch) {
        html += renderNode(ch, depth + 1);
      });
      html += '</div>';
    }
    return html;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return { init: init, refresh: refresh };
})();
