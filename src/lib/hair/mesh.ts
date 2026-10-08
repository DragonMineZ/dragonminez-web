import { clamp, lerp, PIXEL, Quat, Vec3 } from './math';
import { FACES, flatIndex, type HairFace } from './faces';
import { parseColor } from './colors';
import type { CustomHair } from './customHair';
import { buildPose, StrandPose } from './pose';
import { CORNERS, shadingOf } from './occlusion';
import { resolveRamp, sampleRamp, type ColorRamp } from './colorRamp';

const BASE_OVERLAP = 0.015;
const OFFSET_EPSILON = 1.0e-5;
const LENGTH_SHADE = 0.55;
const OCCLUSION_SHADE = 1.3;
const OCCLUSION_PIVOT = 0.12;
const FACING_SHADE = 0.35;
const FACING_PIVOT = 0.3;
const SHADE_STEP = 0.5;
const DARKEST_SHADE = -0.5;
const COMB_JITTER = 0.22;
const CELLS_PER_UNIT = 1 / PIXEL;
const TEXTURE_SIZE = 16;
const TEXEL_UV = 1 / TEXTURE_SIZE;
const CAP_U = 0.5;
const CAP_V = 0.5;
const CAP_SEED = 4;

export interface PickEntry {
    face: HairFace;
    index: number;
    segment: number;
    start: Vec3;
    inverseRotation: Quat;
    halfWidth: number;
    bottom: number;
    top: number;
    halfDepth: number;
}

export interface HairMesh {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    uvs: Float32Array;
    strandIds: Float32Array;
    segmentIds: Float32Array;
    indices: Uint32Array;
    picks: PickEntry[];
}

export interface MeshOptions {
    globalColor: number;
    detailed?: boolean;
    isHidden?: (face: HairFace, index: number) => boolean;
}

function mix(value: number): number {
    let hash = Math.imul(value | 0, 0x9e3779b1);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x85ebca6b);
    return hash ^ (hash >>> 13);
}

function signedNoise(value: number): number {
    return (mix(value) & 0xffff) / 32767.5 - 1;
}

function level(shade: number): number {
    return Math.round(clamp(shade, DARKEST_SHADE, 1) / SHADE_STEP);
}

function cells(units: number): number {
    return Math.max(1, Math.round(units * CELLS_PER_UNIT));
}

export function buildHairMesh(hair: CustomHair, options: MeshOptions): HairMesh {
    return new MeshBuilder(options).build(hair);
}

class MeshBuilder {
    private readonly positions: number[] = [];
    private readonly normals: number[] = [];
    private readonly colors: number[] = [];
    private readonly uvs: number[] = [];
    private readonly strandIds: number[] = [];
    private readonly segmentIds: number[] = [];
    private readonly indices: number[] = [];
    private readonly picks: PickEntry[] = [];
    private vertexCount = 0;

    private rotations: Quat[] = [];
    private starts: Vec3[] = [];
    private ends: Vec3[] = [];
    private travelled: number[] = [];

    private readonly ringRotation = new Quat();
    private readonly inverse = new Quat();
    private readonly axisX = new Vec3();
    private readonly axisY = new Vec3();
    private readonly axisZ = new Vec3();
    private readonly localDirection = new Vec3();
    private readonly normal = new Vec3();
    private readonly edgeA = new Vec3();
    private readonly edgeB = new Vec3();
    private readonly center = new Vec3();
    private readonly bottomRing = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    private readonly topRing = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    private readonly box = Array.from({ length: 8 }, () => new Vec3());
    private readonly cell = new Vec3();
    private readonly cornerShades = new Float64Array(8);
    private readonly faceCenters = new Float64Array(4);
    private readonly rgb = new Float32Array(3);
    private rowLevels = new Int32Array(16);

    private strandV = 0;
    private ramp: ColorRamp = resolveRamp(0);
    private strandSeed = 0;
    private currentFlat = 0;
    private currentSegment = 0;
    private readonly detailed: boolean;

    constructor(private readonly options: MeshOptions) {
        this.detailed = options.detailed ?? true;
    }

