/**
 * BackgroundControl — small popover that lets the user change the 3D editor's
 * background colour. Dark hair is invisible against the default near-black
 * canvas, so presets span the full dark→light range plus a custom picker.
 */
import { useEffect, useRef, useState } from "react";
import Tooltip from "../../ui/Tooltip";

export interface BackgroundPreset {
    label: string;
    value: string;
}

/** Dark → light spread so any hair colour stays readable against the canvas. */
export const BG_PRESETS: BackgroundPreset[] = [
    { label: "Void", value: "#0a0a0b" },
    { label: "Charcoal", value: "#2b2d33" },
    { label: "Slate", value: "#475569" },
    { label: "Gray", value: "#94a3b8" },
    { label: "Mist", value: "#d4d4d8" },
    { label: "White", value: "#ffffff" },
];

interface BackgroundControlProps {
    color: string;
    onChange: (color: string) => void;
    label: string;
}

export default function BackgroundControl({ color, onChange, label }: BackgroundControlProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <Tooltip content={label} position="bottom">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={label}
                    aria-haspopup="true"
                    aria-expanded={open}
                    className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all ${
                        open
                            ? "bg-surface-elevated border-glass-strong"
                            : "bg-surface/80 backdrop-blur-sm border-glass hover:bg-surface-elevated"
                    }`}
                >
                    <span
                        className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
                        style={{ backgroundColor: color }}
                    />
                </button>
            </Tooltip>

            {open && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 p-3 rounded-2xl border border-glass bg-surface/95 backdrop-blur-xl shadow-dropdown animate-slide-in-soft">
                    <div className="grid grid-cols-3 gap-2">
                        {BG_PRESETS.map((preset) => {
                            const active = preset.value.toLowerCase() === color.toLowerCase();
                            return (
                                <Tooltip key={preset.value} content={preset.label} position="bottom">
                                    <button
                                        type="button"
                                        onClick={() => onChange(preset.value)}
                                        aria-label={preset.label}
                                        aria-pressed={active}
                                        className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 ${
                                            active ? "border-foreground" : "border-white/15"
                                        }`}
                                        style={{ backgroundColor: preset.value }}
                                    />
                                </Tooltip>
                            );
                        })}
                    </div>

                    {/* Custom colour */}
                    <label className="mt-3 flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted hover:text-foreground transition-colors">
                        <span
                            className="w-9 h-9 rounded-xl border-2 border-white/15 grid place-items-center shrink-0"
                            style={{ backgroundColor: color }}
                        >
                            <span className="material-symbols-outlined text-[18px] mix-blend-difference text-white">
                                colorize
                            </span>
                        </span>
                        <span className="whitespace-nowrap">{color.toUpperCase()}</span>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onChange(e.target.value)}
                            className="sr-only"
                        />
                    </label>
                </div>
            )}
        </div>
    );
}
