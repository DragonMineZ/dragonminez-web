/**
 * Encoder/decoder for DragonMineZ hair codes ("DMZ1:" single style /
 * "DMZF1:" full set), byte-compatible with `HairManager` in the mod:
 * binary NBT → raw deflate (level 9) → big-integer base62 → prefix.
 */
import pako from "pako";
import { decodeHairCode } from "../hair_decoder";
import { parseNbt, type HairData, type HairFormData, type StrandData } from "../nbt_reader";
import {
    HAIR_FACES,
    FACE_KEYS,
    FACE_INFO,
    HAIR_VERSION,
    type CustomHairModel,
    type HairFace,
    type HairSetModel,
    type HairStrandModel,
    copyHair,
    createEmptyHair,
    createEmptyStrand,
    faceOrdinal,
    fillEmptySet,
    isStrandVisible,
} from "./model";
import {
    type NbtCompound,
    nbtCompound,
    nbtFloat,
    nbtInt,
    nbtList,
    nbtString,
    writeNbt,
} from "./nbt_writer";

const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SINGLE_PREFIX = "DMZ1:";
export const FULL_SET_PREFIX = "DMZF1:";

// ── Encoding ────────────────────────────────────────────────────────────────

function strandToNbt(strand: HairStrandModel): NbtCompound {
    const tag: NbtCompound = new Map();
    if (strand.id !== 0) tag.set("i", nbtInt(strand.id));
    if (strand.length !== 0) tag.set("l", nbtInt(strand.length));
    if (strand.lengthScale !== 1) tag.set("ls", nbtFloat(strand.lengthScale));

    if (strand.rotX !== 0) tag.set("rx", nbtFloat(strand.rotX));
    if (strand.rotY !== 0) tag.set("ry", nbtFloat(strand.rotY));
    if (strand.rotZ !== 0) tag.set("rz", nbtFloat(strand.rotZ));

    if (strand.scaleX !== 1) tag.set("sx", nbtFloat(strand.scaleX));
    if (strand.scaleY !== 1) tag.set("sy", nbtFloat(strand.scaleY));
    if (strand.scaleZ !== 1) tag.set("sz", nbtFloat(strand.scaleZ));

    if (strand.cubeWidth !== 2) tag.set("cw", nbtFloat(strand.cubeWidth));
    if (strand.cubeHeight !== 2) tag.set("ch", nbtFloat(strand.cubeHeight));
    if (strand.cubeDepth !== 2) tag.set("cd", nbtFloat(strand.cubeDepth));

    if (strand.curveX !== 0) tag.set("cx", nbtFloat(strand.curveX));
    if (strand.curveY !== 0) tag.set("cy", nbtFloat(strand.curveY));
    if (strand.curveZ !== 0) tag.set("cz", nbtFloat(strand.curveZ));

    if (strand.color) tag.set("c", nbtString(strand.color));
    return tag;
}

function hairToNbt(hair: CustomHairModel): NbtCompound {
    const tag: NbtCompound = new Map();
    tag.set("v", nbtInt(HAIR_VERSION));
    if (hair.name) tag.set("n", nbtString(hair.name));
    tag.set("gc", nbtString(hair.globalColor));

    for (const face of HAIR_FACES) {
        const visible = hair.strands[face].filter(isStrandVisible).map(strandToNbt);
        if (visible.length > 0) {
            tag.set(FACE_KEYS[face], nbtList(visible));
        }
    }
    return tag;
}

function bytesToBase62(bytes: Uint8Array): string {
    if (bytes.length === 0) return "";
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    let value = BigInt("0x" + hex);
    if (value === 0n) return BASE62_ALPHABET[0];

    const base = 62n;
    let out = "";
    while (value > 0n) {
        out = BASE62_ALPHABET[Number(value % base)] + out;
        value /= base;
    }
    return out;
}

function compressAndEncode(nbtBytes: Uint8Array, prefix: string): string {
    const compressed = pako.deflateRaw(nbtBytes, { level: 9 });
    return prefix + bytesToBase62(compressed);
}

/** Serializes a single hair style to a "DMZ1:" code. */
export function encodeHair(hair: CustomHairModel): string {
    return compressAndEncode(writeNbt(hairToNbt(hair)), SINGLE_PREFIX);
}

/**
 * Serializes a full style set to a "DMZF1:" code.
 * Empty styles inherit from the previous one, mirroring the in-game editor.
 */
export function encodeHairSet(set: HairSetModel): string {
    const filled = fillEmptySet(set);
    const root: NbtCompound = new Map();
    root.set("B", nbtCompound(hairToNbt(filled.base)));
    root.set("S", nbtCompound(hairToNbt(filled.ssj)));
    root.set("S2", nbtCompound(hairToNbt(filled.ssj2)));
    root.set("T", nbtCompound(hairToNbt(filled.ssj3)));
    return compressAndEncode(writeNbt(root), FULL_SET_PREFIX);
}

// ── Decoding (raw NBT object → typed model) ─────────────────────────────────

function num(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
    }
    return undefined;
}

