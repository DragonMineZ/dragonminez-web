import * as THREE from 'three';
import { PIXEL } from '../../../lib/hair/math';
import type { HairFace } from '../../../lib/hair/faces';
import type { CustomHair } from '../../../lib/hair/customHair';
import { buildHairMesh, parseGlobalColor, type HairMesh } from '../../../lib/hair/mesh';
import { composeBodySkin, composeHairBase, loadSkinImages, type SkinImages } from './skinTextures';

const LIGHT_0 = new THREE.Vector3(0.7902, 0.5838, 0.1862).normalize();
const LIGHT_1 = new THREE.Vector3(0.2707, -0.1438, 0.9519).normalize();
export const NO_STRAND = -10;

const VERTEX_SHADER = `
attribute vec3 aColor;
attribute float aStrand;
attribute float aSegment;
uniform vec3 uTint;
uniform vec3 uLight0;
uniform vec3 uLight1;
uniform float uSelected;
uniform float uSelectedSegment;
uniform float uPulse;
uniform float uHover;
varying vec3 vColor;
varying vec2 vUv;
void main() {
    vec3 base = aColor * uTint;
    float intensity = 0.0;
    if (abs(aStrand - uSelected) < 0.5) {
        intensity = uSelectedSegment < 0.0 ? uPulse : (abs(aSegment - uSelectedSegment) < 0.5 ? uPulse : 0.2);
    } else if (abs(aStrand - uHover) < 0.5) {
        intensity = 0.12;
    }
    base = base + (1.0 - base) * intensity * 0.85;
    vec3 n = normalize(normalMatrix * normal);
    float light = min(1.0, (max(0.0, dot(uLight0, n)) + max(0.0, dot(uLight1, n))) * 0.6 + 0.4);
    vColor = base * light;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D uMap;
varying vec3 vColor;
varying vec2 vUv;
void main() {
    vec4 texel = texture2D(uMap, vUv);
    if (texel.a < 0.1) discard;
    gl_FragColor = vec4(texel.rgb * vColor, 1.0);
}
`;

function createMaterial(map: THREE.Texture, side: THREE.Side): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        side,
        uniforms: {
            uMap: { value: map },
            uTint: { value: new THREE.Color(1, 1, 1) },
            uLight0: { value: LIGHT_0 },
            uLight1: { value: LIGHT_1 },
            uSelected: { value: NO_STRAND },
            uSelectedSegment: { value: -1 },
            uPulse: { value: 0 },
            uHover: { value: NO_STRAND },
        },
    });
}

interface BoxSpec {
    x0: number;
    y0: number;
    z0: number;
    w: number;
    h: number;
    d: number;
    u: number;
    v: number;
}

function boxGeometry(boxes: BoxSpec[]): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const strands: number[] = [];
    const indices: number[] = [];
    for (const box of boxes) {
        const x0 = box.x0;
        const x1 = box.x0 + box.w;
        const y0 = box.y0;
        const y1 = box.y0 + box.h;
        const z0 = box.z0;
        const z1 = box.z0 + box.d;
        const { u, v, w, h, d } = box;
        const faces: { normal: number[]; corners: number[][]; region: number[] }[] = [
            { normal: [0, 0, -1], corners: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], region: [u + d, v + d, w, h] },
            { normal: [0, 0, 1], corners: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], region: [u + d + w + d, v + d, w, h] },
            { normal: [1, 0, 0], corners: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], region: [u, v + d, d, h] },
            { normal: [-1, 0, 0], corners: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]], region: [u + d + w, v + d, d, h] },
            { normal: [0, 1, 0], corners: [[x1, y1, z1], [x0, y1, z1], [x0, y1, z0], [x1, y1, z0]], region: [u + d, v, w, d] },
            { normal: [0, -1, 0], corners: [[x1, y0, z1], [x0, y0, z1], [x0, y0, z0], [x1, y0, z0]], region: [u + d + w, v, w, d] },
        ];
        for (const face of faces) {
            const first = positions.length / 3;
            const [ru, rv, rw, rh] = face.region;
            const regionUv = [[ru, rv], [ru + rw, rv], [ru + rw, rv + rh], [ru, rv + rh]];
            for (let c = 0; c < 4; c++) {
                positions.push(...face.corners[c]);
                normals.push(...face.normal);
                uvs.push(regionUv[c][0] / 64, regionUv[c][1] / 64);
                colors.push(1, 1, 1);
                strands.push(NO_STRAND);
            }
            indices.push(first, first + 1, first + 2, first + 2, first + 3, first);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aStrand', new THREE.Float32BufferAttribute(strands, 1));
    geometry.setAttribute('aSegment', new THREE.Float32BufferAttribute(strands, 1));
    geometry.setIndex(indices);
    return geometry;
}

export const HEAD_BOX: BoxSpec = { x0: -4, y0: 0, z0: -4, w: 8, h: 8, d: 8, u: 0, v: 0 };
const BODY_BOXES: BoxSpec[] = [
    { x0: -4, y0: -12, z0: -2, w: 8, h: 12, d: 4, u: 16, v: 16 },
    { x0: 4, y0: -12, z0: -2, w: 4, h: 12, d: 4, u: 40, v: 16 },
    { x0: -8, y0: -12, z0: -2, w: 4, h: 12, d: 4, u: 32, v: 48 },
    { x0: 0, y0: -24, z0: -2, w: 4, h: 12, d: 4, u: 0, v: 16 },
    { x0: -4, y0: -24, z0: -2, w: 4, h: 12, d: 4, u: 16, v: 48 },
];
const HAIR_BASE_SCALE = 1.006;

