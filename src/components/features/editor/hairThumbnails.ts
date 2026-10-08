import * as THREE from 'three';
import { DEG_TO_RAD, PIXEL } from '../../../lib/hair/math';
import { BASE_SLOT, SLOTS, type HairStyleSlot } from '../../../lib/hair/faces';
import type { CustomHair } from '../../../lib/hair/customHair';
import { fromCode, fromFullSetCode, isFullSetCode } from '../../../lib/hair/codec';
import { DEFAULT_LIMITS, sanitize } from '../../../lib/hair/limits';
import { buildHairMesh, parseGlobalColor } from '../../../lib/hair/mesh';
import { HairScene } from './hairScene';

export const THUMBNAIL_YAW = 35;
export const THUMBNAIL_PITCH = 0;
const CAMERA_DISTANCE = 200;
const FRAME_MARGIN = 0.08;
const MAX_CACHED = 300;
const FRAME_BUDGET_MS = 12;
const MIN_FRAME_POINTS: [number, number, number][] = [
    [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
    [-4, 8, -4], [4, 8, -4], [-4, 8, 4], [4, 8, 4],
    [-8, -3, -2], [8, -3, -2], [-8, -3, 2], [8, -3, 2],
];

export interface PreviewStyle {
    slot: HairStyleSlot | null;
    hair: CustomHair;
    frame: PreviewFrame;
}

export interface PreviewFrame {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

export interface DecodedHair {
    styles: PreviewStyle[];
    color: string;
    emptyFrame: PreviewFrame;
}

interface CameraBasis {
    direction: THREE.Vector3;
    right: THREE.Vector3;
    up: THREE.Vector3;
}

function cameraBasis(yawDegrees: number, pitchDegrees: number): CameraBasis {
    const yaw = yawDegrees * DEG_TO_RAD;
    const pitch = pitchDegrees * DEG_TO_RAD;
    const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    return { direction, right, up };
}

const BASIS = cameraBasis(THUMBNAIL_YAW, THUMBNAIL_PITCH);

class Bounds {
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;

    add(x: number, y: number, z: number): void {
        const px = x * BASIS.right.x + y * BASIS.right.y + z * BASIS.right.z;
        const py = x * BASIS.up.x + y * BASIS.up.y + z * BASIS.up.z;
        if (px < this.minX) this.minX = px;
        if (px > this.maxX) this.maxX = px;
        if (py < this.minY) this.minY = py;
        if (py > this.maxY) this.maxY = py;
    }
}

function measureFrame(hair: CustomHair | null, color: string): PreviewFrame {
    const bounds = new Bounds();
    for (const [x, y, z] of MIN_FRAME_POINTS) bounds.add(x, y, z);
    if (hair) {
        const positions = buildHairMesh(hair, { globalColor: parseGlobalColor(color), detailed: false }).positions;
        for (let i = 0; i < positions.length; i += 3) {
            bounds.add(positions[i] / PIXEL, positions[i + 1] / PIXEL, positions[i + 2] / PIXEL);
        }
    }
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const margin = Math.max(width, height) * FRAME_MARGIN;
    return {
        centerX: (bounds.minX + bounds.maxX) / 2,
        centerY: (bounds.minY + bounds.maxY) / 2,
        width: width + margin * 2,
        height: height + margin * 2,
    };
}

const cache = new Map<string, DecodedHair | null>();

export function decodeHair(code: string): DecodedHair | null {
    if (cache.has(code)) return cache.get(code) ?? null;
    const result = decodeUncached(code);
    cache.set(code, result);
    if (cache.size > MAX_CACHED) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    return result;
}

function decodeUncached(code: string): DecodedHair | null {
    const hairs: { slot: HairStyleSlot | null; hair: CustomHair }[] = [];
    let color = '#000000';
    if (isFullSetCode(code)) {
        const set = fromFullSetCode(code);
        if (!set) return null;
        color = set[BASE_SLOT.index].globalColor;
        for (const slot of SLOTS) {
            const hair = set[slot.index];
            sanitize(hair, slot, DEFAULT_LIMITS);
            if (!hair.isEmpty()) hairs.push({ slot, hair });
        }
    } else {
        const single = fromCode(code);
        if (!single) return null;
        sanitize(single, BASE_SLOT, DEFAULT_LIMITS);
        color = single.globalColor;
        if (!single.isEmpty()) hairs.push({ slot: null, hair: single });
    }
    return {
        styles: hairs.map((entry) => ({ ...entry, frame: measureFrame(entry.hair, color) })),
        color,
        emptyFrame: measureFrame(null, color),
    };
}

class ThumbnailRenderer {
    readonly ready: Promise<void>;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly hairScene = new HairScene();
    private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

    constructor() {
        const canvas = document.createElement('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.setClearColor(0x000000, 0);
        this.hairScene.setBodyVisible(true);
        this.hairScene.setHairBaseVisible(true);
        this.ready = this.hairScene.ready;
    }

    draw(target: HTMLCanvasElement, decoded: DecodedHair, style: PreviewStyle | null): void {
        const width = target.width;
        const height = target.height;
        if (width === 0 || height === 0) return;
        this.renderer.setSize(width, height, false);

        const aspect = width / height;
        const frame = style ? style.frame : decoded.emptyFrame;
        const frustumHeight = Math.max(frame.height, frame.width / aspect);
        this.camera.left = -frustumHeight * aspect / 2;
        this.camera.right = frustumHeight * aspect / 2;
        this.camera.top = frustumHeight / 2;
        this.camera.bottom = -frustumHeight / 2;
        const target3 = BASIS.right.clone().multiplyScalar(frame.centerX).addScaledVector(BASIS.up, frame.centerY);
        this.camera.position.copy(target3).addScaledVector(BASIS.direction, CAMERA_DISTANCE);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(target3);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();

        if (style) this.hairScene.setHair(style.hair, decoded.color);
        else this.hairScene.clearHair();
        this.hairScene.setSkinColor(decoded.color);
        this.renderer.render(this.hairScene.scene, this.camera);

        const context = target.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, width, height);
        context.drawImage(this.renderer.domElement, 0, 0, width, height);
    }
}

let instance: ThumbnailRenderer | null = null;
let unavailable = false;

function renderer(): ThumbnailRenderer | null {
    if (instance || unavailable) return instance;
    try {
        instance = new ThumbnailRenderer();
    } catch {
        unavailable = true;
    }
    return instance;
}

export function thumbnailsAvailable(): boolean {
    return renderer() !== null;
}

interface Job {
    decoded: DecodedHair;
    style: PreviewStyle | null;
    onDone?: () => void;
}

const jobs = new Map<HTMLCanvasElement, Job>();
let scheduled = false;
let waiting = false;

function schedule(): void {
    if (scheduled || waiting) return;
    const active = renderer();
    if (!active) return;
    waiting = true;
    active.ready.then(() => {
        waiting = false;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(runJobs);
    });
}

function runJobs(): void {
    scheduled = false;
    const active = renderer();
    if (!active) return;
    const start = performance.now();
    for (const [canvas, job] of jobs) {
        jobs.delete(canvas);
        if (!canvas.isConnected) continue;
        active.draw(canvas, job.decoded, job.style);
        job.onDone?.();
        if (performance.now() - start > FRAME_BUDGET_MS) break;
    }
    if (jobs.size > 0) schedule();
}

export function requestThumbnail(canvas: HTMLCanvasElement, decoded: DecodedHair, style: PreviewStyle | null, onDone?: () => void): void {
    jobs.set(canvas, { decoded, style, onDone });
    schedule();
}

export function cancelThumbnail(canvas: HTMLCanvasElement): void {
    jobs.delete(canvas);
}
