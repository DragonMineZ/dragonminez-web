import { Vec3 } from './math';

export type HairFaceKey = 'F' | 'B' | 'L' | 'R' | 'T';
export type HairFaceName = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'TOP';

export interface HairFace {
    readonly key: HairFaceKey;
    readonly name: HairFaceName;
    readonly ordinal: number;
    readonly maxStrands: number;
    readonly rows: number;
    readonly cols: number;
}

export const FRONT_STRANDS = 4;
export const SIDE_STRANDS = 16;

export const FRONT: HairFace = { key: 'F', name: 'FRONT', ordinal: 0, maxStrands: FRONT_STRANDS, rows: 1, cols: 4 };
export const BACK: HairFace = { key: 'B', name: 'BACK', ordinal: 1, maxStrands: SIDE_STRANDS, rows: 4, cols: 4 };
export const LEFT: HairFace = { key: 'L', name: 'LEFT', ordinal: 2, maxStrands: SIDE_STRANDS, rows: 4, cols: 4 };
export const RIGHT: HairFace = { key: 'R', name: 'RIGHT', ordinal: 3, maxStrands: SIDE_STRANDS, rows: 4, cols: 4 };
export const TOP: HairFace = { key: 'T', name: 'TOP', ordinal: 4, maxStrands: SIDE_STRANDS, rows: 4, cols: 4 };

export const FACES: readonly HairFace[] = [FRONT, BACK, LEFT, RIGHT, TOP];

const FLAT_OFFSETS: number[] = [];
let flatTotal = 0;
for (const face of FACES) {
    FLAT_OFFSETS.push(flatTotal);
    flatTotal += face.maxStrands;
}
export const STRAND_COUNT = flatTotal;

export function flatIndex(face: HairFace, index: number): number {
    return FLAT_OFFSETS[face.ordinal] + index;
}

export function strandId(face: HairFace, index: number): number {
    return face.ordinal * 100 + index;
}

const BASE_POSITIONS: Vec3[][] = FACES.map((face) => {
    const positions: Vec3[] = [];
    for (let index = 0; index < face.maxStrands; index++) positions.push(computeStrandBasePosition(face, index));
    return positions;
});

function computeStrandBasePosition(face: HairFace, index: number): Vec3 {
    const row = Math.floor(index / face.cols);
    const col = index % face.cols;
    const positions = [-3.0, -1.0, 1.0, 3.0];
    const yOffsets = [0.0, -1.5, -3.0, -4.5];
    const gridX = positions[col % 4];
    const gridZ = positions[row % 4];
    const rowYOffset = yOffsets[row % 4];
    switch (face.name) {
        case 'FRONT':
            return new Vec3(gridX, 7.25, -4.0);
        case 'BACK':
            return new Vec3(gridX, 7.25 + rowYOffset, 4.0);
        case 'LEFT':
            return new Vec3(-3.95, 7.25 + rowYOffset, gridX);
        case 'RIGHT':
            return new Vec3(3.95, 7.25 + rowYOffset, -gridX);
        case 'TOP':
            return new Vec3(gridX, 7.85, gridZ);
    }
}

export function getStrandBasePosition(face: HairFace, index: number): Vec3 {
    const cached = BASE_POSITIONS[face.ordinal];
    if (index >= 0 && index < cached.length) return cached[index];
    return new Vec3();
}

export function getBaseRotation(face: HairFace): [number, number, number] {
    switch (face.name) {
        case 'FRONT':
            return [-90, 0, 0];
        case 'BACK':
            return [90, 0, 0];
        case 'LEFT':
            return [0, 0, 90];
        case 'RIGHT':
            return [0, 0, -90];
        case 'TOP':
            return [0, 0, 0];
    }
}

export function mirrorFace(face: HairFace): HairFace {
    if (face === LEFT) return RIGHT;
    if (face === RIGHT) return LEFT;
    return face;
}

export function mirrorIndex(face: HairFace, index: number): number {
    const row = Math.floor(index / face.cols);
    const col = index % face.cols;
    return row * face.cols + (face.cols - 1 - col);
}

export type HairSlotName = 'BASE' | 'SSJ' | 'SSJ2' | 'SSJ3' | 'SSJ4';

export interface HairStyleSlot {
    readonly name: HairSlotName;
    readonly index: number;
    readonly nbtKey: string;
    readonly codeKey: string;
    readonly legacyCodeKey: string;
    readonly hairType: string;
}

export const SLOTS: readonly HairStyleSlot[] = [
    { name: 'BASE', index: 0, nbtKey: 'HairBase', codeKey: 'B', legacyCodeKey: 'Base', hairType: 'base' },
    { name: 'SSJ', index: 1, nbtKey: 'HairSSJ', codeKey: 'S', legacyCodeKey: 'SSJ', hairType: 'ssj' },
    { name: 'SSJ2', index: 2, nbtKey: 'HairSSJ2', codeKey: 'S2', legacyCodeKey: 'SSJ2', hairType: 'ssj2' },
    { name: 'SSJ3', index: 3, nbtKey: 'HairSSJ3', codeKey: 'T', legacyCodeKey: 'SSJ3', hairType: 'ssj3' },
    { name: 'SSJ4', index: 4, nbtKey: 'HairSSJ4', codeKey: 'S4', legacyCodeKey: 'SSJ4', hairType: 'ssj4' },
];

export const BASE_SLOT = SLOTS[0];
export const SSJ_SLOT = SLOTS[1];
export const SSJ2_SLOT = SLOTS[2];
export const SSJ3_SLOT = SLOTS[3];
export const SSJ4_SLOT = SLOTS[4];
