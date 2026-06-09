/**
 * Left-panel code section: full-set code display/copy + import textarea + per-style code.
 * Debounces code recomputation 300ms from model changes (passed in as prop).
 */
import React, { useState, useRef, useCallback } from "react";
import type { HairSetModel, HairStyleKey, CustomHairModel } from "../../../lib/hair/model";
import { encodeHair, encodeHairSet } from "../../../lib/hair/codec";
import { useLanguage } from "../../../i18n";

interface CodePanelProps {
    hairSet: HairSetModel;
    currentHair: CustomHairModel;
    currentStyle: HairStyleKey;
    onImport: (code: string) => boolean;
    onImportSuccess: () => void;
    onImportError: () => void;
}

const TRUNCATE_LEN = 80;

export default function CodePanel({
    hairSet,
    currentHair,
    currentStyle,
    onImport,
    onImportSuccess,
    onImportError,
}: CodePanelProps) {
    const { t } = useLanguage();

    // Codes are computed on-demand (caller passes debounced set)
    const fullCode = encodeHairSet(hairSet);
    const styleCode = encodeHair(currentHair);

    const [importText, setImportText] = useState("");
    const [copiedFull, setCopiedFull] = useState(false);
    const [copiedStyle, setCopiedStyle] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const copyToClipboard = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    }, []);

    const handleImport = useCallback(() => {
        const ok = onImport(importText.trim());
        if (ok) {
            onImportSuccess();
            setImportText("");
            setShowImport(false);
        } else {
            onImportError();
        }
    }, [importText, onImport, onImportSuccess, onImportError]);

    const truncate = (s: string) =>
        s.length > TRUNCATE_LEN ? s.slice(0, TRUNCATE_LEN) + "…" : s;

    return (
        <div className="flex flex-col gap-3">
            {/* Full set code */}
            <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                    {t("editor.fullCode")}
                </span>
                <div className="flex items-center gap-2 bg-surface border border-glass rounded-xl px-3 py-2">
                    <span className="flex-1 text-xs font-mono text-foreground/70 truncate min-w-0">
                        {truncate(fullCode)}
                    </span>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(fullCode, setCopiedFull)}
                        title={t("editor.copy")}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-glass hover:bg-glass-strong text-xs text-muted hover:text-foreground transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">
                            {copiedFull ? "check" : "content_copy"}
                        </span>
                        <span className="hidden sm:inline">
                            {copiedFull ? t("editor.copied") : t("editor.copy")}
                        </span>
                    </button>
                </div>
            </div>

            {/* Per-style code */}
            <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                    {t("editor.styleCode")}
                </span>
                <div className="flex items-center gap-2 bg-surface border border-glass rounded-xl px-3 py-2">
                    <span className="flex-1 text-xs font-mono text-foreground/70 truncate min-w-0">
                        {truncate(styleCode)}
                    </span>
                    <button
                        type="button"
                        onClick={() => copyToClipboard(styleCode, setCopiedStyle)}
                        title={t("editor.copy")}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-glass hover:bg-glass-strong text-xs text-muted hover:text-foreground transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">
                            {copiedStyle ? "check" : "content_copy"}
                        </span>
                        <span className="hidden sm:inline">
                            {copiedStyle ? t("editor.copied") : t("editor.copy")}
                        </span>
                    </button>
                </div>
            </div>

            {/* Import toggle */}
            <button
                type="button"
                onClick={() => setShowImport((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors px-0.5"
            >
                <span className="material-symbols-outlined text-sm">
                    {showImport ? "expand_less" : "upload"}
                </span>
                {t("editor.import")}
            </button>

            {showImport && (
                <div className="space-y-2">
                    <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="DMZ1:… or DMZF1:…"
                        rows={3}
                        className="w-full px-3 py-2 bg-surface border border-glass rounded-xl text-foreground text-xs font-mono placeholder:text-muted/30 focus:outline-none focus:border-glass-strong transition-all resize-none"
                    />
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={!importText.trim()}
                        className="w-full py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40"
                    >
                        {t("editor.import")}
                    </button>
                </div>
            )}
        </div>
    );
}
