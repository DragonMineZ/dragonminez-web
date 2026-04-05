const BASE64_URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

window.decodeHairCode = function (code) {
    if (!code) return null;

    let isFullSet = false;
    let cleanCode = code.replace(/\s+/g, '');
    const upperCode = cleanCode.toUpperCase();

    if (upperCode.startsWith("DMZF4:")) {
        cleanCode = cleanCode.substring(6);
        isFullSet = true;
    } else if (upperCode.startsWith("DMZ4:")) {
        cleanCode = cleanCode.substring(5);
    }

    try {
        const bigInt = decodeBase64UrlToBigInt(cleanCode);
        const bytes = bigIntToByteArray(bigInt);

        const decompressed = pako.inflate(bytes, { raw: true });

        return {
            data: decompressed,
            isFullSet: isFullSet
        };
    } catch (e) {
        console.error("Decoding failed", e);
        return null;
    }
};

function decodeBase64UrlToBigInt(encoded) {
    let value = 0n;
    const base = 64n;

    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charAt(i);
        const digit = BASE64_URL_ALPHABET.indexOf(char);
        if (digit < 0) {
            throw new Error("Invalid char at " + i + ": '" + char + "' (Code: " + char.charCodeAt(0) + ")");
        }

        value = (value * base) + BigInt(digit);
    }

    return value;
}

function bigIntToByteArray(bigInt) {
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
