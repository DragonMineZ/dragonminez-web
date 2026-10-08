import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLanguage } from '../../../i18n';
import type { HairEditorState } from '../../../lib/hair/editorState';
import { HairViewportRenderer, type ViewPreset } from './viewportRenderer';
import { BACKGROUND_LABEL_KEYS, backgroundStyle, loadStoredBackground, nextBackground, PLAIN_BACKGROUND_CLASS, storeBackground, type ViewportBackground } from './backgrounds';
import { formatText, IconButton, Icon } from './editorUi';
import { SLOTS } from '../../../lib/hair/faces';

export interface HairViewportHandle {
    cancelTool: () => boolean;
    isToolActive: () => boolean;
}

interface HairViewportProps {
    state: HairEditorState;
    status: { text: string; tone: 'success' | 'warning' } | null;
    hairName?: string;
    onLimit: () => void;
    className?: string;
}

const VIEWS: ViewPreset[] = ['front', 'back', 'left', 'right', 'reset'];
const VIEW_KEYS: Record<ViewPreset, string> = {
    front: 'viewFront',
    back: 'viewBack',
    left: 'viewLeft',
    right: 'viewRight',
    reset: 'viewReset',
};

const OVERLAY_PILL = 'rounded-full border border-glass bg-surface/80 backdrop-blur';

const HairViewport = forwardRef<HairViewportHandle, HairViewportProps>(function HairViewport({ state, status, hairName, onLimit, className = '' }, ref) {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<HairViewportRenderer | null>(null);
    const limitRef = useRef(onLimit);
    const [toolActive, setToolActive] = useState(false);
    const [webglError, setWebglError] = useState(false);
    const [background, setBackground] = useState<ViewportBackground>('plain');

    limitRef.current = onLimit;

    useEffect(() => {
        setBackground(loadStoredBackground());
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            rendererRef.current = new HairViewportRenderer(canvas, state, {
                onToolChange: setToolActive,
                onLimit: () => limitRef.current(),
            });
        } catch {
            setWebglError(true);
        }
        return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
        };
    }, [state]);

    useImperativeHandle(ref, () => ({
        cancelTool: () => rendererRef.current?.cancelTool() ?? false,
        isToolActive: () => rendererRef.current?.isToolActive() ?? false,
    }), []);

    const cycleBackground = () => {
        const next = nextBackground(background);
        setBackground(next);
        storeBackground(next);
    };

    const stepStyle = (direction: number) => {
        const next = (SLOTS.indexOf(state.slot) + direction + SLOTS.length) % SLOTS.length;
        state.setSlot(SLOTS[next]);
    };

    const backgroundLabel = formatText(t('editor.background'), { name: t(`editor.${BACKGROUND_LABEL_KEYS[background]}`) });

    return (
        <div className={`relative min-h-0 ${className}`}>
            <div
                className={`absolute inset-0 overflow-hidden rounded-3xl border border-glass shadow-glass ${background === 'plain' ? PLAIN_BACKGROUND_CLASS : ''}`}
                style={backgroundStyle(background)}
            >
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none select-none outline-none" />
                {webglError && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-error">
                        {t('editor.webglError')}
                    </div>
                )}
            </div>
            <div className="absolute left-3 right-3 top-3 flex flex-col gap-2 pointer-events-none">
                <div className="flex flex-wrap gap-1.5 pr-12">
                    {VIEWS.map((view) => (
                        <button
                            key={view}
                            type="button"
                            onClick={() => rendererRef.current?.setView(view)}
                            className={`pointer-events-auto h-8 px-3.5 text-[11px] font-bold text-muted transition-all duration-300 hover:bg-foreground hover:text-background hover:border-transparent active:scale-95 cursor-pointer ${OVERLAY_PILL}`}
                        >
                            {t(`editor.${VIEW_KEYS[view]}`)}
                        </button>
                    ))}
                </div>
                {hairName && (
                    <div className="flex justify-center px-2">
                        <div className="max-w-[80%] truncate rounded-2xl border border-glass bg-surface/80 px-6 py-2.5 text-center text-base font-bold text-foreground shadow-dropdown backdrop-blur-xl">
                            {hairName}
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute right-3 top-3">
                <IconButton icon="wallpaper" label={backgroundLabel} onClick={cycleBackground} overlay tooltipPosition="bottom" />
            </div>
            {status && (
                <div className="absolute left-0 right-0 bottom-28 flex justify-center pointer-events-none">
                    <div className={`rounded-full border px-4 py-1.5 text-xs font-bold backdrop-blur animate-slide-in-soft ${status.tone === 'success' ? 'border-glass-strong bg-surface/90 text-foreground' : 'border-error/40 bg-error-glass text-error'}`}>
                        {status.text}
                    </div>
                </div>
            )}
            <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-3 px-3 pointer-events-none">
                <button
                    type="button"
                    onClick={() => stepStyle(-1)}
                    aria-label={t('editor.prevStyle')}
                    title={t('editor.prevStyle')}
                    className={`pointer-events-auto flex h-10 w-10 items-center justify-center text-foreground shadow-dropdown transition-all hover:bg-foreground hover:text-background active:scale-95 cursor-pointer ${OVERLAY_PILL}`}
                >
                    <Icon name="chevron_left" className="text-[22px]" />
                </button>
                <div className={`flex h-10 min-w-[120px] flex-col items-center justify-center px-5 shadow-dropdown ${OVERLAY_PILL}`}>
                    <span className="mb-0.5 text-[9px] font-black uppercase leading-none tracking-[0.2em] text-muted">{t('editor.currentStyle')}</span>
                    <span className="text-xs font-black uppercase leading-none tracking-tight text-foreground">{t(`editor.style${state.slot.index}`)}</span>
                </div>
                <button
                    type="button"
                    onClick={() => stepStyle(1)}
                    aria-label={t('editor.nextStyle')}
                    title={t('editor.nextStyle')}
                    className={`pointer-events-auto flex h-10 w-10 items-center justify-center text-foreground shadow-dropdown transition-all hover:bg-foreground hover:text-background active:scale-95 cursor-pointer ${OVERLAY_PILL}`}
                >
                    <Icon name="chevron_right" className="text-[22px]" />
                </button>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex pointer-events-none">
                <span className={`max-w-full truncate px-3.5 py-1 text-[11px] font-medium text-muted ${OVERLAY_PILL}`}>
                    {t(toolActive ? 'editor.hintTool' : 'editor.hintViewport')}
                </span>
            </div>
        </div>
    );
});

export default HairViewport;