    build(hair: CustomHair): HairMesh {
        const shading = shadingOf(hair);
        const pose = new StrandPose();
        for (const face of FACES) {
            for (let index = 0; index < face.maxStrands; index++) {
                const strand = hair.getStrand(face, index);
                if (!strand || !strand.isVisible()) continue;
                if (this.options.isHidden && this.options.isHidden(face, index)) continue;
                const flat = flatIndex(face, index);
                const params = shading.params[flat];
                const occlusion = shading.occlusion[flat];
                if (!params || !occlusion) continue;
                buildPose(strand, face, index, pose);
                if (pose.segments <= 0) continue;
                this.emitStrand(pose, flat, params, occlusion);
            }
        }
        return {
            positions: Float32Array.from(this.positions),
            normals: Float32Array.from(this.normals),
            colors: Float32Array.from(this.colors),
            uvs: Float32Array.from(this.uvs),
            strandIds: Float32Array.from(this.strandIds),
            segmentIds: Float32Array.from(this.segmentIds),
            indices: Uint32Array.from(this.indices),
            picks: this.picks,
        };
    }

    private ensureCapacity(count: number): void {
        while (this.rotations.length < count) {
            this.rotations.push(new Quat());
            this.starts.push(new Vec3());
            this.ends.push(new Vec3());
            this.travelled.push(0);
        }
    }

    private emitStrand(strand: StrandPose, flat: number, params: Float32Array, occlusion: Float32Array): void {
        const segments = strand.segments;
        this.ensureCapacity(segments);
        this.currentFlat = flat;

        const cursor = this.center.copy(strand.root);
        let parent = strand.baseRotation;
        const scratch = new Vec3();
        let length = 0;
        for (let k = 0; k < segments; k++) {
            this.rotations[k].copy(strand.restRotations[k]);
            parent.transform(scratch.copy(strand.localOffsets[k]), this.starts[k]).add(cursor);
            this.rotations[k].transform(this.ends[k].set(0, strand.lengths[k], 0)).add(this.starts[k]);
            cursor.copy(this.ends[k]);
            parent = this.rotations[k];
            this.travelled[k] = length;
            length += strand.lengths[k];
        }

        this.strandSeed = mix(strand.id);
        this.strandV = (this.strandSeed & 0xf) * TEXEL_UV;
        for (let side = 0; side < 4; side++) this.faceCenters[side] = ((this.strandSeed >>> (8 + side * 4)) & 0xf) * TEXEL_UV;

        for (let k = 0; k < segments; k++) {
            this.currentSegment = k;
            this.ramp = resolveRamp(strand.resolveColor(k, this.options.globalColor));
            this.shadeRing(params, occlusion, k, 0);
            this.shadeRing(params, occlusion, k + 1, 4);

            const halfWidth = strand.widths[k] * 0.5;
            const halfDepth = strand.depths[k] * 0.5;
            if (strand.jointStyle === 'CONNECTED') {
                this.emitConnected(strand, k);
            } else {
                this.emitBlock(strand, k);
            }
            this.picks.push({
                face: strand.face,
                index: strand.index,
                segment: k,
                start: this.starts[k].clone(),
                inverseRotation: this.rotations[k].conjugate(new Quat()),
                halfWidth,
                bottom: 0,
                top: strand.lengths[k],
                halfDepth,
            });
        }
    }

    private shadeRing(params: Float32Array, occlusion: Float32Array, ring: number, firstCorner: number): void {
        const lengthShade = LENGTH_SHADE * (2 * params[ring] - 1);
        for (let corner = 0; corner < CORNERS; corner++) {
            this.cornerShades[firstCorner + corner] = lengthShade + OCCLUSION_SHADE * (OCCLUSION_PIVOT - occlusion[ring * CORNERS + corner]);
        }
    }

