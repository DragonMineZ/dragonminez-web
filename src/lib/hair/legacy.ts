import { clamp, DEG_TO_RAD, Mat4, Quat, RAD_TO_DEG, Vec3 } from './math';
import { getBaseRotation, getStrandBasePosition, strandId, type HairFace } from './faces';
import { NbtCompound } from './nbt';
import { HairStrand } from './strand';
import { buildGeometry, StrandPose } from './pose';

export const LEGACY_DECAY = Math.fround(0.85);
export const FIDELITY_EPSILON_PX = 0.1;

export interface LegacyStrand {
    length: number;
    lengthScale: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    cubeWidth: number;
    cubeHeight: number;
    cubeDepth: number;
    curveX: number;
    curveY: number;
    curveZ: number;
    color: string | null;
}

function readFloat(tag: NbtCompound, shortKey: string, longKey: string, fallback: number): number {
    const value = tag.contains(shortKey) ? tag.getFloat(shortKey) : (tag.contains(longKey) ? tag.getFloat(longKey) : fallback);
    return Number.isFinite(value) ? value : fallback;
}

export function readLegacyStrand(tag: NbtCompound): LegacyStrand {
    return {
        length: Math.max(0, tag.contains('l') ? tag.getInt('l') : tag.getInt('Length')),
        lengthScale: readFloat(tag, 'ls', 'LengthScale', 1),
        rotationX: readFloat(tag, 'rx', 'RotX', 0),
        rotationY: readFloat(tag, 'ry', 'RotY', 0),
        rotationZ: readFloat(tag, 'rz', 'RotZ', 0),
        scaleX: readFloat(tag, 'sx', 'ScaleX', 1),
        scaleY: readFloat(tag, 'sy', 'ScaleY', 1),
        scaleZ: readFloat(tag, 'sz', 'ScaleZ', 1),
        cubeWidth: readFloat(tag, 'cw', 'CubeW', 2),
        cubeHeight: readFloat(tag, 'ch', 'CubeH', 2),
        cubeDepth: readFloat(tag, 'cd', 'CubeD', 2),
        curveX: readFloat(tag, 'cx', 'CurveX', 0),
        curveY: readFloat(tag, 'cy', 'CurveY', 0),
        curveZ: readFloat(tag, 'cz', 'CurveZ', 0),
        color: tag.contains('c') ? tag.getString('c') : (tag.contains('Color') ? tag.getString('Color') : null),
    };
}

export function createDefaultStrand(face: HairFace, index: number): HairStrand {
    const strand = new HairStrand(strandId(face, index));
    const rotation = getBaseRotation(face);
    strand.setRotation(rotation[0], rotation[1], rotation[2]);
    return strand;
}

export function migrateStrand(face: HairFace, index: number, tag: NbtCompound): HairStrand {
    const legacy = readLegacyStrand(tag);
    const strand = createDefaultStrand(face, index);
    strand.setRotation(legacy.rotationX, legacy.rotationY, legacy.rotationZ);
    strand.setColor(legacy.color);

    const segments = Math.min(legacy.length, HairStrand.MAX_SEGMENTS);
    if (segments <= 0) {
        strand.setSegments(0);
        return strand;
    }

    const decaySum = (1 - Math.pow(LEGACY_DECAY, segments)) / (1 - LEGACY_DECAY);
    const ratio = Math.fround(Math.pow(LEGACY_DECAY, segments - 1));

    strand.setSegments(segments);
    strand.setLength(Math.fround(Math.fround(Math.fround(legacy.cubeHeight * legacy.lengthScale) * legacy.scaleY) * decaySum));
    strand.setLengthRatio(ratio);
    strand.setTaper(ratio);
    strand.setTaperCurve(1);
    strand.setWidth(Math.fround(legacy.cubeWidth * legacy.scaleX));
    strand.setDepth(Math.fround(legacy.cubeDepth * legacy.scaleZ));
    strand.setBend(Math.fround(legacy.curveX * (segments - 1)), Math.fround(legacy.curveY * (segments - 1)), Math.fround(legacy.curveZ * (segments - 1)));

    const legacyJoints = legacyCenterline(face, index, legacy, segments);
    const pose = new StrandPose();
    buildGeometry(strand, face, index, pose);
    if (maxDeviationPx(pose, legacyJoints) > FIDELITY_EPSILON_PX) fitCenterline(strand, legacyJoints, pose);
    return strand;
}

