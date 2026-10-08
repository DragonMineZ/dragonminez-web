import { useEffect, useRef, useState } from "react";
import Tooltip from "../../ui/Tooltip";
import { useLanguage } from "../../../i18n";
import notFoundImage from "../../../assets/hairsalon/not_found.svg";
import { cancelThumbnail, decodeHair, requestThumbnail, thumbnailsAvailable, type DecodedHair } from "../editor/hairThumbnails";
import { backgroundStyle, PLAIN_BACKGROUND_CLASS } from "../editor/backgrounds";

const MAX_PIXEL_RATIO = 2;
const DECODE_DELAY_MS = 120;
const LIGHT_BACKGROUND_POSITION = "center";

interface HairPreviewProps {
    code: string;
    name: string;
    className?: string;
}

const overlayButton = "flex items-center justify-center w-8 h-8 rounded-full border border-glass bg-surface/80 text-muted backdrop-blur transition-all duration-300 hover:bg-foreground hover:text-background hover:border-transparent active:scale-95 cursor-pointer group/preview-button";
const overlayIcon = "material-symbols-outlined text-[20px] leading-none group-hover/preview-button:[font-variation-settings:'FILL'_1]";

export default function HairPreview({ code, name, className = "" }: HairPreviewProps) {
    const { t } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(false);
    const [decoded, setDecoded] = useState<DecodedHair | null | undefined>(undefined);
    const [styleIndex, setStyleIndex] = useState(0);
    const [light, setLight] = useState(false);
    const [drawn, setDrawn] = useState(false);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        if (typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: "300px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        const trimmed = code.trim();
        const handle = window.setTimeout(() => {
            const result = trimmed ? decodeHair(trimmed) : null;
            setDecoded(result);
            setStyleIndex(0);
            setDrawn(false);
        }, DECODE_DELAY_MS);
        return () => window.clearTimeout(handle);
    }, [code, visible]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => {
            const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
            setSize({
                width: Math.round(canvas.clientWidth * ratio),
                height: Math.round(canvas.clientHeight * ratio),
            });
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !decoded || size.width === 0 || size.height === 0) return;
        if (canvas.width !== size.width) canvas.width = size.width;
        if (canvas.height !== size.height) canvas.height = size.height;
        const style = decoded.styles[Math.min(styleIndex, decoded.styles.length - 1)] ?? null;
        requestThumbnail(canvas, decoded, style, () => setDrawn(true));
        return () => cancelThumbnail(canvas);
    }, [decoded, styleIndex, size]);

    const failed = decoded === null || (decoded !== undefined && !thumbnailsAvailable());
    const styleCount = decoded?.styles.length ?? 0;
    const current = decoded?.styles[Math.min(styleIndex, Math.max(0, styleCount - 1))];
    const step = (direction: number) => setStyleIndex((index) => (index + direction + styleCount) % styleCount);

    return (
        <div ref={containerRef} className={`relative aspect-square shrink-0 ${className}`}>
            <div
                className={`absolute inset-0 overflow-hidden rounded-2xl border border-glass ${light ? "" : PLAIN_BACKGROUND_CLASS}`}
                style={light ? backgroundStyle("timeChamber", LIGHT_BACKGROUND_POSITION) : undefined}
            >
                <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label={name}
                    className={`absolute inset-0 h-full w-full transition-transform duration-500 group-hover/card:scale-105 ${failed ? "hidden" : ""}`}
                />

                {failed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <img src={notFoundImage.src} alt="" className="w-1/2 opacity-60" />
                        <span className="text-xs font-semibold text-muted">{t("hairSalon.previewUnavailable")}</span>
                    </div>
                )}

                {!failed && !drawn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin" />
                    </div>
                )}
            </div>

            {!failed && (
                <div className="absolute right-2 top-2">
                    <Tooltip position="bottom" content={light ? t("hairSalon.previewDefaultBackground") : t("hairSalon.previewLightBackground")}>
                        <button
                            type="button"
                            onClick={() => setLight((value) => !value)}
                            className={overlayButton}
                            aria-label={light ? t("hairSalon.previewDefaultBackground") : t("hairSalon.previewLightBackground")}
                            aria-pressed={light}
                        >
                            <span className={overlayIcon}>{light ? "dark_mode" : "light_mode"}</span>
                        </button>
                    </Tooltip>
                </div>
            )}

            {!failed && styleCount > 1 && (
                <>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                        <Tooltip content={t("hairSalon.previewPrev")}>
                            <button type="button" onClick={() => step(-1)} className={overlayButton} aria-label={t("hairSalon.previewPrev")}>
                                <span className={overlayIcon}>chevron_left</span>
                            </button>
                        </Tooltip>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Tooltip content={t("hairSalon.previewNext")}>
                            <button type="button" onClick={() => step(1)} className={overlayButton} aria-label={t("hairSalon.previewNext")}>
                                <span className={overlayIcon}>chevron_right</span>
                            </button>
                        </Tooltip>
                    </div>
                </>
            )}

            {!failed && current?.slot && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-glass bg-surface/80 px-3 py-1 backdrop-blur">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {t(`editor.style${current.slot.index}`)}
                    </span>
                    {styleCount > 1 && (
                        <span className="flex items-center gap-1">
                            {decoded!.styles.map((style, index) => (
                                <span
                                    key={style.slot?.name ?? index}
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${index === styleIndex ? "bg-foreground" : "bg-foreground/25"}`}
                                />
                            ))}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
