/**
 * Reusable slider component for the Hair Editor.
 * Styled to the glass dark aesthetic with accent track fill.
 */
import React, { useId } from "react";

interface EditorSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
    onChange: (value: number) => void;
    /** Format the displayed value (default: toFixed(step < 1 ? 2 : 0)) */
    formatValue?: (v: number) => string;
}

export default function EditorSlider({
    label,
    value,
    min,
    max,
    step = 1,
    unit,
    disabled = false,
    onChange,
    formatValue,
}: EditorSliderProps) {
    const id = useId();

    const pct = ((value - min) / (max - min)) * 100;
    const displayValue = formatValue
        ? formatValue(value)
        : step < 1
          ? value.toFixed(2)
          : Math.round(value).toString();

    return (
        <div className={`space-y-1.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between px-0.5">
                <label htmlFor={id} className="text-xs font-semibold text-muted tracking-wide uppercase">
                    {label}
                </label>
                <span className="text-xs font-bold text-foreground tabular-nums min-w-[3rem] text-right">
                    {displayValue}{unit && <span className="text-muted ml-0.5">{unit}</span>}
                </span>
            </div>
            <div className="relative flex items-center h-5">
                {/* Track background */}
                <div className="absolute inset-y-0 flex items-center w-full">
                    <div className="w-full h-1.5 rounded-full bg-glass-strong overflow-hidden">
                        <div
                            className="h-full rounded-full bg-foreground/80 transition-none"
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        />
                    </div>
                </div>
                <input
                    id={id}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="editor-slider relative w-full h-5 appearance-none bg-transparent cursor-pointer"
                    style={{ zIndex: 1 }}
                />
            </div>
        </div>
    );
}
