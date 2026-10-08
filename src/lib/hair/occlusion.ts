import { clamp, PIXEL, Quat, smoothstep, Vec3 } from './math';
import { FACES, flatIndex, STRAND_COUNT } from './faces';
import type { CustomHair } from './customHair';
import { buildGeometry, StrandPose } from './pose';

export const CORNERS = 4;

const HEAD_MIN = -4.0;
const HEAD_MAX = 4.0;
const HEAD_MIN_Y = 0.0;
const HEAD_MAX_Y = 8.0;
const HEAD_RANGE = 3.0;
const OCCLUDER_RANGE = 3.5;
const SPHERE_SPACING = 1.5;
const SAMPLE_OFFSET = 0.05;
const PIXELS_PER_UNIT = 1 / PIXEL;
const CORNER_X = [-1, 1, 1, -1];
const CORNER_Z = [-1, -1, 1, 1];

export interface Shading {
    revision: number;
    params: (Float32Array | null)[];
    occlusion: (Float32Array | null)[];
}

const cache = new WeakMap<CustomHair, Shading>();

export function shadingOf(hair: CustomHair): Shading {
    const cached = cache.get(hair);
    if (cached && cached.revision === hair.revision) return cached;
    const computed = new Workspace().compute(hair);
    cache.set(hair, computed);
    return computed;
}

export function ringParams(pose: StrandPose, out: Float32Array): void {
    let total = 0;
    for (let k = 0; k < pose.segments; k++) total += pose.lengths[k];
    out[0] = 0;
    let travelled = 0;
    for (let k = 0; k < pose.segments; k++) {
        travelled += pose.lengths[k];
        out[k + 1] = total > 0 ? travelled / total : (k + 1) / pose.segments;
    }
}

class Workspace {
    private readonly poses: StrandPose[] = [];
    private readonly present: boolean[] = new Array(STRAND_COUNT).fill(false);
    private readonly occluders: number[] = [];
    private readonly firstSphere = new Int32Array(STRAND_COUNT);
    private readonly lastSphere = new Int32Array(STRAND_COUNT);
    private readonly reachBounds = new Float64Array(STRAND_COUNT * 6);
    private spheres: number[] = [];
    private segmentsOf: number[] = [];
    private sphereCount = 0;

    private readonly ringRotation = new Quat();
    private readonly ringCenter = new Vec3();
    private readonly end = new Vec3();
    private readonly axisX = new Vec3();
    private readonly axisZ = new Vec3();
    private readonly point = new Vec3();
    private readonly normal = new Vec3();

    compute(hair: CustomHair): Shading {
        const shading: Shading = {
            revision: hair.revision,
            params: new Array(STRAND_COUNT).fill(null),
            occlusion: new Array(STRAND_COUNT).fill(null),
        };
        this.collect(hair);
        for (const face of FACES) {
            for (let index = 0; index < face.maxStrands; index++) {
                const flat = flatIndex(face, index);
                if (!this.present[flat]) continue;
                const pose = this.poses[flat];
                const rings = pose.segments + 1;
                const params = new Float32Array(rings);
                const values = new Float32Array(rings * CORNERS);
                ringParams(pose, params);
                for (let ring = 0; ring < rings; ring++) this.shadeRing(flat, pose, ring, values);
                shading.params[flat] = params;
                shading.occlusion[flat] = values;
            }
        }
        return shading;
    }

    private collect(hair: CustomHair): void {
        this.sphereCount = 0;
        this.spheres = [];
        this.segmentsOf = [];
        this.occluders.length = 0;
        for (const face of FACES) {
            for (let index = 0; index < face.maxStrands; index++) {
                const flat = flatIndex(face, index);
                const strand = hair.getStrand(face, index);
                this.present[flat] = strand !== null && strand.isVisible();
                if (!this.present[flat] || !strand) continue;
                let pose = this.poses[flat];
                if (!pose) pose = this.poses[flat] = new StrandPose();
                buildGeometry(strand, face, index, pose);
                if (pose.segments <= 0) {
                    this.present[flat] = false;
                    continue;
                }
                this.firstSphere[flat] = this.sphereCount;
                for (let k = 0; k < pose.segments; k++) this.addSegment(k, pose);
                this.lastSphere[flat] = this.sphereCount;
                this.computeReach(flat);
                this.occluders.push(flat);
            }
        }
    }

