/**
 * Right panel: sliders and color controls for the selected strand.
 * Length slider: 0..(maxCubes+1) where integer part = cube count, fractional → lengthScale.
 */
import React, { useCallback } from "react";
import type { HairStrandModel, HairStyleKey } from "../../../lib/hair/model";
import { useLanguage } from "../../../i18n";
import EditorSlider from "./EditorSlider";
import ColorPicker from "./ColorPicker";
import Button from "../../ui/Button";

interface StrandControlsProps {
    strand: HairStrandModel | null;
    styleKey: HairStyleKey;
    globalColor: string;
    hairName: string;
    onStrandChange: (patch: Partial<HairStrandModel>) => void;
    onGlobalColorChange: (color: string) => void;
    onHairNameChange: (name: string) => void;
    onClearStrand: () => void;
    onClearStyle: () => void;
}

/** Max cube count for a given style key */
function maxCubes(style: HairStyleKey): number {
    return style === "ssj3" ? 8 : 4;
}

/**
 * Map the raw strand length + lengthScale → slider value in [0, maxCubes+1].
 * Integer part = length (cubes), fractional part above maxCubes → lengthScale = 1 + frac * 0.5
 */
function toSliderValue(strand: HairStrandModel, style: HairStyleKey): number {
    const mc = maxCubes(style);
    if (strand.length <= mc) return strand.length;
    // length > mc shouldn't happen normally, but handle it
    const extra = (strand.lengthScale - 1) / 0.5;
    return mc + Math.min(1, Math.max(0, extra));
}

/**
 * Reverse: slider value → { length, lengthScale }
 */
function fromSliderValue(
    v: number,
    style: HairStyleKey,
): Pick<HairStrandModel, "length" | "lengthScale"> {
    const mc = maxCubes(style);
    const intPart = Math.min(Math.floor(v), mc);
    if (v <= mc) {
        return { length: intPart, lengthScale: 1 };
    }
    const frac = v - mc; // 0..1
    return { length: mc, lengthScale: 1 + frac * 0.5 };
}

export default function StrandControls({
    strand,
    styleKey,
    globalColor,
    hairName,
    onStrandChange,
    onGlobalColorChange,
    onHairNameChange,
    onClearStrand,
    onClearStyle,
}: StrandControlsProps) {
    const { t } = useLanguage();
    const mc = maxCubes(styleKey);
    const disabled = strand === null;

    const sliderVal = strand ? toSliderValue(strand, styleKey) : 0;

    const handleLengthChange = useCallback(
        (v: number) => {
            onStrandChange(fromSliderValue(v, styleKey));
        },
        [onStrandChange, styleKey],
    );

    const formatLength = useCallback(
        (v: number) => {
            const intPart = Math.min(Math.floor(v), mc);
            const frac = v - mc;
            if (v > mc && frac > 0.001) {
                return `${intPart} +${(frac * 0.5).toFixed(2)}`;
            }
            return `${intPart} ${t("editor.cubes")}`;
        },
        [mc, t],
    );

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-hide">
            {/* Hair Name */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                    {t("editor.hairName")}
                </label>
                <input
                    type="text"
                    value={hairName}
                    onChange={(e) => onHairNameChange(e.target.value)}
                    placeholder={t("editor.hairNamePlaceholder")}
                    maxLength={64}
                    className="w-full px-3 py-2 bg-surface border border-glass rounded-xl text-foreground text-sm placeholder:text-muted/40 focus:outline-none focus:border-glass-strong transition-all"
                />
            </div>

            {/* Global color */}
            <ColorPicker
                label={t("editor.globalColor")}
                value={globalColor}
                onChange={onGlobalColorChange}
            />

            <div className="border-t border-glass my-1" />

            {/* No strand selected hint */}
            {!strand && (
                <p className="text-xs text-muted italic text-center py-4">
                    {t("editor.noStrandSelected")}
                </p>
            )}

            {/* Strand controls */}
            {strand && (
                <>
                    <div className="space-y-3">
                        {/* Length */}
                        <EditorSlider
                            label={t("editor.length")}
                            value={sliderVal}
                            min={0}
                            max={mc + 1}
                            step={0.05}
                            disabled={disabled}
                            onChange={handleLengthChange}
                            formatValue={formatLength}
                        />

                        {/* Width */}
                        <EditorSlider
                            label={t("editor.width")}
                            value={(strand.scaleX + strand.scaleZ) / 2}
                            min={0.5}
                            max={1.5}
                            step={0.05}
                            disabled={disabled}
                            onChange={(v) => onStrandChange({ scaleX: v, scaleZ: v })}
                        />

                        {/* X Rotation */}
                        <EditorSlider
                            label={t("editor.xRotation")}
                            value={strand.rotX}
                            min={-180}
                            max={180}
                            step={1}
                            unit="°"
                            disabled={disabled}
                            onChange={(v) => onStrandChange({ rotX: v })}
                        />

                        {/* Z Rotation */}
                        <EditorSlider
                            label={t("editor.zRotation")}
                            value={strand.rotZ}
                            min={-180}
                            max={180}
                            step={1}
                            unit="°"
                            disabled={disabled}
                            onChange={(v) => onStrandChange({ rotZ: v })}
                        />

                        {/* X Bend */}
                        <EditorSlider
                            label={t("editor.xBend")}
                            value={strand.curveX}
                            min={-180}
                            max={180}
                            step={1}
                            unit="°"
                            disabled={disabled}
                            onChange={(v) => onStrandChange({ curveX: v })}
                        />

                        {/* Z Bend */}
                        <EditorSlider
                            label={t("editor.zBend")}
                            value={strand.curveZ}
                            min={-180}
                            max={180}
                            step={1}
                            unit="°"
                            disabled={disabled}
                            onChange={(v) => onStrandChange({ curveZ: v })}
                        />
                    </div>

                    {/* Per-strand color */}
                    <ColorPicker
                        label={t("editor.color")}
                        value={strand.color ?? globalColor}
                        onChange={(hex) => onStrandChange({ color: hex })}
                        onReset={() => onStrandChange({ color: null })}
                        resetLabel={t("editor.resetColor")}
                        disabled={disabled}
                    />

                    {/* Clear strand */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearStrand}
                        disabled={disabled}
                        className="w-full justify-center text-muted hover:text-error"
                    >
                        <span className="material-symbols-outlined text-base mr-1.5">delete</span>
                        {t("editor.clearStrand")}
                    </Button>
                </>
            )}

            <div className="border-t border-glass my-1" />

            {/* Clear style */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onClearStyle}
                className="w-full justify-center text-muted hover:text-error"
            >
                <span className="material-symbols-outlined text-base mr-1.5">clear_all</span>
                {t("editor.clearStyle")}
            </Button>
        </div>
    );
}
