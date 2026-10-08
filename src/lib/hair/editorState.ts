import { BASE_SLOT, FACES, FRONT, SLOTS, flatIndex, getBaseRotation, type HairFace, type HairStyleSlot } from './faces';
import { CustomHair, emptyStyleSet, type HairStyleSet } from './customHair';
import { HairStrand } from './strand';
import { createDefaultStrand } from './legacy';
import { DEFAULT_LIMITS, sanitize, type HairLimits } from './limits';
import { fromCode, fromFullSetCode, isFullSetCode, toCode, toFullSetCode } from './codec';
import { getPreset, presetExists } from './presets';
import { normalizeColor } from './colors';
import type { NbtCompound } from './nbt';

const MAX_HISTORY = 64;

function colorlessTag(style: CustomHair): NbtCompound {
    const tag = style.save();
    tag.remove('gc');
    return tag;
}

function snapshot(styles: HairStyleSet): CustomHair[] {
    return styles.map((style) => style.copy());
}

export interface EditorLoadResult {
    loaded: boolean;
    fullSet: boolean;
}

export class HairEditorState {
    readonly styles: HairStyleSet = emptyStyleSet();
    readonly limits: HairLimits = DEFAULT_LIMITS;
    readonly hidden = new Set<number>();
    readonly locked = new Set<number>();

    slot: HairStyleSlot = BASE_SLOT;
    face: HairFace = FRONT;
    selectedFace: HairFace | null = null;
    selectedIndex = -1;
    selectedSegment = -1;
    mirror = false;
    hairBase = true;
    bodyVisible = true;
    presetId = 0;
    selectionStartMs = 0;
    version = 0;
    hiddenVersion = 0;

    private initialTags: NbtCompound[] = [];
    private initialGlobalColor = '#000000';
    private undoStack: CustomHair[][] = [];
    private redoStack: CustomHair[][] = [];
    private gestureActive = false;
    private strandClipboard: HairStrand | null = null;
    private forceDirty = false;
    private readonly listeners = new Set<() => void>();

