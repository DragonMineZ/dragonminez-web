/**
 * Core state management hook for the 3D Hair Editor.
 * Manages HairSetModel, selection state, viewport toggles, and undo stack.
 */
import { useState, useCallback, useRef } from "react";
import {
    type HairSetModel,
    type HairStyleKey,
    type HairFace,
    type HairStrandModel,
    type CustomHairModel,
    HAIR_STYLES,
    HAIR_FACES,
    FACE_INFO,
    createEmptySet,
    copySet,
    copyHair,
    createEmptyStrand,
} from "../../../lib/hair/model";
import { decodeHairToSet } from "../../../lib/hair/codec";

// ── Mirror logic ─────────────────────────────────────────────────────────────

function getMirrorInfo(
    face: HairFace,
    index: number,
): { mirrorFace: HairFace; mirrorIndex: number } | null {
    const info = FACE_INFO[face];

    if (face === "LEFT") {
        return { mirrorFace: "RIGHT", mirrorIndex: index };
    }
    if (face === "RIGHT") {
        return { mirrorFace: "LEFT", mirrorIndex: index };
    }
    // FRONT/BACK/TOP: mirror within the row (col → cols-1-col, skip middle)
    const col = index % info.cols;
    const row = Math.floor(index / info.cols);
    const mirrorCol = info.cols - 1 - col;
    if (mirrorCol === col) return null; // middle column — no mirror
    return { mirrorFace: face, mirrorIndex: row * info.cols + mirrorCol };
}

function applyMirror(src: HairStrandModel, target: HairStrandModel): HairStrandModel {
    return {
        ...target,
        length: src.length,
        lengthScale: src.lengthScale,
        scaleX: src.scaleX,
        scaleY: src.scaleY,
        scaleZ: src.scaleZ,
        rotX: src.rotX,
        rotY: src.rotY,
        rotZ: -src.rotZ,
        curveX: src.curveX,
        curveY: src.curveY,
        curveZ: -src.curveZ,
        color: src.color,
    };
}

// ── State shape ───────────────────────────────────────────────────────────────

export interface EditorSelection {
    style: HairStyleKey;
    face: HairFace;
    strandIndex: number | null;
}

export interface EditorToggles {
    mirror: boolean;
    physics: boolean;
    autoRotate: boolean;
    showBase: boolean;
}

export interface HairEditorState {
    hairSet: HairSetModel;
    selection: EditorSelection;
    toggles: EditorToggles;
}

const MAX_UNDO = 30;

