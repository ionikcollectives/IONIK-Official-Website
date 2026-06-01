/* ═══════════════════════════════════════════════════════════
   IONIK — ionik-gear-viewer.js
   Interactive 3D viewer: strap.glb in the Gear project card.
   Pattern mirrors ionik-3d.js exactly — same approach that works.
═══════════════════════════════════════════════════════════ */

(function StrapViewer() {
    'use strict';

    /* Bail early — same guard as ionik-3d.js */
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') return;

    var canvas = document.getElementById('strapCanvas');
    if (!canvas) return;

    var container = canvas.parentElement;

    /* ── Dimensions: read AFTER the page has fully painted ── */
    function init() {
        var W = container.offsetWidth;
        var H = container.offsetHeight;

        /* If layout hasn't settled yet, wait one more frame */
        if (!W || !H) { requestAnimationFrame(init); return; }

        /* ── Renderer — let Three.js set canvas size (same as ionik-3d.js) ── */
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        } catch (e) { return; }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);                  /* sets canvas attrs + style */
        renderer.outputEncoding     = THREE.sRGBEncoding;
        renderer.toneMapping        = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;

        /* ── Scene & Camera ── */
        var scene  = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 2000);

        /* ── Lights ──
           Using AmbientLight + DirectionalLight only.
           No PMREMGenerator — that needs an extra GPU pass which can fail
           silently when a second WebGL context is already running (ionik-3d).
           MeshLambertMaterial (applied below) renders perfectly with this. */
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));

        var key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(4, 8, 6);
        scene.add(key);

        var teal = new THREE.DirectionalLight(0x00c9b1, 1.6);
        teal.position.set(-5, 2, -4);
        scene.add(teal);

        var fill = new THREE.DirectionalLight(0xaaccff, 0.8);
        fill.position.set(-3, -4, 5);
        scene.add(fill);

        /* ── Pivot ── */
        var pivot = new THREE.Group();
        scene.add(pivot);

        /* ── Drag rotation ── */
        var rotY = 0, rotX = 0, targetY = 0, targetX = 0, autoY = 0;
        var dragging = false, lastX = 0, lastY = 0;
        var idleTimer = null, isIdle = true;
        var PITCH = Math.PI * 0.36;
        var hint  = container.querySelector('.gp-card__model-hint');

        function dragStart(x, y) { dragging = true; isIdle = false; lastX = x; lastY = y; clearTimeout(idleTimer); if (hint) hint.style.opacity = '0'; }
        function dragMove(x, y)  { if (!dragging) return; targetY += (x - lastX) * 0.007; targetX = Math.max(-PITCH, Math.min(PITCH, targetX + (y - lastY) * 0.007)); lastX = x; lastY = y; }
        function dragEnd()       { dragging = false; idleTimer = setTimeout(function () { isIdle = true; }, 2000); }

        canvas.addEventListener('mousedown',  function (e) { dragStart(e.clientX, e.clientY); });
        window.addEventListener('mousemove',  function (e) { dragMove(e.clientX, e.clientY); });
        window.addEventListener('mouseup',    dragEnd);
        canvas.addEventListener('touchstart', function (e) { var t = e.touches[0]; dragStart(t.clientX, t.clientY); }, { passive: true });
        canvas.addEventListener('touchmove',  function (e) { var t = e.touches[0]; dragMove(t.clientX, t.clientY); e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchend',   dragEnd);

        /* ── Load model ── */
        new THREE.GLTFLoader().load(
            'Assets/kth.glb',

            function onLoad(gltf) {
                var model = gltf.scene;

                model.traverse(function (child) {
                    if (!child.isMesh) return;
                    var mats = Array.isArray(child.material) ? child.material : [child.material];
                    var newMats = mats.map(function (m) {
                        /* MeshLambertMaterial: diffuse-only, no specular glare,
                           supports texture maps, works with directional lights. */
                        var col = (m && m.color) ? m.color.clone() : new THREE.Color(0xcccccc);
                        return new THREE.MeshLambertMaterial({
                            color:       col,
                            map:         (m && m.map) ? m.map : null,
                            transparent: m ? !!m.transparent : false,
                            opacity:     (m && m.opacity != null) ? m.opacity : 1,
                            side:        THREE.DoubleSide
                        });
                    });
                    child.material = Array.isArray(child.material) ? newMats : newMats[0];
                });

                /* Centre & fit */
                var box = new THREE.Box3().setFromObject(model);
                var cen = new THREE.Vector3(), sz = new THREE.Vector3();
                box.getCenter(cen); box.getSize(sz);
                model.position.sub(cen);

                var maxDim = Math.max(sz.x, sz.y, sz.z);
                var fov    = camera.fov * (Math.PI / 180);
                var dist   = (maxDim * 0.5) / Math.tan(fov * 0.5) * 1.5;
                camera.position.set(0, 0, dist);
                camera.near = dist * 0.001;
                camera.far  = dist * 20;
                camera.lookAt(0, 0, 0);
                camera.updateProjectionMatrix();

                pivot.add(model);
                if (hint) setTimeout(function () { hint.style.opacity = '0'; }, 3000);
            },

            undefined,

            function onError(err) {
                console.warn('[IONIK Gear Viewer] kth.glb failed to load:', err);
            }
        );

        /* ── Resize — same as ionik-3d.js ── */
        window.addEventListener('resize', function () {
            W = container.offsetWidth;
            H = container.offsetHeight;
            camera.aspect = W / H;
            camera.updateProjectionMatrix();
            renderer.setSize(W, H);
        });

        /* ── Render loop ── */
        (function tick() {
            requestAnimationFrame(tick);
            if (isIdle && !dragging) autoY += 0.004;
            rotY += (targetY + autoY - rotY) * 0.09;
            rotX += (targetX          - rotX) * 0.09;
            pivot.rotation.y = rotY;
            pivot.rotation.x = rotX;
            renderer.render(scene, camera);
        }());
    }

    /* Defer exactly like ionik-3d.js: run after DOM + one rAF */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(init); });
    } else {
        requestAnimationFrame(init);
    }

}());
