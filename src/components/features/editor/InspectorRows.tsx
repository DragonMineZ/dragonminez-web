import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { HairEditorState } from '../../../lib/hair/editorState';
import { normalizeColor } from '../../../lib/hair/colors';
import { EditorButton, Icon } from './editorUi';

const SCRUB_PIXELS = 240;

const AXIS_COLORS: Record<string, string> = {
    x: '#ef4444',
    y: '#22c55e',
    z: '#3b82f6',
};

export type Axis = 'x' | 'y' | 'z' | null;

function formatValue(value: number, step: number, integer: boolean): string {
    if (integer) return String(Math.round(value));
    if (step >= 1) return value.toFixed(0);
    if (step >= 0.1) return value.toFixed(1);
    return value.toFixed(2);
}

interface NumberRowProps {
    state: HairEditorState;
    label: string;
    axis?: Axis;
    min: number;
    max: number;
    step: number;
    integer?: boolean;
    value: number;
    defaultValue: number;
    onChange: (value: number) => void;
    onLimit?: () => void;
}

export function NumberRow({ state, label, axis = null, min, max, step, integer = false, value, defaultValue, onChange, onLimit }: NumberRowProps) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const dragMode = useRef<'bar' | 'scrub' | null>(null);
    const dragStartX = useRef(0);
    const dragStartValue = useRef(0);
    const barRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const isAtLimit = (candidate: number) => {
        const tolerance = integer ? 0.5 : Math.max(1.0e-3, (max - min) * 1.0e-4);
        return Math.abs(candidate - min) <= tolerance || Math.abs(candidate - max) <= tolerance;
    };

    const apply = (raw: number, fine: boolean, pushedPast = false) => {
        if (!Number.isFinite(raw)) return;
        let clamped = Math.max(min, Math.min(max, raw));
        if (step > 0 && !fine) clamped = Math.round(clamped / step) * step;
        if (integer) clamped = Math.round(clamped);
        clamped = Math.max(min, Math.min(max, clamped));
        const before = value;
        onChange(clamped);
        if (isAtLimit(clamped) && (pushedPast || !isAtLimit(before))) onLimit?.();
    };

    const applyFromBar = (clientX: number, fine: boolean) => {
        const bar = barRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        apply(min + ratio * (max - min), fine);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, mode: 'bar' | 'scrub') => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        state.beginGesture();
        dragMode.current = mode;
        if (mode === 'bar') {
            applyFromBar(event.clientX, event.shiftKey);
        } else {
            dragStartX.current = event.clientX;
            dragStartValue.current = value;
        }
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragMode.current === 'bar') {
            applyFromBar(event.clientX, event.shiftKey);
        } else if (dragMode.current === 'scrub') {
            const sensitivity = event.shiftKey ? 0.1 : (event.ctrlKey || event.metaKey ? 5 : 1);
            const delta = (event.clientX - dragStartX.current) * (max - min) / SCRUB_PIXELS * sensitivity;
            apply(dragStartValue.current + delta, event.shiftKey);
        }
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragMode.current) state.endGesture();
        dragMode.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const reset = (event: React.MouseEvent) => {
        event.preventDefault();
        state.recordStep();
        onChange(defaultValue);
    };

    const commit = () => {
        setEditing(false);
        const parsed = parseFloat(text.trim().replace(',', '.'));
        if (!Number.isFinite(parsed)) return;
        state.recordStep();
        apply(parsed, false, parsed < min || parsed > max);
    };

    const ratio = max > min ? (Math.max(min, Math.min(max, value)) - min) / (max - min) : 0;
    const zero = min < 0 && max > 0 ? -min / (max - min) : 0;
    const fillLeft = Math.min(zero, ratio);
    const fillWidth = Math.abs(ratio - zero);

    return (
        <div className="group flex items-center gap-2 h-8 px-1 rounded-xl transition-colors hover:bg-glass" onContextMenu={reset}>
            <div
                className={`relative w-[88px] shrink-0 truncate text-[11px] font-semibold cursor-ew-resize select-none pl-2 ${dragMode.current === 'scrub' ? 'text-foreground' : 'text-muted'}`}
                onPointerDown={(event) => onPointerDown(event, 'scrub')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                title={label}
            >
                {axis && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ backgroundColor: AXIS_COLORS[axis] }} />}
                {label}
            </div>
            <div
                ref={barRef}
                className="relative flex-1 h-4 rounded-full bg-glass-strong cursor-pointer touch-none"
                onPointerDown={(event) => onPointerDown(event, 'bar')}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div className="absolute top-1 bottom-1 rounded-full bg-foreground/35" style={{ left: `${fillLeft * 100}%`, width: `${fillWidth * 100}%` }} />
                {min < 0 && max > 0 && <div className="absolute top-0.5 bottom-0.5 w-px bg-muted/60" style={{ left: `${zero * 100}%` }} />}
                <div className="absolute top-0 bottom-0 w-1 -ml-0.5 rounded-full bg-foreground" style={{ left: `${ratio * 100}%` }} />
            </div>
            {editing ? (
                <input
                    ref={inputRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'Tab') commit();
                        else if (event.key === 'Escape') setEditing(false);
                        event.stopPropagation();
                    }}
                    className="w-16 shrink-0 h-6 rounded-full bg-background border border-foreground/40 px-2.5 text-right text-[11px] font-mono text-foreground focus:outline-none"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setText(formatValue(value, step, integer));
                        setEditing(true);
                    }}
                    className="w-16 shrink-0 h-6 rounded-full bg-surface-elevated border border-glass-strong px-2.5 text-right text-[11px] font-mono font-medium text-foreground transition-colors hover:border-foreground/40 cursor-text"
                >
                    {formatValue(value, step, integer)}
                </button>
            )}
        </div>
    );
}

