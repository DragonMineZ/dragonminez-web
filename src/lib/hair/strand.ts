import { clampFinite, wrapDegrees } from './math';
import { normalizeColor } from './colors';
import { NbtCompound, NbtList, TAG_COMPOUND, TAG_LIST } from './nbt';

export type HairJointStyle = 'BLOCKS' | 'CONNECTED';
export const JOINT_STYLES: readonly HairJointStyle[] = ['BLOCKS', 'CONNECTED'];

export function jointStyleById(id: number): HairJointStyle {
    return id >= 0 && id < JOINT_STYLES.length ? JOINT_STYLES[id] : 'BLOCKS';
}

export function nextJointStyle(style: HairJointStyle): HairJointStyle {
    return JOINT_STYLES[(JOINT_STYLES.indexOf(style) + 1) % JOINT_STYLES.length];
}

const OVERRIDE_EPSILON = 1.0e-4;

export class HairSegmentOverride {
    static readonly MAX_OFFSET = 2.0;
    static readonly MAX_ROTATION = 180.0;
    static readonly MIN_SCALE = 0.1;
    static readonly MAX_SCALE = 16.0;

    readonly index: number;
    offsetX = 0;
    offsetY = 0;
    offsetZ = 0;
    rotationX = 0;
    rotationY = 0;
    rotationZ = 0;
    lengthScale = 1;
    widthScale = 1;
    depthScale = 1;
    color: string | null = null;

    constructor(index: number) {
        this.index = index;
    }

    setOffset(x: number, y: number, z: number): void {
        const max = HairSegmentOverride.MAX_OFFSET;
        this.offsetX = clampFinite(x, -max, max, this.offsetX);
        this.offsetY = clampFinite(y, -max, max, this.offsetY);
        this.offsetZ = clampFinite(z, -max, max, this.offsetZ);
    }

    setRotation(x: number, y: number, z: number): void {
        const max = HairSegmentOverride.MAX_ROTATION;
        this.rotationX = clampFinite(x, -max, max, this.rotationX);
        this.rotationY = clampFinite(y, -max, max, this.rotationY);
        this.rotationZ = clampFinite(z, -max, max, this.rotationZ);
    }

    setLengthScale(value: number): void {
        this.lengthScale = clampFinite(value, HairSegmentOverride.MIN_SCALE, HairSegmentOverride.MAX_SCALE, this.lengthScale);
    }

    setWidthScale(value: number): void {
        this.widthScale = clampFinite(value, HairSegmentOverride.MIN_SCALE, HairSegmentOverride.MAX_SCALE, this.widthScale);
    }

    setDepthScale(value: number): void {
        this.depthScale = clampFinite(value, HairSegmentOverride.MIN_SCALE, HairSegmentOverride.MAX_SCALE, this.depthScale);
    }

    setColor(color: string | null): void {
        this.color = normalizeColor(color);
    }

    isIdentity(): boolean {
        return Math.abs(this.offsetX) < OVERRIDE_EPSILON && Math.abs(this.offsetY) < OVERRIDE_EPSILON && Math.abs(this.offsetZ) < OVERRIDE_EPSILON
            && Math.abs(this.rotationX) < OVERRIDE_EPSILON && Math.abs(this.rotationY) < OVERRIDE_EPSILON && Math.abs(this.rotationZ) < OVERRIDE_EPSILON
            && Math.abs(this.lengthScale - 1) < OVERRIDE_EPSILON && Math.abs(this.widthScale - 1) < OVERRIDE_EPSILON
            && Math.abs(this.depthScale - 1) < OVERRIDE_EPSILON && this.color === null;
    }

    copy(): HairSegmentOverride {
        return this.copyAs(this.index);
    }

