import pako from 'pako';
import { BASE_SLOT, FACES, SLOTS, SSJ2_SLOT, SSJ3_SLOT, SSJ4_SLOT, SSJ_SLOT } from './faces';
import { CustomHair, type HairStyleSet } from './customHair';
import { NbtCompound, TAG_COMPOUND, TAG_LIST, readNbt, writeNbt } from './nbt';

export const CODE_PREFIX = 'DMZ22:';
export const FULL_CODE_PREFIX = 'DMZF22:';

const LEGACY_CODE_PREFIX = 'DMZ1:';
const LEGACY_FULL_CODE_PREFIX = 'DMZF1:';
const OLD_WEB_PREFIXES = ['DMZF4:', 'DMZF5:', 'DMZ4:', 'DMZ5:'];
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE64_URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_DECOMPRESSED_BYTES = 1 << 21;
const MAX_NBT_BYTES = 1 << 21;
export const MAX_CODE_LENGTH = 1 << 18;
const BIG_NUMBER_CHUNK = 8;

export function cleanCode(code: string): string {
    return code.replace(/[\s​﻿]+/g, '');
}

export function isFullSetCode(code: string | null | undefined): boolean {
    if (!code) return false;
    const trimmed = cleanCode(code);
    return trimmed.startsWith(FULL_CODE_PREFIX) || trimmed.startsWith(LEGACY_FULL_CODE_PREFIX)
        || trimmed.startsWith('DMZF4:') || trimmed.startsWith('DMZF5:');
}

export function isCurrentCode(code: string): boolean {
    const trimmed = cleanCode(code);
    return trimmed.startsWith(CODE_PREFIX) || trimmed.startsWith(FULL_CODE_PREFIX);
}

export function toCurrentCode(code: string): string {
    if (isCurrentCode(code)) return code;
    if (isFullSetCode(code)) {
        const set = fromFullSetCode(code);
        return set ? toFullSetCode(set) : code;
    }
    const single = fromCode(code);
    return single ? toCode(single) : code;
}

export function toCode(hair: CustomHair): string {
    return CODE_PREFIX + encode(withoutJointStyles(hair.save()));
}

export function toFullSetCode(styles: HairStyleSet): string {
    const tag = new NbtCompound();
    for (const slot of SLOTS) tag.putCompound(slot.codeKey, withoutJointStyles(styles[slot.index].save()));
    return FULL_CODE_PREFIX + encode(tag);
}

export function fromCode(code: string | null | undefined): CustomHair | null {
    if (!code) return null;
    const trimmed = cleanCode(code);
    if (!trimmed) return null;
    if (isFullSetCode(trimmed)) {
        const set = fromFullSetCode(trimmed);
        return set ? set[BASE_SLOT.index] : null;
    }
    const tag = decodeTag(trimmed);
    if (!tag) return null;
    if (tag.contains('Base') && (tag.contains('SSJ') || tag.contains('SSJ2') || tag.contains('SSJ3'))) {
        return CustomHair.fromTag(withoutJointStyles(tag.getCompound('Base')));
    }
    return CustomHair.fromTag(withoutJointStyles(tag));
}

export function fromFullSetCode(code: string | null | undefined): HairStyleSet | null {
    if (!code || !isFullSetCode(code)) return null;
    const trimmed = cleanCode(code);
    const tag = decodeTag(trimmed);
    if (!tag) return null;

    const styles: (CustomHair | undefined)[] = [];
    for (const slot of SLOTS) {
        const key = tag.contains(slot.codeKey) ? slot.codeKey : (tag.contains(slot.legacyCodeKey) ? slot.legacyCodeKey : null);
        if (key !== null) styles[slot.index] = CustomHair.fromTag(withoutJointStyles(tag.getCompound(key)));
    }

    const base = styles[BASE_SLOT.index] ?? new CustomHair();
    styles[BASE_SLOT.index] = base;
    if (!trimmed.startsWith(FULL_CODE_PREFIX) && !styles[SSJ2_SLOT.index] && styles[SSJ_SLOT.index]) {
        styles[SSJ2_SLOT.index] = styles[SSJ_SLOT.index]!.copy();
    }
    styles[SSJ_SLOT.index] ??= base.copy();
    styles[SSJ2_SLOT.index] ??= base.copy();
    styles[SSJ3_SLOT.index] ??= base.copy();
    styles[SSJ4_SLOT.index] ??= new CustomHair();
    return styles as HairStyleSet;
}

