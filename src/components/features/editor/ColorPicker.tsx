/**
 * Compact color picker: native color input + hex text input + optional reset button.
 * Used for both per-strand color and global style color.
 */
import React, { useState, useCallback } from "react";
import { useLanguage } from "../../../i18n";

interface ColorPickerProps {
    label: string;
    value: string; // "#RRGGBB"
    onChange: (hex: string) => void;
    onReset?: () => void;
    resetLabel?: string;
    disabled?: boolean;
}

function isValidHex(v: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(v);
}

export default function ColorPicker({
    label,
    value,
    onChange,
    onReset,
    resetLabel,
    disabled = false,
}: ColorPickerProps) {
    const { t } = useLanguage();
    const [hexInput, setHexInput] = useState(value);
    const [lastValue, setLastValue] = useState(value);

    // Re-sync the text input whenever the value prop changes from outside
    // (e.g. switching strands or styles) — render-time derived state reset.
    if (value !== lastValue) {
        setLastValue(value);
        setHexInput(value);
    }

    const resolvedHex = isValidHex(value) ? value : "#000000";

    const handleColorInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            setHexInput(v);
            if (isValidHex(v)) onChange(v);
        },
        [onChange],
    );

    const handleHexBlur = useCallback(() => {
        if (isValidHex(hexInput)) {
            onChange(hexInput);
        } else {
            setHexInput(value);
        }
    }, [hexInput, value, onChange]);

    const handleHexChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            setHexInput(raw);
            const normalized = raw.startsWith("#") ? raw : "#" + raw;
            if (isValidHex(normalized)) onChange(normalized);
        },
        [onChange],
    );

    return (
        <div className={`space-y-1.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
            <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">{label}</span>
            <div className="flex items-center gap-2">
                {/* Native color swatch */}
                <div
                    className="relative w-9 h-9 rounded-xl border border-glass-strong overflow-hidden flex-shrink-0 cursor-pointer"
                    style={{ backgroundColor: resolvedHex }}
                >
                    <input
                        type="color"
                        value={resolvedHex}
                        onChange={(e) => {
                            setHexInput(e.target.value);
                            onChange(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        disabled={disabled}
                        title={t("editor.customColor")}
                    />
                </div>

                {/* Hex text input */}
                <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexChange}
                    onBlur={handleHexBlur}
                    maxLength={7}
                    disabled={disabled}
                    placeholder="#000000"
                    className="flex-1 px-3 py-2 bg-surface border border-glass rounded-xl text-foreground text-xs font-mono placeholder:text-muted/40 focus:outline-none focus:border-glass-strong transition-all"
                    aria-label={t("editor.hexLabel")}
                />

                {/* Reset button */}
                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={disabled}
                        title={resetLabel ?? t("editor.resetColor")}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-glass hover:bg-glass-strong text-muted hover:text-foreground transition-all"
                    >
                        <span className="material-symbols-outlined text-base [font-variation-settings:'wght'_400]">
                            format_color_reset
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
