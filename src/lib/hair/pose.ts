import { DEG_TO_RAD, PIXEL, Quat, Vec3 } from './math';
import { INHERIT, lerpColor, parseColor } from './colors';
import { getStrandBasePosition, strandId, type HairFace } from './faces';
import type { HairJointStyle, HairStrand } from './strand';

export class StrandPose {
    face!: HairFace;
    index = 0;
    id = 0;
    segments = 0;
    jointStyle: HairJointStyle = 'BLOCKS';

    readonly root = new Vec3();
    readonly baseRotation = new Quat();
    relativeRotations: Quat[] = [];
    localOffsets: Vec3[] = [];
    restRotations: Quat[] = [];
    restStarts: Vec3[] = [];
    readonly restTip = new Vec3();

    lengths: number[] = [];
    widths: number[] = [];
    depths: number[] = [];
    params: number[] = [];

    strandColor = INHERIT;
    tipColor = INHERIT;
    segmentColors: number[] = [];

    ensureCapacity(count: number): void {
        while (this.lengths.length < count) {
            this.relativeRotations.push(new Quat());
            this.restRotations.push(new Quat());
            this.localOffsets.push(new Vec3());
            this.restStarts.push(new Vec3());
            this.lengths.push(0);
            this.widths.push(0);
            this.depths.push(0);
            this.params.push(0);
            this.segmentColors.push(INHERIT);
        }
    }

    restEnd(segment: number, out: Vec3): Vec3 {
        return this.restRotations[segment].transform(out.set(0, this.lengths[segment], 0)).add(this.restStarts[segment]);
    }

    resolveColor(segment: number, global: number): number {
        const segmentColor = this.segmentColors[segment];
        if (segmentColor !== INHERIT) return segmentColor;
        const base = this.strandColor !== INHERIT ? this.strandColor : global;
        const tip = this.tipColor !== INHERIT ? this.tipColor : base;
        return lerpColor(base, tip, this.params[segment]);
    }
}

export function buildPose(strand: HairStrand, face: HairFace, index: number, out: StrandPose): void {
    buildGeometry(strand, face, index, out);
    out.strandColor = parseColor(strand.color);
    out.tipColor = parseColor(strand.tipColor);
    for (let k = 0; k < out.segments; k++) {
        const override = strand.getOverride(k);
        out.segmentColors[k] = override ? parseColor(override.color) : INHERIT;
    }
}

export function buildGeometry(strand: HairStrand, face: HairFace, index: number, out: StrandPose): void {
    const segments = strand.segments;
    out.ensureCapacity(segments);
    out.face = face;
    out.index = index;
    out.id = strandId(face, index);
    out.segments = segments;
    out.jointStyle = strand.jointStyle;

    const base = getStrandBasePosition(face, index);
    out.root.set(base.x + strand.offsetX, base.y + strand.offsetY, base.z + strand.offsetZ).mul(PIXEL);
    out.baseRotation.identity()
        .rotateX(strand.rotationX * DEG_TO_RAD)
        .rotateY(strand.rotationY * DEG_TO_RAD)
        .rotateZ(strand.rotationZ * DEG_TO_RAD);
    if (segments <= 0) {
        out.restTip.copy(out.root);
        return;
    }

    let totalWeight = 0;
    for (let k = 0; k < segments; k++) {
        const param = segments > 1 ? k / (segments - 1) : 0;
        out.params[k] = param;
        totalWeight += Math.pow(strand.lengthRatio, param);
    }

    const joints = Math.max(1, segments - 1);
    const bendX = segments > 1 ? strand.bendX / joints * DEG_TO_RAD : 0;
    const bendY = segments > 1 ? strand.bendY / joints * DEG_TO_RAD : 0;
    const bendZ = segments > 1 ? strand.bendZ / joints * DEG_TO_RAD : 0;
    const twist = segments > 1 ? strand.twist / joints * DEG_TO_RAD : 0;

    let lengthScale = 1;
    let widthScale = 1;
    let depthScale = 1;
    for (let k = 0; k < segments; k++) {
        const param = out.params[k];
        const override = strand.getOverride(k);
        const weight = Math.pow(strand.lengthRatio, param) / totalWeight;
        const taperFactor = Math.pow(strand.taper, Math.pow(param, strand.taperCurve));
        if (override) {
            lengthScale *= override.lengthScale;
            widthScale *= override.widthScale;
            depthScale *= override.depthScale;
        }

        out.lengths[k] = strand.length * weight * PIXEL * lengthScale;
        out.widths[k] = strand.width * taperFactor * PIXEL * widthScale;
        out.depths[k] = strand.depth * taperFactor * PIXEL * depthScale;

        const relative = out.relativeRotations[k].identity();
        if (k > 0) relative.rotateX(bendX).rotateY(bendY).rotateZ(bendZ).rotateY(twist);

        const offset = out.localOffsets[k];
        if (override) {
            offset.set(override.offsetX, override.offsetY, override.offsetZ).mul(PIXEL);
            relative.transform(offset);
            relative.rotateX(override.rotationX * DEG_TO_RAD)
                .rotateY(override.rotationY * DEG_TO_RAD)
                .rotateZ(override.rotationZ * DEG_TO_RAD);
        } else {
            offset.zero();
        }
    }

    let parent = out.baseRotation;
    const cursor = out.restTip.copy(out.root);
    const scratch = new Vec3();
    for (let k = 0; k < segments; k++) {
        const start = out.restStarts[k];
        parent.transform(scratch.copy(out.localOffsets[k]), start).add(cursor);
        const rotation = out.restRotations[k].copy(parent).mul(out.relativeRotations[k]);
        rotation.transform(cursor.set(0, out.lengths[k], 0)).add(start);
        parent = rotation;
    }
}
