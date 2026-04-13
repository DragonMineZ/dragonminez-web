export interface StrandData {
    l: number;
    c?: number;
    cw?: number;
    ch?: number;
    cd?: number;
    ls?: number;
    cx?: number;
    cy?: number;
    cz?: number;
    rx?: number;
    ry?: number;
    rz?: number;
    sx?: number;
    sy?: number;
    sz?: number;
}

export interface HairFormData {
    F?: StrandData[];
    B?: StrandData[];
    L?: StrandData[];
    R?: StrandData[];
    T?: StrandData[];
    Color?: number;
    GlobalColor?: number;
    gc?: number;
    Base?: HairFormData;
    SSJ?: HairFormData;
    SSJ2?: HairFormData;
    SSJ3?: HairFormData;
}

export interface HairData {
    Base?: HairFormData;
    SSJ?: HairFormData;
    SSJ2?: HairFormData;
    SSJ3?: HairFormData;
    F?: StrandData[];
    B?: StrandData[];
    L?: StrandData[];
    R?: StrandData[];
    T?: StrandData[];
    Color?: number;
    [key: string]: HairFormData | StrandData[] | number | undefined;
}

type NBTValue = 
    | number 
    | string 
    | number[] 
    | HairData 
    | NBTValue[];

export function parseNbt(data: Uint8Array): HairData {
    let offset = 0;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const textDecoder = new TextDecoder('utf-8');

    function readByte(): number { return view.getInt8(offset++); }
    function readUByte(): number { return view.getUint8(offset++); }
    function readShort(): number { const v = view.getInt16(offset); offset += 2; return v; }
    function readInt(): number { const v = view.getInt32(offset); offset += 4; return v; }
    function readLong(): number {
        const high = view.getInt32(offset);
        const low = view.getInt32(offset + 4);
        offset += 8;
        return low;
    }
    function readFloat(): number { const v = view.getFloat32(offset); offset += 4; return v; }

    function readString(): string {
        const utflen = view.getUint16(offset);
        offset += 2;

        const stringBytes = data.subarray(offset, offset + utflen);
        offset += utflen;

        try {
            return textDecoder.decode(stringBytes);
        } catch (e) {
            return String.fromCharCode.apply(null, Array.from(stringBytes));
        }
    }

    function readTag(type: number): NBTValue {
        switch (type) {
            case 1: return readByte();
            case 2: return readShort();
            case 3: return readInt();
            case 4: return readLong();
            case 5: return readFloat();
            case 6: return view.getFloat64((offset += 8) - 8);
            case 7: {
                const len7 = readInt();
                const arr7: number[] = [];
                for (let i = 0; i < len7; i++) arr7.push(readByte());
                return arr7;
            }
            case 8: return readString();
            case 9: {
                const listType = readByte();
                const listLen = readInt();
                const list: NBTValue[] = [];
                for (let i = 0; i < listLen; i++) list.push(readTag(listType));
                return list;
            }
            case 10: {
                const compound: HairData = {};
                while (true) {
                    const tagType = readByte();
                    if (tagType === 0) break;
                    const tagName = readString();
                    compound[tagName] = readTag(tagType) as HairFormData | StrandData[] | number;
                }
                return compound;
            }
            case 11: {
                const len11 = readInt();
                const arr11: number[] = [];
                for (let i = 0; i < len11; i++) arr11.push(readInt());
                return arr11;
            }
            default: throw new Error("Unknown tag type: " + type);
        }
    }

    const rootType = readByte();
    const rootName = readString();
    const result = readTag(rootType) as HairData;
    
    return result;
}

export function extractHairForms(data: HairData, isFullSet: boolean): { forms: Record<string, HairFormData>; availableForms: string[] } {
    const forms: Record<string, HairFormData> = {};
    const formMap: Record<string, string[]> = {
        "Base": ["Base", "base", "B"],
        "SSJ": ["SSJ", "ssj", "S"],
        "SSJ2": ["SSJ2", "ssj2", "S2"],
        "SSJ3": ["SSJ3", "ssj3", "T"]
    };

    const foundForms: string[] = [];
    const faceKeys = ["F", "B", "L", "R", "T", "FRONT", "BACK", "LEFT", "RIGHT", "TOP", "f", "b", "l", "r", "t", "front", "back", "left", "right", "top"];
    const hasFacesAtRoot = faceKeys.some(k => data[k] && Array.isArray(data[k]) && (data[k] as StrandData[]).length > 0);

    for (const [canonical, aliases] of Object.entries(formMap)) {
        for (const alias of aliases) {
            if (data[alias] && typeof data[alias] === 'object') {
                forms[canonical] = data[alias] as HairFormData;
                if (!foundForms.includes(canonical)) foundForms.push(canonical);
                break;
            }
        }
    }

    if (!isFullSet) {
        if (hasFacesAtRoot) {
            forms["Base"] = data;
            foundForms.unshift("Base");
        } else if (foundForms.length === 0) {
            forms["Base"] = data;
            foundForms.push("Base");
        }
    } else {
        if (foundForms.length === 0 && hasFacesAtRoot) {
            forms["Base"] = data;
            foundForms.push("Base");
        }
    }

    return { forms, availableForms: foundForms };
}

export function getStrandsForFace(form: HairFormData, faceKey: string): StrandData[] {
    const faceMapping: Record<string, string[]> = {
        'F': ['F', 'FRONT', 'f', 'front'],
        'B': ['B', 'BACK', 'b', 'back'],
        'L': ['L', 'LEFT', 'l', 'left'],
        'R': ['R', 'RIGHT', 'r', 'right'],
        'T': ['T', 'TOP', 't', 'top']
    };

    const aliases = faceMapping[faceKey] || [faceKey];
    for (const alias of aliases) {
        const value = (form as HairData)[alias];
        if (value && Array.isArray(value)) {
            return value as StrandData[];
        }
    }
    return [];
}