function withoutJointStyles(style: NbtCompound): NbtCompound {
    for (const face of FACES) {
        for (const key of [face.key, face.name]) {
            if (!style.contains(key, TAG_LIST)) continue;
            const strands = style.getList(key, TAG_COMPOUND);
            for (let i = 0; i < strands.size; i++) strands.getCompound(i).remove('js');
        }
    }
    return style;
}

function decodeTag(code: string): NbtCompound | null {
    if (code.length > MAX_CODE_LENGTH) return null;
    try {
        let compressed: Uint8Array;
        if (code.startsWith(FULL_CODE_PREFIX)) {
            compressed = decodeBase64Url(code.substring(FULL_CODE_PREFIX.length));
        } else if (code.startsWith(CODE_PREFIX)) {
            compressed = decodeBase64Url(code.substring(CODE_PREFIX.length));
        } else if (code.startsWith(LEGACY_FULL_CODE_PREFIX)) {
            compressed = decodeBigNumber(code.substring(LEGACY_FULL_CODE_PREFIX.length), BASE62_ALPHABET);
        } else if (code.startsWith(LEGACY_CODE_PREFIX)) {
            compressed = decodeBigNumber(code.substring(LEGACY_CODE_PREFIX.length), BASE62_ALPHABET);
        } else {
            const prefix = OLD_WEB_PREFIXES.find((candidate) => code.startsWith(candidate));
            if (!prefix) return null;
            compressed = decodeBigNumber(code.substring(prefix.length), BASE64_URL_ALPHABET);
        }
        const raw = pako.inflateRaw(compressed);
        if (raw.length > MAX_DECOMPRESSED_BYTES) return null;
        return readNbt(raw, MAX_NBT_BYTES);
    } catch {
        return null;
    }
}

function encode(tag: NbtCompound): string {
    const compressed = pako.deflateRaw(writeNbt(tag), { level: 9 });
    return encodeBase64Url(compressed);
}

function encodeBase64Url(bytes: Uint8Array): string {
    let result = '';
    let i = 0;
    for (; i + 2 < bytes.length; i += 3) {
        const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        result += BASE64_URL_ALPHABET[(chunk >> 18) & 63] + BASE64_URL_ALPHABET[(chunk >> 12) & 63]
            + BASE64_URL_ALPHABET[(chunk >> 6) & 63] + BASE64_URL_ALPHABET[chunk & 63];
    }
    const remaining = bytes.length - i;
    if (remaining === 1) {
        const chunk = bytes[i] << 16;
        result += BASE64_URL_ALPHABET[(chunk >> 18) & 63] + BASE64_URL_ALPHABET[(chunk >> 12) & 63];
    } else if (remaining === 2) {
        const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8);
        result += BASE64_URL_ALPHABET[(chunk >> 18) & 63] + BASE64_URL_ALPHABET[(chunk >> 12) & 63] + BASE64_URL_ALPHABET[(chunk >> 6) & 63];
    }
    return result;
}

function decodeBase64Url(text: string): Uint8Array {
    const clean = text.replace(/=+$/, '');
    if (clean.length % 4 === 1) throw new Error('Invalid base64 length');
    const output: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < clean.length; i++) {
        const value = BASE64_URL_ALPHABET.indexOf(clean[i]);
        if (value < 0) throw new Error(`Invalid base64 character '${clean[i]}'`);
        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output.push((buffer >> bits) & 0xff);
        }
    }
    return Uint8Array.from(output);
}

function decodeBigNumber(encoded: string, alphabet: string): Uint8Array {
    if (!encoded) return new Uint8Array(0);
    let value = 0n;
    const base = alphabet.length;
    for (let start = 0; start < encoded.length; start += BIG_NUMBER_CHUNK) {
        const end = Math.min(encoded.length, start + BIG_NUMBER_CHUNK);
        let chunk = 0;
        for (let i = start; i < end; i++) {
            const digit = alphabet.indexOf(encoded[i]);
            if (digit < 0) throw new Error(`Invalid character '${encoded[i]}'`);
            chunk = chunk * base + digit;
        }
        value = value * BigInt(base) ** BigInt(end - start) + BigInt(chunk);
    }
    let hex = value.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    return bytes;
}
