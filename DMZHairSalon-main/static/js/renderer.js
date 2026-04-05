
let scene, camera, renderer, steve, hairGroup;

function init() {
    setupScene();

    const code = localStorage.getItem('selectedHairCode');
    if (code) {
        document.getElementById('hair-code').value = code;
        renderFromInput();
    }

    document.getElementById('render-btn').addEventListener('click', renderFromInput);
    document.getElementById('copy-btn').addEventListener('click', () => {
        const txt = document.getElementById('hair-code');
        txt.select();
        document.execCommand('copy');
    });

    animate();
}

function renderFromInput() {
    const code = document.getElementById('hair-code').value;
    try {
        while (hairGroup.children.length > 0) {
            hairGroup.remove(hairGroup.children[0]);
        }

        if (typeof window.decodeHairCode !== 'function') {
            console.error("decodeHairCode function not found. ignoring render");
            return;
        }

        const decoded = window.decodeHairCode(code);
        if (decoded && decoded.data) {
            parseAndRenderHair(decoded.data, decoded.isFullSet);
        } else {
            console.error("Failed to decode hair code");
        }
    } catch (e) {
        console.error("Render failed", e);
    }
}

function setupScene() {
    const container = document.getElementById('viewer-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;
    camera.position.y = 0.5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    steve = new THREE.Group();

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xe0aa94 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 0.250;
    steve.add(headMesh);
    window.headModel = headMesh;

    const hairBaseGroup = new THREE.Group();
    hairBaseGroup.name = "hairBase";
    headMesh.add(hairBaseGroup);
    window.hairBase = hairBaseGroup;

    const HAIR_OFFSET = 0.255;

    const hairFaces = [
        { name: 'up', pos: [0, HAIR_OFFSET, 0], rot: [-Math.PI / 2, 0, 0], file: '/static/src/hair_base_up.png' },
        { name: 'down', pos: [0, -HAIR_OFFSET, 0], rot: [Math.PI / 2, 0, 0], file: '/static/src/hair_base_down.png' },
        { name: 'front', pos: [0, 0, -HAIR_OFFSET], rot: [0, 0, 0], file: '/static/src/hair_base_front.png' },
        { name: 'back', pos: [0, 0, HAIR_OFFSET], rot: [0, Math.PI, 0], file: '/static/src/hair_base_back.png' },
        { name: 'right', pos: [HAIR_OFFSET, 0, 0], rot: [0, -Math.PI / 2, 0], file: '/static/src/hair_base_right.png' },
        { name: 'left', pos: [-HAIR_OFFSET, 0, 0], rot: [0, Math.PI / 2, 0], file: '/static/src/hair_base_left.png' }
    ];

    hairFaces.forEach(face => {
        const geometry = new THREE.PlaneGeometry(0.51, 0.51);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            face.file,
            (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                console.log(`${face.name} textura CARGADA`);

                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    color: 0x000000
                });

                const plane = new THREE.Mesh(geometry, material);
                plane.position.set(...face.pos);
                plane.rotation.set(...face.rot);
                plane.name = `hair_base_${face.name}`;

                hairBaseGroup.add(plane);
                console.log(`${face.name} agregado al grupo`);

                hairBaseGroup.visible = true;
            },
            undefined,
            (err) => console.error(`${face.name} error:`, err)
        );
    });

    console.log("Intentando cargar las 6 texturas de hair base... (empieza negro)");

    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x00aa00, visible: false });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.625 + 0.250;
    steve.add(body);

    scene.add(steve);

    hairGroup = new THREE.Group();
    steve.add(hairGroup);

    steve.rotation.y = Math.PI;

    let isDragging = false;
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };

    container.addEventListener('contextmenu', e => e.preventDefault());

    container.addEventListener('mousedown', e => {
        if (e.button === 0) isDragging = true;
        if (e.button === 2) isPanning = true;
    });
    window.addEventListener('mouseup', () => {
        isDragging = false;
        isPanning = false;
    });

    container.addEventListener('mousemove', e => {
        const delta = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        if (isDragging) {
            steve.rotation.y += delta.x * 0.01;
            steve.rotation.x += delta.y * 0.01;
        }
        if (isPanning) {
            steve.position.x += delta.x * 0.01;
            steve.position.y -= delta.y * 0.01;
        }

        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });

    container.addEventListener('wheel', e => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(1, Math.min(30, camera.position.z));
    }, { passive: false });

    const setupSlider = (id, spanId, cb) => {
        const slider = document.getElementById(id);
        const span = document.getElementById(spanId);
        if (slider) {
            slider.addEventListener('input', e => {
                const val = parseFloat(e.target.value);
                if (span) span.textContent = val.toFixed(3);
                cb(val);
            });
        }
    };

    setupSlider('head-y-slider', 'head-y-value', v => {
        if (window.headModel) window.headModel.position.y = v;
    });
    setupSlider('head-w-slider', 'head-w-value', v => {
        if (window.headModel) window.headModel.scale.x = v;
    });
    setupSlider('head-h-slider', 'head-h-value', v => {
        if (window.headModel) window.headModel.scale.y = v;
    });
    setupSlider('head-d-slider', 'head-d-value', v => {
        if (window.headModel) window.headModel.scale.z = v;
    });

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function parseAndRenderHair(nbtBuffer, isFullSet) {
    if (typeof window.nbt === 'undefined') {
        console.error("NBT reader not loaded");
        return;
    }

    nbt.parse(nbtBuffer, function (error, data) {
        if (error) {
            console.error("NBT Parse Error:", error);
            return;
        }
        renderHairData(data, isFullSet);
    });
}

