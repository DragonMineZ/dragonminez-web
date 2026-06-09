/**
 * Typed model of the DragonMineZ custom hair format.
 * Mirrors `com.dragonminez.common.hair.CustomHair` / `HairStrand` from the mod (v2.1).
 */

export const HAIR_FACES = ["FRONT", "BACK", "LEFT", "RIGHT", "TOP"] as const;
export type HairFace = (typeof HAIR_FACES)[number];

export const FACE_KEYS: Record<HairFace, string> = {
    FRONT: "F",
    BACK: "B",
    LEFT: "L",
    RIGHT: "R",
    TOP: "T",
};

export interface FaceInfo {
    maxStrands: number;
    rows: number;
    cols: number;
}

export const FACE_INFO: Record<HairFace, FaceInfo> = {
    FRONT: { maxStrands: 4, rows: 1, cols: 4 },
    BACK: { maxStrands: 16, rows: 4, cols: 4 },
    LEFT: { maxStrands: 16, rows: 4, cols: 4 },
    RIGHT: { maxStrands: 16, rows: 4, cols: 4 },
    TOP: { maxStrands: 16, rows: 4, cols: 4 },
};

export const HAIR_VERSION = 5;
export const MAX_STRAND_LENGTH = 50;
/** Per-segment size decay used by the in-game renderer. */
export const SIZE_DECAY = 0.85;
/** Minecraft pixel → world unit scale used by the in-game renderer. */
export const UNIT_SCALE = 1 / 16;

export interface HairStrandModel {
    id: number;
    /** Number of stacked cubes (0 = hidden). */
    length: number;
    lengthScale: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    cubeWidth: number;
    cubeHeight: number;
    cubeDepth: number;
    curveX: number;
    curveY: number;
    curveZ: number;
    /** Per-strand hex color ("#RRGGBB") overriding the global color, or null. */
    color: string | null;
}

export interface CustomHairModel {
    name: string;
    globalColor: string;
    strands: Record<HairFace, HairStrandModel[]>;
}

export type HairStyleKey = "base" | "ssj" | "ssj2" | "ssj3";
export const HAIR_STYLES: HairStyleKey[] = ["base", "ssj", "ssj2", "ssj3"];

export interface HairSetModel {
    base: CustomHairModel;
    ssj: CustomHairModel;
    ssj2: CustomHairModel;
    ssj3: CustomHairModel;
}

export function faceOrdinal(face: HairFace): number {
    return HAIR_FACES.indexOf(face);
}

/** Port of CustomHair.getBaseRotation */
export function getBaseRotation(face: HairFace): [number, number, number] {
    switch (face) {
        case "FRONT": return [-90, 0, 0];
        case "BACK": return [90, 0, 0];
        case "LEFT": return [0, 0, 90];
        case "RIGHT": return [0, 0, -90];
        case "TOP": return [0, 0, 0];
    }
}

/** Port of CustomHair.computeStrandBasePosition (Minecraft pixels). */
export function getStrandBasePosition(face: HairFace, index: number): [number, number, number] {
    const info = FACE_INFO[face];
    const row = Math.floor(index / info.cols);
    const col = index % info.cols;

    const positions = [-3, -1, 1, 3];
    const yOffsets = [0, -1.5, -3, -4.5];

    const gridX = positions[col % 4];
    const gridZ = positions[row % 4];
    const rowYOffset = yOffsets[row % 4];

    switch (face) {
        case "FRONT": return [gridX, 7.25, -4.0];
        case "BACK": return [gridX, 7.25 + rowYOffset, 4.0];
        case "LEFT": return [-3.95, 7.25 + rowYOffset, gridX];
        case "RIGHT": return [3.95, 7.25 + rowYOffset, -gridX];
        case "TOP": return [gridX, 7.85, gridZ];
    }
}

export function createEmptyStrand(face: HairFace, index: number): HairStrandModel {
    const [rx, ry, rz] = getBaseRotation(face);
    return {
        id: faceOrdinal(face) * 100 + index,
        length: 0,
        lengthScale: 1,
        rotX: rx,
        rotY: ry,
        rotZ: rz,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        cubeWidth: 2,
        cubeHeight: 2,
        cubeDepth: 2,
        curveX: 0,
        curveY: 0,
        curveZ: 0,
        color: null,
    };
}

export function createEmptyHair(name = "Custom", globalColor = "#000000"): CustomHairModel {
    const strands = {} as Record<HairFace, HairStrandModel[]>;
    for (const face of HAIR_FACES) {
        strands[face] = Array.from({ length: FACE_INFO[face].maxStrands }, (_, i) =>
            createEmptyStrand(face, i),
        );
    }
    return { name, globalColor, strands };
}

export function copyStrand(s: HairStrandModel): HairStrandModel {
    return { ...s };
}

export function copyHair(hair: CustomHairModel): CustomHairModel {
    const strands = {} as Record<HairFace, HairStrandModel[]>;
    for (const face of HAIR_FACES) {
        strands[face] = hair.strands[face].map(copyStrand);
    }
    return { name: hair.name, globalColor: hair.globalColor, strands };
}

export function createEmptySet(): HairSetModel {
    return {
        base: createEmptyHair(),
        ssj: createEmptyHair(),
        ssj2: createEmptyHair(),
        ssj3: createEmptyHair(),
    };
}

export function copySet(set: HairSetModel): HairSetModel {
    return {
        base: copyHair(set.base),
        ssj: copyHair(set.ssj),
        ssj2: copyHair(set.ssj2),
        ssj3: copyHair(set.ssj3),
    };
}

export function isStrandVisible(s: HairStrandModel): boolean {
    return s.length > 0;
}

export function isHairEmpty(hair: CustomHairModel): boolean {
    return HAIR_FACES.every((face) => hair.strands[face].every((s) => s.length <= 0));
}

/**
 * Port of HairEditorScreen.fillEmptyStyles: empty styles inherit from the
 * previous one so exported full-set codes always carry all four forms.
 */
export function fillEmptySet(set: HairSetModel): HairSetModel {
    const base = isHairEmpty(set.base) ? createEmptyHair() : copyHair(set.base);
    const ssj = isHairEmpty(set.ssj) ? copyHair(base) : copyHair(set.ssj);
    const ssj2 = isHairEmpty(set.ssj2) ? copyHair(ssj) : copyHair(set.ssj2);
    const ssj3 = isHairEmpty(set.ssj3) ? copyHair(ssj2) : copyHair(set.ssj3);
    return { base, ssj, ssj2, ssj3 };
}