function loadStrand(tag: StrandData, face: HairFace, index: number): HairStrandModel {
    const raw = tag as unknown as Record<string, unknown>;
    const strand = createEmptyStrand(face, index);
    strand.length = Math.max(0, Math.min(50, num(pick(raw, "l", "Length"), 0)));
    strand.lengthScale = num(pick(raw, "ls", "LengthScale"), 1);
    strand.rotX = num(pick(raw, "rx", "RotX"), 0);
    strand.rotY = num(pick(raw, "ry", "RotY"), 0);
    strand.rotZ = num(pick(raw, "rz", "RotZ"), 0);
    strand.scaleX = num(pick(raw, "sx", "ScaleX"), 1);
    strand.scaleY = num(pick(raw, "sy", "ScaleY"), 1);
    strand.scaleZ = num(pick(raw, "sz", "ScaleZ"), 1);
    strand.cubeWidth = num(pick(raw, "cw", "CubeW"), 2);
    strand.cubeHeight = num(pick(raw, "ch", "CubeH"), 2);
    strand.cubeDepth = num(pick(raw, "cd", "CubeD"), 2);
    strand.curveX = num(pick(raw, "cx", "CurveX"), 0);
    strand.curveY = num(pick(raw, "cy", "CurveY"), 0);
    strand.curveZ = num(pick(raw, "cz", "CurveZ"), 0);
    strand.color = str(pick(raw, "c", "Color"));
    return strand;
}

/** Port of CustomHair.load: maps saved strands back to grid slots by static id. */
export function hairFromNbtObject(data: HairFormData): CustomHairModel {
    const raw = data as Record<string, unknown>;
    const hair = createEmptyHair();

    const version = num(pick(raw, "v", "Version"), 1);
    hair.name = (str(pick(raw, "n", "Name")) ?? "Custom").toString();
    hair.globalColor = str(pick(raw, "gc", "GlobalColor")) ?? "#000000";

    for (const face of HAIR_FACES) {
        const list = pick(raw, FACE_KEYS[face], face, face.toLowerCase());
        if (!Array.isArray(list)) continue;

        const strands = hair.strands[face];
        for (let i = 0; i < list.length; i++) {
            const tag = list[i] as StrandData;
            const idInTag = num(pick(tag as unknown as Record<string, unknown>, "i", "Id"), 0);

            let targetIndex = i;
            if (version >= 2) {
                const calculated = idInTag - faceOrdinal(face) * 100;
                if (calculated >= 0 && calculated < strands.length) {
                    targetIndex = calculated;
                }
            }
            if (targetIndex < strands.length) {
                strands[targetIndex] = loadStrand(tag, face, targetIndex);
            }
        }
    }
    return hair;
}

export interface DecodedHairSet {
    set: HairSetModel;
    isFullSet: boolean;
    /** Styles that were actually present in the code (vs. inherited). */
    availableStyles: string[];
}

function readForm(root: Record<string, unknown>, ...aliases: string[]): CustomHairModel | null {
    for (const alias of aliases) {
        const value = root[alias];
        if (value && typeof value === "object" && !Array.isArray(value)) {
            return hairFromNbtObject(value as HairFormData);
        }
    }
    return null;
}

/**
 * Decodes any supported hair code (DMZ1/4/5, DMZF1/4/5) into a typed,
 * fully-populated style set. Single-style codes populate `base` only.
 */
export function decodeHairToSet(code: string): DecodedHairSet | null {
    const decoded = decodeHairCode(code);
    if (!decoded) return null;

    let data: HairData;
    try {
        data = parseNbt(decoded.data);
    } catch {
        return null;
    }

    const root = data as Record<string, unknown>;
    const base = readForm(root, "B", "Base", "base");
    const ssj = readForm(root, "S", "SSJ", "ssj");
    const ssj2 = readForm(root, "S2", "SSJ2", "ssj2");
    const ssj3 = readForm(root, "T", "SSJ3", "ssj3");
    const hasForms = !!(base || ssj || ssj2 || ssj3);

    const availableStyles: string[] = [];
    if (base) availableStyles.push("base");
    if (ssj) availableStyles.push("ssj");
    if (ssj2) availableStyles.push("ssj2");
    if (ssj3) availableStyles.push("ssj3");

    if (!hasForms) {
        const single = hairFromNbtObject(data as HairFormData);
        return {
            set: fillEmptySet({
                base: single,
                ssj: createEmptyHair(),
                ssj2: createEmptyHair(),
                ssj3: createEmptyHair(),
            }),
            isFullSet: false,
            availableStyles: ["base"],
        };
    }

    const resolvedBase = base ?? createEmptyHair();
    const resolvedSsj = ssj ?? copyHair(resolvedBase);
    const resolvedSsj2 = ssj2 ?? copyHair(resolvedSsj);
    const resolvedSsj3 = ssj3 ?? copyHair(resolvedBase);

    return {
        set: { base: resolvedBase, ssj: resolvedSsj, ssj2: resolvedSsj2, ssj3: resolvedSsj3 },
        isFullSet: decoded.isFullSet,
        availableStyles,
    };
}

export function isFullSetCode(code: string): boolean {
    return /^DMZF[145]:/i.test(code.trim());
}

export function isValidHairCode(code: string): boolean {
    return /^DMZF?[145]:[A-Za-z0-9_-]+$/i.test(code.trim());
}

export { FACE_INFO };
