import * as THREE from 'three';
import { DEG_TO_RAD, PIXEL, Quat, RAD_TO_DEG, Vec3 } from '../../../lib/hair/math';
import { flatIndex, type HairFace } from '../../../lib/hair/faces';
import type { CustomHair } from '../../../lib/hair/customHair';
import type { HairStrand } from '../../../lib/hair/strand';
import { buildGeometry, StrandPose } from '../../../lib/hair/pose';
import { intersectPick } from '../../../lib/hair/mesh';
import { addSegment, MIN_SEGMENT_LENGTH, removeSegment, resizeLength } from '../../../lib/hair/limits';
import type { HairEditorState } from '../../../lib/hair/editorState';
import { HairScene, NO_STRAND } from './hairScene';

const PERIOD_MS = 2000;
const RISE_MS = 200;
const HOLD_MS = 800;
const FALL_MS = 350;
const CLICK_DRAG_THRESHOLD = 3;
const ORBIT_SPEED = 0.5;
const CURVE_DEGREES_PER_PIXEL = 0.75;
const ROTATION_PROBE = 0.2;
const MIN_SCREEN_LENGTH = 2;
const BASE_FRUSTUM = 30;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;
const TARGET_Y = 3;
const CAMERA_DISTANCE = 200;

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'reset';
export type ToolMode = 'grow' | 'rotate' | 'curve';

export interface ViewportCallbacks {
    onToolChange?: (active: boolean) => void;
    onLimit?: () => void;
}

interface Hit {
    face: HairFace;
    index: number;
    segment: number;
}

function envelope(elapsed: number): number {
    const t = ((elapsed % PERIOD_MS) + PERIOD_MS) % PERIOD_MS;
    if (t < RISE_MS) {
        const inverse = 1 - t / RISE_MS;
        return 1 - inverse * inverse * inverse;
    }
    if (t < RISE_MS + HOLD_MS) return 1;
    if (t < RISE_MS + HOLD_MS + FALL_MS) {
        const x = (t - RISE_MS - HOLD_MS) / FALL_MS;
        return 1 - (-(Math.cos(Math.PI * x) - 1) / 2);
    }
    return 0;
}

export class HairViewportRenderer {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly hairScene = new HairScene();
    private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    private builtStyle: CustomHair | null = null;
    private builtRevision = -1;
    private builtHiddenVersion = -1;
    private builtColor = '';
    private frame = 0;
    private disposed = false;

    private yaw = 0;
    private pitch = 0;
    private zoom = 1;
    private targetZoom = 1;
    private panX = 0;
    private panY = 0;

    private pointerId = -1;
    private pressX = 0;
    private pressY = 0;
    private lastX = 0;
    private lastY = 0;
    private pressButton = -1;
    private orbiting = false;
    private panning = false;
    private pendingTool: ToolMode | null = null;
    private pressAlt = false;
    private pressShift = false;
    private hover: Hit | null = null;

    private tool: ToolMode | null = null;
    private toolFace: HairFace | null = null;
    private toolIndex = -1;
    private toolOriginal: HairStrand | null = null;
    private toolStartX = 0;
    private toolStartY = 0;
    private readonly rootScreen = new Vec3();
    private readonly tipScreen = new Vec3();
    private readonly rootLocal = new Vec3();
    private readonly tipLocal = new Vec3();
    private readonly viewAxis = new Vec3();
    private readonly toolBaseRotation = new Quat();
    private pixelsPerHairPixel = 1;
    private rotationSign = 1;
    private atLimit = false;

    constructor(private readonly canvas: HTMLCanvasElement, private readonly state: HairEditorState, private readonly callbacks: ViewportCallbacks = {}) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.setClearColor(0x000000, 0);