function renderHairData(hairData, isFullSet) {
    if (!hairData) {
        console.error("renderHairData: No hairData provided");
        return;
    }

    console.log("Full NBT Structure:", hairData);

    const forms = {};
    const formMap = {
        "Base": ["Base", "base", "B"],
        "SSJ": ["SSJ", "ssj", "S"],
        "SSJ2": ["SSJ2", "ssj2", "S2"],
        "SSJ3": ["SSJ3", "ssj3", "T"]
    };

    let foundForms = [];
    for (const [canonical, aliases] of Object.entries(formMap)) {
        for (const alias of aliases) {
            if (hairData[alias]) {
                forms[canonical] = hairData[alias];
                if (!foundForms.includes(canonical)) foundForms.push(canonical);
                break;
            }
        }
    }

    const faceKeys = ["F", "B", "L", "R", "T", "FRONT", "BACK", "LEFT", "RIGHT", "TOP", "f", "b", "l", "r", "t", "front", "back", "left", "right", "top"];
    const hasFacesAtRoot = faceKeys.some(k => hairData[k] && Array.isArray(hairData[k]) && hairData[k].length > 0);

    if (!isFullSet) {
        if (hasFacesAtRoot) {
            console.log("DMZ4: Root has faces, using root as Base.");
            forms["Base"] = hairData;
            foundForms = ["Base"];
        } else if (foundForms.length > 0) {
            console.log("DMZ4: No root faces, but found forms. Using detected forms.");
        } else {
            console.log("DMZ4: No forms or faces. Using root as fallback.");
            forms["Base"] = hairData;
            foundForms = ["Base"];
        }
    } else {
        if (foundForms.length === 0) {
            if (hasFacesAtRoot) {
                console.log("DMZF4: No forms found, but root has faces. Using root.");
                forms["Base"] = hairData;
                foundForms = ["Base"];
            } else {
                console.warn("DMZF4: No hair data found at all!");
            }
        }
    }

    window.hairForms = forms;
    window.availableForms = foundForms;
    window.currentFormIndex = 0;

    console.log("Final Forms State:", { isFullSet, count: foundForms.length, forms: foundForms });

    const switcher = document.getElementById('form-switcher');
    const canSwitch = isFullSet && foundForms.length > 1;

    if (switcher) {
        if (canSwitch) {
            console.log("Showing form switcher");
            switcher.style.display = 'flex';
            updateFormDisplay();
        } else {
            console.log("Hiding form switcher");
            switcher.style.display = 'none';
            renderCurrentForm();
        }
    } else {
        renderCurrentForm();
    }

    if (!window.switcherInitialized) {
        const prevBtn = document.getElementById('prev-form');
        const nextBtn = document.getElementById('next-form');
        if (prevBtn && nextBtn) {
            prevBtn.onclick = () => {
                window.currentFormIndex = (window.currentFormIndex - 1 + window.availableForms.length) % window.availableForms.length;
                updateFormDisplay();
            };
            nextBtn.onclick = () => {
                window.currentFormIndex = (window.currentFormIndex + 1) % window.availableForms.length;
                updateFormDisplay();
            };
            window.switcherInitialized = true;
        }
    }
}

function updateFormDisplay() {
    if (!window.availableForms || window.availableForms.length === 0) return;
    const formKey = window.availableForms[window.currentFormIndex];
    const label = document.getElementById('current-form-label');
    if (label) label.textContent = formKey.toLowerCase();
    renderCurrentForm();
}