    private emitBlock(strand: StrandPose, k: number): void {
        const rotation = this.rotations[k];
        rotation.transform(this.axisX.set(1, 0, 0));
        rotation.transform(this.axisY.set(0, 1, 0));
        rotation.transform(this.axisZ.set(0, 0, 1));

        const halfWidth = strand.widths[k] * 0.5;
        const halfDepth = strand.depths[k] * 0.5;
        let bottom = 0;
        if (k > 0 && isOffsetZero(strand, k)) {
            this.rotations[k - 1].conjugate(this.inverse).transform(this.localDirection.copy(this.axisY));
            bottom = -(halfWidth * Math.abs(this.localDirection.x) + halfDepth * Math.abs(this.localDirection.z) + BASE_OVERLAP);
        }
        const top = strand.lengths[k];
        const origin = this.starts[k];
        const box = this.box;

        this.corner(box[0], origin, -halfWidth, bottom, -halfDepth);
        this.corner(box[1], origin, halfWidth, bottom, -halfDepth);
        this.corner(box[2], origin, halfWidth, bottom, halfDepth);
        this.corner(box[3], origin, -halfWidth, bottom, halfDepth);
        this.corner(box[4], origin, -halfWidth, top, -halfDepth);
        this.corner(box[5], origin, halfWidth, top, -halfDepth);
        this.corner(box[6], origin, halfWidth, top, halfDepth);
        this.corner(box[7], origin, -halfWidth, top, halfDepth);

        const height = top - bottom;
        const vBase = this.strandV + Math.round((this.travelled[k] + bottom) * CELLS_PER_UNIT) * TEXEL_UV;
        this.normal.copy(this.axisY).negate();
        this.pixelFace(box[0], box[1], box[2], box[3], 0, 1, 2, 3, halfDepth * 2, halfWidth * 2, CAP_SEED, CAP_U, CAP_V, k === 0);
        this.normal.copy(this.axisY);
        this.pixelFace(box[7], box[6], box[5], box[4], 7, 6, 5, 4, halfDepth * 2, halfWidth * 2, CAP_SEED + 1, CAP_U, CAP_V, k === strand.segments - 1);
        this.normal.copy(this.axisZ).negate();
        this.pixelFace(box[0], box[4], box[5], box[1], 0, 4, 5, 1, halfWidth * 2, height, 0, this.faceCenters[0], vBase, true);
        this.normal.copy(this.axisX);
        this.pixelFace(box[1], box[5], box[6], box[2], 1, 5, 6, 2, halfDepth * 2, height, 1, this.faceCenters[1], vBase, true);
        this.normal.copy(this.axisZ);
        this.pixelFace(box[2], box[6], box[7], box[3], 2, 6, 7, 3, halfWidth * 2, height, 2, this.faceCenters[2], vBase, true);
        this.normal.copy(this.axisX).negate();
        this.pixelFace(box[3], box[7], box[4], box[0], 3, 7, 4, 0, halfDepth * 2, height, 3, this.faceCenters[3], vBase, true);
    }

    private emitConnected(strand: StrandPose, k: number): void {
        const segments = strand.segments;
        const joinedBelow = k > 0 && isOffsetZero(strand, k);
        const joinedAbove = k < segments - 1 && isOffsetZero(strand, k + 1);
        const bottomRing = this.bottomRing;
        const topRing = this.topRing;

        let bottomHalfWidth: number;
        let bottomHalfDepth: number;
        if (joinedBelow) {
            this.rotations[k - 1].slerp(this.rotations[k], 0.5, this.ringRotation);
            bottomHalfWidth = (strand.widths[k - 1] + strand.widths[k]) * 0.25;
            bottomHalfDepth = (strand.depths[k - 1] + strand.depths[k]) * 0.25;
            this.ring(bottomRing, this.starts[k], this.ringRotation, bottomHalfWidth, bottomHalfDepth);
        } else {
            bottomHalfWidth = strand.widths[k] * 0.5;
            bottomHalfDepth = strand.depths[k] * 0.5;
            this.ring(bottomRing, this.starts[k], this.rotations[k], bottomHalfWidth, bottomHalfDepth);
            this.rotations[k].transform(this.normal.set(0, -1, 0));
            this.pixelFace(bottomRing[0], bottomRing[1], bottomRing[2], bottomRing[3], 0, 1, 2, 3, bottomHalfDepth * 2, bottomHalfWidth * 2, CAP_SEED, CAP_U, CAP_V, k === 0);
        }

        let topHalfWidth: number;
        let topHalfDepth: number;
        if (joinedAbove) {
            this.rotations[k].slerp(this.rotations[k + 1], 0.5, this.ringRotation);
            topHalfWidth = (strand.widths[k] + strand.widths[k + 1]) * 0.25;
            topHalfDepth = (strand.depths[k] + strand.depths[k + 1]) * 0.25;
            this.ring(topRing, this.ends[k], this.ringRotation, topHalfWidth, topHalfDepth);
        } else {
            topHalfWidth = strand.widths[k] * 0.5;
            topHalfDepth = strand.depths[k] * 0.5;
            this.ring(topRing, this.ends[k], this.rotations[k], topHalfWidth, topHalfDepth);
            this.rotations[k].transform(this.normal.set(0, 1, 0));
            this.pixelFace(topRing[3], topRing[2], topRing[1], topRing[0], 7, 6, 5, 4, topHalfDepth * 2, topHalfWidth * 2, CAP_SEED + 1, CAP_U, CAP_V, k === segments - 1);
        }

        const vBase = this.strandV + Math.round(this.travelled[k] * CELLS_PER_UNIT) * TEXEL_UV;
        this.center.copy(this.starts[k]).add(this.ends[k]).mul(0.5);
        for (let side = 0; side < 4; side++) {
            const nextSide = (side + 1) % 4;
            const alongWidth = (side & 1) === 0;
            const span = alongWidth ? bottomHalfWidth + topHalfWidth : bottomHalfDepth + topHalfDepth;
            this.faceNormal(bottomRing[side], bottomRing[nextSide], topRing[nextSide], topRing[side]);
            this.pixelFace(bottomRing[side], topRing[side], topRing[nextSide], bottomRing[nextSide], side, 4 + side, 4 + nextSide, nextSide,
                span, strand.lengths[k], side, this.faceCenters[side], vBase, true);
        }
    }