        canvas.addEventListener('pointerdown', this.onPointerDown);
        canvas.addEventListener('pointermove', this.onPointerMove);
        canvas.addEventListener('pointerup', this.onPointerUp);
        canvas.addEventListener('pointercancel', this.onPointerCancel);
        canvas.addEventListener('pointerleave', this.onPointerLeave);
        canvas.addEventListener('wheel', this.onWheel, { passive: false });
        canvas.addEventListener('contextmenu', this.onContextMenu);
        this.loop();
    }

    dispose(): void {
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
        this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('contextmenu', this.onContextMenu);
        this.hairScene.dispose();
        this.renderer.dispose();
    }

    isToolActive(): boolean {
        return this.tool !== null;
    }

    setView(preset: ViewPreset): void {
        const yaw = { front: 0, back: 180, left: -90, right: 90, reset: 0 }[preset];
        this.yaw = yaw;
        this.pitch = 0;
        if (preset === 'reset') {
            this.panX = 0;
            this.panY = 0;
            this.targetZoom = 1;
        }
    }

    cancelTool(): boolean {
        if (!this.tool || !this.toolFace || !this.toolOriginal) return false;
        const strand = this.state.style().getStrand(this.toolFace, this.toolIndex);
        if (strand) {
            strand.copyFrom(this.toolOriginal);
            this.state.propagateMirror();
            this.state.style().markChanged();
        }
        this.endTool();
        this.state.notify();
        return true;
    }

    private loop = (): void => {
        if (this.disposed) return;
        this.frame = requestAnimationFrame(this.loop);
        this.render();
    };

    private render(): void {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (width === 0 || height === 0) return;
        const size = this.renderer.getSize(new THREE.Vector2());
        if (size.x !== width || size.y !== height) this.renderer.setSize(width, height, false);

        this.zoom += (this.targetZoom - this.zoom) * 0.3;
        this.updateCamera(width, height);
        this.updateHairMesh();
        this.hairScene.setSkinColor(this.state.globalColor());
        this.hairScene.setBodyVisible(this.state.bodyVisible);
        this.hairScene.setHairBaseVisible(this.state.hairBase);

        const uniforms = this.hairScene.hairMaterial.uniforms;
        if (this.state.selectedFace) {
            uniforms.uSelected.value = flatIndex(this.state.selectedFace, this.state.selectedIndex);
            uniforms.uSelectedSegment.value = this.state.selectedSegment;
            uniforms.uPulse.value = envelope(performance.now() - this.state.selectionStartMs);
        } else {
            uniforms.uSelected.value = NO_STRAND;
            uniforms.uSelectedSegment.value = -1;
            uniforms.uPulse.value = 0;
        }
        uniforms.uHover.value = this.hover && !this.tool ? flatIndex(this.hover.face, this.hover.index) : NO_STRAND;
        this.renderer.render(this.hairScene.scene, this.camera);
    }

    private updateCamera(width: number, height: number): void {
        const frustumHeight = BASE_FRUSTUM / this.zoom;
        const aspect = width / height;
        this.camera.left = -frustumHeight * aspect / 2;
        this.camera.right = frustumHeight * aspect / 2;
        this.camera.top = frustumHeight / 2;
        this.camera.bottom = -frustumHeight / 2;
        const yaw = this.yaw * DEG_TO_RAD;
        const pitch = this.pitch * DEG_TO_RAD;
        const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
        const target = new THREE.Vector3(0, TARGET_Y, 0);
        this.camera.position.copy(target).addScaledVector(direction, CAMERA_DISTANCE);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(target);
        this.camera.updateMatrixWorld();
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        this.camera.position.addScaledVector(right, -this.panX).addScaledVector(up, this.panY);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
    }

    private updateHairMesh(): void {
        const style = this.state.style();
        const color = this.state.globalColor();
        if (style === this.builtStyle && style.revision === this.builtRevision && this.builtHiddenVersion === this.state.hiddenVersion && color === this.builtColor) return;
        this.builtStyle = style;
        this.builtRevision = style.revision;
        this.builtHiddenVersion = this.state.hiddenVersion;
        this.builtColor = color;
        this.hairScene.setHair(style, color, { isHidden: (face, index) => this.state.isHidden(face, index) });
    }

    private canvasPoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    private headToScreen(point: Vec3, out: Vec3): Vec3 {
        const world = new THREE.Vector3(point.x / PIXEL, point.y / PIXEL, point.z / PIXEL).project(this.camera);
        return out.set((world.x + 1) * 0.5 * this.canvas.clientWidth, (1 - world.y) * 0.5 * this.canvas.clientHeight, 0);
    }

    private screenDirectionToHead(dx: number, dy: number): Vec3 {
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        const direction = right.multiplyScalar(dx).addScaledVector(up, -dy);
        return new Vec3(direction.x, direction.y, direction.z);
    }

    private viewDirection(): Vec3 {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        return new Vec3(forward.x, forward.y, forward.z).normalize();
    }

    private pick(x: number, y: number, filter: (face: HairFace, index: number) => boolean): Hit | null {
        const mesh = this.hairScene.mesh;
        if (!mesh) return null;
        const ndc = new THREE.Vector2((x / this.canvas.clientWidth) * 2 - 1, -(y / this.canvas.clientHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, this.camera);
        const origin = new Vec3(raycaster.ray.origin.x * PIXEL, raycaster.ray.origin.y * PIXEL, raycaster.ray.origin.z * PIXEL);
        const direction = new Vec3(raycaster.ray.direction.x, raycaster.ray.direction.y, raycaster.ray.direction.z);
        let best: Hit | null = null;
        let bestT = Infinity;
        for (const entry of mesh.picks) {
            if (!filter(entry.face, entry.index)) continue;
            const t = intersectPick(entry, origin, direction);
            if (t >= 0 && t < bestT) {
                bestT = t;
                best = { face: entry.face, index: entry.index, segment: entry.segment };
            }
        }
        return best;
    }

    private unlocked = (face: HairFace, index: number): boolean => !this.state.isLocked(face, index);

    private onContextMenu = (event: Event): void => {
        event.preventDefault();
    };

    private onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.0015);
        this.targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.targetZoom * factor));
    };

    private onPointerDown = (event: PointerEvent): void => {
        if (this.pointerId !== -1) return;
        this.pointerId = event.pointerId;
        try {
            this.canvas.setPointerCapture(event.pointerId);
        } catch {
            this.canvas.focus();
        }
        const point = this.canvasPoint(event);
        this.pressX = point.x;
        this.pressY = point.y;
        this.lastX = point.x;
        this.lastY = point.y;
        this.pressButton = event.button;
        this.pressAlt = event.altKey;
        this.pressShift = event.shiftKey;
        this.orbiting = false;
        this.panning = event.button === 1;
        this.pendingTool = event.button === 0
            ? (event.shiftKey ? 'grow' : (event.ctrlKey || event.metaKey ? 'curve' : (event.altKey ? 'rotate' : null)))
            : null;
        if (event.button === 0 && (event.altKey || event.shiftKey || event.ctrlKey)) event.preventDefault();
    };

    private onPointerMove = (event: PointerEvent): void => {
        const point = this.canvasPoint(event);
        if (this.pointerId === -1) {
            const hit = this.pick(point.x, point.y, this.unlocked);
            this.hover = hit;
            return;
        }
        if (event.pointerId !== this.pointerId) return;
        if (this.tool) {
            this.dragTool(point.x, point.y);
            return;
        }
        const moved = Math.hypot(point.x - this.pressX, point.y - this.pressY) > CLICK_DRAG_THRESHOLD;
        if (this.pressButton === 0 && this.pendingTool) {
            if (moved) {
                const mode = this.pendingTool;
                this.pendingTool = null;
                this.beginTool(mode, this.pressX, this.pressY);
                if (this.tool) this.dragTool(point.x, point.y);
            }
            return;
        }
        if (this.pressButton === 2 && moved) this.panning = true;
        if (this.pressButton === 0) {
            if (!this.orbiting && moved) this.orbiting = true;
            if (this.orbiting) {
                this.yaw -= (point.x - this.lastX) * ORBIT_SPEED;
                this.pitch = Math.max(-89, Math.min(89, this.pitch + (point.y - this.lastY) * ORBIT_SPEED));
            }
        } else if (this.panning) {
            const unitsPerPixel = (BASE_FRUSTUM / this.zoom) / Math.max(1, this.canvas.clientHeight);
            this.panX += (point.x - this.lastX) * unitsPerPixel;
            this.panY += (point.y - this.lastY) * unitsPerPixel;
        }
        this.lastX = point.x;
        this.lastY = point.y;
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (event.pointerId !== this.pointerId) return;
        const point = this.canvasPoint(event);
        if (this.tool) {
            this.endTool();
            this.state.notify();
        } else if (this.pressButton === 0 && !this.orbiting) {
            this.pickSelection(point.x, point.y, this.pressAlt);
        } else if (this.pressButton === 2 && !this.panning) {
            this.secondaryClick(point.x, point.y, this.pressShift || event.shiftKey);
        }
        this.releasePointer();
    };

    private onPointerCancel = (event: PointerEvent): void => {
        if (event.pointerId !== this.pointerId) return;
        if (this.tool) this.cancelTool();
        this.releasePointer();
    };

    private onPointerLeave = (): void => {
        if (this.pointerId === -1) this.hover = null;
    };

    private releasePointer(): void {
        if (this.pointerId !== -1 && this.canvas.hasPointerCapture(this.pointerId)) {
            try {
                this.canvas.releasePointerCapture(this.pointerId);
            } catch {
                this.canvas.blur();
            }
        }
        this.pointerId = -1;
        this.pressButton = -1;
        this.orbiting = false;
        this.panning = false;
        this.pendingTool = null;
    }

    private pickSelection(x: number, y: number, alt: boolean): void {
        const hit = this.pick(x, y, this.unlocked);
        const state = this.state;
        if (!hit) {
            state.clearSelection();
        } else if (state.selectedFace === hit.face && state.selectedIndex === hit.index && alt) {
            state.selectSegment(hit.segment);
        } else {
            state.select(hit.face, hit.index);
            if (alt) state.selectSegment(hit.segment);
        }
    }

    private secondaryClick(x: number, y: number, shift: boolean): void {
        const state = this.state;
        const hit = this.pick(x, y, () => true);
        if (!hit) {
            state.setBodyVisible(!state.bodyVisible);
            return;
        }
        if (!state.hasSelection() || hit.face !== state.selectedFace || hit.index !== state.selectedIndex) return;
        if (state.isLocked(hit.face, hit.index)) return;
        const strand = state.selectedStrand();
        if (!strand || !strand.isVisible()) return;
        const preview = strand.copy();
        const changed = shift ? removeSegment(preview) : addSegment(preview, state.limits.maxSegments, state.limits.maxLength);
        if (!changed) {
            this.callbacks.onLimit?.();
            return;
        }
        state.recordStep();
        state.modifySelected((target) => target.copyFrom(preview));
    }

    private beginTool(mode: ToolMode, x: number, y: number): void {
        const state = this.state;
        const hit = this.pick(x, y, this.unlocked);
        if (hit && (hit.face !== state.selectedFace || hit.index !== state.selectedIndex)) state.select(hit.face, hit.index);
        if (!state.selectedFace || state.isLocked(state.selectedFace, state.selectedIndex)) return;
        const strand = state.style().getStrand(state.selectedFace, state.selectedIndex);
        if (!strand || !strand.isVisible()) return;

        state.recordStep();
        this.tool = mode;
        this.toolFace = state.selectedFace;
        this.toolIndex = state.selectedIndex;
        this.toolOriginal = strand.copy();
        this.toolStartX = x;
        this.toolStartY = y;
        const pose = new StrandPose();
        buildGeometry(this.toolOriginal, this.toolFace, this.toolIndex, pose);
        this.rootLocal.copy(pose.root);
        this.tipLocal.copy(pose.restTip);
        this.headToScreen(this.rootLocal, this.rootScreen);
        this.headToScreen(this.tipLocal, this.tipScreen);
        this.viewAxis.copy(this.viewDirection());
        this.toolBaseRotation.identity()
            .rotateX(this.toolOriginal.rotationX * DEG_TO_RAD)
            .rotateY(this.toolOriginal.rotationY * DEG_TO_RAD)
            .rotateZ(this.toolOriginal.rotationZ * DEG_TO_RAD);
        const probe = this.headToScreen(new Vec3(this.rootLocal.x + PIXEL, this.rootLocal.y, this.rootLocal.z), new Vec3());
        const probeY = this.headToScreen(new Vec3(this.rootLocal.x, this.rootLocal.y + PIXEL, this.rootLocal.z), new Vec3());
        const probeZ = this.headToScreen(new Vec3(this.rootLocal.x, this.rootLocal.y, this.rootLocal.z + PIXEL), new Vec3());
        this.pixelsPerHairPixel = Math.max(1.0e-3, Math.max(
            Math.hypot(probe.x - this.rootScreen.x, probe.y - this.rootScreen.y),
            Math.hypot(probeY.x - this.rootScreen.x, probeY.y - this.rootScreen.y),
            Math.hypot(probeZ.x - this.rootScreen.x, probeZ.y - this.rootScreen.y)));
        if (mode === 'rotate') this.rotationSign = this.resolveRotationSign();
        this.atLimit = false;
        this.callbacks.onToolChange?.(true);
    }

    private endTool(): void {
        this.tool = null;
        this.toolFace = null;
        this.toolOriginal = null;
        this.callbacks.onToolChange?.(false);
    }

    private dragTool(x: number, y: number): void {
        if (!this.tool || !this.toolFace || !this.toolOriginal) return;
        const strand = this.state.style().getStrand(this.toolFace, this.toolIndex);
        if (!strand) return;
        strand.copyFrom(this.toolOriginal);
        if (this.tool === 'grow') this.grow(strand, x, y);
        else if (this.tool === 'rotate') this.rotate(strand, x, y);
        else this.curve(strand, x, y);
        this.state.propagateMirror();
        this.state.style().markChanged();
        this.state.notify();
    }

    private grow(strand: HairStrand, x: number, y: number): void {
        let dirX = this.tipScreen.x - this.rootScreen.x;
        let dirY = this.tipScreen.y - this.rootScreen.y;
        const screenLength = Math.hypot(dirX, dirY);
        if (screenLength < MIN_SCREEN_LENGTH) {
            dirX = 0;
            dirY = -1;
        } else {
            dirX /= screenLength;
            dirY /= screenLength;
        }
        const projected = (x - this.toolStartX) * dirX + (y - this.toolStartY) * dirY;
        const length = this.toolOriginal!.length + projected / this.pixelsPerHairPixel;
        const maxLength = this.state.limits.maxLength;
        resizeLength(strand, length, this.state.limits.maxSegments, maxLength);
        const limited = length >= maxLength || length <= MIN_SEGMENT_LENGTH;
        if (limited && !this.atLimit) this.callbacks.onLimit?.();
        this.atLimit = limited;
    }

    private rotate(strand: HairStrand, x: number, y: number): void {
        const startAngle = Math.atan2(this.toolStartY - this.rootScreen.y, this.toolStartX - this.rootScreen.x);
        const currentAngle = Math.atan2(y - this.rootScreen.y, x - this.rootScreen.x);
        const angle = (currentAngle - startAngle) * this.rotationSign;
        const rotated = new Quat().rotationAxis(angle, this.viewAxis.x, this.viewAxis.y, this.viewAxis.z).mul(this.toolBaseRotation);
        const euler = rotated.getEulerAnglesXYZ(new Vec3());
        strand.setRotation(euler.x * RAD_TO_DEG, euler.y * RAD_TO_DEG, euler.z * RAD_TO_DEG);
    }

    private curve(strand: HairStrand, x: number, y: number): void {
        const pixels = Math.hypot(x - this.toolStartX, y - this.toolStartY);
        const drag = this.screenDirectionToHead(x - this.toolStartX, y - this.toolStartY);
        if (pixels < 1.0e-3 || drag.lengthSquared() < 1.0e-12) return;
        drag.normalize();
        this.toolBaseRotation.clone().conjugate().transform(drag);
        const degrees = pixels * CURVE_DEGREES_PER_PIXEL;
        const original = this.toolOriginal!;
        strand.setBend(original.bendX + drag.z * degrees, original.bendY, original.bendZ - drag.x * degrees);
    }

    private resolveRotationSign(): number {
        const offset = this.tipLocal.clone().sub(this.rootLocal);
        const startAngle = Math.atan2(this.tipScreen.y - this.rootScreen.y, this.tipScreen.x - this.rootScreen.x);
        const probe = new Quat().rotationAxis(ROTATION_PROBE, this.viewAxis.x, this.viewAxis.y, this.viewAxis.z).transform(offset).add(this.rootLocal);
        const probeScreen = this.headToScreen(probe, new Vec3());
        const probeAngle = Math.atan2(probeScreen.y - this.rootScreen.y, probeScreen.x - this.rootScreen.x);
        const delta = Math.atan2(Math.sin(probeAngle - startAngle), Math.cos(probeAngle - startAngle));
        return delta >= 0 ? 1 : -1;
    }
}
