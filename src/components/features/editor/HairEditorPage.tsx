/**
 * Hair Editor — full-page island composing the 3D preview, strand grid,
 * sliders, code import/export and the publish flow.
 */
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useLanguage } from "../../../i18n";
import {
    HAIR_FACES,
    HAIR_STYLES,
    type HairFace,
    type HairStyleKey,
    type HairSetModel,
} from "../../../lib/hair/model";
import { useHairEditor } from "./useHairEditor";
import EditorScene from "./EditorScene";
import BackgroundControl from "./BackgroundControl";
import StrandGrid from "./StrandGrid";
import StrandControls from "./StrandControls";
import CodePanel from "./CodePanel";
import PublishModal from "./PublishModal";
import ConfirmDialog from "../../ui/ConfirmDialog";
import SuccessAlert from "../../ui/SuccessAlert";
import ErrorAlert from "../../ui/ErrorAlert";
import ErrorBoundary from "../../ui/ErrorBoundary";
import Tooltip from "../../ui/Tooltip";
import { encodeHairSet } from "../../../lib/hair/codec";

interface HairEditorPageProps {
    initialCode?: string;
    isSignedIn?: boolean;
}

/** Debounce a value — used so code re-encoding doesn't run on every slider tick. */
function useDebounced<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const handle = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(handle);
    }, [value, delayMs]);
    return debounced;
}

const FACE_KEY_BY_FACE: Record<HairFace, string> = {
    FRONT: "editor.faces.front",
    BACK: "editor.faces.back",
    LEFT: "editor.faces.left",
    RIGHT: "editor.faces.right",
    TOP: "editor.faces.top",
};

