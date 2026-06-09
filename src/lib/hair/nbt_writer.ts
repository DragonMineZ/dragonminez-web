/**
 * Minimal binary NBT writer compatible with Minecraft's `NbtIo.write`
 * (uncompressed, big-endian, modified UTF-8 strings).
 *
 * Only the tag types used by the hair format are supported:
 * Int (3), Float (5), String (8), List (9) and Compound (10).
 */

export type NbtValue =
    | { type: "int"; value: number }
    | { type: "float"; value: number }
    | { type: "string"; value: string }
    | { type: "list"; value: NbtCompound[] }
    | { type: "compound"; value: NbtCompound };

export type NbtCompound = Map<string, NbtValue>;

const TAG_END = 0;
const TAG_INT = 3;
const TAG_FLOAT = 5;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;

class ByteWriter {
    private buf = new Uint8Array(1024);
    private view = new DataView(this.buf.buffer);
    private len = 0;

    private ensure(extra: number) {
        if (this.len + extra <= this.buf.length) return;
        let next = this.buf.length * 2;
        while (next < this.len + extra) next *= 2;
        const grown = new Uint8Array(next);
        grown.set(this.buf.subarray(0, this.len));
        this.buf = grown;
        this.view = new DataView(this.buf.buffer);
    }

    writeByte(v: number) {
        this.ensure(1);
        this.view.setUint8(this.len, v & 0xff);
        this.len += 1;
    }

    writeShort(v: number) {
        this.ensure(2);
        this.view.setUint16(this.len, v & 0xffff);
        this.len += 2;
    }

    writeInt(v: number) {
        this.ensure(4);
        this.view.setInt32(this.len, v | 0);
        this.len += 4;
    }

    writeFloat(v: number) {
        this.ensure(4);
        this.view.setFloat32(this.len, v);
        this.len += 4;
    }

    writeBytes(bytes: Uint8Array) {
        this.ensure(bytes.length);
        this.buf.set(bytes, this.len);
        this.len += bytes.length;
    }

    /** Java DataOutput.writeUTF: u16 byte length + modified UTF-8 payload. */
    writeUTF(s: string) {
        const bytes = encodeModifiedUtf8(s);
        if (bytes.length > 0xffff) throw new Error("NBT string too long");
        this.writeShort(bytes.length);
        this.writeBytes(bytes);
    }

    toUint8Array(): Uint8Array {
        return this.buf.slice(0, this.len);
    }
}

/** Java's modified UTF-8: NUL is 2 bytes, supplementary chars become surrogate pairs (3 bytes each). */
function encodeModifiedUtf8(s: string): Uint8Array {
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x0001 && c <= 0x007f) {
            out.push(c);
        } else if (c === 0x0000 || (c >= 0x0080 && c <= 0x07ff)) {
            out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else {
            out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
    }
    return new Uint8Array(out);
}

function tagId(value: NbtValue): number {
    switch (value.type) {
        case "int": return TAG_INT;
        case "float": return TAG_FLOAT;
        case "string": return TAG_STRING;
        case "list": return TAG_LIST;
        case "compound": return TAG_COMPOUND;
    }
}

function writePayload(w: ByteWriter, value: NbtValue) {
    switch (value.type) {
        case "int":
            w.writeInt(value.value);
            break;
        case "float":
            w.writeFloat(value.value);
            break;
        case "string":
            w.writeUTF(value.value);
            break;
        case "list":
            w.writeByte(value.value.length === 0 ? TAG_END : TAG_COMPOUND);
            w.writeInt(value.value.length);
            for (const item of value.value) {
                writeCompoundPayload(w, item);
            }
            break;
        case "compound":
            writeCompoundPayload(w, value.value);
            break;
    }
}

function writeCompoundPayload(w: ByteWriter, compound: NbtCompound) {
    for (const [name, value] of compound) {
        w.writeByte(tagId(value));
        w.writeUTF(name);
        writePayload(w, value);
    }
    w.writeByte(TAG_END);
}

/** Serializes a root compound exactly like `NbtIo.write` (type byte + empty root name + payload). */
export function writeNbt(root: NbtCompound): Uint8Array {
    const w = new ByteWriter();
    w.writeByte(TAG_COMPOUND);
    w.writeUTF("");
    writeCompoundPayload(w, root);
    return w.toUint8Array();
}

export const nbtInt = (value: number): NbtValue => ({ type: "int", value });
export const nbtFloat = (value: number): NbtValue => ({ type: "float", value });
export const nbtString = (value: string): NbtValue => ({ type: "string", value });
export const nbtList = (value: NbtCompound[]): NbtValue => ({ type: "list", value });
export const nbtCompound = (value: NbtCompound): NbtValue => ({ type: "compound", value });
