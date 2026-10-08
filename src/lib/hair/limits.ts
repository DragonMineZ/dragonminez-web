import { clamp, PIXEL } from './math';
import { FACES, type HairFace, type HairStyleSlot } from './faces';
import { CustomHair } from './customHair';
import { HairStrand } from './strand';
import { buildGeometry, StrandPose } from './pose';

export interface HairLimits {
    maxSegments: number;
    maxLength: number;
    maxWidth: number;
    maxRootOffset: number;
    maxTotalSegments: number;
}

export const DEFAULT_LIMITS: HairLimits = {
    maxSegments: 12,
    maxLength: 20,
    maxWidth: 8,
    maxRootOffset: 2,
    maxTotalSegments: 600,
};

export function maxLengthFor(limits: HairLimits, _slot: HairStyleSlot): number {
    return limits.maxLength;
}

export const MIN_SEGMENT_LENGTH = 1.0;
export const MAX_SEGMENT_LENGTH = 4.0;

export function resizeLength(strand: HairStrand, length: number, maxSegments: number, maxLength: number): void {
    let segments = Math.max(1, strand.segments);
    let clamped = clamp(length, MIN_SEGMENT_LENGTH, maxLength);
    while (clamped / segments > MAX_SEGMENT_LENGTH && segments < maxSegments) segments++;
    while (clamped / segments < MIN_SEGMENT_LENGTH && segments > 1) segments--;
    clamped = clamp(clamped, segments * MIN_SEGMENT_LENGTH, Math.min(maxLength, segments * MAX_SEGMENT_LENGTH));
    strand.setSegments(segments);
    strand.setLength(clamped);
}

export function resizeSegments(strand: HairStrand, segments: number, maxSegments: number, maxLength: number): void {
    const count = Math.max(1, Math.min(maxSegments, segments));
    strand.setSegments(count);
    strand.setLength(clamp(strand.length, count * MIN_SEGMENT_LENGTH, Math.min(maxLength, count * MAX_SEGMENT_LENGTH)));
}

export function addSegment(strand: HairStrand, maxSegments: number, maxLength: number): boolean {
    const segments = strand.segments;
    if (segments >= maxSegments) return false;
    const average = segments > 0 ? strand.length / segments : HairStrand.DEFAULT_LENGTH / HairStrand.DEFAULT_SEGMENTS;
    const length = Math.min(maxLength, strand.length + average);
    if (length / (segments + 1) < MIN_SEGMENT_LENGTH) return false;
    strand.setSegments(segments + 1);
    strand.setLength(length);
    return true;
}

export function removeSegment(strand: HairStrand): boolean {
    const segments = strand.segments;
    if (segments <= 1) return false;
    const average = strand.length / segments;
    strand.setSegments(segments - 1);
    strand.setLength(Math.max(MIN_SEGMENT_LENGTH, strand.length - average));
    strand.removeOverride(segments - 1);
    return true;
}

export function sanitize(hair: CustomHair, slot: HairStyleSlot, limits: HairLimits): number {
    let adjustments = 0;
    let remainingSegments = limits.maxTotalSegments;
    const scratch = new StrandPose();
    for (const face of FACES) {
        const strands = hair.getStrands(face);
        for (let index = 0; index < strands.length; index++) {
            const strand = strands[index];
            if (!strand.isVisible()) continue;
            if (remainingSegments <= 0) {
                strand.setSegments(0);
                adjustments++;
                continue;
            }
            adjustments += sanitizeStrand(strand, face, index, slot, limits, scratch);
            if (strand.segments > remainingSegments) {
                strand.setSegments(remainingSegments);
                adjustments++;
            }
            remainingSegments -= strand.segments;
        }
    }
    if (adjustments > 0) hair.markChanged();
    return adjustments;
}

function sanitizeStrand(strand: HairStrand, face: HairFace, index: number, slot: HairStyleSlot, limits: HairLimits, scratch: StrandPose): number {
    let adjustments = 0;
    if (strand.segments > limits.maxSegments) {
        strand.setSegments(limits.maxSegments);
        adjustments++;
    }

    const maxWidth = limits.maxWidth;
    if (strand.width > maxWidth) {
        strand.setWidth(maxWidth);
        adjustments++;
    }
    if (strand.depth > maxWidth) {
        strand.setDepth(maxWidth);
        adjustments++;
    }

    const maxOffset = limits.maxRootOffset;
    const offsetX = clamp(strand.offsetX, -maxOffset, maxOffset);
    const offsetY = clamp(strand.offsetY, -maxOffset, maxOffset);
    const offsetZ = clamp(strand.offsetZ, -maxOffset, maxOffset);
    if (offsetX !== strand.offsetX || offsetY !== strand.offsetY || offsetZ !== strand.offsetZ) {
        strand.setOffset(offsetX, offsetY, offsetZ);
        adjustments++;
    }

    const widthScaleLimit = maxWidth / strand.width;
    const depthScaleLimit = maxWidth / strand.depth;
    let widthScale = 1;
    let depthScale = 1;
    for (let k = 0; k < strand.segments; k++) {
        const override = strand.getOverride(k);
        if (!override) continue;
        if (widthScale * override.widthScale > widthScaleLimit) {
            override.setWidthScale(widthScaleLimit / widthScale);
            adjustments++;
        }
        if (depthScale * override.depthScale > depthScaleLimit) {
            override.setDepthScale(depthScaleLimit / depthScale);
            adjustments++;
        }
        widthScale *= override.widthScale;
        depthScale *= override.depthScale;
    }

    buildGeometry(strand, face, index, scratch);
    let totalLength = 0;
    for (let k = 0; k < scratch.segments; k++) totalLength += scratch.lengths[k] / PIXEL;
    const maxLength = maxLengthFor(limits, slot);
    if (totalLength > maxLength && totalLength > 0) {
        strand.setLength(strand.length * (maxLength / totalLength));
        adjustments++;
    }
    return adjustments;
}
