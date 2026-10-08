import { normalizeColor } from './colors';
import { FACES, mirrorFace, mirrorIndex, strandId, type HairFace } from './faces';
import { createDefaultStrand, migrateStrand } from './legacy';
import { NbtCompound, NbtList, TAG_COMPOUND } from './nbt';
import { HairStrand } from './strand';

export const HAIR_VERSION = 7;
const FIRST_SEGMENT_OVERRIDE_VERSION = 6;

let revisions = 0;

function nextRevision(): number {
    revisions += 1;
    return revisions;
}

export class CustomHair {
    private readonly strandsByFace: HairStrand[][];
    globalColor = '#000000';
    name = 'Custom';
    revision = nextRevision();

    constructor() {
        this.strandsByFace = FACES.map((face) => {
            const strands: HairStrand[] = [];
            for (let i = 0; i < face.maxStrands; i++) strands.push(createDefaultStrand(face, i));
            return strands;
        });
    }

    getStrands(face: HairFace): HairStrand[] {
        return this.strandsByFace[face.ordinal];
    }

    getStrand(face: HairFace, index: number): HairStrand | null {
        const strands = this.strandsByFace[face.ordinal];
        return index >= 0 && index < strands.length ? strands[index] : null;
    }

    setStrand(face: HairFace, index: number, strand: HairStrand): void {
        const strands = this.strandsByFace[face.ordinal];
        if (index < 0 || index >= strands.length) return;
        const copy = strand.copy();
        copy.id = strandId(face, index);
        strands[index] = copy;
        this.markChanged();
    }

    getMirrorStrand(face: HairFace, index: number): HairStrand | null {
        const targetFace = mirrorFace(face);
        const targetIndex = mirrorIndex(face, index);
        if (targetFace === face && targetIndex === index) return null;
        return this.getStrand(targetFace, targetIndex);
    }

    getVisibleStrandCount(): number {
        let count = 0;
        for (const strands of this.strandsByFace) for (const strand of strands) if (strand.isVisible()) count++;
        return count;
    }

    getTotalSegmentCount(): number {
        let count = 0;
        for (const strands of this.strandsByFace) for (const strand of strands) if (strand.isVisible()) count += strand.segments;
        return count;
    }

    isEmpty(): boolean {
        return this.getVisibleStrandCount() === 0;
    }

    setGlobalColor(color: string | null): void {
        this.globalColor = normalizeColor(color) ?? '#000000';
    }

    setName(name: string | null): void {
        this.name = name ?? 'Custom';
    }

    markChanged(): void {
        this.revision = nextRevision();
    }

    clear(): void {
        FACES.forEach((face) => {
            const strands = this.strandsByFace[face.ordinal];
            for (let i = 0; i < strands.length; i++) strands[i] = createDefaultStrand(face, i);
        });
        this.markChanged();
    }

    copyFrom(other: CustomHair): void {
        this.name = other.name;
        this.globalColor = other.globalColor;
        FACES.forEach((face) => {
            const source = other.strandsByFace[face.ordinal];
            const target = this.strandsByFace[face.ordinal];
            for (let i = 0; i < target.length; i++) target[i] = source[i].copy();
        });
        this.markChanged();
    }

    copy(): CustomHair {
        const copy = new CustomHair();
        copy.copyFrom(this);
        return copy;
    }

    save(): NbtCompound {
        const tag = new NbtCompound();
        tag.putInt('v', HAIR_VERSION);
        if (this.name) tag.putString('n', this.name);
        tag.putString('gc', this.globalColor);
        for (const face of FACES) {
            const list = new NbtList();
            for (const strand of this.strandsByFace[face.ordinal]) {
                if (strand.isVisible()) list.add({ type: TAG_COMPOUND, value: strand.save() });
            }
            if (!list.isEmpty()) tag.putList(face.key, list);
        }
        return tag;
    }

    load(tag: NbtCompound): void {
        const version = tag.contains('v') ? tag.getInt('v') : (tag.contains('Version') ? tag.getInt('Version') : 1);
        this.name = tag.contains('n') ? tag.getString('n') : (tag.contains('Name') ? tag.getString('Name') : 'Custom');
        this.setGlobalColor(tag.contains('gc') ? tag.getString('gc') : tag.getString('GlobalColor'));

        for (const face of FACES) {
            const strands = this.strandsByFace[face.ordinal];
            for (let i = 0; i < strands.length; i++) strands[i] = createDefaultStrand(face, i);

            const key = tag.contains(face.key) ? face.key : (tag.contains(face.name) ? face.name : null);
            if (key === null) continue;

            const list = tag.getList(key, TAG_COMPOUND);
            for (let i = 0; i < list.size; i++) {
                const strandTag = list.getCompound(i);
                const index = resolveStrandIndex(face, strandTag, i, version);
                if (index < 0 || index >= strands.length) continue;

                let strand: HairStrand;
                if (version >= FIRST_SEGMENT_OVERRIDE_VERSION) {
                    strand = new HairStrand();
                    strand.load(strandTag);
                } else {
                    strand = migrateStrand(face, index, strandTag);
                }
                if (version < HAIR_VERSION) strand.convertAbsoluteSegmentScales();
                strand.id = strandId(face, index);
                strands[index] = strand;
            }
        }
        this.markChanged();
    }

    static fromTag(tag: NbtCompound | null): CustomHair {
        const hair = new CustomHair();
        if (tag) hair.load(tag);
        return hair;
    }
}

function resolveStrandIndex(face: HairFace, strandTag: NbtCompound, listIndex: number, version: number): number {
    if (version < 2) return listIndex;
    const id = strandTag.contains('i') ? strandTag.getInt('i') : strandTag.getInt('Id');
    const index = id - face.ordinal * 100;
    return index >= 0 && index < face.maxStrands ? index : listIndex;
}

export type HairStyleSet = [CustomHair, CustomHair, CustomHair, CustomHair, CustomHair];

export function emptyStyleSet(): HairStyleSet {
    return [new CustomHair(), new CustomHair(), new CustomHair(), new CustomHair(), new CustomHair()];
}