export function useHairEditor(initialCode?: string) {
    // ── Initial state ────────────────────────────────────────────────────────
    const getInitialSet = (): HairSetModel => {
        if (initialCode) {
            const decoded = decodeHairToSet(initialCode);
            if (decoded) return decoded.set;
        }
        return createEmptySet();
    };

    const [hairSet, setHairSetRaw] = useState<HairSetModel>(getInitialSet);

    const [selection, setSelection] = useState<EditorSelection>({
        style: "base",
        face: "FRONT",
        strandIndex: null,
    });

    const [toggles, setToggles] = useState<EditorToggles>({
        mirror: false,
        physics: false,
        autoRotate: false,
        showBase: true,
    });

    // ── Undo stack ───────────────────────────────────────────────────────────
    const undoStack = useRef<HairSetModel[]>([]);

    const pushUndo = useCallback((prev: HairSetModel) => {
        undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), copySet(prev)];
    }, []);

    const setHairSet = useCallback(
        (updater: (prev: HairSetModel) => HairSetModel, addUndo = true) => {
            setHairSetRaw((prev) => {
                if (addUndo) pushUndo(prev);
                return updater(prev);
            });
        },
        [pushUndo],
    );

    const undo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        const prev = undoStack.current[undoStack.current.length - 1];
        undoStack.current = undoStack.current.slice(0, -1);
        setHairSetRaw(prev);
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const currentHair = (): CustomHairModel => hairSet[selection.style];

    const getSelectedStrand = (): HairStrandModel | null => {
        if (selection.strandIndex === null) return null;
        return currentHair().strands[selection.face][selection.strandIndex] ?? null;
    };

    // ── Selection ────────────────────────────────────────────────────────────
    const selectStyle = useCallback((style: HairStyleKey) => {
        setSelection((prev) => ({ ...prev, style, strandIndex: null }));
    }, []);

    const selectFace = useCallback((face: HairFace) => {
        setSelection((prev) => ({ ...prev, face, strandIndex: null }));
    }, []);

    const selectStrand = useCallback((index: number | null) => {
        setSelection((prev) => ({ ...prev, strandIndex: index }));
    }, []);

    // ── Strand mutation ──────────────────────────────────────────────────────
    const updateStrand = useCallback(
        (
            style: HairStyleKey,
            face: HairFace,
            index: number,
            patch: Partial<HairStrandModel>,
            addUndo = true,
        ) => {
            setHairSet((prev) => {
                const newSet = copySet(prev);
                const strands = newSet[style].strands[face];
                strands[index] = { ...strands[index], ...patch };

                // Mirror logic
                if (toggles.mirror) {
                    const mirrorInfo = getMirrorInfo(face, index);
                    if (mirrorInfo) {
                        const { mirrorFace, mirrorIndex } = mirrorInfo;
                        const mirrorStrands = newSet[style].strands[mirrorFace];
                        mirrorStrands[mirrorIndex] = applyMirror(
                            strands[index],
                            mirrorStrands[mirrorIndex],
                        );
                    }
                }
                return newSet;
            }, addUndo);
        },
        [setHairSet, toggles.mirror],
    );

    // Update the currently-selected strand (convenience wrapper)
    const updateSelectedStrand = useCallback(
        (patch: Partial<HairStrandModel>) => {
            if (selection.strandIndex === null) return;
            updateStrand(selection.style, selection.face, selection.strandIndex, patch);
        },
        [selection, updateStrand],
    );

    // ── Style-level ops ──────────────────────────────────────────────────────
    const updateGlobalColor = useCallback(
        (color: string) => {
            setHairSet((prev) => {
                const newSet = copySet(prev);
                newSet[selection.style].globalColor = color;
                return newSet;
            });
        },
        [setHairSet, selection.style],
    );

    const updateHairName = useCallback(
        (name: string) => {
            setHairSet((prev) => {
                const newSet = copySet(prev);
                newSet[selection.style].name = name;
                return newSet;
            });
        },
        [setHairSet, selection.style],
    );

    const clearSelectedStrand = useCallback(() => {
        if (selection.strandIndex === null) return;
        const empty = createEmptyStrand(selection.face, selection.strandIndex);
        updateStrand(selection.style, selection.face, selection.strandIndex, empty);
    }, [selection, updateStrand]);

    const clearStyle = useCallback(() => {
        setHairSet((prev) => {
            const newSet = copySet(prev);
            for (const face of HAIR_FACES) {
                const info = FACE_INFO[face];
                newSet[selection.style].strands[face] = Array.from(
                    { length: info.maxStrands },
                    (_, i) => createEmptyStrand(face, i),
                );
            }
            return newSet;
        });
    }, [setHairSet, selection.style]);

    // ── Import ───────────────────────────────────────────────────────────────
    const importCode = useCallback(
        (code: string): boolean => {
            const decoded = decodeHairToSet(code);
            if (!decoded) return false;

            if (decoded.isFullSet) {
                // Full set: replace all styles
                setHairSet(() => decoded.set);
            } else {
                // Single style: replace current style only
                setHairSet((prev) => {
                    const newSet = copySet(prev);
                    newSet[selection.style] = copyHair(decoded.set.base);
                    return newSet;
                });
            }
            return true;
        },
        [setHairSet, selection.style],
    );

    // ── Toggles ──────────────────────────────────────────────────────────────
    const setToggle = useCallback((key: keyof EditorToggles, value: boolean) => {
        setToggles((prev) => ({ ...prev, [key]: value }));
    }, []);

    return {
        hairSet,
        selection,
        toggles,
        // Derived
        currentHair: currentHair(),
        selectedStrand: getSelectedStrand(),
        // Selection actions
        selectStyle,
        selectFace,
        selectStrand,
        // Mutation actions
        updateStrand,
        updateSelectedStrand,
        updateGlobalColor,
        updateHairName,
        clearSelectedStrand,
        clearStyle,
        importCode,
        // Viewport
        setToggle,
        // Undo
        undo,
        canUndo: undoStack.current.length > 0,
    };
}