    copyAs(index: number): HairSegmentOverride {
        const copy = new HairSegmentOverride(index);
        copy.offsetX = this.offsetX;
        copy.offsetY = this.offsetY;
        copy.offsetZ = this.offsetZ;
        copy.rotationX = this.rotationX;
        copy.rotationY = this.rotationY;
        copy.rotationZ = this.rotationZ;
        copy.lengthScale = this.lengthScale;
        copy.widthScale = this.widthScale;
        copy.depthScale = this.depthScale;
        copy.color = this.color;
        return copy;
    }

    mirror(): void {
        this.offsetX = -this.offsetX;
        this.rotationY = -this.rotationY;
        this.rotationZ = -this.rotationZ;
    }

    save(): NbtCompound {
        const tag = new NbtCompound();
        tag.putInt('k', this.index);
        if (this.offsetX !== 0) tag.putFloat('ox', this.offsetX);
        if (this.offsetY !== 0) tag.putFloat('oy', this.offsetY);
        if (this.offsetZ !== 0) tag.putFloat('oz', this.offsetZ);
        if (this.rotationX !== 0) tag.putFloat('rx', this.rotationX);
        if (this.rotationY !== 0) tag.putFloat('ry', this.rotationY);
        if (this.rotationZ !== 0) tag.putFloat('rz', this.rotationZ);
        if (this.lengthScale !== 1) tag.putFloat('ls', this.lengthScale);
        if (this.widthScale !== 1) tag.putFloat('ws', this.widthScale);
        if (this.depthScale !== 1) tag.putFloat('ds', this.depthScale);
        if (this.color !== null) tag.putString('c', this.color);
        return tag;
    }

    static load(tag: NbtCompound): HairSegmentOverride {
        const override = new HairSegmentOverride(tag.getInt('k'));
        override.setOffset(tag.getFloat('ox'), tag.getFloat('oy'), tag.getFloat('oz'));
        override.setRotation(tag.getFloat('rx'), tag.getFloat('ry'), tag.getFloat('rz'));
        if (tag.contains('ls')) override.setLengthScale(tag.getFloat('ls'));
        if (tag.contains('ws')) override.setWidthScale(tag.getFloat('ws'));
        if (tag.contains('ds')) override.setDepthScale(tag.getFloat('ds'));
        if (tag.contains('c')) override.setColor(tag.getString('c'));
        return override;
    }
}

export class HairStrand {
    static readonly MAX_SEGMENTS = 32;
    static readonly MIN_LENGTH = 0.1;
    static readonly MAX_LENGTH = 128.0;
    static readonly MIN_LENGTH_RATIO = 0.1;
    static readonly MAX_LENGTH_RATIO = 4.0;
    static readonly MIN_WIDTH = 0.1;
    static readonly MAX_WIDTH = 16.0;
    static readonly MIN_TAPER = 0.05;
    static readonly MAX_TAPER = 2.0;
    static readonly MIN_TAPER_CURVE = 0.25;
    static readonly MAX_TAPER_CURVE = 4.0;
    static readonly MAX_ROOT_OFFSET = 4.0;
    static readonly MAX_BEND = 3600.0;
    static readonly MAX_TWIST = 3600.0;

    static readonly DEFAULT_SEGMENTS = 4;
    static readonly DEFAULT_LENGTH = 6.0;
    static readonly DEFAULT_LENGTH_RATIO = 0.6;
    static readonly DEFAULT_WIDTH = 2.0;
    static readonly DEFAULT_DEPTH = 2.0;
    static readonly DEFAULT_TAPER = 0.6;
    static readonly DEFAULT_TAPER_CURVE = 1.0;

    id: number;
    segments = 0;
    length = HairStrand.DEFAULT_LENGTH;
    lengthRatio = HairStrand.DEFAULT_LENGTH_RATIO;
    width = HairStrand.DEFAULT_WIDTH;
    depth = HairStrand.DEFAULT_DEPTH;
    taper = HairStrand.DEFAULT_TAPER;
    taperCurve = HairStrand.DEFAULT_TAPER_CURVE;
    offsetX = 0;
    offsetY = 0;
    offsetZ = 0;
    rotationX = 0;
    rotationY = 0;
    rotationZ = 0;
    bendX = 0;
    bendY = 0;
    bendZ = 0;
    twist = 0;
    jointStyle: HairJointStyle = 'BLOCKS';
    color: string | null = null;
    tipColor: string | null = null;
    private readonly overrides = new Map<number, HairSegmentOverride>();