    private addSegment(segment: number, pose: StrandPose): void {
        const start = pose.restStarts[segment];
        pose.restEnd(segment, this.end);
        const radius = Math.sqrt((pose.widths[segment] * pose.depths[segment]) / Math.PI) * PIXELS_PER_UNIT;
        const length = start.distance(this.end) * PIXELS_PER_UNIT;
        const count = Math.max(1, Math.round(length / (radius * SPHERE_SPACING)));
        for (let i = 0; i < count; i++) {
            const fraction = (i + 0.5) / count;
            this.spheres.push(
                (start.x + (this.end.x - start.x) * fraction) * PIXELS_PER_UNIT,
                (start.y + (this.end.y - start.y) * fraction) * PIXELS_PER_UNIT,
                (start.z + (this.end.z - start.z) * fraction) * PIXELS_PER_UNIT,
                radius
            );
            this.segmentsOf.push(segment);
            this.sphereCount++;
        }
    }

    private computeReach(flat: number): void {
        const bounds = flat * 6;
        const reach = this.reachBounds;
        reach[bounds] = Infinity;
        reach[bounds + 1] = Infinity;
        reach[bounds + 2] = Infinity;
        reach[bounds + 3] = -Infinity;
        reach[bounds + 4] = -Infinity;
        reach[bounds + 5] = -Infinity;
        for (let sphere = this.firstSphere[flat]; sphere < this.lastSphere[flat]; sphere++) {
            const base = sphere * 4;
            const distance = this.spheres[base + 3] * OCCLUDER_RANGE;
            for (let axis = 0; axis < 3; axis++) {
                reach[bounds + axis] = Math.min(reach[bounds + axis], this.spheres[base + axis] - distance);
                reach[bounds + 3 + axis] = Math.max(reach[bounds + 3 + axis], this.spheres[base + axis] + distance);
            }
        }
    }

    private withinReach(flat: number, position: Vec3): boolean {
        const bounds = flat * 6;
        const reach = this.reachBounds;
        return position.x >= reach[bounds] && position.x <= reach[bounds + 3]
            && position.y >= reach[bounds + 1] && position.y <= reach[bounds + 4]
            && position.z >= reach[bounds + 2] && position.z <= reach[bounds + 5];
    }

    private shadeRing(flat: number, pose: StrandPose, ring: number, out: Float32Array): void {
        const segments = pose.segments;
        const below = Math.max(0, ring - 1);
        const above = Math.min(segments - 1, ring);
        if (ring === 0) {
            this.ringCenter.copy(pose.restStarts[0]);
        } else if (ring === segments) {
            pose.restEnd(segments - 1, this.ringCenter);
        } else {
            pose.restEnd(below, this.ringCenter).add(pose.restStarts[above]).mul(0.5);
        }
        pose.restRotations[below].slerp(pose.restRotations[above], below === above ? 0 : 0.5, this.ringRotation);
        const halfWidth = (pose.widths[below] + pose.widths[above]) * 0.25 * PIXELS_PER_UNIT;
        const halfDepth = (pose.depths[below] + pose.depths[above]) * 0.25 * PIXELS_PER_UNIT;
        this.ringCenter.mul(PIXELS_PER_UNIT);
        this.ringRotation.transform(this.axisX.set(1, 0, 0));
        this.ringRotation.transform(this.axisZ.set(0, 0, 1));

        const axisX = this.axisX;
        const axisZ = this.axisZ;
        for (let corner = 0; corner < CORNERS; corner++) {
            const sx = CORNER_X[corner];
            const sz = CORNER_Z[corner];
            this.normal.copy(axisX).mul(sx * halfDepth).addXYZ(axisZ.x * sz * halfWidth, axisZ.y * sz * halfWidth, axisZ.z * sz * halfWidth).normalize();
            this.point.copy(this.ringCenter)
                .addXYZ(axisX.x * sx * halfWidth, axisX.y * sx * halfWidth, axisX.z * sx * halfWidth)
                .addXYZ(axisZ.x * sz * halfDepth, axisZ.y * sz * halfDepth, axisZ.z * sz * halfDepth)
                .addXYZ(this.normal.x * SAMPLE_OFFSET, this.normal.y * SAMPLE_OFFSET, this.normal.z * SAMPLE_OFFSET);
            let visibility = 1 - headOcclusion(this.point, this.normal);
            for (let i = 0; i < this.occluders.length && visibility > 0; i++) {
                const occluder = this.occluders[i];
                if (!this.withinReach(occluder, this.point)) continue;
                const self = occluder === flat;
                for (let sphere = this.firstSphere[occluder]; sphere < this.lastSphere[occluder]; sphere++) {
                    if (self && (this.segmentsOf[sphere] === below || this.segmentsOf[sphere] === above)) continue;
                    visibility *= 1 - this.sphereOcclusion(this.point, this.normal, sphere);
                }
            }
            out[ring * CORNERS + corner] = clamp(1 - visibility, 0, 1);
        }
    }