interface ToggleButtonProps {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

function ToggleButton({ icon, label, active, onClick }: ToggleButtonProps) {
    return (
        <Tooltip content={label} position="bottom">
            <button
                type="button"
                onClick={onClick}
                aria-pressed={active}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all ${
                    active
                        ? "bg-foreground text-background border-foreground shadow-glow"
                        : "bg-surface/80 backdrop-blur-sm border-glass text-muted hover:text-foreground hover:bg-surface-elevated"
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </button>
        </Tooltip>
    );
}

export default function HairEditorPage({ initialCode, isSignedIn = false }: HairEditorPageProps) {
    const { t } = useLanguage();
    const editor = useHairEditor(initialCode);
    const {
        hairSet,
        selection,
        toggles,
        currentHair,
        selectedStrand,
        selectStyle,
        selectFace,
        selectStrand,
        updateSelectedStrand,
        updateGlobalColor,
        updateHairName,
        clearSelectedStrand,
        clearStyle,
        importCode,
        setToggle,
        undo,
    } = editor;

    const [bgColor, setBgColor] = useState("#0a0a0b");
    const [publishOpen, setPublishOpen] = useState(false);
    const [publishCode, setPublishCode] = useState("");
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [alert, setAlert] = useState<{ kind: "success" | "error"; message: string } | null>(null);

    // Code regeneration is expensive (NBT + deflate) — debounce it off the hot path.
    const debouncedSet: HairSetModel = useDebounced(hairSet, 300);

    const openPublish = () => {
        setPublishCode(encodeHairSet(hairSet));
        setPublishOpen(true);
    };

    // Ctrl+Z undo
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
                e.preventDefault();
                undo();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [undo]);

    const handleSelectFromScene = (face: HairFace, index: number) => {
        if (face !== selection.face) selectFace(face);
        selectStrand(index);
    };

    const styleLabel: Record<HairStyleKey, string> = {
        base: t("editor.styles.base"),
        ssj: t("editor.styles.ssj"),
        ssj2: t("editor.styles.ssj2"),
        ssj3: t("editor.styles.ssj3"),
    };

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[640px] bg-background">
            {/* ── Top bar */}
            <header className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-glass bg-surface/60 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <a
                        href="/hairsalon"
                        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors font-semibold shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        <span className="hidden sm:inline">{t("editor.backToSalon")}</span>
                    </a>
                    <div className="w-px h-6 bg-glass-strong hidden sm:block" />
                    <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground truncate">
                        {t("editor.title")}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {isSignedIn ? (
                        <button
                            type="button"
                            onClick={openPublish}
                            className="flex items-center gap-2 px-5 py-2 bg-foreground text-background rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[18px]">publish</span>
                            {t("editor.publish")}
                        </button>
                    ) : (
                        <Tooltip content={t("editor.signInToPublish")} position="bottom">
                            <span className="flex items-center gap-2 px-5 py-2 bg-glass border border-glass text-muted rounded-full font-bold text-sm cursor-not-allowed">
                                <span className="material-symbols-outlined text-[18px]">publish</span>
                                {t("editor.publish")}
                            </span>
                        </Tooltip>
                    )}
                </div>
            </header>

            {/* ── Main layout */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Left panel: styles, faces, grid, codes */}
                <aside className="order-2 lg:order-1 w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-r border-glass bg-surface/40 overflow-y-auto scrollbar-hide">
                    <div className="p-4 flex flex-col gap-5">
                        {/* Styles */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                                {t("editor.stylesLabel")}
                            </span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {HAIR_STYLES.map((style) => (
                                    <button
                                        key={style}
                                        type="button"
                                        onClick={() => selectStyle(style)}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                            selection.style === style
                                                ? "bg-foreground text-background border-foreground shadow-glow"
                                                : "bg-glass border-glass text-muted hover:text-foreground hover:bg-glass-strong"
                                        }`}
                                    >
                                        {styleLabel[style]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Faces */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                                {t("editor.facesLabel")}
                            </span>
                            <div className="grid grid-cols-5 gap-1.5">
                                {HAIR_FACES.map((face) => (
                                    <button
                                        key={face}
                                        type="button"
                                        onClick={() => selectFace(face)}
                                        title={t(FACE_KEY_BY_FACE[face])}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                            selection.face === face
                                                ? "bg-foreground text-background border-foreground shadow-glow"
                                                : "bg-glass border-glass text-muted hover:text-foreground hover:bg-glass-strong"
                                        }`}
                                    >
                                        {face.charAt(0)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-muted/70 px-0.5">
                                {t(FACE_KEY_BY_FACE[selection.face])}
                            </p>
                        </div>

                        {/* Strand grid */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted tracking-wide uppercase px-0.5">
                                {t("editor.strandsLabel")}
                            </span>
                            <StrandGrid
                                face={selection.face}
                                strands={currentHair.strands[selection.face]}
                                selectedIndex={selection.strandIndex}
                                onSelect={(i) =>
                                    selectStrand(selection.strandIndex === i ? null : i)
                                }
                            />
                        </div>

                        <div className="border-t border-glass" />

                        {/* Codes */}
                        <CodePanel
                            hairSet={debouncedSet}
                            currentHair={debouncedSet[selection.style]}
                            currentStyle={selection.style}
                            onImport={importCode}
                            onImportSuccess={() =>
                                setAlert({ kind: "success", message: t("editor.importSuccess") })
                            }
                            onImportError={() =>
                                setAlert({ kind: "error", message: t("editor.importInvalid") })
                            }
                        />
                    </div>
                </aside>

                {/* Center: 3D canvas */}
                <main className="order-1 lg:order-2 flex-1 relative min-h-[320px] lg:min-h-0">
                    <ErrorBoundary>
                        <Canvas
                            camera={{ position: [0, 2.2, 5.5], fov: 45 }}
                            dpr={[1, 2]}
                            className="!absolute inset-0"
                        >
                            <color attach="background" args={[bgColor]} />
                            <EditorScene
                                hair={currentHair}
                                selectedFace={selection.face}
                                selectedIndex={selection.strandIndex}
                                showBase={toggles.showBase}
                                physics={toggles.physics}
                                onSelectStrand={handleSelectFromScene}
                            />
                            <OrbitControls
                                enablePan={false}
                                minDistance={2.5}
                                maxDistance={10}
                                minPolarAngle={Math.PI * 0.15}
                                maxPolarAngle={Math.PI * 0.85}
                                autoRotate={toggles.autoRotate}
                                autoRotateSpeed={1.2}
                                target={[0, 1.6, 0]}
                            />
                        </Canvas>
                    </ErrorBoundary>

                    {/* Floating toggles */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                        <ToggleButton
                            icon="flip"
                            label={t("editor.mirror")}
                            active={toggles.mirror}
                            onClick={() => setToggle("mirror", !toggles.mirror)}
                        />
                        <ToggleButton
                            icon="airwave"
                            label={t("editor.physics")}
                            active={toggles.physics}
                            onClick={() => setToggle("physics", !toggles.physics)}
                        />
                        <ToggleButton
                            icon="360"
                            label={t("editor.autoRotate")}
                            active={toggles.autoRotate}
                            onClick={() => setToggle("autoRotate", !toggles.autoRotate)}
                        />
                        <ToggleButton
                            icon="face_retouching_natural"
                            label={t("editor.showBase")}
                            active={toggles.showBase}
                            onClick={() => setToggle("showBase", !toggles.showBase)}
                        />
                        <BackgroundControl
                            color={bgColor}
                            onChange={setBgColor}
                            label={t("editor.background")}
                        />
                    </div>

                    {/* Controls hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface/70 backdrop-blur-sm border border-glass rounded-full text-[11px] text-muted pointer-events-none select-none z-10 whitespace-nowrap">
                        {t("editor.controlsHint")}
                    </div>
                </main>

                {/* Right panel: strand controls */}
                <aside className="order-3 w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-glass bg-surface/40 overflow-y-auto scrollbar-hide">
                    <div className="p-4">
                        <StrandControls
                            strand={selectedStrand}
                            styleKey={selection.style}
                            globalColor={currentHair.globalColor}
                            hairName={currentHair.name}
                            onStrandChange={updateSelectedStrand}
                            onGlobalColorChange={updateGlobalColor}
                            onHairNameChange={updateHairName}
                            onClearStrand={clearSelectedStrand}
                            onClearStyle={() => setClearConfirmOpen(true)}
                        />
                    </div>
                </aside>
            </div>

            {/* ── Modals & alerts */}
            <PublishModal
                isOpen={publishOpen}
                onClose={() => setPublishOpen(false)}
                code={publishCode}
                hairName={currentHair.name}
            />

            <ConfirmDialog
                isOpen={clearConfirmOpen}
                onClose={() => setClearConfirmOpen(false)}
                onConfirm={() => {
                    clearStyle();
                    setClearConfirmOpen(false);
                }}
                title={t("editor.clearStyleConfirmTitle")}
                description={t("editor.clearStyleConfirmDesc")}
            />

            <SuccessAlert
                show={alert?.kind === "success"}
                message={alert?.message ?? ""}
                onClose={() => setAlert(null)}
            />
            <ErrorAlert
                show={alert?.kind === "error"}
                message={alert?.message ?? ""}
                onClose={() => setAlert(null)}
            />
        </div>
    );
}
