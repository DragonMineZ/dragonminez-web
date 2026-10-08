export const TAG_END = 0;
export const TAG_BYTE = 1;
export const TAG_SHORT = 2;
export const TAG_INT = 3;
export const TAG_LONG = 4;
export const TAG_FLOAT = 5;
export const TAG_DOUBLE = 6;
export const TAG_BYTE_ARRAY = 7;
export const TAG_STRING = 8;
export const TAG_LIST = 9;
export const TAG_COMPOUND = 10;
export const TAG_INT_ARRAY = 11;
export const TAG_LONG_ARRAY = 12;
export const TAG_ANY_NUMERIC = 99;

export type NbtTag =
    | { type: typeof TAG_BYTE; value: number }
    | { type: typeof TAG_SHORT; value: number }
    | { type: typeof TAG_INT; value: number }
    | { type: typeof TAG_LONG; value: bigint }
    | { type: typeof TAG_FLOAT; value: number }
    | { type: typeof TAG_DOUBLE; value: number }
    | { type: typeof TAG_BYTE_ARRAY; value: Int8Array }
    | { type: typeof TAG_STRING; value: string }
    | { type: typeof TAG_LIST; value: NbtList }
    | { type: typeof TAG_COMPOUND; value: NbtCompound }
    | { type: typeof TAG_INT_ARRAY; value: Int32Array }
    | { type: typeof TAG_LONG_ARRAY; value: BigInt64Array };

function isNumeric(tag: NbtTag): boolean {
    return tag.type >= TAG_BYTE && tag.type <= TAG_DOUBLE;
}

function numericValue(tag: NbtTag): number {
    if (tag.type === TAG_LONG) return Number(tag.value);
    return tag.value as number;
}

export class NbtList {
    elementType: number;
    readonly items: NbtTag[] = [];

    constructor(elementType = TAG_END) {
        this.elementType = elementType;
    }

    get size(): number {
        return this.items.length;
    }

    add(tag: NbtTag): void {
        if (this.items.length === 0) this.elementType = tag.type;
        this.items.push(tag);
    }

    getCompound(index: number): NbtCompound {
        const tag = this.items[index];
        return tag && tag.type === TAG_COMPOUND ? tag.value : new NbtCompound();
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}

export class NbtCompound {
    readonly entries = new Map<string, NbtTag>();

    contains(key: string, type?: number): boolean {
        const tag = this.entries.get(key);
        if (!tag) return false;
        if (type === undefined) return true;
        if (type === TAG_ANY_NUMERIC) return isNumeric(tag);
        return tag.type === type;
    }

    remove(key: string): void {
        this.entries.delete(key);
    }

    put(key: string, tag: NbtTag): void {
        this.entries.set(key, tag);
    }

    putInt(key: string, value: number): void {
        this.entries.set(key, { type: TAG_INT, value: value | 0 });
    }

    putByte(key: string, value: number): void {
        this.entries.set(key, { type: TAG_BYTE, value: (value << 24) >> 24 });
    }

    putFloat(key: string, value: number): void {
        this.entries.set(key, { type: TAG_FLOAT, value: Math.fround(value) });
    }

    putString(key: string, value: string): void {
        this.entries.set(key, { type: TAG_STRING, value });
    }

    putCompound(key: string, value: NbtCompound): void {
        this.entries.set(key, { type: TAG_COMPOUND, value });
    }

    putList(key: string, value: NbtList): void {
        this.entries.set(key, { type: TAG_LIST, value });
    }

    getInt(key: string): number {
        const tag = this.entries.get(key);
        if (!tag || !isNumeric(tag)) return 0;
        const value = numericValue(tag);
        return tag.type === TAG_FLOAT || tag.type === TAG_DOUBLE ? Math.floor(value) | 0 : value | 0;
    }

    getByte(key: string): number {
        const tag = this.entries.get(key);
        if (!tag || !isNumeric(tag)) return 0;
        const value = numericValue(tag);
        const integer = tag.type === TAG_FLOAT || tag.type === TAG_DOUBLE ? Math.floor(value) : value;
        return (integer << 24) >> 24;
    }

    getFloat(key: string): number {
        const tag = this.entries.get(key);
        if (!tag || !isNumeric(tag)) return 0;
        return Math.fround(numericValue(tag));
    }

    getString(key: string): string {
        const tag = this.entries.get(key);
        return tag && tag.type === TAG_STRING ? tag.value : '';
    }

    getCompound(key: string): NbtCompound {
        const tag = this.entries.get(key);
        return tag && tag.type === TAG_COMPOUND ? tag.value : new NbtCompound();
    }

    getList(key: string, elementType: number): NbtList {
        const tag = this.entries.get(key);
        if (!tag || tag.type !== TAG_LIST) return new NbtList();
        const list = tag.value;
        if (list.isEmpty() || list.elementType === elementType) return list;
        return new NbtList();
    }