export function legacyCenterline(face: HairFace, index: number, legacy: LegacyStrand, segments: number): Vec3[] {
    const base = getStrandBasePosition(face, index);
    const matrix = new Mat4()
        .translate(base.x, base.y, base.z)
        .rotateX(legacy.rotationX * DEG_TO_RAD)
        .rotateY(legacy.rotationY * DEG_TO_RAD)
        .rotateZ(legacy.rotationZ * DEG_TO_RAD)
        .scale(legacy.scaleX, legacy.scaleY, legacy.scaleZ);

    const joints: Vec3[] = [];
    let decay = 1;
    let previousHeight = 0;
    for (let i = 0; i < segments; i++) {
        const height = Math.fround(Math.fround(legacy.cubeHeight * decay) * legacy.lengthScale);
        if (i > 0) {
            matrix.translate(0, previousHeight, 0)
                .rotateX(legacy.curveX * DEG_TO_RAD)
                .rotateY(legacy.curveY * DEG_TO_RAD)
                .rotateZ(legacy.curveZ * DEG_TO_RAD);
        }
        joints[i] = matrix.transformPosition(0, 0, 0);
        previousHeight = height;
        decay = Math.fround(decay * LEGACY_DECAY);
    }
    joints[segments] = matrix.transformPosition(0, previousHeight, 0);
    return joints;
}

export function maxDeviationPx(pose: StrandPose, legacyJoints: Vec3[]): number {
    let max = 0;
    const scratch = new Vec3();
    for (let k = 0; k < pose.segments; k++) {
        max = Math.max(max, scratch.copy(pose.restStarts[k]).mul(16).distance(legacyJoints[k]));
    }
    max = Math.max(max, scratch.copy(pose.restTip).mul(16).distance(legacyJoints[pose.segments]));
    return max;
}

function fitCenterline(strand: HairStrand, legacyJoints: Vec3[], pose: StrandPose): void {
    strand.clearOverrides();
    const segments = pose.segments;
    const baseLengths: number[] = [];
    for (let k = 0; k < segments; k++) baseLengths[k] = pose.lengths[k] * 16;

    const parent = pose.baseRotation.clone();
    const frame = new Quat();
    const inverse = new Quat();
    const direction = new Vec3();
    const joints = Math.max(1, segments - 1);
    const bendX = segments > 1 ? strand.bendX / joints * DEG_TO_RAD : 0;
    const bendY = segments > 1 ? strand.bendY / joints * DEG_TO_RAD : 0;
    const bendZ = segments > 1 ? strand.bendZ / joints * DEG_TO_RAD : 0;

    for (let k = 0; k < segments; k++) {
        frame.copy(parent);
        if (k > 0) frame.rotateX(bendX).rotateY(bendY).rotateZ(bendZ);

        direction.copy(legacyJoints[k + 1]).sub(legacyJoints[k]);
        const actualLength = direction.length();
        if (actualLength < 1.0e-5 || baseLengths[k] < 1.0e-5) {
            parent.copy(frame);
            continue;
        }

        frame.invert(inverse).transform(direction).mul(1 / actualLength);
        const rotationZ = Math.asin(clamp(-direction.x, -1, 1));
        const rotationX = Math.atan2(direction.z, direction.y);

        const override = strand.getOrCreateOverride(k);
        override.setRotation(Math.fround(rotationX * RAD_TO_DEG), 0, Math.fround(rotationZ * RAD_TO_DEG));
        override.setLengthScale(Math.fround(actualLength / baseLengths[k]));
        if (override.isIdentity()) strand.removeOverride(k);

        parent.copy(frame).rotateX(rotationX).rotateZ(rotationZ);
    }
}