    private sphereOcclusion(position: Vec3, surfaceNormal: Vec3, sphere: number): number {
        const base = sphere * 4;
        const radius = this.spheres[base + 3];
        const dx = this.spheres[base] - position.x;
        const dy = this.spheres[base + 1] - position.y;
        const dz = this.spheres[base + 2] - position.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        const reach = radius * OCCLUDER_RANGE;
        if (distanceSquared > reach * reach) return 0;
        const distance = Math.sqrt(distanceSquared);
        if (distance <= radius) return 1;
        const cosine = (surfaceNormal.x * dx + surfaceNormal.y * dy + surfaceNormal.z * dz) / distance;
        const ratio = distance / radius;
        const ratioSquared = ratio * ratio;
        let result: number;
        if (ratioSquared * cosine * cosine < 1) {
            const crossing = (cosine * ratio + 1) / ratioSquared;
            result = 0.33 * crossing * crossing;
        } else {
            result = Math.max(0, cosine) / ratioSquared;
        }
        const falloff = 1 - smoothstep((distance - radius) / (reach - radius));
        return clamp(result * falloff, 0, 1);
    }
}

function headOcclusion(position: Vec3, surfaceNormal: Vec3): number {
    const cx = clamp(position.x, HEAD_MIN, HEAD_MAX);
    const cy = clamp(position.y, HEAD_MIN_Y, HEAD_MAX_Y);
    const cz = clamp(position.z, HEAD_MIN, HEAD_MAX);
    const dx = position.x - cx;
    const dy = position.y - cy;
    const dz = position.z - cz;
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let nx: number;
    let ny: number;
    let nz: number;
    if (distance > 1.0e-4) {
        nx = dx / distance;
        ny = dy / distance;
        nz = dz / distance;
    } else {
        distance = 0;
        const toMinX = position.x - HEAD_MIN;
        const toMaxX = HEAD_MAX - position.x;
        const toMinY = position.y - HEAD_MIN_Y;
        const toMaxY = HEAD_MAX_Y - position.y;
        const toMinZ = position.z - HEAD_MIN;
        const toMaxZ = HEAD_MAX - position.z;
        const nearest = Math.min(Math.min(Math.min(toMinX, toMaxX), Math.min(toMinY, toMaxY)), Math.min(toMinZ, toMaxZ));
        nx = nearest === toMinX ? -1 : (nearest === toMaxX ? 1 : 0);
        ny = nx !== 0 ? 0 : (nearest === toMinY ? -1 : (nearest === toMaxY ? 1 : 0));
        nz = nx !== 0 || ny !== 0 ? 0 : (nearest === toMinZ ? -1 : 1);
    }
    const facing = surfaceNormal.x * nx + surfaceNormal.y * ny + surfaceNormal.z * nz;
    return 0.5 * (1 - facing) * Math.exp(-distance / HEAD_RANGE);
}
