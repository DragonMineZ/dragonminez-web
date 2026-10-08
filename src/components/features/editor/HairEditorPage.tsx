import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../../i18n';
import { HairEditorState } from '../../../lib/hair/editorState';
import Modal from '../../ui/Modal';
import HairOutliner, { type CodeAction } from './HairOutliner';
import HairInspector from './HairInspector';
import HairViewport, { type HairViewportHandle } from './HairViewport';
import { EditorButton, formatText, IconButton, isTypingTarget, useEditorVersion } from './editorUi';

interface HairEditorPageProps {
    code: string;
    hairId?: string;
    name?: string;
}

type Status = { text: string; tone: 'success' | 'warning' } | null;
type Dialog = { mode: 'importStyle' | 'importFull' } | { mode: 'export'; code: string } | null;

const STATUS_MS = 2600;
const DEFAULT_PRESET = 1;

export default function HairEditorPage({ code, hairId = '', name = '' }: HairEditorPageProps) {
    const { t } = useLanguage();
    const tr = useCallback((key: string) => t(`editor.${key}`), [t]);
    const state = useMemo(() => new HairEditorState(), []);
    const viewportRef = useRef<HairViewportHandle>(null);
    const [loadError, setLoadError] = useState(false);
    const [hairName, setHairName] = useState(name);
    const [status, setStatus] = useState<Status>(null);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState(false);
    const statusTimer = useRef<number | undefined>(undefined);
    useEditorVersion(state);

    useEffect(() => {
        let cancelled = false;
        const load = (source: string) => {
            if (cancelled) return;
            const result = source ? state.loadCode(source) : { loaded: false, fullSet: false };
            if (!result.loaded) {
                state.loadPreset(DEFAULT_PRESET);
                setLoadError(!!source);
            }
        };
        if (!code && /^\d+$/.test(hairId)) {
            state.loadPreset(DEFAULT_PRESET);
            fetch(`/api/hairs/${hairId}`)
                .then((response) => (response.ok ? response.json() : null))
                .then((hair: { code?: string; name?: string } | null) => {
                    if (cancelled) return;
                    if (!hair?.code) {
                        setLoadError(true);
                        return;
                    }
                    if (hair.name) setHairName(hair.name);
                    load(hair.code);
                })
                .catch(() => {
                    if (!cancelled) setLoadError(true);
                });
        } else {
            load(code);
        }
        return () => {
            cancelled = true;
        };
    }, [code, hairId, state]);

    const showStatus = useCallback((text: string, tone: 'success' | 'warning' = 'success') => {
        window.clearTimeout(statusTimer.current);
        setStatus({ text, tone });
        statusTimer.current = window.setTimeout(() => setStatus(null), STATUS_MS);
    }, []);

    const onLimit = useCallback(() => showStatus(tr('statusLimit'), 'warning'), [showStatus, tr]);

    useEffect(() => () => window.clearTimeout(statusTimer.current), []);

    useEffect(() => {
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!state.isDirty()) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [state]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (dialog || isTypingTarget(event.target)) return;
            const control = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();
            if (event.key === 'Escape') {
                if (viewportRef.current?.cancelTool()) return;
                if (state.hasSelection()) state.clearSelection();
                return;
            }
            if (control && key === 'z') {
                event.preventDefault();
                if (event.shiftKey) state.redo();
                else state.undo();
                return;
            }
            if (control && key === 'y') {
                event.preventDefault();
                state.redo();
                return;
            }
            if (control && key === 'c' && state.hasSelection()) {
                event.preventDefault();
                state.copyStrand();
                showStatus(tr('statusCopiedStrand'));
                return;
            }
            if (control && key === 'v' && state.hasSelection()) {
                event.preventDefault();
                state.pasteStrand();
                return;
            }
            if ((event.key === 'Delete' || event.key === 'Backspace') && state.hasSelection()) {
                event.preventDefault();
                state.clearSelectedStrand();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [dialog, state, showStatus, tr]);

    const styleName = tr(`style${state.slot.index}`);

    const copyToClipboard = (text: string) => {
        if (navigator?.clipboard) navigator.clipboard.writeText(text).catch(() => undefined);
    };

    const onCodeAction = (action: CodeAction) => {
        if (action === 'importStyle' || action === 'importFull') {
            setImportText('');
            setImportError(false);
            setDialog({ mode: action });
            return;
        }
        if (action === 'exportStyle') {
            const exported = state.exportStyle();
            copyToClipboard(exported);
            setDialog({ mode: 'export', code: exported });
            showStatus(formatText(tr('statusCopiedStyle'), { style: styleName }));
            return;
        }
        const exported = state.exportFull();
        copyToClipboard(exported);
        state.markSaved();
        setDialog({ mode: 'export', code: exported });
        showStatus(tr('statusCopiedFull'));
    };

    const runImport = () => {
        if (!dialog || dialog.mode === 'export') return;
        const ok = dialog.mode === 'importFull' ? state.importFull(importText) : state.importStyle(importText);
        if (!ok) {
            setImportError(true);
            return;
        }
        setDialog(null);
        showStatus(dialog.mode === 'importFull' ? tr('statusImportedFull') : formatText(tr('statusImportedStyle'), { style: styleName }));
    };

    const dirty = state.isDirty();

    return (
        <div className="flex flex-col gap-3 px-3 md:px-6 lg:h-[calc(100vh-7rem)]">
            <div className="flex flex-wrap items-center gap-2">
                <EditorButton icon="arrow_back" onClick={() => { window.location.href = '/hairsalon'; }} className="h-9">
                    {tr('backToSalon')}
                </EditorButton>
                <div className="flex flex-1 min-w-0 items-center">
                    {dirty && <span className="h-2 w-2 rounded-full bg-foreground" title={tr('unsaved')} aria-label={tr('unsaved')} />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <IconButton icon="undo" label={`${tr('undo')} (Ctrl+Z)`} onClick={() => state.undo()} disabled={!state.canUndo()} tooltipPosition="bottom" />
                    <IconButton icon="redo" label={`${tr('redo')} (Ctrl+Y)`} onClick={() => state.redo()} disabled={!state.canRedo()} tooltipPosition="bottom" />
                    <EditorButton icon="flip" onClick={() => state.setMirror(!state.mirror)} active={state.mirror} className="h-9">
                        {tr('mirror')}
                    </EditorButton>
                    <EditorButton onClick={() => state.setHairBase(!state.hairBase)} active={state.hairBase} className="h-9">
                        {tr('hairbase')}
                    </EditorButton>
                    <EditorButton onClick={() => state.setBodyVisible(!state.bodyVisible)} active={state.bodyVisible} className="h-9">
                        {tr('body')}
                    </EditorButton>
                </div>
            </div>

            {loadError && (
                <div className="rounded-2xl border border-error/30 bg-error-glass px-4 py-2 text-xs font-semibold text-error">
                    {tr('loadError')}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
                <HairViewport
                    ref={viewportRef}
                    state={state}
                    status={status}
                    hairName={hairName}
                    onLimit={onLimit}
                    className="order-1 lg:order-2 h-[60vh] lg:h-auto lg:flex-1"
                />
                <HairOutliner state={state} onCodeAction={onCodeAction} className="order-2 lg:order-1 lg:w-64 shrink-0" />
                <HairInspector state={state} onLimit={onLimit} className="order-3 lg:w-80 shrink-0 max-h-[70vh] lg:max-h-none" />
            </div>

            <Modal isOpen={dialog !== null} onClose={() => setDialog(null)}>
                {dialog && dialog.mode !== 'export' && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-foreground pr-12">{tr(dialog.mode === 'importFull' ? 'importFull' : 'importStyle')}</h2>
                        {dialog.mode === 'importStyle' && <p className="text-sm text-muted">{tr('importStyleHint')}</p>}
                        <textarea
                            autoFocus
                            value={importText}
                            onChange={(event) => {
                                setImportText(event.target.value);
                                setImportError(false);
                            }}
                            placeholder={tr('importPlaceholder')}
                            rows={7}
                            className={`w-full rounded-2xl border bg-surface px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted/50 focus:outline-none ${importError ? 'border-error/60' : 'border-glass focus:border-glass-strong'}`}
                        />
                        {importError && <p className="text-sm font-semibold text-error">{tr('statusInvalidCode')}</p>}
                        <div className="flex justify-end gap-2">
                            <EditorButton onClick={() => setDialog(null)} size="md">{tr('cancel')}</EditorButton>
                            <EditorButton icon="download" onClick={runImport} disabled={!importText.trim()} primary size="md">{tr('import')}</EditorButton>
                        </div>
                    </div>
                )}
                {dialog && dialog.mode === 'export' && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-foreground pr-12">{tr('exportTitle')}</h2>
                        <p className="text-sm text-muted">{tr('exportHint')}</p>
                        <textarea
                            readOnly
                            value={dialog.code}
                            rows={7}
                            onFocus={(event) => event.target.select()}
                            className="w-full rounded-2xl border border-glass bg-surface px-4 py-3 font-mono text-xs text-foreground focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <EditorButton icon="content_copy" onClick={() => copyToClipboard(dialog.code)} size="md">
                                {tr('copy')}
                            </EditorButton>
                            <EditorButton onClick={() => setDialog(null)} primary size="md">{tr('close')}</EditorButton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