function renderCurrentForm() {
    if (!window.availableForms || !window.hairForms) return;

    const formKey = window.availableForms[window.currentFormIndex];
    const targetHair = window.hairForms[formKey];
    if (!targetHair) return;

    const isSSJ = formKey.toLowerCase().includes("ssj") || formKey === "S" || formKey === "T";

    console.log(`--- Rendering Form: ${formKey} (isSSJ: ${isSSJ}) ---`);

    while (hairGroup.children.length > 0) {
        hairGroup.remove(hairGroup.children[0]);
    }

    const faceMapping = {
        'F': ['F', 'FRONT', 'f', 'front'],
        'B': ['B', 'BACK', 'b', 'back'],
        'L': ['L', 'LEFT', 'l', 'left'],
        'R': ['R', 'RIGHT', 'r', 'right'],
        'T': ['T', 'TOP', 't', 'top']
    };

    let totalStrands = 0;
    Object.keys(faceMapping).forEach(faceKey => {
        let strands = null;
        for (const alias of faceMapping[faceKey]) {
            if (targetHair[alias] && Array.isArray(targetHair[alias])) {
                strands = targetHair[alias];
                break;
            }
        }

        if (strands && strands.length > 0) {
            console.log(`Face ${faceKey}: Found ${strands.length} strands`);
            totalStrands += strands.length;
            renderFaceStrands(faceKey, strands, targetHair, isSSJ);
        }
    });

    console.log(`Total strands rendered: ${totalStrands}`);

    if (window.hairBase) {
        window.hairBase.visible = true;

        let hairColor = 0x000000;

        if (isSSJ) {
            hairColor = 0xFFE89E;
        } else {
            let codeColor = targetHair.Color || targetHair.GlobalColor || targetHair.gc || -1;
            if (typeof codeColor === 'string') codeColor = parseInt(codeColor.replace('#', ''), 16);

            if (codeColor !== -1 && codeColor !== undefined && codeColor !== null && codeColor >= 0) {
                hairColor = codeColor;
            }
        }

        window.hairBase.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.set(hairColor);
                child.material.needsUpdate = true;
            }
        });

        console.log(`Hair base tintado con #${hairColor.toString(16).padStart(6, '0')} (${isSSJ ? 'SSJ' : 'base'})`);
    }
}

function renderFaceStrands(faceKey, strands, targetHair, isSSJ) {
    const UNIT_SCALE = 0.0625;
    const SIZE_DECAY = 0.85;
    const DEG_TO_RAD = Math.PI / 180;

    let globalColor = targetHair.Color || targetHair.GlobalColor || targetHair.gc || -1;

    strands.forEach((strand, index) => {
        const length = strand.l || 0;
        if (length <= 0) return;

        let c = strand.c !== undefined ? strand.c : globalColor;
        if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);

        const isBlack = (c === 0 || c === 0x000000 || c === -1 || c === undefined || c < 0x222222);
        if (isSSJ && isBlack) c = 0xFFE89E;
        if (isNaN(c) || c === -1) c = isSSJ ? 0xFFE89E : 0x000000;

        const material = new THREE.MeshLambertMaterial({ color: c });
        const pos = getStrandBasePosition(faceKey, index);

        const root = new THREE.Group();
        root.position.set(pos.x * UNIT_SCALE, pos.y * UNIT_SCALE, pos.z * UNIT_SCALE);
        root.rotation.set((strand.rx || 0) * DEG_TO_RAD, (strand.ry || 0) * DEG_TO_RAD, (strand.rz || 0) * DEG_TO_RAD);
        root.scale.set(strand.sx || 1.0, strand.sy || 1.0, strand.sz || 1.0);

        const bw = (strand.cw !== undefined ? strand.cw : 2) * UNIT_SCALE;
        const bh = (strand.ch !== undefined ? strand.ch : 2) * UNIT_SCALE;
        const bd = (strand.cd !== undefined ? strand.cd : 2) * UNIT_SCALE;
        const ls = strand.ls || 1.0;
        const cx = (strand.cx || 0) * DEG_TO_RAD;
        const cy = (strand.cy || 0) * DEG_TO_RAD;
        const cz = (strand.cz || 0) * DEG_TO_RAD;

        let parent = root;
        let currentOffset = 0;
        for (let i = 0; i < length; i++) {
            const s = Math.pow(SIZE_DECAY, i);
            const h = bh * s * ls;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw * s, h, bd * s), material);
            mesh.position.y = h / 2;

            if (i > 0) {
                const g = new THREE.Group();
                g.position.y = currentOffset;
                g.rotation.set(cx, cy, cz);
                parent.add(g);
                parent = g;
            }
            parent.add(mesh);
            currentOffset = h;
        }
        hairGroup.add(root);
    });
}

function getStrandBasePosition(face, index) {
    const FACE_COLS = 4;

    const row = Math.floor(index / FACE_COLS);
    const col = index % FACE_COLS;

    const positions = [-3.0, -1.0, 1.0, 3.0];
    const yOffsets = [0.0, -1.5, -3.0, -4.5];

    const gridX = positions[col % 4];
    const gridZ = positions[row % 4];
    const rowYOffset = yOffsets[row % 4];

    switch (face) {
        case 'F': return { x: gridX, y: 7.25, z: -4.0 };
        case 'B': return { x: gridX, y: 7.25 + rowYOffset, z: 4.0 };
        case 'L': return { x: -3.95, y: 7.25 + rowYOffset, z: gridX };
        case 'R': return { x: 3.95, y: 7.25 + rowYOffset, z: -gridX };
        case 'T': return { x: gridX, y: 7.85, z: gridZ };
        default: return { x: 0, y: 0, z: 0 };
    }
}

init();