    equals(other: NbtCompound): boolean {
        return tagsEqual({ type: TAG_COMPOUND, value: this }, { type: TAG_COMPOUND, value: other });
    }
}

function tagsEqual(a: NbtTag, b: NbtTag): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
        case TAG_COMPOUND: {
            const left = a.value.entries;
            const right = (b.value as NbtCompound).entries;
            if (left.size !== right.size) return false;
            for (const [key, tag] of left) {
                const other = right.get(key);
                if (!other || !tagsEqual(tag, other)) return false;
            }
            return true;
        }
        case TAG_LIST: {
            const left = a.value.items;
            const right = (b.value as NbtList).items;
            if (left.length !== right.length) return false;
            for (let i = 0; i < left.length; i++) if (!tagsEqual(left[i], right[i])) return false;
            return true;
        }
        case TAG_BYTE_ARRAY:
        case TAG_INT_ARRAY:
        case TAG_LONG_ARRAY: {
            const left = a.value as ArrayLike<unknown>;
            const right = b.value as ArrayLike<unknown>;
            if (left.length !== right.length) return false;
            for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
            return true;
        }
        default:
            return a.value === b.value;
    }
}

export class NbtSizeError extends Error {}

class Reader {
    private offset = 0;
    private read = 0;
    private readonly view: DataView;

    constructor(private readonly data: Uint8Array, private readonly limit: number) {
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }

    private account(bytes: number): void {
        this.read += bytes;
        if (this.read > this.limit) throw new NbtSizeError(`NBT exceeds ${this.limit} bytes`);
    }

    private ensure(bytes: number): void {
        if (this.offset + bytes > this.data.length) throw new Error('Unexpected end of NBT data');
    }

    byte(): number {
        this.ensure(1);
        return this.view.getInt8(this.offset++);
    }

    short(): number {
        this.ensure(2);
        const value = this.view.getInt16(this.offset);
        this.offset += 2;
        return value;
    }

    unsignedShort(): number {
        this.ensure(2);
        const value = this.view.getUint16(this.offset);
        this.offset += 2;
        return value;
    }

    int(): number {
        this.ensure(4);
        const value = this.view.getInt32(this.offset);
        this.offset += 4;
        return value;
    }

    long(): bigint {
        this.ensure(8);
        const value = this.view.getBigInt64(this.offset);
        this.offset += 8;
        return value;
    }

    float(): number {
        this.ensure(4);
        const value = this.view.getFloat32(this.offset);
        this.offset += 4;
        return value;
    }

    double(): number {
        this.ensure(8);
        const value = this.view.getFloat64(this.offset);
        this.offset += 8;
        return value;
    }

    utf(): string {
        const length = this.unsignedShort();
        this.ensure(length);
        const bytes = this.data.subarray(this.offset, this.offset + length);
        this.offset += length;
        return decodeModifiedUtf8(bytes);
    }

    payload(type: number, depth: number): NbtTag {
        if (depth > 512) throw new Error('NBT nesting too deep');
        switch (type) {
            case TAG_BYTE:
                this.account(9);
                return { type, value: this.byte() };
            case TAG_SHORT:
                this.account(10);
                return { type, value: this.short() };
            case TAG_INT:
                this.account(12);
                return { type, value: this.int() };
            case TAG_LONG:
                this.account(16);
                return { type, value: this.long() };
            case TAG_FLOAT:
                this.account(12);
                return { type, value: this.float() };
            case TAG_DOUBLE:
                this.account(16);
                return { type, value: this.double() };
            case TAG_BYTE_ARRAY: {
                this.account(24);
                const length = this.int();
                if (length < 0) throw new Error('Negative array length');
                this.account(length);
                const array = new Int8Array(length);
                for (let i = 0; i < length; i++) array[i] = this.byte();
                return { type, value: array };
            }
            case TAG_STRING: {
                this.account(36);
                const value = this.utf();
                this.account(2 * value.length);
                return { type, value };
            }
            case TAG_LIST: {
                this.account(37);
                const elementType = this.byte();
                const length = this.int();
                if (length < 0) throw new Error('Negative list length');
                if (elementType === TAG_END && length > 0) throw new Error('Missing list element type');
                this.account(4 * length);
                const list = new NbtList(elementType);
                for (let i = 0; i < length; i++) list.items.push(this.payload(elementType, depth + 1));
                return { type, value: list };
            }
            case TAG_COMPOUND: {
                this.account(48);
                const compound = new NbtCompound();
                for (;;) {
                    const entryType = this.byte();
                    if (entryType === TAG_END) break;
                    const key = this.utf();
                    this.account(28 + 2 * key.length);
                    const tag = this.payload(entryType, depth + 1);
                    if (!compound.entries.has(key)) this.account(36);
                    compound.entries.set(key, tag);
                }
                return { type, value: compound };
            }
            case TAG_INT_ARRAY: {
                this.account(24);
                const length = this.int();
                if (length < 0) throw new Error('Negative array length');
                this.account(4 * length);
                const array = new Int32Array(length);
                for (let i = 0; i < length; i++) array[i] = this.int();
                return { type, value: array };
            }
            case TAG_LONG_ARRAY: {
                this.account(24);
                const length = this.int();
                if (length < 0) throw new Error('Negative array length');
                this.account(8 * length);
                const array = new BigInt64Array(length);
                for (let i = 0; i < length; i++) array[i] = this.long();
                return { type, value: array };
            }
            default:
                throw new Error(`Unknown NBT tag type ${type}`);
        }
    }
}