    private pixelFace(bottomLeft: Vec3, topLeft: Vec3, topRight: Vec3, bottomRight: Vec3,
                      shadeBottomLeft: number, shadeTopLeft: number, shadeTopRight: number, shadeBottomRight: number,
                      width: number, height: number, seed: number, uBase: number, vBase: number, visible: boolean): void {
        const split = this.detailed && visible;
        const columns = split ? cells(width) : 1;
        const rows = split ? cells(height) : 1;
        if (this.rowLevels.length < rows) this.rowLevels = new Int32Array(Math.max(rows, this.rowLevels.length * 2));
        const facing = FACING_SHADE * (this.normal.y - FACING_PIVOT);
        const shades = this.cornerShades;
        for (let column = 0; column < columns; column++) {
            const across = (column + 0.5) / columns;
            const bottomShade = lerp(across, shades[shadeBottomLeft], shades[shadeBottomRight]);
            const topShade = lerp(across, shades[shadeTopLeft], shades[shadeTopRight]);
            const offset = facing + (split ? COMB_JITTER * signedNoise((this.strandSeed + seed * 131 + column * 31) | 0) : 0);
            for (let row = 0; row < rows; row++) {
                this.rowLevels[row] = level(lerp((row + 0.5) / rows, bottomShade, topShade) + offset);
            }
            let runStart = 0;
            for (let row = 1; row <= rows; row++) {
                if (row < rows && this.rowLevels[row] === this.rowLevels[runStart]) continue;
                this.emitCell(bottomLeft, topLeft, topRight, bottomRight, column / columns, (column + 1) / columns,
                    runStart / rows, row / rows, this.rowLevels[runStart],
                    uBase + column * TEXEL_UV, uBase + (column + 1) * TEXEL_UV, vBase + runStart * TEXEL_UV, vBase + row * TEXEL_UV);
                runStart = row;
            }
        }
    }

    private emitCell(bottomLeft: Vec3, topLeft: Vec3, topRight: Vec3, bottomRight: Vec3, across0: number, across1: number,
                     along0: number, along1: number, shadeLevel: number, u0: number, u1: number, v0: number, v1: number): void {
        sampleRamp(this.ramp, shadeLevel * SHADE_STEP, this.rgb, 0);
        const first = this.vertexCount;
        this.vertex(this.interpolate(bottomLeft, topLeft, topRight, bottomRight, across0, along0), u0, v0);
        this.vertex(this.interpolate(bottomLeft, topLeft, topRight, bottomRight, across0, along1), u0, v1);
        this.vertex(this.interpolate(bottomLeft, topLeft, topRight, bottomRight, across1, along1), u1, v1);
        this.vertex(this.interpolate(bottomLeft, topLeft, topRight, bottomRight, across1, along0), u1, v0);
        this.indices.push(first, first + 1, first + 2, first + 2, first + 3, first);
    }