    constructor(id = 0) {
        this.id = id;
    }

    isVisible(): boolean {
        return this.segments > 0 && this.length > 0;
    }

    setSegments(segments: number): void {
        this.segments = Math.max(0, Math.min(HairStrand.MAX_SEGMENTS, Math.trunc(segments)));
    }

    setLength(length: number): void {
        this.length = clampFinite(length, HairStrand.MIN_LENGTH, HairStrand.MAX_LENGTH, this.length);
    }

    setLengthRatio(value: number): void {
        this.lengthRatio = clampFinite(value, HairStrand.MIN_LENGTH_RATIO, HairStrand.MAX_LENGTH_RATIO, this.lengthRatio);
    }

    setWidth(value: number): void {
        this.width = clampFinite(value, HairStrand.MIN_WIDTH, HairStrand.MAX_WIDTH, this.width);
    }

    setDepth(value: number): void {
        this.depth = clampFinite(value, HairStrand.MIN_WIDTH, HairStrand.MAX_WIDTH, this.depth);
    }

    setTaper(value: number): void {
        this.taper = clampFinite(value, HairStrand.MIN_TAPER, HairStrand.MAX_TAPER, this.taper);
    }

    setTaperCurve(value: number): void {
        this.taperCurve = clampFinite(value, HairStrand.MIN_TAPER_CURVE, HairStrand.MAX_TAPER_CURVE, this.taperCurve);
    }

    setOffset(x: number, y: number, z: number): void {
        const max = HairStrand.MAX_ROOT_OFFSET;
        this.offsetX = clampFinite(x, -max, max, this.offsetX);
        this.offsetY = clampFinite(y, -max, max, this.offsetY);
        this.offsetZ = clampFinite(z, -max, max, this.offsetZ);
    }

    setRotation(x: number, y: number, z: number): void {
        this.rotationX = Number.isFinite(x) ? wrapDegrees(x) : this.rotationX;
        this.rotationY = Number.isFinite(y) ? wrapDegrees(y) : this.rotationY;
        this.rotationZ = Number.isFinite(z) ? wrapDegrees(z) : this.rotationZ;
    }

    setBend(x: number, y: number, z: number): void {
        const max = HairStrand.MAX_BEND;
        this.bendX = clampFinite(x, -max, max, this.bendX);
        this.bendY = clampFinite(y, -max, max, this.bendY);
        this.bendZ = clampFinite(z, -max, max, this.bendZ);
    }

    setTwist(value: number): void {
        this.twist = clampFinite(value, -HairStrand.MAX_TWIST, HairStrand.MAX_TWIST, this.twist);
    }

    setJointStyle(style: HairJointStyle | null): void {
        this.jointStyle = style ?? 'BLOCKS';
    }

    setColor(color: string | null): void {
        this.color = normalizeColor(color);
    }

    setTipColor(color: string | null): void {
        this.tipColor = normalizeColor(color);
    }

    getOverride(index: number): HairSegmentOverride | undefined {
        return this.overrides.get(index);
    }

    getOrCreateOverride(index: number): HairSegmentOverride {
        let override = this.overrides.get(index);
        if (!override) {
            override = new HairSegmentOverride(index);
            this.overrides.set(index, override);
        }
        return override;
    }

    removeOverride(index: number): void {
        this.overrides.delete(index);
    }

    clearOverrides(): void {
        this.overrides.clear();
    }

    getOverrides(): HairSegmentOverride[] {
        return [...this.overrides.values()].sort((a, b) => a.index - b.index);
    }