export function readNbt(data: Uint8Array, limit = 1 << 21): NbtCompound {
    const reader = new Reader(data, limit);
    const type = reader.byte();
    if (type !== TAG_COMPOUND) throw new Error('Root tag must be a named compound tag');
    reader.utf();
    const tag = reader.payload(type, 0);
    return (tag as { type: typeof TAG_COMPOUND; value: NbtCompound }).value;
}

class Writer {
    private buffer = new Uint8Array(1024);
    private view = new DataView(this.buffer.buffer);
    private length = 0;

    private grow(bytes: number): void {
        if (this.length + bytes <= this.buffer.length) return;
        let capacity = this.buffer.length * 2;
        while (capacity < this.length + bytes) capacity *= 2;
        const next = new Uint8Array(capacity);
        next.set(this.buffer.subarray(0, this.length));
        this.buffer = next;
        this.view = new DataView(next.buffer);
    }

    byte(value: number): void {
        this.grow(1);
        this.view.setInt8(this.length, value);
        this.length += 1;
    }

    short(value: number): void {
        this.grow(2);
        this.view.setInt16(this.length, value);
        this.length += 2;
    }

    int(value: number): void {
        this.grow(4);
        this.view.setInt32(this.length, value);
        this.length += 4;
    }

    long(value: bigint): void {
        this.grow(8);
        this.view.setBigInt64(this.length, value);
        this.length += 8;
    }

    float(value: number): void {
        this.grow(4);
        this.view.setFloat32(this.length, value);
        this.length += 4;
    }

    double(value: number): void {
        this.grow(8);
        this.view.setFloat64(this.length, value);
        this.length += 8;
    }

    utf(value: string): void {
        const bytes = encodeModifiedUtf8(value);
        if (bytes.length > 65535) throw new Error('String too long for NBT');
        this.grow(2 + bytes.length);
        this.view.setUint16(this.length, bytes.length);
        this.length += 2;
        this.buffer.set(bytes, this.length);
        this.length += bytes.length;
    }

    payload(tag: NbtTag): void {
        switch (tag.type) {
            case TAG_BYTE:
                this.byte(tag.value);
                break;
            case TAG_SHORT:
                this.short(tag.value);
                break;
            case TAG_INT:
                this.int(tag.value);
                break;
            case TAG_LONG:
                this.long(tag.value);
                break;
            case TAG_FLOAT:
                this.float(tag.value);
                break;
            case TAG_DOUBLE:
                this.double(tag.value);
                break;
            case TAG_BYTE_ARRAY:
                this.int(tag.value.length);
                for (const value of tag.value) this.byte(value);
                break;
            case TAG_STRING:
                this.utf(tag.value);
                break;
            case TAG_LIST:
                this.byte(tag.value.isEmpty() ? TAG_END : tag.value.elementType);
                this.int(tag.value.size);
                for (const item of tag.value.items) this.payload(item);
                break;
            case TAG_COMPOUND:
                for (const [key, entry] of tag.value.entries) {
                    this.byte(entry.type);
                    this.utf(key);
                    this.payload(entry);
                }
                this.byte(TAG_END);
                break;
            case TAG_INT_ARRAY:
                this.int(tag.value.length);
                for (const value of tag.value) this.int(value);
                break;
            case TAG_LONG_ARRAY:
                this.int(tag.value.length);
                for (const value of tag.value) this.long(value);
                break;
        }
    }

    result(): Uint8Array {
        return this.buffer.slice(0, this.length);
    }
}

export function writeNbt(compound: NbtCompound): Uint8Array {
    const writer = new Writer();
    writer.byte(TAG_COMPOUND);
    writer.utf('');
    writer.payload({ type: TAG_COMPOUND, value: compound });
    return writer.result();
}

function encodeModifiedUtf8(value: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code >= 0x0001 && code <= 0x007f) {
            bytes.push(code);
        } else if (code <= 0x07ff) {
            bytes.push(0xc0 | ((code >> 6) & 0x1f), 0x80 | (code & 0x3f));
        } else {
            bytes.push(0xe0 | ((code >> 12) & 0x0f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return Uint8Array.from(bytes);
}

function decodeModifiedUtf8(bytes: Uint8Array): string {
    let result = '';
    let i = 0;
    while (i < bytes.length) {
        const first = bytes[i];
        if ((first & 0x80) === 0) {
            result += String.fromCharCode(first);
            i += 1;
        } else if ((first & 0xe0) === 0xc0 && i + 1 < bytes.length) {
            result += String.fromCharCode(((first & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
            i += 2;
        } else if ((first & 0xf0) === 0xe0 && i + 2 < bytes.length) {
            result += String.fromCharCode(((first & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
            i += 3;
        } else {
            throw new Error('Malformed modified UTF-8');
        }
    }
    return result;
}
