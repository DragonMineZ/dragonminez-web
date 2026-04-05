
window.nbt = {
    parse: function (data, callback) {
        if (!data) return callback(new Error("No data"));

        let offset = 0;
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const textDecoder = new TextDecoder('utf-8');

        function readByte() { return view.getInt8(offset++); }
        function readUByte() { return view.getUint8(offset++); }
        function readShort() { let v = view.getInt16(offset); offset += 2; return v; }
        function readInt() { let v = view.getInt32(offset); offset += 4; return v; }
        function readLong() {
            let high = view.getInt32(offset);
            let low = view.getInt32(offset + 4);
            offset += 8;
            return low;
        }
        function readFloat() { let v = view.getFloat32(offset); offset += 4; return v; }

        function readString() {
            let utflen = view.getUint16(offset);
            offset += 2;

            let stringBytes = data.subarray(offset, offset + utflen);
            offset += utflen;

            try {
                return textDecoder.decode(stringBytes);
            } catch (e) {
                console.warn("String decode failed, falling back");
                return String.fromCharCode.apply(null, stringBytes);
            }
        }

        function readTag(type) {
            switch (type) {
                case 1: return readByte();
                case 2: return readShort();
                case 3: return readInt();
                case 4: return readLong();
                case 5: return readFloat();
                case 6: return view.getFloat64((offset += 8) - 8);
                case 7:
                    let len7 = readInt();
                    let arr7 = [];
                    for (let i = 0; i < len7; i++) arr7.push(readByte());
                    return arr7;
                case 8: return readString();
                case 9:
                    let listType = readByte();
                    let listLen = readInt();
                    let list = [];
                    for (let i = 0; i < listLen; i++) list.push(readTag(listType));
                    return list;
                case 10:
                    let compound = {};
                    while (true) {
                        let tagType = readByte();
                        if (tagType === 0) break;
                        let tagName = readString();
                        compound[tagName] = readTag(tagType);
                    }
                    return compound;
                case 11:
                    let len11 = readInt();
                    let arr11 = [];
                    for (let i = 0; i < len11; i++) arr11.push(readInt());
                    return arr11;
                default: throw new Error("Unknown tag type: " + type);
            }
        }

        try {
            let rootType = readByte();
            if (rootType !== 10) {
            }
            let rootName = readString();
            let result = readTag(rootType);
            callback(null, result);
        } catch (e) {
            callback(e);
        }
    }
};