    constructor() {
        this.resetBaseline();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getVersion(): number {
        return this.version;
    }

    notify(): void {
        this.version++;
        for (const listener of this.listeners) listener();
    }

    loadCode(code: string): EditorLoadResult {
        const trimmed = code.trim();
        if (!trimmed) return { loaded: false, fullSet: false };
        if (isFullSetCode(trimmed)) {
            const set = fromFullSetCode(trimmed);
            if (!set) return { loaded: false, fullSet: true };
            SLOTS.forEach((slot) => {
                sanitize(set[slot.index], slot, this.limits);
                this.styles[slot.index].copyFrom(set[slot.index]);
            });
        } else {
            const single = fromCode(trimmed);
            if (!single) return { loaded: false, fullSet: false };
            sanitize(single, BASE_SLOT, this.limits);
            this.styles.forEach((style, index) => (index === BASE_SLOT.index ? style.copyFrom(single) : style.clear()));
            const color = single.globalColor;
            this.styles.forEach((style) => style.setGlobalColor(color));
        }
        this.presetId = 0;
        this.clearSelection();
        this.undoStack = [];
        this.redoStack = [];
        this.resetBaseline();
        this.notify();
        return { loaded: true, fullSet: isFullSetCode(trimmed) };
    }

    loadPreset(presetId: number): void {
        if (!presetExists(presetId)) return;
        SLOTS.forEach((slot) => this.styles[slot.index].copyFrom(getPreset(presetId, slot)));
        this.presetId = presetId;
        this.clearSelection();
        this.undoStack = [];
        this.redoStack = [];
        this.resetBaseline();
        this.notify();
    }

    markSaved(): void {
        this.resetBaseline();
        this.notify();
    }

    private resetBaseline(): void {
        this.initialTags = this.styles.map(colorlessTag);
        this.initialGlobalColor = this.globalColor();
        this.forceDirty = false;
    }

    style(): CustomHair {
        return this.styles[this.slot.index];
    }

    globalColor(): string {
        return this.styles[BASE_SLOT.index].globalColor;
    }

    setGlobalColor(hex: string | null): void {
        const color = normalizeColor(hex) ?? this.initialGlobalColor;
        for (const style of this.styles) {
            style.setGlobalColor(color);
            style.markChanged();
        }
        this.notify();
    }

    isDirty(): boolean {
        if (this.forceDirty || this.globalColor() !== this.initialGlobalColor) return true;
        return this.styles.some((style, index) => !colorlessTag(style).equals(this.initialTags[index]));
    }

    exportStyle(): string {
        return toCode(this.style());
    }

    exportFull(): string {
        return toFullSetCode(this.styles);
    }

    importStyle(code: string): boolean {
        const imported = isFullSetCode(code) ? fromFullSetCode(code)?.[this.slot.index] ?? null : fromCode(code);
        if (!imported) return false;
        sanitize(imported, this.slot, this.limits);
        this.recordStep();
        const color = this.globalColor();
        const previous = this.style().copy();
        this.style().copyFrom(imported);
        keepJointStyles(this.style(), previous);
        this.style().setGlobalColor(color);
        this.presetId = 0;
        this.clampSegmentSelection();
        this.notify();
        return true;
    }

    importFull(code: string): boolean {
        const imported = fromFullSetCode(code);
        if (!imported) return false;
        SLOTS.forEach((slot) => sanitize(imported[slot.index], slot, this.limits));
        this.recordStep();
        SLOTS.forEach((slot) => {
            const target = this.styles[slot.index];
            const previous = target.copy();
            target.copyFrom(imported[slot.index]);
            keepJointStyles(target, previous);
        });
        this.presetId = 0;
        this.clampSegmentSelection();
        this.notify();
        return true;
    }

    setSlot(slot: HairStyleSlot): void {
        if (slot === this.slot) return;
        this.slot = slot;
        this.clampSegmentSelection();
        this.restartPulse();
        this.notify();
    }

    setFace(face: HairFace): void {
        this.face = face;
        this.notify();
    }

    select(face: HairFace | null, index: number): void {
        this.selectedFace = face;
        this.selectedIndex = face ? index : -1;
        this.selectedSegment = -1;
        if (face) this.face = face;
        this.restartPulse();
        this.notify();
    }

    selectSegment(segment: number): void {
        this.selectedSegment = segment;
        this.clampSegmentSelection();
        this.restartPulse();
        this.notify();
    }

    clearSelection(): void {
        this.selectedFace = null;
        this.selectedIndex = -1;
        this.selectedSegment = -1;
        this.notify();
    }

    hasSelection(): boolean {
        return this.selectedFace !== null && this.selectedIndex >= 0;
    }

    selectedStrand(): HairStrand | null {
        return this.selectedFace ? this.style().getStrand(this.selectedFace, this.selectedIndex) : null;
    }

    isHidden(face: HairFace, index: number): boolean {
        return this.hidden.has(flatIndex(face, index));
    }

    isLocked(face: HairFace, index: number): boolean {
        return this.locked.has(flatIndex(face, index));
    }

    toggleHidden(face: HairFace, index: number): void {
        const flat = flatIndex(face, index);
        if (!this.hidden.delete(flat)) this.hidden.add(flat);
        this.hiddenVersion++;
        this.notify();
    }

    toggleLocked(face: HairFace, index: number): void {
        const flat = flatIndex(face, index);
        if (!this.locked.delete(flat)) this.locked.add(flat);
        this.notify();
    }

    setMirror(value: boolean): void {
        this.mirror = value;
        this.notify();
    }

    setHairBase(value: boolean): void {
        this.hairBase = value;
        this.notify();
    }

    setBodyVisible(value: boolean): void {
        this.bodyVisible = value;
        this.notify();
    }

    applyPreset(presetId: number): boolean {
        if (!presetExists(presetId)) return false;
        this.recordStep();
        const color = this.globalColor();
        SLOTS.forEach((slot) => {
            const target = this.styles[slot.index];
            const previous = target.copy();
            target.copyFrom(getPreset(presetId, slot));
            keepJointStyles(target, previous);
            target.setGlobalColor(color);
        });
        this.presetId = presetId;
        this.forceDirty = true;
        this.clampSegmentSelection();
        this.notify();
        return true;
    }

    beginGesture(): void {
        if (this.gestureActive) return;
        this.pushHistory();
        this.gestureActive = true;
    }

    endGesture(): void {
        this.gestureActive = false;
    }

    recordStep(): void {
        this.pushHistory();
    }

    private pushHistory(): void {
        this.undoStack.push(snapshot(this.styles));
        while (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
        this.redoStack = [];
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    undo(): boolean {
        const previous = this.undoStack.pop();
        if (!previous) return false;
        this.redoStack.push(snapshot(this.styles));
        previous.forEach((style, index) => this.styles[index].copyFrom(style));
        this.clampSegmentSelection();
        this.notify();
        return true;
    }

    redo(): boolean {
        const next = this.redoStack.pop();
        if (!next) return false;
        this.undoStack.push(snapshot(this.styles));
        next.forEach((style, index) => this.styles[index].copyFrom(style));
        this.clampSegmentSelection();
        this.notify();
        return true;
    }

    modifySelected(action: (strand: HairStrand) => void): void {
        const strand = this.selectedStrand();
        if (!strand) return;
        action(strand);
        this.propagateMirror();
        this.clampSegmentSelection();
        this.style().markChanged();
        this.notify();
    }

    propagateMirror(): void {
        if (!this.mirror || !this.selectedFace) return;
        const source = this.selectedStrand();
        const target = this.style().getMirrorStrand(this.selectedFace, this.selectedIndex);
        if (!source || !target) return;
        target.copyFrom(source);
        target.mirror();
    }

    copyStrand(): void {
        const strand = this.selectedStrand();
        if (strand) {
            this.strandClipboard = strand.copy();
            this.notify();
        }
    }

    hasStrandClipboard(): boolean {
        return this.strandClipboard !== null;
    }

    pasteStrand(): void {
        const clipboard = this.strandClipboard;
        if (!clipboard || !this.hasSelection()) return;
        this.recordStep();
        this.modifySelected((strand) => strand.copyFrom(clipboard));
    }

    addStrandToSelectedSlot(): void {
        if (!this.hasSelection()) return;
        this.recordStep();
        this.modifySelected((strand) => strand.makeVisibleWithDefaults());
    }

    clearSelectedStrand(): void {
        const face = this.selectedFace;
        if (!face) return;
        this.recordStep();
        const index = this.selectedIndex;
        this.modifySelected((strand) => strand.copyFrom(createDefaultStrand(face, index)));
        this.selectedSegment = -1;
        this.notify();
    }

    copyStrandToOtherStyles(): void {
        const strand = this.selectedStrand();
        const face = this.selectedFace;
        if (!strand || !face) return;
        this.recordStep();
        for (const other of SLOTS) {
            if (other === this.slot) continue;
            const style = this.styles[other.index];
            style.setStrand(face, this.selectedIndex, strand);
            if (this.mirror) {
                const target = style.getMirrorStrand(face, this.selectedIndex);
                if (target) {
                    target.copyFrom(strand);
                    target.mirror();
                }
            }
        }
        this.notify();
    }

    copyStyleFrom(source: HairStyleSlot): void {
        if (source === this.slot) return;
        this.recordStep();
        this.style().copyFrom(this.styles[source.index]);
        this.clampSegmentSelection();
        this.notify();
    }

    clearStyle(): void {
        this.recordStep();
        this.style().clear();
        this.selectedSegment = -1;
        this.notify();
    }

    resetSelectedSegment(): void {
        const segment = this.selectedSegment;
        if (segment < 0) return;
        this.recordStep();
        this.modifySelected((strand) => strand.removeOverride(segment));
    }

    baseRotation(axis: number): number {
        return this.selectedFace ? getBaseRotation(this.selectedFace)[axis] : 0;
    }

    clampSegmentSelection(): void {
        const strand = this.selectedStrand();
        if (!strand || !strand.isVisible()) {
            this.selectedSegment = -1;
            return;
        }
        if (this.selectedSegment >= strand.segments) this.selectedSegment = strand.segments - 1;
    }

    restartPulse(): void {
        this.selectionStartMs = performance.now();
    }

    nonEmptySlots(): boolean[] {
        return this.styles.map((style) => !style.isEmpty());
    }

    faceList(): readonly HairFace[] {
        return FACES;
    }
}

function keepJointStyles(target: CustomHair, previous: CustomHair): void {
    for (const face of FACES) {
        for (let index = 0; index < face.maxStrands; index++) {
            const before = previous.getStrand(face, index);
            const after = target.getStrand(face, index);
            if (!before || !after || !before.isVisible() || !after.isVisible()) continue;
            if (before.jointStyle !== 'BLOCKS') after.setJointStyle(before.jointStyle);
        }
    }
    target.markChanged();
}
