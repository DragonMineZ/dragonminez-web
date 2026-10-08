import { useSyncExternalStore, type ReactNode } from 'react';
import Button from '../../ui/Button';
import Tooltip from '../../ui/Tooltip';
import type { HairEditorState } from '../../../lib/hair/editorState';

export function useEditorVersion(state: HairEditorState): number {
    return useSyncExternalStore(
        (listener) => state.subscribe(listener),
        () => state.getVersion(),
        () => state.getVersion()
    );
}

export function formatText(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function Panel({ title, children, className = '', actions }: { title: string; children: ReactNode; className?: string; actions?: ReactNode }) {
    return (
        <section className={`flex flex-col min-h-0 bg-surface border border-glass rounded-3xl shadow-glass overflow-hidden ${className}`}>
            <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-glass">
                <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">{title}</h2>
                {actions}
            </header>
            {children}
        </section>
    );
}

export function Icon({ name, className = '' }: { name: string; className?: string }) {
    return <span className={`material-symbols-outlined leading-none transition-all ${className}`}>{name}</span>;
}

interface EditorButtonProps {
    children: ReactNode;
    onClick?: () => void;
    active?: boolean;
    primary?: boolean;
    disabled?: boolean;
    icon?: string;
    size?: 'sm' | 'md';
    className?: string;
}

export function EditorButton({ children, onClick, active = false, primary = false, disabled = false, icon, size = 'sm', className = '' }: EditorButtonProps) {
    return (
        <Button
            type="button"
            size={size}
            variant={active || primary ? 'primary' : 'secondary'}
            disabled={disabled}
            onClick={onClick}
            className={`group/editor-button gap-1.5 whitespace-nowrap select-none disabled:hover:scale-100 ${className}`}
        >
            {icon && <Icon name={icon} className="text-[18px] group-hover/editor-button:[font-variation-settings:'FILL'_1]" />}
            {children}
        </Button>
    );
}

interface PillTabProps {
    children: ReactNode;
    onClick: () => void;
    active: boolean;
    className?: string;
    ariaLabel?: string;
}

export function PillTab({ children, onClick, active, className = '', ariaLabel }: PillTabProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            aria-pressed={active}
            className={`relative inline-flex items-center justify-center rounded-full text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer select-none ${active
                ? 'bg-foreground text-background shadow-glow'
                : 'bg-glass text-muted hover:bg-glass-strong hover:text-foreground'} ${className}`}
        >
            {children}
        </button>
    );
}

interface IconButtonProps {
    icon: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    overlay?: boolean;
    tooltipPosition?: 'top' | 'bottom';
    className?: string;
}

export function IconButton({ icon, label, onClick, disabled = false, active = false, overlay = false, tooltipPosition = 'top', className = '' }: IconButtonProps) {
    const tone = active
        ? 'bg-foreground text-background border-transparent shadow-glow'
        : `${overlay ? 'bg-surface/80 backdrop-blur' : 'bg-surface'} text-muted border-glass hover:bg-foreground hover:text-background hover:border-transparent`;
    return (
        <Tooltip content={label} position={tooltipPosition} disabled={disabled}>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                className={`group/icon-button flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${tone} ${className}`}
            >
                <Icon name={icon} className="text-[20px] group-hover/icon-button:[font-variation-settings:'FILL'_1]" />
            </button>
        </Tooltip>
    );
}

export function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-center gap-2 pt-4 pb-1.5 px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted whitespace-nowrap">{children}</span>
            <span className="h-px flex-1 rounded-full bg-glass-strong" />
        </div>
    );
}
