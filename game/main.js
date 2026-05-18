/**
 * MUNDO PERDIDO — VR EXPLORER
 * Three.js r169 + WebXR · Meta Quest 3
 * Práctica 3.7 — Escenarios VR
 *
 * ─── ASSETS REQUERIDOS (descargar y colocar en las rutas indicadas) ───────────
 *
 * 1. PERSONAJE (FBX con animaciones) — Mixamo (mixamo.com, gratis):
 *    - Personaje: "Kaya" o "Maria" (skin humano, NO maniquí)
 *    - Descarga: Character + Animation en formato FBX (with skin)
 *    Animaciones descargadas POR SEPARADO (mismo personaje, "In Place"):
 *      · Walking.fbx      → solo animación, mismo esqueleto
 *      · Running.fbx      → solo animación, mismo esqueleto
 *      · Jump.fbx         → solo animación (Jumping Up)
 *      · Dance.fbx        → solo animación (Samba Dancing / Hip Hop Dancing)
 *    Rutas: ../assets/models/character.fbx
 *            ../assets/models/Walking.fbx
 *            ../assets/models/Running.fbx
 *            ../assets/models/Jump.fbx
 *            ../assets/models/Dance.fbx
 *
 * 2. HDR entorno 360° — Poly Haven (polyhaven.com, gratis):
 *    - Sugerido: "autumn_park_4k.hdr" o "kiara_1_dawn_4k.hdr"
 *    - Descargar en 2K (para que no sea demasiado pesado)
 *    - Ruta: ../assets/hdr/environment.hdr
 *
 * 3. TEXTURAS — Poly Haven o AmbientCG (gratis):
 *    - Piso: "Grass001" o "Ground037" → ground_color.jpg + ground_normal.jpg
 *    - Roca: "Rock030" → rock_color.jpg + rock_normal.jpg
 *    - Rutas: ../assets/textures/ground_color.jpg  (y _normal.jpg)
 *              ../assets/textures/rock_color.jpg    (y _normal.jpg)
 *
 * 4. SONIDOS (formato mp3, libres de derechos — freesound.org):
 *    - ../assets/sounds/music.mp3       → música de fondo (naturaleza/aventura)
 *    - ../assets/sounds/footstep.mp3    → paso de pie
 *    - ../assets/sounds/jump.mp3        → sonido salto
 *    - ../assets/sounds/land.mp3        → aterrizaje
 *    - ../assets/sounds/collide.mp3     → choque con objeto
 *
 * 5. FAVICON/ÍCONO:
 *    - ../assets/icons/favicon.png      → ícono de la pestaña (32×32 px)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE          from 'three';
import { FBXLoader }       from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader }      from 'three/addons/loaders/RGBELoader.js';
import { VRButton }        from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTES Y ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
const ESCENA_MITAD  = 40;   // Radio del escenario (metros)
const GRAVEDAD      = -18;
const VEL_CAMINAR   = 4.5;
const VEL_CORRER    = 9.0;
const FUERZA_SALTO  = 7.5;
const ALTURA_PISO   = 0;
const CAMARA_OFFSET = new THREE.Vector3(0, 2.2, 5.5);

let scene, camera, renderer, clock;
let mixer, character;
let actions = {};           // { idle, walk, run, jump, dance }
let estadoAnim = 'idle';    // estado actual

let controls;               // OrbitControls PC
let isVR = false;
let controller1, controller2, controllerGrip1, controllerGrip2;

// Física simple del personaje
let posChar    = new THREE.Vector3(0, ALTURA_PISO, 0);
let velY       = 0;
let enPiso     = true;
let rotChar    = 0;         // ángulo Y actual del personaje (radianes)
let rotTarget  = 0;         // ángulo Y objetivo para giro fluido

// Teclado
const keys = {};
let pendingTurn = 0;        // giro de 90° pendiente (±PI/2)
let turnCooldown = 0;

// Objetos físicos de la escena
const objetosFisicos = [];  // { mesh, vel, angVel }
const RADIO_COLISION_OBJ = 0.8;
const RADIO_COLISION_CHAR = 0.5;

// Niebla
const COLOR_NIEBLA = new THREE.Color(0xb8d4a0);

// VR joysticks
let vrAxisIzq  = [0, 0];
let vrAxisDer  = [0, 0];
let vrButtonA  = false;
let vrButtonB  = false;
let _prevA = false, _prevB = false;

// HUD VR
let hudVR, hudCanvas3D, hudCtx3D, hudTexture3D;

// Audio
let audioCtx, musicNode, footstepBuffer, jumpBuffer, landBuffer, collideBuffer;
let footstepTimer = 0;
let wasInAir = false;

// Loading
let assetsLoaded = 0;
const TOTAL_ASSETS = 4;  // personaje + hdr + 2 texturas

// ─────────────────────────────────────────────────────────────────────────────
//  PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
function setProgress(n, hint) {
    const pct = Math.round((n / TOTAL_ASSETS) * 100);
    const bar = document.getElementById('prog');
    if (bar) bar.style.width = pct + '%';
    const h = document.getElementById('loading-hint');
    if (h && hint) h.textContent = hint;
}

function maybeHideLoading() {
    assetsLoaded++;
    setProgress(assetsLoaded);
    if (assetsLoaded >= TOTAL_ASSETS) {
        const el = document.getElementById('loading');
        if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.8s'; setTimeout(() => el.remove(), 850); }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────────────────
function init() {
    clock = new THREE.Clock();

    // ── Renderer ──
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Botón VR
    const vrBtn = VRButton.createButton(renderer);
    document.body.appendChild(vrBtn);

    // ── Scene ──
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLOR_NIEBLA, 0.028);

    // ── Camera ──
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 3, 8);

    // ── Orbit controls (solo PC) ──
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan    = false;
    controls.enableZoom   = false;
    controls.minDistance  = 3;
    controls.maxDistance  = 12;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // ── Luces ──
    buildLights();

    // ── Escenario ──
    buildScenario();

    // ── HDR ──
    setProgress(0, 'Cargando ambiente HDR...');
    new RGBELoader().setPath('../assets/hdr/')
        .load('environment.hdr', tex => {
            tex.mapping       = THREE.EquirectangularReflectionMapping;
            scene.background  = tex;
            scene.environment = tex;
            maybeHideLoading();
        }, undefined, () => {
            // Si no hay HDR, color sólido de cielo
            scene.background = new THREE.Color(0x4a7a30);
            maybeHideLoading();
        });

    // ── Personaje (FBX Mixamo) ──
    setProgress(0, 'Cargando personaje...');
    loadCharacter();

    // ── Objetos físicos ──
    buildPhysicsObjects();

    // ── Controladores VR ──
    initVRControllers();

    // ── Audio ──
    initAudio();

    // ── Teclado ──
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   e => { keys[e.code] = false; });
    window.addEventListener('resize', onResize);

    // ── Sesión VR ──
    renderer.xr.addEventListener('sessionstart', () => {
        isVR = true;
        controls.enabled = false;
        ['hud','crosshair','anim-label'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        crearHUDVR();
    });
    renderer.xr.addEventListener('sessionend', () => {
        isVR = false;
        controls.enabled = true;
        ['hud','crosshair','anim-label'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
        if (hudVR) { scene.remove(hudVR); hudVR = null; }
    });

    renderer.setAnimationLoop(animate);
}

// ─────────────────────────────────────────────────────────────────────────────
//  LUCES
// ─────────────────────────────────────────────────────────────────────────────
function buildLights() {
    // Luz ambiental suave (la del entorno HDR la complementa)
    const ambient = new THREE.AmbientLight(0x90b060, 0.6);
    scene.add(ambient);

    // Sol (luz principal con sombras)
    const sun = new THREE.DirectionalLight(0xfff4cc, 2.2);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 200;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
    sun.shadow.camera.right = sun.shadow.camera.top   =  60;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Relleno atmosférico azul (sky bounce)
    const fill = new THREE.HemisphereLight(0x6fa8d4, 0x3a6e2a, 0.5);
    scene.add(fill);

    // Luz cálida de antorcha (punto de interés) — como antorcha o hoguera
    const campfire = new THREE.PointLight(0xff8844, 3.5, 18);
    campfire.position.set(-8, 1.2, -8);
    campfire.castShadow = true;
    scene.add(campfire);

    // Animación de parpadeo de la antorcha
    campfire.userData.baseIntensity = 3.5;
    campfire.userData.flickerPhase  = 0;
    campfire.userData.isFlicker     = true;
    scene.userData.campfire = campfire;

    // Segundo punto de luz (luna simulada, fría)
    const moon = new THREE.DirectionalLight(0x8899cc, 0.4);
    moon.position.set(-40, 30, -30);
    scene.add(moon);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESCENARIO
// ─────────────────────────────────────────────────────────────────────────────
function buildScenario() {
    const texLoader = new THREE.TextureLoader();

    // ── PISO con textura ──
    setProgress(0, 'Cargando texturas de suelo...');
    const groundColor  = texLoader.load('../assets/textures/ground_color.jpg',  () => { assetsLoaded++; setProgress(assetsLoaded); }, undefined, () => maybeHideLoading());
    const groundNormal = texLoader.load('../assets/textures/ground_normal.jpg', () => {}, undefined, () => {});

    // Repetición de textura para cubrir el plano
    [groundColor, groundNormal].forEach(t => {
        if (!t) return;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(20, 20);
    });

    const groundGeo = new THREE.PlaneGeometry(ESCENA_MITAD * 2, ESCENA_MITAD * 2, 30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
        map:         groundColor,
        normalMap:   groundNormal,
        roughness:   0.9, metalness: 0.0,
        color:       0x5a8040   // fallback si no carga textura
    });

    // Ondulación ligera del terreno (heightmap procedural)
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getY(i);
        pos.setZ(i, Math.sin(x * 0.18) * 0.35 + Math.sin(z * 0.22) * 0.3);
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── ÁRBOLES procedurales ──
    buildTrees();

    // ── ARBUSTOS ──
    buildBushes();

    // ── MUROS LÍMITE (invisibles, solo para colisión lógica) ──
    // Se manejan en el update del personaje (clamp de posición)

    // ── HOGUERA ──
    buildCampfire();

    // ── ZONA DE PASTO DIFERENTE (círculo) ──
    const patchGeo = new THREE.CircleGeometry(6, 32);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x2d6e20, roughness: 0.95 });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(8, 0.01, -8);
    patch.receiveShadow = true;
    scene.add(patch);
}

function buildTrees() {
    const treePositions = [
        [-12, 0, -15], [14, 0, -18], [-18, 0, 10], [16, 0, 8],
        [-6,  0, -22], [20, 0, -6],  [-20, 0, -4], [10, 0, 18],
        [-14, 0, 16],  [0,  0, -25], [22, 0, 14],  [-22, 0, -16]
    ];

    treePositions.forEach(([x, y, z]) => {
        const group = new THREE.Group();

        // Tronco
        const trunkH = 2.5 + Math.random() * 1.5;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.28, trunkH, 8),
            new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 1 })
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Copa (2–3 esferas solapadas)
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.9 });
        const h = trunkH;
        [[0, h + 1.4, 0, 1.8], [0.5, h + 0.6, 0.3, 1.3], [-0.4, h + 0.5, -0.2, 1.2]].forEach(([dx, dy, dz, r]) => {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
            leaf.position.set(dx, dy, dz);
            leaf.castShadow = true;
            group.add(leaf);
        });

        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        group.scale.setScalar(0.8 + Math.random() * 0.5);
        scene.add(group);
    });
}

function buildBushes() {
    const bushPositions = [[-4,0,-10],[3,0,-8],[8,0,4],[-6,0,6],[-10,0,-2],[5,0,10],[-8,0,12],[12,0,-5]];
    bushPositions.forEach(([x, y, z]) => {
        const scale = 0.5 + Math.random() * 0.5;
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(scale, 7, 5),
            new THREE.MeshStandardMaterial({ color: 0x1e5c1e, roughness: 1 })
        );
        bush.position.set(x, scale * 0.6, z);
        bush.castShadow = true;
        scene.add(bush);
    });
}

function buildCampfire() {
    // Base (piedras)
    const stoneGeo = new THREE.TorusGeometry(0.5, 0.18, 6, 8);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888070, roughness: 1 });
    const stones = new THREE.Mesh(stoneGeo, stoneMat);
    stones.rotation.x = -Math.PI / 2;
    stones.position.set(-8, 0.05, -8);
    scene.add(stones);

    // Troncos cruzados
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 1 });
    [-1, 1].forEach(sign => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.0, 7), logMat);
        log.position.set(-8, 0.2, -8);
        log.rotation.z = sign * 0.6;
        scene.add(log);
    });

    // Llamas (cono naranja/rojo translúcido)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 8), flameMat);
    flame.position.set(-8, 0.8, -8);
    flame.userData.isFlame = true;
    scene.add(flame);
}

// ─────────────────────────────────────────────────────────────────────────────
//  OBJETOS FÍSICOS (mínimo 5)
// ─────────────────────────────────────────────────────────────────────────────
function buildPhysicsObjects() {
    const texLoader = new THREE.TextureLoader();
    const rockColor  = texLoader.load('../assets/textures/rock_color.jpg',  () => {}, undefined, () => {});
    const rockNormal = texLoader.load('../assets/textures/rock_normal.jpg', () => {}, undefined, () => {});
    [rockColor, rockNormal].forEach(t => { if(t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2,2); }});

    const rockMat = new THREE.MeshStandardMaterial({ map: rockColor, normalMap: rockNormal, color: 0x888880, roughness: 0.95 });

    // 1–5: Piedras estáticas con física al ser golpeadas
    const rockData = [
        { pos: [3, 0.5, 3],   r: 0.6 },
        { pos: [-3, 0.4, 2],  r: 0.5 },
        { pos: [1, 0.35, -4], r: 0.45 },
        { pos: [5, 0.3, -2],  r: 0.4 },
        { pos: [-2, 0.55, 5], r: 0.65 },
    ];

    rockData.forEach(({ pos, r }) => {
        const geo  = new THREE.DodecahedronGeometry(r, 0);
        // Deformar para que no sean perfectas
        const verts = geo.attributes.position;
        for (let i = 0; i < verts.count; i++) {
            verts.setX(i, verts.getX(i) * (0.85 + Math.random() * 0.3));
            verts.setY(i, verts.getY(i) * (0.85 + Math.random() * 0.3));
            verts.setZ(i, verts.getZ(i) * (0.85 + Math.random() * 0.3));
        }
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, rockMat.clone());
        mesh.position.set(...pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        objetosFisicos.push({ mesh, vel: new THREE.Vector3(), angVel: new THREE.Vector3(), radio: r, enPiso: true });
    });

    // 6: Pelota (tiene movimiento) — rueda cuando el personaje la golpea
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xe04020, roughness: 0.5, metalness: 0.1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), ballMat);
    ball.position.set(-1, 0.45, 1);
    ball.castShadow = true;
    scene.add(ball);
    objetosFisicos.push({ mesh: ball, vel: new THREE.Vector3(), angVel: new THREE.Vector3(), radio: 0.45, enPiso: true, esRodante: true });

    // 7: Barril (se tambalea)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x8b5e2a, roughness: 0.8 });
    const barrel = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), barrelMat);
    barrel.add(body);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.04, 6, 14), new THREE.MeshStandardMaterial({ color: 0x444430 }));
    ring1.rotation.x = Math.PI / 2; ring1.position.y =  0.25; barrel.add(ring1);
    const ring2 = ring1.clone(); ring2.position.y = -0.25; barrel.add(ring2);
    barrel.position.set(4, 0.45, 4);
    barrel.castShadow = true;
    scene.add(barrel);
    objetosFisicos.push({ mesh: barrel, vel: new THREE.Vector3(), angVel: new THREE.Vector3(), radio: 0.38, enPiso: true });

    // 8: Caja de madera
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xc4a060, roughness: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), boxMat);
    box.position.set(-4, 0.35, -3);
    box.castShadow = true;
    scene.add(box);
    objetosFisicos.push({ mesh: box, vel: new THREE.Vector3(), angVel: new THREE.Vector3(), radio: 0.5, enPiso: true });
}

// ─────────────────────────────────────────────────────────────────────────────
//  PERSONAJE FBX (Mixamo)
// ─────────────────────────────────────────────────────────────────────────────
function loadCharacter() {
    const fbxLoader = new FBXLoader();

    fbxLoader.load('../assets/models/character.fbx', fbx => {
        // Escalar al tamaño de la escena (Mixamo trae en cm → cm a m ≈ 0.01)
        fbx.scale.setScalar(0.012);
        fbx.traverse(obj => {
            obj.castShadow    = true;
            obj.receiveShadow = true;
            if (obj.isMesh && obj.material) {
                // Asegurar materiales PBR
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => { m.metalness = 0; m.roughness = 0.7; });
                } else {
                    obj.material.metalness = 0; obj.material.roughness = 0.7;
                }
            }
        });

        character = new THREE.Group();
        character.add(fbx);
        character.position.copy(posChar);
        scene.add(character);

        mixer = new THREE.AnimationMixer(fbx);

        // Cargar las animaciones separadas
        const animFiles = { walk: 'Walking.fbx', run: 'Running.fbx', jump: 'Jump.fbx', dance: 'Dance.fbx' };

        // Animación idle (del propio FBX del personaje, primera clip)
        if (fbx.animations && fbx.animations.length > 0) {
            actions.idle = mixer.clipAction(fbx.animations[0]);
            actions.idle.play();
        }

        let animLoaded = 0;
        const totalAnims = Object.keys(animFiles).length;

        Object.entries(animFiles).forEach(([name, file]) => {
            fbxLoader.load(`../assets/models/${file}`, animFBX => {
                if (animFBX.animations && animFBX.animations.length > 0) {
                    const clip = animFBX.animations[0];
                    clip.name  = name;
                    actions[name] = mixer.clipAction(clip);
                    actions[name].setLoop(
                        name === 'jump' ? THREE.LoopOnce : THREE.LoopRepeat
                    );
                    if (name === 'jump') actions[name].clampWhenFinished = true;
                }
                animLoaded++;
                if (animLoaded >= totalAnims) {
                    setAnimacion('idle');
                    maybeHideLoading(); // cuenta el personaje + sus anims como 1 asset
                }
            }, undefined, () => {
                animLoaded++;
                if (animLoaded >= totalAnims) maybeHideLoading();
            });
        });

    }, xhr => {
        setProgress(assetsLoaded, `Personaje: ${Math.round(xhr.loaded / xhr.total * 100)}%`);
    }, () => {
        // Si no hay FBX, crear fallback de personaje con geometría
        buildFallbackCharacter();
        maybeHideLoading();
    });
}

// Personaje fallback si no hay FBX
function buildFallbackCharacter() {
    character = new THREE.Group();

    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.6 });
    const skinMat  = new THREE.MeshStandardMaterial({ color: 0xf5c8a0, roughness: 0.7 });
    const hairMat  = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.9 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.55, 8), bodyMat);
    torso.position.y = 1.05; character.add(torso);
    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
    head.position.y = 1.55; character.add(head);
    // Pelo
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), hairMat);
    hair.position.y = 1.68; hair.scale.y = 0.6; character.add(hair);
    // Piernas
    [[-0.12, 0], [0.12, 0]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 7), bodyMat);
        leg.position.set(x, 0.55, z); character.add(leg);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.22), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        foot.position.set(x, 0.3, z + 0.04); character.add(foot);
    });
    // Brazos
    [[-0.3, 0], [0.3, 0]].forEach(([x, z]) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 7), skinMat);
        arm.position.set(x, 1.0, z); arm.rotation.z = x > 0 ? -0.25 : 0.25;
        character.add(arm);
    });

    character.position.copy(posChar);
    scene.add(character);

    // Animaciones procedurales simples para el fallback
    buildProceduralAnimations();
}

// Animaciones procedurales (solo fallback)
let proceduralTime = 0;
function buildProceduralAnimations() {
    actions.idle = { type: 'proc', name: 'idle' };
    actions.walk = { type: 'proc', name: 'walk' };
    actions.run  = { type: 'proc', name: 'run'  };
    actions.jump = { type: 'proc', name: 'jump' };
    actions.dance = { type: 'proc', name: 'dance' };
}

function applyProceduralAnim(dt) {
    if (!character || !actions[estadoAnim] || actions[estadoAnim].type !== 'proc') return;
    proceduralTime += dt;
    const t = proceduralTime;
    const children = character.children;
    if (!children.length) return;

    const spd = estadoAnim === 'run' ? 8 : (estadoAnim === 'dance' ? 5 : 4);
    const bob = estadoAnim === 'idle' ? Math.sin(t * 1.5) * 0.02 : Math.sin(t * spd) * 0.05;

    character.children.forEach((c, i) => {
        if (i === 0) c.position.y = 1.05 + bob; // torso
        if (i === 1) c.position.y = 1.55 + bob; // cabeza
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMACIONES DEL PERSONAJE
// ─────────────────────────────────────────────────────────────────────────────
function setAnimacion(nombre) {
    if (!actions[nombre] || estadoAnim === nombre) return;
    const prevAction = actions[estadoAnim];
    estadoAnim = nombre;
    const newAction  = actions[nombre];

    // Si son acciones Mixer reales
    if (prevAction && prevAction.isRunning && prevAction.isRunning()) {
        prevAction.fadeOut(0.25);
    }
    if (newAction && newAction.reset) {
        newAction.reset().fadeIn(0.25).play();
    }

    // Etiqueta en pantalla
    const labels = { idle: 'EN REPOSO', walk: 'CAMINANDO', run: 'CORRIENDO', jump: 'SALTANDO', dance: 'BAILANDO' };
    const el = document.getElementById('anim-label');
    if (el) {
        el.textContent = labels[nombre] || nombre.toUpperCase();
        el.style.opacity = '1';
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIO
// ─────────────────────────────────────────────────────────────────────────────
function initAudio() {
    document.addEventListener('click', startAudio, { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
}

async function startAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    async function loadBuf(url) {
        try {
            const resp = await fetch(url);
            const arr  = await resp.arrayBuffer();
            return await audioCtx.decodeAudioData(arr);
        } catch { return null; }
    }

    // Música de fondo (loop)
    const musicBuf = await loadBuf('../assets/sounds/music.mp3');
    if (musicBuf) {
        musicNode = audioCtx.createBufferSource();
        musicNode.buffer = musicBuf;
        musicNode.loop   = true;
        const gainMus = audioCtx.createGain(); gainMus.gain.value = 0.25;
        musicNode.connect(gainMus).connect(audioCtx.destination);
        musicNode.start();
    }

    footstepBuffer = await loadBuf('../assets/sounds/footstep.mp3');
    jumpBuffer     = await loadBuf('../assets/sounds/jump.mp3');
    landBuffer     = await loadBuf('../assets/sounds/land.mp3');
    collideBuffer  = await loadBuf('../assets/sounds/collide.mp3');
}

function playSound(buffer, vol = 1) {
    if (!audioCtx || !buffer) return;
    const src  = audioCtx.createBufferSource();
    src.buffer = buffer;
    const gain = audioCtx.createGain(); gain.gain.value = vol;
    src.connect(gain).connect(audioCtx.destination);
    src.start();
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLADORES VR
// ─────────────────────────────────────────────────────────────────────────────
function initVRControllers() {
    const factory = new XRControllerModelFactory();

    controller1 = renderer.xr.getController(0); // derecho
    controller1.addEventListener('selectstart', () => {});
    scene.add(controller1);
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(factory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controller2 = renderer.xr.getController(1); // izquierdo
    scene.add(controller2);
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(factory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
}

function leerVRGamepads() {
    if (!isVR) return;
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const src of session.inputSources) {
        if (!src.gamepad) continue;
        const axes = src.gamepad.axes;
        const btns = src.gamepad.buttons;

        if (src.handedness === 'left' && axes.length >= 4) {
            vrAxisIzq[0] = axes[2];
            vrAxisIzq[1] = axes[3];
        }
        if (src.handedness === 'right' && axes.length >= 4) {
            vrAxisDer[0] = axes[2];
            vrAxisDer[1] = axes[3];
            // Botón A (índice 4 en Quest) → saltar
            vrButtonA = btns[4]?.pressed || false;
            // Botón B (índice 5) → bailar
            vrButtonB = btns[5]?.pressed || false;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HUD VR (canvas flotante)
// ─────────────────────────────────────────────────────────────────────────────
function crearHUDVR() {
    hudCanvas3D = document.createElement('canvas');
    hudCanvas3D.width  = 512;
    hudCanvas3D.height = 128;
    hudCtx3D   = hudCanvas3D.getContext('2d');
    hudTexture3D = new THREE.CanvasTexture(hudCanvas3D);

    const geo = new THREE.PlaneGeometry(0.8, 0.2);
    const mat = new THREE.MeshBasicMaterial({ map: hudTexture3D, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    hudVR = new THREE.Mesh(geo, mat);
    scene.add(hudVR);
}

function actualizarHUDVR(xrCamera) {
    if (!hudVR || !xrCamera) return;
    const offset = new THREE.Vector3(0, -0.3, -0.9);
    offset.applyQuaternion(xrCamera.quaternion);
    hudVR.position.copy(xrCamera.position).add(offset);
    hudVR.quaternion.copy(xrCamera.quaternion);

    // Dibujar HUD
    const c = hudCtx3D, w = 512, h = 128;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(10,15,7,0.7)';
    roundRect(c, 8, 8, w - 16, h - 16, 12); c.fill();
    c.strokeStyle = 'rgba(212,168,67,0.5)'; c.lineWidth = 2;
    roundRect(c, 8, 8, w - 16, h - 16, 12); c.stroke();
    c.fillStyle = '#d4a843'; c.font = 'bold 22px Arial'; c.textAlign = 'center';
    c.fillText('MUNDO PERDIDO VR', w / 2, 48);
    c.fillStyle = 'rgba(212,168,67,0.6)'; c.font = '17px Arial';
    c.fillText(`ANIMACIÓN: ${estadoAnim.toUpperCase()}`, w / 2, 80);
    hudTexture3D.needsUpdate = true;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TECLADO
// ─────────────────────────────────────────────────────────────────────────────
function onKeyDown(e) {
    keys[e.code] = true;

    // Saltar
    if (e.code === 'Space' && enPiso) {
        velY = FUERZA_SALTO;
        enPiso = false;
        setAnimacion('jump');
        playSound(jumpBuffer, 0.6);
    }

    // Bailar
    if (e.code === 'KeyB') {
        setAnimacion(estadoAnim === 'dance' ? 'idle' : 'dance');
    }

    // Girar 90° (se acumula si ya hay uno pendiente)
    if ((e.code === 'KeyQ') && turnCooldown <= 0) {
        rotTarget += Math.PI / 2;
        turnCooldown = 0.4;
    }
    if ((e.code === 'KeyE') && turnCooldown <= 0) {
        rotTarget -= Math.PI / 2;
        turnCooldown = 0.4;
    }

    // Silenciar música
    if (e.code === 'KeyM' && musicNode) {
        if (audioCtx.state === 'running') audioCtx.suspend();
        else audioCtx.resume();
    }

    // Reiniciar
    if (e.code === 'KeyR') location.reload();
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTUALIZAR PERSONAJE
// ─────────────────────────────────────────────────────────────────────────────
const _dir = new THREE.Vector3();
const _forward = new THREE.Vector3();

function updateCharacter(dt) {
    if (!character) return;

    // ── Inputs ──
    const corriendo = keys['ShiftLeft'] || keys['ShiftRight'];
    const moveX = (keys['KeyA'] ? 1 : 0) - (keys['KeyD'] ? 1 : 0);
    const moveZ = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);

    let moveXvr = 0, moveZvr = 0;
    const dz = 0.15;
    if (isVR) {
        moveXvr = Math.abs(vrAxisIzq[0]) > dz ? -vrAxisIzq[0] : 0;
        moveZvr = Math.abs(vrAxisIzq[1]) > dz ? -vrAxisIzq[1] : 0;
    }

    const totalX = moveX + moveXvr;
    const totalZ = moveZ + moveZvr;
    const moving = Math.abs(totalX) + Math.abs(totalZ) > 0.05;
    const vel    = corriendo ? VEL_CORRER : VEL_CAMINAR;

    // ── Animación ──
    if (enPiso && estadoAnim !== 'dance') {
        if (moving) {
            setAnimacion(corriendo ? 'run' : 'walk');
        } else if (estadoAnim !== 'idle' && estadoAnim !== 'jump') {
            setAnimacion('idle');
        }
    }
    if (!enPiso && estadoAnim !== 'jump') setAnimacion('jump');

    // Aterrizó
    if (enPiso && wasInAir) {
        playSound(landBuffer, 0.5);
        if (estadoAnim === 'jump') setAnimacion('idle');
        wasInAir = false;
    }
    if (!enPiso) wasInAir = true;

    // ── Movimiento ──
    if (moving) {
        // Orientar según cámara (PC) o absoluto (VR)
        const angle = isVR ? 0 : controls.getAzimuthalAngle();
        _forward.set(totalX, 0, totalZ).normalize();
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        _dir.set(
            _forward.x * cosA + _forward.z * sinA,
            0,
            -_forward.x * sinA + _forward.z * cosA
        );

        posChar.x += _dir.x * vel * dt;
        posChar.z += _dir.z * vel * dt;

        // Apuntar personaje en la dirección del movimiento (suave)
        const targetAngle = Math.atan2(_dir.x, _dir.z);
        rotChar = lerpAngle(rotChar, targetAngle, 10 * dt);

        // Pasos
        footstepTimer -= dt;
        if (footstepTimer <= 0) {
            playSound(footstepBuffer, 0.4);
            footstepTimer = corriendo ? 0.3 : 0.5;
        }
    }

    // ── Giro 90° (Q / E) ──
    if (turnCooldown > 0) turnCooldown -= dt;
    rotChar = lerpAngle(rotChar, rotTarget, 12 * dt);

    // VR giro derecho
    if (isVR && Math.abs(vrAxisDer[0]) > 0.5 && turnCooldown <= 0) {
        rotTarget -= Math.sign(vrAxisDer[0]) * Math.PI / 2;
        turnCooldown = 0.4;
    }

    // ── Salto VR ──
    if (isVR && vrButtonA && !_prevA && enPiso) {
        velY = FUERZA_SALTO;
        enPiso = false;
        setAnimacion('jump');
        playSound(jumpBuffer, 0.6);
    }
    _prevA = vrButtonA;

    // ── Baile VR ──
    if (isVR && vrButtonB && !_prevB) {
        setAnimacion(estadoAnim === 'dance' ? 'idle' : 'dance');
    }
    _prevB = vrButtonB;

    // ── Gravedad ──
    velY += GRAVEDAD * dt;
    posChar.y += velY * dt;

    if (posChar.y <= ALTURA_PISO) {
        posChar.y = ALTURA_PISO;
        velY = 0;
        enPiso = true;
    }

    // ── Límites del escenario ──
    const lim = ESCENA_MITAD - 1.5;
    posChar.x = Math.max(-lim, Math.min(lim, posChar.x));
    posChar.z = Math.max(-lim, Math.min(lim, posChar.z));

    // ── Aplicar transform al personaje ──
    character.position.copy(posChar);
    character.rotation.y = rotChar;

    // ── Colisión con objetos físicos ──
    objetosFisicos.forEach(obj => {
        const dx = posChar.x - obj.mesh.position.x;
        const dz = posChar.z - obj.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = RADIO_COLISION_CHAR + obj.radio;

        if (dist < minDist && dist > 0.01) {
            const overlap = minDist - dist;
            const nx = dx / dist, nz = dz / dist;

            // Empujar objeto
            const impulso = 2.5 + vel * 0.4;
            obj.vel.x += nx * impulso;
            obj.vel.z += nz * impulso;
            if (obj.esRodante) {
                obj.angVel.x += nz * impulso * 2;
                obj.angVel.z -= nx * impulso * 2;
            }

            // Separar personaje del objeto
            posChar.x += nx * overlap * 0.5;
            posChar.z += nz * overlap * 0.5;

            playSound(collideBuffer, 0.3);
        }
    });
}

function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * Math.min(1, t);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTUALIZAR OBJETOS FÍSICOS
// ─────────────────────────────────────────────────────────────────────────────
function updatePhysics(dt) {
    objetosFisicos.forEach(obj => {
        // Gravedad
        if (!obj.enPiso) obj.vel.y += GRAVEDAD * dt;
        obj.mesh.position.addScaledVector(obj.vel, dt);

        // Piso
        const minY = obj.radio;
        if (obj.mesh.position.y <= minY) {
            obj.mesh.position.y = minY;
            obj.vel.y = 0;
            obj.enPiso = true;
            obj.vel.x *= 0.85;
            obj.vel.z *= 0.85;
        } else {
            obj.enPiso = false;
        }

        // Fricción
        obj.vel.x *= 0.92;
        obj.vel.z *= 0.92;
        if (obj.angVel) {
            obj.mesh.rotation.x += obj.angVel.x * dt;
            obj.mesh.rotation.z += obj.angVel.z * dt;
            obj.angVel.multiplyScalar(0.88);
        }

        // Límites
        const lim = ESCENA_MITAD - 1;
        ['x', 'z'].forEach(ax => {
            if (Math.abs(obj.mesh.position[ax]) > lim) {
                obj.mesh.position[ax] = Math.sign(obj.mesh.position[ax]) * lim;
                obj.vel[ax] *= -0.5;
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTUALIZAR CÁMARA
// ─────────────────────────────────────────────────────────────────────────────
function updateCamera(dt) {
    if (isVR || !character) return;
    // La cámara orbita alrededor del personaje (OrbitControls)
    controls.target.lerp(new THREE.Vector3(posChar.x, posChar.y + 1.2, posChar.z), 8 * dt);
    controls.update();
}

// ─────────────────────────────────────────────────────────────────────────────
//  EFECTOS AMBIENTE (llama + parpadeo luz)
// ─────────────────────────────────────────────────────────────────────────────
function updateAmbient(t) {
    // Parpadeo hoguera
    const fire = scene.userData.campfire;
    if (fire) {
        fire.userData.flickerPhase += 0.12;
        const flicker = 1 + Math.sin(fire.userData.flickerPhase * 7.3) * 0.15 + Math.sin(fire.userData.flickerPhase * 13.1) * 0.08;
        fire.intensity = fire.userData.baseIntensity * flicker;
    }

    // Llama (escala y color)
    scene.traverse(obj => {
        if (obj.userData.isFlame) {
            obj.scale.y = 0.85 + Math.sin(t * 8) * 0.2;
            obj.scale.x = 0.85 + Math.sin(t * 6.3) * 0.15;
            obj.position.y = 0.8 + Math.sin(t * 9) * 0.05;
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOOP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function animate() {
    const dt = Math.min(clock.getDelta(), 0.05); // cap en 50ms
    const t  = clock.elapsedTime;

    leerVRGamepads();
    updateCharacter(dt);
    updatePhysics(dt);
    updateCamera(dt);
    updateAmbient(t);
    applyProceduralAnim(dt);

    if (mixer) mixer.update(dt);

    // HUD VR
    if (isVR && hudVR) {
        const xrCam = renderer.xr.getCamera();
        actualizarHUDVR(xrCam);
    }

    renderer.render(scene, camera);
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESIZE
// ─────────────────────────────────────────────────────────────────────────────
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ARRANCAR
// ─────────────────────────────────────────────────────────────────────────────
init();
