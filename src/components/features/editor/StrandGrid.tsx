/**
 * Strand grid selector for one face.
 * FRONT: 1×4, others: 4×4. Cells show strand index, highlight selected/visible/hover.
 */
import React from "react";
import type { HairFace, HairStrandModel } from "../../../lib/hair/model";
import { FACE_INFO } from "../../../lib/hair/model";

interface StrandGridProps {
    face: HairFace;
    strands: HairStrandModel[];
    selectedIndex: number | null;
    onSelect: (index: number) => void;
}

export default function StrandGrid({ face, strands, selectedIndex, onSelect }: StrandGridProps) {
    const info = FACE_INFO[face];
    const { rows, cols } = info;

    return (
        <div
            className="grid gap-1"
            style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
        >
            {strands.map((strand, i) => {
                const isSelected = i === selectedIndex;
                const isVisible = strand.length > 0;

                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onSelect(i)}
                        title={`Strand ${i + 1}`}
                        className={[
                            "aspect-square min-w-0 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center border",
                            isSelected
                                ? "bg-foreground text-background border-foreground shadow-glow scale-105"
                                : isVisible
                                  ? "bg-glass-strong border-glass-strong text-foreground hover:bg-foreground/20 hover:border-foreground/40"
                                  : "bg-glass border-glass text-muted/50 hover:bg-glass-strong hover:border-glass-strong hover:text-muted",
                        ].join(" ")}
                    >
                        {i + 1}
                    </button>
                );
            })}
        </div>
    );
}
