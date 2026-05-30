/* ═══════════════════════════════════════════════════════════
   IONIK — ionik-3d.js
   3D background: KTH Tactical Bottle Carrier
   Requires three.min.js + GLTFLoader.js loaded before this.
   Works from file:// — no dev server required.
═══════════════════════════════════════════════════════════ */

(function GearBackground() {
    'use strict';

    /* Bail if Three.js or GLTFLoader didn't load (e.g. offline) */
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') return;

    var canvas = document.getElementById('gearCanvas');
    if (!canvas) return;

    var W = window.innerWidth;
    var H = window.innerHeight;

    /* ── Scene & Camera ── */
    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 2000);

    /* ── Renderer — transparent background ── */
    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) {
        return; /* WebGL not supported — degrade silently */
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputEncoding    = THREE.sRGBEncoding;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    var key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 6, 5);
    scene.add(key);

    /* Cool blue-teal fill — complements the teal strap */
    var fill = new THREE.DirectionalLight(0x88ddff, 0.8);
    fill.position.set(-4, -2, 3);
    scene.add(fill);

    /* Rim from behind */
    var rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(0, -3, -5);
    scene.add(rim);

    /* ── Pivot group ── */
    var pivot = new THREE.Group();
    scene.add(pivot);

    /* ── State ── */
    var targetRotY  = 0;
    var currentRotY = 0;
    var floatAmp    = 0;
    var startTime   = Date.now();

    /* ── Apply ghost transparency to a material ── */
    function ghostify(mat) {
        var m         = mat.clone();
        m.transparent = true;
        m.opacity     = 0.20;
        m.depthWrite  = false;
        return m;
    }

    /* ── Load the GLB ── */
    var loader = new THREE.GLTFLoader();
    loader.load(
        'Assets/Bottle Hook.glb',

        /* onLoad */
        function (gltf) {
            var model = gltf.scene;

            /* Center model at origin */
            var box    = new THREE.Box3().setFromObject(model);
            var center = new THREE.Vector3();
            var size   = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);
            model.position.sub(center);

            /* Fit camera to model — fills ~65 % of screen height */
            var maxDim  = Math.max(size.x, size.y, size.z);
            var fovRad  = camera.fov * (Math.PI / 180);
            var camDist = (maxDim * 0.5) / Math.tan(fovRad * 0.5) * 1.55;
            camera.position.z = camDist;
            camera.near       = camDist * 0.001;
            camera.far        = camDist * 20;
            camera.updateProjectionMatrix();

            /* Float amplitude: 3 % of model height */
            floatAmp = size.y * 0.03;

            /* Ghost every mesh material */
            model.traverse(function (child) {
                if (!child.isMesh) return;
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(ghostify);
                } else {
                    child.material = ghostify(child.material);
                }
            });

            /* Slight tilt so the hook hangs at a natural angle */
            model.rotation.x = -0.15;

            pivot.add(model);
        },

        /* onProgress */ undefined,

        /* onError */
        function (err) {
            console.warn('[IONIK 3D] Could not load model:', err);
        }
    );

    /* ── Scroll → clockwise Y rotation ── */
    window.addEventListener('scroll', function () {
        targetRotY = -window.scrollY * 0.003;
    }, { passive: true });

    /* ── Resize ── */
    window.addEventListener('resize', function () {
        W = window.innerWidth;
        H = window.innerHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    });

    /* ── Render loop ── */
    function tick() {
        requestAnimationFrame(tick);

        var t = (Date.now() - startTime) * 0.001; /* seconds */

        /* Smooth lerp toward scroll target */
        currentRotY += (targetRotY - currentRotY) * 0.045;
        pivot.rotation.y = currentRotY;

        /* Gentle sinusoidal float */
        pivot.position.y = Math.sin(t * 0.38) * floatAmp;

        renderer.render(scene, camera);
    }
    tick();

}());
