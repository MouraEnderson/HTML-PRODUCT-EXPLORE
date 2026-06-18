/**
 * @file ui/bom-3d-viewer.js
 * Visualizador 3D próprio (Three.js) — sem 3DPlay.
 */
var Bom3DViewer = (function () {
  'use strict';

  var hostEl = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var controls = null;
  var animationId = 0;
  var statusEl = null;
  var resizeObserver = null;

  function hasThree() {
    return typeof window.THREE !== 'undefined' && window.THREE.WebGLRenderer;
  }

  function ensureHost(selector) {
    var root = window.__3DX_UI_ROOT__ || document;
    hostEl = typeof selector === 'string' ? root.querySelector(selector) : selector;
    if (!hostEl) return null;
    if (!hostEl.querySelector('.bom-3d-canvas-shell')) {
      hostEl.innerHTML =
        '<div class="bom-3d-canvas-shell">' +
        '<div class="bom-3d-canvas-host" aria-label="Visualizador 3D BOM Analytics"></div>' +
        '<p class="bom-3d-canvas-status"></p>' +
        '</div>';
    }
    statusEl = hostEl.querySelector('.bom-3d-canvas-status');
    return hostEl.querySelector('.bom-3d-canvas-host');
  }

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'bom-3d-canvas-status';
    if (kind === 'ok') statusEl.classList.add('bom-3d-canvas-status-ok');
    if (kind === 'warn') statusEl.classList.add('bom-3d-canvas-status-warn');
    if (kind === 'err') statusEl.classList.add('bom-3d-canvas-status-err');
  }

  function disposeScene() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = 0;
    }
    if (renderer) {
      try {
        renderer.dispose();
      } catch (e) {}
      renderer = null;
    }
    scene = null;
    camera = null;
    controls = null;
  }

  function fitCamera(object) {
    if (!camera || !object || !hasThree()) return;
    var THREE = window.THREE;
    var box = new THREE.Box3().setFromObject(object);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z, 0.001);
    var dist = maxDim * 2.2;
    camera.position.set(center.x + dist, center.y + dist * 0.6, center.z + dist);
    camera.lookAt(center);
    if (controls && controls.target) {
      controls.target.copy(center);
      controls.update();
    }
  }

  function animate() {
    if (!renderer || !scene || !camera) return;
    animationId = requestAnimationFrame(animate);
    if (controls && controls.update) controls.update();
    renderer.render(scene, camera);
  }

  function bindResize(canvas) {
    if (!canvas || !renderer || !camera) return;
    function onResize() {
      var w = canvas.clientWidth || 320;
      var h = canvas.clientHeight || 240;
      if (w < 10 || h < 10) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    onResize();
    if (window.ResizeObserver) {
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', onResize);
    }
  }

  function orbitControls(camera, dom) {
    if (!hasThree()) return null;
    var THREE = window.THREE;
    var state = { theta: 0.8, phi: 0.9, radius: 4, target: new THREE.Vector3() };
    var dragging = false;
    var lastX = 0;
    var lastY = 0;

    function update() {
      var x = state.radius * Math.sin(state.phi) * Math.cos(state.theta);
      var y = state.radius * Math.cos(state.phi);
      var z = state.radius * Math.sin(state.phi) * Math.sin(state.theta);
      camera.position.set(state.target.x + x, state.target.y + y, state.target.z + z);
      camera.lookAt(state.target);
    }

    function onDown(ev) {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
    }
    function onUp() {
      dragging = false;
    }
    function onMove(ev) {
      if (!dragging) return;
      var dx = ev.clientX - lastX;
      var dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      state.theta -= dx * 0.01;
      state.phi = Math.max(0.15, Math.min(Math.PI - 0.15, state.phi + dy * 0.01));
      update();
    }
    function onWheel(ev) {
      ev.preventDefault();
      state.radius = Math.max(0.5, Math.min(40, state.radius + ev.deltaY * 0.01));
      update();
    }

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointerleave', onUp);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    update();
    return { target: state.target, update: update };
  }

  function showMessage(msg, code) {
    var canvasHost = ensureHost('#partPreviewImage');
    if (!canvasHost) return;
    disposeScene();
    canvasHost.innerHTML =
      '<div class="bom-3d-canvas-empty">' +
      '<p class="bom-3d-canvas-empty-title">' +
      String(msg || 'Representação 3D web não disponível para este item.') +
      '</p>' +
      (code ? '<p class="bom-3d-canvas-empty-code">' + String(code) + '</p>' : '') +
      '</div>';
    setStatus(code || '', 'warn');
  }

  function showLoading(title) {
    var canvasHost = ensureHost('#partPreviewImage');
    if (!canvasHost) return;
    disposeScene();
    canvasHost.innerHTML =
      '<div class="bom-3d-canvas-loading">Carregando representação 3D' +
      (title ? ' — ' + String(title) : '') +
      '…</div>';
    setStatus('Carregando representação 3D…', 'ok');
  }

  function loadModel(url, format) {
    return new Promise(function (resolve, reject) {
      if (!hasThree()) {
        reject(new Error('THREE_NOT_LOADED'));
        return;
      }
      var THREE = window.THREE;
      format = String(format || '').toLowerCase();
      var onLoaded = function (obj) {
        resolve(obj);
      };
      var onError = function (err) {
        reject(err || new Error('MODEL_LOAD_FAILED'));
      };
      if (format === 'glb' || format === 'gltf' || /\.glb($|\?)/i.test(url) || /\.gltf($|\?)/i.test(url)) {
        if (!THREE.GLTFLoader) {
          reject(new Error('GLTF_LOADER_UNAVAILABLE'));
          return;
        }
        var gltf = new THREE.GLTFLoader();
        gltf.load(url, function (payload) {
          onLoaded(payload.scene || payload);
        }, undefined, onError);
        return;
      }
      if (format === 'obj' || /\.obj($|\?)/i.test(url)) {
        if (!THREE.OBJLoader) {
          reject(new Error('OBJ_LOADER_UNAVAILABLE'));
          return;
        }
        new THREE.OBJLoader().load(url, onLoaded, undefined, onError);
        return;
      }
      if (format === 'stl' || /\.stl($|\?)/i.test(url)) {
        if (!THREE.STLLoader) {
          reject(new Error('STL_LOADER_UNAVAILABLE'));
          return;
        }
        new THREE.STLLoader().load(
          url,
          function (geometry) {
            var mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9e9e9e }));
            onLoaded(mesh);
          },
          undefined,
          onError
        );
        return;
      }
      reject(new Error('NO_WEB_VIEWABLE_FORMAT'));
    });
  }

  function renderObject(object3d) {
    var canvasHost = ensureHost('#partPreviewImage');
    if (!canvasHost || !hasThree()) return false;
    disposeScene();
    canvasHost.innerHTML = '';
    var THREE = window.THREE;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    var w = canvasHost.clientWidth || 320;
    var h = canvasHost.clientHeight || 240;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h, false);
    canvasHost.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    var dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(3, 4, 5);
    scene.add(dir);
    scene.add(object3d);
    controls = orbitControls(camera, renderer.domElement);
    fitCamera(object3d);
    bindResize(renderer.domElement);
    animate();
    setStatus('Modelo 3D carregado.', 'ok');
    return true;
  }

  function show(opts) {
    opts = opts || {};
    if (!opts.modelUrl) {
      showMessage(
        opts.message || 'Representação 3D web não disponível para este item.',
        opts.code || ''
      );
      return Promise.resolve(false);
    }
    showLoading(opts.title || '');
    return loadModel(opts.modelUrl, opts.format)
      .then(function (obj) {
        return renderObject(obj);
      })
      .catch(function (err) {
        showMessage(
          'Representação 3D web não disponível para este item.',
          opts.code || (err && err.message) || 'MODEL_LOAD_FAILED'
        );
        return false;
      });
  }

  function clear() {
    disposeScene();
    if (hostEl) {
      hostEl.innerHTML =
        '<span class="bom-preview-placeholder">Clique numa linha da E-BOM para visualização 3D</span>';
    }
    setStatus('', 'ok');
  }

  function init(selector) {
    ensureHost(selector || '#partPreviewImage');
  }

  return {
    init: init,
    show: show,
    clear: clear,
    showLoading: showLoading,
    showMessage: showMessage
  };
})();

if (typeof window !== 'undefined') {
  window.Bom3DViewer = Bom3DViewer;
}