    private interpolate(bottomLeft: Vec3, topLeft: Vec3, topRight: Vec3, bottomRight: Vec3, across: number, along: number): Vec3 {
        this.edgeA.copy(bottomLeft).lerp(bottomRight, across);
        this.edgeB.copy(topLeft).lerp(topRight, across);
        return this.cell.copy(this.edgeA).lerp(this.edgeB, along);
    }

    private faceNormal(a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
        this.edgeA.copy(c).sub(a);
        this.edgeB.copy(d).sub(b);
        this.edgeA.cross(this.edgeB, this.normal);
        if (this.normal.lengthSquared() < 1.0e-12) {
            this.normal.copy(a).add(b).add(c).add(d).mul(0.25).sub(this.center);
        }
        this.edgeB.copy(a).add(b).add(c).add(d).mul(0.25).sub(this.center);
        if (this.normal.dot(this.edgeB) < 0) this.normal.negate();
        this.normal.normalize();
    }

    private ring(out: Vec3[], origin: Vec3, rotation: Quat, halfWidth: number, halfDepth: number): void {
        rotation.transform(this.axisX.set(1, 0, 0));
        rotation.transform(this.axisZ.set(0, 0, 1));
        const ax = this.axisX;
        const az = this.axisZ;
        out[0].copy(origin).addXYZ(-halfWidth * ax.x - halfDepth * az.x, -halfWidth * ax.y - halfDepth * az.y, -halfWidth * ax.z - halfDepth * az.z);
        out[1].copy(origin).addXYZ(halfWidth * ax.x - halfDepth * az.x, halfWidth * ax.y - halfDepth * az.y, halfWidth * ax.z - halfDepth * az.z);
        out[2].copy(origin).addXYZ(halfWidth * ax.x + halfDepth * az.x, halfWidth * ax.y + halfDepth * az.y, halfWidth * ax.z + halfDepth * az.z);
        out[3].copy(origin).addXYZ(-halfWidth * ax.x + halfDepth * az.x, -halfWidth * ax.y + halfDepth * az.y, -halfWidth * ax.z + halfDepth * az.z);
    }

    private corner(out: Vec3, origin: Vec3, x: number, y: number, z: number): void {
        const ax = this.axisX;
        const ay = this.axisY;
        const az = this.axisZ;
        out.copy(origin)
            .addXYZ(ax.x * x, ax.y * x, ax.z * x)
            .addXYZ(ay.x * y, ay.y * y, ay.z * y)
            .addXYZ(az.x * z, az.y * z, az.z * z);
    }

    private vertex(position: Vec3, u: number, v: number): void {
        this.positions.push(position.x, position.y, position.z);
        this.normals.push(this.normal.x, this.normal.y, this.normal.z);
        this.colors.push(this.rgb[0], this.rgb[1], this.rgb[2]);
        this.uvs.push(u, v);
        this.strandIds.push(this.currentFlat);
        this.segmentIds.push(this.currentSegment);
        this.vertexCount++;
    }
}

function isOffsetZero(strand: StrandPose, segment: number): boolean {
    return strand.localOffsets[segment].lengthSquared() < OFFSET_EPSILON * OFFSET_EPSILON;
}

export function parseGlobalColor(hex: string): number {
    const rgb = parseColor(hex);
    return rgb < 0 ? 0 : rgb;
}

export function intersectPick(entry: PickEntry, origin: Vec3, direction: Vec3): number {
    const localOrigin = entry.inverseRotation.transform(origin.clone().sub(entry.start), new Vec3());
    const localDirection = entry.inverseRotation.transform(direction.clone(), new Vec3());
    let tMin = -Infinity;
    let tMax = Infinity;
    const min = [-entry.halfWidth, entry.bottom, -entry.halfDepth];
    const max = [entry.halfWidth, entry.top, entry.halfDepth];
    const o = [localOrigin.x, localOrigin.y, localOrigin.z];
    const d = [localDirection.x, localDirection.y, localDirection.z];
    for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(d[axis]) < 1.0e-9) {
            if (o[axis] < min[axis] || o[axis] > max[axis]) return -1;
            continue;
        }
        let t1 = (min[axis] - o[axis]) / d[axis];
        let t2 = (max[axis] - o[axis]) / d[axis];
        if (t1 > t2) {
            const swap = t1;
            t1 = t2;
            t2 = swap;
        }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return -1;
    }
    if (tMax < 0) return -1;
    return tMin >= 0 ? tMin : tMax;
}