    convertAbsoluteSegmentScales(): void {
        let lengthScale = 1;
        let widthScale = 1;
        let depthScale = 1;
        for (let k = 0; k < this.segments; k++) {
            const existing = this.overrides.get(k);
            const absoluteLength = existing ? existing.lengthScale : 1;
            const absoluteWidth = existing ? existing.widthScale : 1;
            const absoluteDepth = existing ? existing.depthScale : 1;
            if (!existing && lengthScale === 1 && widthScale === 1 && depthScale === 1) continue;
            const override = this.getOrCreateOverride(k);
            override.setLengthScale(Math.fround(absoluteLength / lengthScale));
            override.setWidthScale(Math.fround(absoluteWidth / widthScale));
            override.setDepthScale(Math.fround(absoluteDepth / depthScale));
            if (override.isIdentity()) {
                this.overrides.delete(k);
                continue;
            }
            lengthScale = Math.fround(lengthScale * override.lengthScale);
            widthScale = Math.fround(widthScale * override.widthScale);
            depthScale = Math.fround(depthScale * override.depthScale);
        }
    }

    makeVisibleWithDefaults(): void {
        if (this.isVisible()) return;
        this.segments = HairStrand.DEFAULT_SEGMENTS;
        this.length = HairStrand.DEFAULT_LENGTH;
        this.lengthRatio = HairStrand.DEFAULT_LENGTH_RATIO;
        this.width = HairStrand.DEFAULT_WIDTH;
        this.depth = HairStrand.DEFAULT_DEPTH;
        this.taper = HairStrand.DEFAULT_TAPER;
        this.taperCurve = HairStrand.DEFAULT_TAPER_CURVE;
    }

    mirror(): void {
        this.rotationY = wrapDegrees(-this.rotationY);
        this.rotationZ = wrapDegrees(-this.rotationZ);
        this.bendY = -this.bendY;
        this.bendZ = -this.bendZ;
        this.twist = -this.twist;
        this.offsetX = -this.offsetX;
        for (const override of this.overrides.values()) override.mirror();
    }

    copyFrom(other: HairStrand): void {
        this.segments = other.segments;
        this.length = other.length;
        this.lengthRatio = other.lengthRatio;
        this.width = other.width;
        this.depth = other.depth;
        this.taper = other.taper;
        this.taperCurve = other.taperCurve;
        this.offsetX = other.offsetX;
        this.offsetY = other.offsetY;
        this.offsetZ = other.offsetZ;
        this.rotationX = other.rotationX;
        this.rotationY = other.rotationY;
        this.rotationZ = other.rotationZ;
        this.bendX = other.bendX;
        this.bendY = other.bendY;
        this.bendZ = other.bendZ;
        this.twist = other.twist;
        this.jointStyle = other.jointStyle;
        this.color = other.color;
        this.tipColor = other.tipColor;
        this.overrides.clear();
        for (const [key, override] of other.overrides) this.overrides.set(key, override.copy());
    }

    copy(): HairStrand {
        const copy = new HairStrand(this.id);
        copy.copyFrom(this);
        return copy;
    }

