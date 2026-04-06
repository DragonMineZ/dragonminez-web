import pako from 'pako';

const BASE64_URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export interface DecodedHair {
    data: Uint8Array;
    isFullSet: boolean;
    version?: number;
}

export function decodeHairCode(code: string): DecodedHair | null {
    if (!code) return null;

    let isFullSet = false;
    // Remove all whitespace including non-breaking spaces and hidden characters
    let cleanCode = code.trim().replace(/[\s\u200B\uFEFF]+/g, '');
    const upperCode = cleanCode.toUpperCase();

    let alphabet = BASE64_URL_ALPHABET;

    // Check for prefixes (case-insensitive due to upperCode)
    if (upperCode.startsWith("DMZF1:")) {
        cleanCode = cleanCode.substring(6);
        isFullSet = true;
        alphabet = BASE62_ALPHABET;
    } else if (upperCode.startsWith("DMZ1:")) {
        cleanCode = cleanCode.substring(5);
        alphabet = BASE62_ALPHABET;
    } else if (upperCode.startsWith("DMZF4:")) {
        cleanCode = cleanCode.substring(6);
        isFullSet = true;
        alphabet = BASE64_URL_ALPHABET;
    } else if (upperCode.startsWith("DMZ4:")) {
        cleanCode = cleanCode.substring(5);
        alphabet = BASE64_URL_ALPHABET;
    } else if (upperCode.startsWith("DMZF5:")) {
        cleanCode = cleanCode.substring(6);
        isFullSet = true;
        alphabet = BASE64_URL_ALPHABET;
    } else if (upperCode.startsWith("DMZ5:")) {
        cleanCode = cleanCode.substring(5);
        alphabet = BASE64_URL_ALPHABET;
    } else {
        // If no DMZ prefix is found, it might be a raw code or an unsupported version
        console.warn(`[HairDecoder] Unknown code format: ${upperCode.substring(0, 10)}...`);
    }

    try {
        const bigInt = decodeBase64ToBigInt(cleanCode, alphabet);
        const bytes = bigIntToByteArray(bigInt);
        const decompressed = pako.inflate(bytes, { raw: true });

        return {
            data: new Uint8Array(decompressed),
            isFullSet: isFullSet
        };
    } catch (e) {
        console.error(`[HairDecoder] Decoding failed for input: ${code.substring(0, 20)}...`, e);
        return null;
    }
}

function decodeBase64ToBigInt(encoded: string, alphabet: string): bigint {
    let value = 0n;
    const base = BigInt(alphabet.length);

    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charAt(i);
        const digit = alphabet.indexOf(char);
        if (digit < 0) {
            throw new Error("Invalid char at " + i + ": '" + char + "' (Code: " + char.charCodeAt(0) + ")");
        }

        value = (value * base) + BigInt(digit);
    }

    return value;
}

function bigIntToByteArray(bigInt: bigint): Uint8Array {
    let hex = bigInt.toString(16);
    if (hex.length % 2) {
        hex = '0' + hex;
    }

    const len = hex.length / 2;
    const u8 = new Uint8Array(len);

    let i = 0;
    let j = 0;
    while (i < len) {
        u8[i] = parseInt(hex.slice(j, j + 2), 16);
        i += 1;
        j += 2;
    }

    if (u8.length > 1 && u8[0] === 0) {
        return u8.slice(1);
    }

    return u8;
}