interface ChoiceRowProps {
    label: string;
    value: string;
    onNext: () => void;
    onReset?: () => void;
}

export function ChoiceRow({ label, value, onNext, onReset }: ChoiceRowProps) {
    return (
        <div
            className="flex items-center gap-2 h-8 px-1 rounded-xl transition-colors hover:bg-glass"
            onContextMenu={(event) => {
                event.preventDefault();
                onReset?.();
            }}
        >
            <span className="w-[88px] shrink-0 truncate pl-2 text-[11px] font-semibold text-muted">{label}</span>
            <button
                type="button"
                onClick={onNext}
                className="group/choice flex flex-1 min-w-0 items-center justify-between gap-1 h-6 rounded-full bg-surface border border-glass pl-3 pr-1.5 text-[11px] font-bold text-foreground transition-all hover:border-glass-strong active:scale-[0.98] cursor-pointer"
            >
                <span className="truncate">{value}</span>
                <Icon name="sync_alt" className="text-[14px] text-muted group-hover/choice:text-foreground" />
            </button>
        </div>
    );
}

const STEPPER_BUTTON = 'flex items-center justify-center h-6 w-6 shrink-0 rounded-full bg-surface border border-glass text-muted transition-all duration-300 hover:bg-foreground hover:text-background hover:border-transparent active:scale-95 cursor-pointer';

interface StepperRowProps {
    label: string;
    value: string;
    onStep: (direction: number) => void;
}

export function StepperRow({ label, value, onStep }: StepperRowProps) {
    return (
        <div className="flex items-center gap-2 h-8 px-1 rounded-xl transition-colors hover:bg-glass">
            <span className="w-[88px] shrink-0 truncate pl-2 text-[11px] font-semibold text-muted">{label}</span>
            <button type="button" onClick={() => onStep(-1)} className={STEPPER_BUTTON}>
                <Icon name="chevron_left" className="text-[18px]" />
            </button>
            <span className="flex-1 text-center text-[11px] font-bold text-foreground truncate">{value}</span>
            <button type="button" onClick={() => onStep(1)} className={STEPPER_BUTTON}>
                <Icon name="chevron_right" className="text-[18px]" />
            </button>
        </div>
    );
}

interface ColorRowProps {
    state: HairEditorState;
    label: string;
    value: string | null;
    fallback: string;
    autoLabel: string;
    onChange: (hex: string | null) => void;
    recordOnChange?: boolean;
}

export function ColorRow({ state, label, value, fallback, autoLabel, onChange, recordOnChange = true }: ColorRowProps) {
    const shown = value ?? fallback;
    const [text, setText] = useState(shown);
    const recorded = useRef(false);

    useEffect(() => {
        setText(shown);
    }, [shown]);

    const record = () => {
        if (!recordOnChange || recorded.current) return;
        state.recordStep();
        recorded.current = true;
    };

    return (
        <div
            className="flex items-center gap-2 h-8 px-1 rounded-xl transition-colors hover:bg-glass"
            onContextMenu={(event) => {
                event.preventDefault();
                state.recordStep();
                onChange(null);
            }}
        >
            <span className="w-[88px] shrink-0 truncate pl-2 text-[11px] font-semibold text-muted">{label}</span>
            <label className="relative h-6 w-6 shrink-0 rounded-full border-2 border-glass-strong overflow-hidden cursor-pointer shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: shown }}>
                <input
                    type="color"
                    value={normalizeColor(shown)?.toLowerCase() ?? '#000000'}
                    onFocus={() => {
                        recorded.current = false;
                    }}
                    onChange={(event) => {
                        record();
                        onChange(event.target.value);
                    }}
                    onBlur={() => {
                        recorded.current = false;
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
            </label>
            <input
                value={value === null ? '' : text}
                placeholder={autoLabel}
                onChange={(event) => setText(event.target.value)}
                onBlur={() => {
                    const normalized = normalizeColor(text);
                    if (normalized && normalized !== value) {
                        state.recordStep();
                        onChange(normalized);
                    } else {
                        setText(shown);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                    event.stopPropagation();
                }}
                className="flex-1 min-w-0 h-6 rounded-full bg-surface-elevated border border-glass-strong px-3 text-[11px] font-mono font-medium uppercase text-foreground placeholder:text-muted placeholder:normal-case focus:outline-none focus:border-foreground/40"
            />
            {value !== null && (
                <button
                    type="button"
                    title={autoLabel}
                    onClick={() => {
                        state.recordStep();
                        onChange(null);
                    }}
                    className="h-6 px-2.5 rounded-full bg-glass text-[10px] font-bold text-muted transition-all hover:bg-glass-strong hover:text-foreground active:scale-95 cursor-pointer"
                >
                    {autoLabel}
                </button>
            )}
        </div>
    );
}

export function InfoRow({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'text' | 'warning' }) {
    const color = tone === 'warning' ? 'text-error' : tone === 'text' ? 'text-foreground' : 'text-muted';
    return <div className={`px-2 py-1 text-[11px] leading-snug ${color}`}>{text}</div>;
}

interface Action {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export function ActionRow({ actions }: { actions: Action[] }) {
    return (
        <div className="flex gap-1.5 px-1 py-1.5">
            {actions.map((action) => (
                <EditorButton
                    key={action.label}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    className="flex-1 min-w-0 h-8 text-[11px]"
                >
                    <span className="truncate">{action.label}</span>
                </EditorButton>
            ))}
        </div>
    );
}