    save(): NbtCompound {
        const tag = new NbtCompound();
        tag.putInt('i', this.id);
        tag.putInt('sg', this.segments);
        tag.putFloat('ln', this.length);
        if (this.lengthRatio !== 1) tag.putFloat('lr', this.lengthRatio);
        if (this.width !== HairStrand.DEFAULT_WIDTH) tag.putFloat('w', this.width);
        if (this.depth !== HairStrand.DEFAULT_DEPTH) tag.putFloat('d', this.depth);
        if (this.taper !== 1) tag.putFloat('tp', this.taper);
        if (this.taperCurve !== 1) tag.putFloat('tg', this.taperCurve);
        if (this.offsetX !== 0) tag.putFloat('ox', this.offsetX);
        if (this.offsetY !== 0) tag.putFloat('oy', this.offsetY);
        if (this.offsetZ !== 0) tag.putFloat('oz', this.offsetZ);
        if (this.rotationX !== 0) tag.putFloat('rx', this.rotationX);
        if (this.rotationY !== 0) tag.putFloat('ry', this.rotationY);
        if (this.rotationZ !== 0) tag.putFloat('rz', this.rotationZ);
        if (this.bendX !== 0) tag.putFloat('bx', this.bendX);
        if (this.bendY !== 0) tag.putFloat('by', this.bendY);
        if (this.bendZ !== 0) tag.putFloat('bz', this.bendZ);
        if (this.twist !== 0) tag.putFloat('tw', this.twist);
        if (this.jointStyle !== 'BLOCKS') tag.putByte('js', JOINT_STYLES.indexOf(this.jointStyle));
        if (this.color !== null) tag.putString('c', this.color);
        if (this.tipColor !== null) tag.putString('tc', this.tipColor);

        const list = new NbtList();
        for (const override of this.getOverrides()) {
            if (override.index < this.segments && !override.isIdentity()) list.add({ type: TAG_COMPOUND, value: override.save() });
        }
        if (!list.isEmpty()) tag.putList('so', list);
        return tag;
    }

    load(tag: NbtCompound): void {
        this.id = tag.getInt('i');
        this.setSegments(tag.getInt('sg'));
        this.length = tag.contains('ln') ? clampFinite(tag.getFloat('ln'), HairStrand.MIN_LENGTH, HairStrand.MAX_LENGTH, HairStrand.DEFAULT_LENGTH) : HairStrand.DEFAULT_LENGTH;
        this.lengthRatio = tag.contains('lr') ? clampFinite(tag.getFloat('lr'), HairStrand.MIN_LENGTH_RATIO, HairStrand.MAX_LENGTH_RATIO, 1) : 1;
        this.width = tag.contains('w') ? clampFinite(tag.getFloat('w'), HairStrand.MIN_WIDTH, HairStrand.MAX_WIDTH, HairStrand.DEFAULT_WIDTH) : HairStrand.DEFAULT_WIDTH;
        this.depth = tag.contains('d') ? clampFinite(tag.getFloat('d'), HairStrand.MIN_WIDTH, HairStrand.MAX_WIDTH, HairStrand.DEFAULT_DEPTH) : HairStrand.DEFAULT_DEPTH;
        this.taper = tag.contains('tp') ? clampFinite(tag.getFloat('tp'), HairStrand.MIN_TAPER, HairStrand.MAX_TAPER, 1) : 1;
        this.taperCurve = tag.contains('tg') ? clampFinite(tag.getFloat('tg'), HairStrand.MIN_TAPER_CURVE, HairStrand.MAX_TAPER_CURVE, 1) : 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
        this.setOffset(tag.getFloat('ox'), tag.getFloat('oy'), tag.getFloat('oz'));
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.setRotation(tag.getFloat('rx'), tag.getFloat('ry'), tag.getFloat('rz'));
        this.bendX = 0;
        this.bendY = 0;
        this.bendZ = 0;
        this.setBend(tag.getFloat('bx'), tag.getFloat('by'), tag.getFloat('bz'));
        this.twist = 0;
        this.setTwist(tag.getFloat('tw'));
        this.jointStyle = jointStyleById(tag.getByte('js'));
        this.color = tag.contains('c') ? normalizeColor(tag.getString('c')) : null;
        this.tipColor = tag.contains('tc') ? normalizeColor(tag.getString('tc')) : null;
        this.overrides.clear();
        if (tag.contains('so', TAG_LIST)) {
            const list = tag.getList('so', TAG_COMPOUND);
            for (let i = 0; i < list.size; i++) {
                const override = HairSegmentOverride.load(list.getCompound(i));
                if (override.index >= 0 && override.index < HairStrand.MAX_SEGMENTS) this.overrides.set(override.index, override);
            }
        }
    }
}