function dataTexture(image: ImageData): THREE.DataTexture {
    const texture = new THREE.DataTexture(new Uint8Array(image.data.buffer.slice(0)), image.width, image.height, THREE.RGBAFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.needsUpdate = true;
    return texture;
}

export interface HairMeshOptions {
    detailed?: boolean;
    isHidden?: (face: HairFace, index: number) => boolean;
}

export class HairScene {
    readonly scene = new THREE.Scene();
    readonly root = new THREE.Group();
    readonly hairMaterial: THREE.ShaderMaterial;
    readonly ready: Promise<void>;
    mesh: HairMesh | null = null;

    private readonly hairGroup = new THREE.Group();
    private readonly bodyGroup = new THREE.Group();
    private readonly hairBaseGroup = new THREE.Group();
    private readonly hairTexture: THREE.Texture;
    private skinMaterial: THREE.ShaderMaterial | null = null;
    private hairBaseMaterial: THREE.ShaderMaterial | null = null;
    private skinImages: SkinImages | null = null;
    private skinColorKey = '';
    private hairMesh: THREE.Mesh | null = null;
    private disposed = false;

    constructor() {
        let textureLoaded: () => void = () => undefined;
        const textureReady = new Promise<void>((resolve) => {
            textureLoaded = resolve;
        });
        this.hairTexture = new THREE.TextureLoader().load('/hair/hair.png', (texture) => {
            texture.needsUpdate = true;
            textureLoaded();
        }, undefined, () => textureLoaded());
        this.hairTexture.magFilter = THREE.NearestFilter;
        this.hairTexture.minFilter = THREE.NearestFilter;
        this.hairTexture.generateMipmaps = false;
        this.hairTexture.wrapS = THREE.RepeatWrapping;
        this.hairTexture.wrapT = THREE.RepeatWrapping;
        this.hairTexture.flipY = false;
        this.hairMaterial = createMaterial(this.hairTexture, THREE.DoubleSide);

        this.hairGroup.scale.setScalar(1 / PIXEL);
        this.root.add(this.bodyGroup, this.hairBaseGroup, this.hairGroup);
        this.scene.add(this.root);
        this.hairBaseGroup.scale.setScalar(HAIR_BASE_SCALE);
        this.hairBaseGroup.position.set(0, 4 - 4 * HAIR_BASE_SCALE, 0);

        const skinReady = loadSkinImages().then((images) => {
            if (this.disposed) return;
            this.skinImages = images;
            this.skinColorKey = '';
        }).catch(() => undefined);
        this.ready = Promise.all([textureReady, skinReady]).then(() => undefined);
    }

    setHair(style: CustomHair, color: string, options: HairMeshOptions = {}): HairMesh {
        this.mesh = buildHairMesh(style, {
            globalColor: parseGlobalColor(color),
            detailed: options.detailed ?? true,
            isHidden: options.isHidden,
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.mesh.positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(this.mesh.normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(this.mesh.uvs, 2));
        geometry.setAttribute('aColor', new THREE.BufferAttribute(this.mesh.colors, 3));
        geometry.setAttribute('aStrand', new THREE.BufferAttribute(this.mesh.strandIds, 1));
        geometry.setAttribute('aSegment', new THREE.BufferAttribute(this.mesh.segmentIds, 1));
        geometry.setIndex(new THREE.BufferAttribute(this.mesh.indices, 1));
        if (this.hairMesh) {
            this.hairMesh.geometry.dispose();
            this.hairMesh.geometry = geometry;
        } else {
            this.hairMesh = new THREE.Mesh(geometry, this.hairMaterial);
            this.hairMesh.frustumCulled = false;
            this.hairGroup.add(this.hairMesh);
        }
        return this.mesh;
    }

    clearHair(): void {
        this.mesh = null;
        if (!this.hairMesh) return;
        this.hairGroup.remove(this.hairMesh);
        this.hairMesh.geometry.dispose();
        this.hairMesh = null;
    }

    setSkinColor(color: string): void {
        if (!this.skinImages || color === this.skinColorKey) return;
        this.skinColorKey = color;
        const skinTexture = dataTexture(composeBodySkin(this.skinImages, color));
        const baseTexture = dataTexture(composeHairBase(this.skinImages, color));
        if (!this.skinMaterial || !this.hairBaseMaterial) {
            this.skinMaterial = createMaterial(skinTexture, THREE.DoubleSide);
            this.hairBaseMaterial = createMaterial(baseTexture, THREE.DoubleSide);
            const head = new THREE.Mesh(boxGeometry([HEAD_BOX]), this.skinMaterial);
            const body = new THREE.Mesh(boxGeometry(BODY_BOXES), this.skinMaterial);
            const hairBase = new THREE.Mesh(boxGeometry([HEAD_BOX]), this.hairBaseMaterial);
            for (const mesh of [head, body, hairBase]) mesh.frustumCulled = false;
            this.root.add(head);
            this.bodyGroup.add(body);
            this.hairBaseGroup.add(hairBase);
        } else {
            this.skinMaterial.uniforms.uMap.value.dispose();
            this.skinMaterial.uniforms.uMap.value = skinTexture;
            this.hairBaseMaterial.uniforms.uMap.value.dispose();
            this.hairBaseMaterial.uniforms.uMap.value = baseTexture;
        }
    }

    setBodyVisible(visible: boolean): void {
        this.bodyGroup.visible = visible;
    }

    setHairBaseVisible(visible: boolean): void {
        this.hairBaseGroup.visible = visible;
    }

    dispose(): void {
        this.disposed = true;
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        this.hairMaterial.dispose();
        this.skinMaterial?.uniforms.uMap.value.dispose();
        this.hairBaseMaterial?.uniforms.uMap.value.dispose();
        this.skinMaterial?.dispose();
        this.hairBaseMaterial?.dispose();
        this.hairTexture.dispose();
    }
}
