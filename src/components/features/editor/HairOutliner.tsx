import { useLanguage } from '../../../i18n';
import type { HairEditorState } from '../../../lib/hair/editorState';
import { FACES, SLOTS } from '../../../lib/hair/faces';
import { EditorButton, formatText, Icon, Panel, PillTab, SectionTitle } from './editorUi';

export type CodeAction = 'importStyle' | 'importFull' | 'exportStyle' | 'exportFull';

interface HairOutlinerProps {
    state: HairEditorState;
    onCodeAction: (action: CodeAction) => void;
    className?: string;
}

export default function HairOutliner({ state, onCodeAction, className = '' }: HairOutlinerProps) {
    const { t } = useLanguage();
    const tr = (key: string) => t(`editor.${key}`);
    const style = state.style();
    const face = state.face;
    const nonEmpty = state.nonEmptySlots();
    const strand = state.selectedStrand();
    const selected = state.hasSelection();
    const hidden = selected && state.selectedFace ? state.isHidden(state.selectedFace, state.selectedIndex) : false;
    const locked = selected && state.selectedFace ? state.isLocked(state.selectedFace, state.selectedIndex) : false;

    return (
        <Panel title={tr('outliner')} className={className}>
            <div className="flex flex-col gap-3 p-4 min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-5 gap-1.5">
                    {SLOTS.map((slot) => (
                        <PillTab
                            key={slot.name}
                            active={state.slot === slot}
                            onClick={() => state.setSlot(slot)}
                            ariaLabel={tr(`style${slot.index}`)}
                            className="h-8"
                        >
                            {tr(`styleShort${slot.index}`)}
                            {nonEmpty[slot.index] && <span className={`absolute top-1.5 right-2.5 h-1.5 w-1.5 rounded-full ${state.slot === slot ? 'bg-background' : 'bg-foreground'}`} />}
                        </PillTab>
                    ))}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {FACES.map((candidate) => (
                        <PillTab
                            key={candidate.key}
                            active={face === candidate}
                            onClick={() => state.setFace(candidate)}
                            ariaLabel={tr(`face${candidate.name}`)}
                            className="h-8"
                        >
                            {candidate.key}
                        </PillTab>
                    ))}
                </div>

                <div className="mx-auto grid gap-1.5 py-1" style={{ gridTemplateColumns: `repeat(${face.cols}, 2.5rem)` }}>
                    {Array.from({ length: face.maxStrands }, (_, index) => {
                        const cellStrand = style.getStrand(face, index);
                        const visible = !!cellStrand && cellStrand.isVisible();
                        const isSelected = state.selectedFace === face && state.selectedIndex === index;
                        const isHidden = state.isHidden(face, index);
                        const isLocked = state.isLocked(face, index);
                        const tone = isSelected
                            ? 'bg-foreground text-background border-foreground shadow-glow-strong'
                            : visible
                                ? 'bg-glass-strong text-foreground border-glass-strong hover:border-foreground/40'
                                : 'bg-surface text-muted border-glass hover:border-glass-strong hover:text-foreground';
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => (isSelected ? state.clearSelection() : state.select(face, index))}
                                className={`relative h-10 rounded-xl border text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer ${tone} ${isHidden ? 'opacity-50' : ''}`}
                            >
                                {index + 1}
                                {isHidden && <span className="absolute left-2 right-2 top-1/2 h-px bg-error" />}
                                {isLocked && <Icon name="lock" className="absolute top-0.5 right-0.5 text-[11px]" />}
                            </button>
                        );
                    })}
                </div>

                {selected && state.selectedFace ? (
                    <div className="grid grid-cols-2 gap-1.5">
                        <EditorButton
                            icon={hidden ? 'visibility' : 'visibility_off'}
                            active={hidden}
                            onClick={() => state.toggleHidden(state.selectedFace!, state.selectedIndex)}
                            className="h-8"
                        >
                            {tr(hidden ? 'show' : 'hide')}
                        </EditorButton>
                        <EditorButton
                            icon={locked ? 'lock_open' : 'lock'}
                            active={locked}
                            onClick={() => state.toggleLocked(state.selectedFace!, state.selectedIndex)}
                            className="h-8"
                        >
                            {tr(locked ? 'unlock' : 'lock')}
                        </EditorButton>
                    </div>
                ) : (
                    <p className="text-[11px] text-muted px-1">{tr('noSelection')}</p>
                )}

                {strand && strand.isVisible() && state.selectedFace && (
                    <div className="flex flex-col gap-0.5 rounded-2xl border border-glass bg-background/40 p-1.5 max-h-48 overflow-y-auto">
                        {Array.from({ length: strand.segments + 1 }, (_, row) => {
                            const isRowSelected = row === 0 ? state.selectedSegment < 0 : state.selectedSegment === row - 1;
                            const override = row > 0 ? strand.getOverride(row - 1) : undefined;
                            const overridden = !!override && !override.isIdentity();
                            const label = row === 0
                                ? formatText(tr('strand'), { face: state.selectedFace!.key, index: state.selectedIndex + 1 })
                                : formatText(tr('segment'), { index: row });
                            return (
                                <button
                                    key={row}
                                    type="button"
                                    onClick={() => state.selectSegment(row - 1)}
                                    className={`flex items-center justify-between h-7 shrink-0 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer ${row === 0 ? 'pl-3' : 'pl-6'} pr-3 ${isRowSelected ? 'bg-foreground text-background' : 'text-muted hover:bg-glass hover:text-foreground'}`}
                                >
                                    <span className="truncate">{label}</span>
                                    {overridden && <span className={`h-1.5 w-1.5 rounded-full ${isRowSelected ? 'bg-background' : 'bg-foreground'}`} />}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="mt-auto">
                    <SectionTitle>{tr('codeTitle')}</SectionTitle>
                    <div className="grid grid-cols-2 gap-1.5 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">{tr('codeStyle')}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">{tr('codeFull')}</span>
                        <EditorButton icon="download" onClick={() => onCodeAction('importStyle')} className="h-8">
                            {tr('import')}
                        </EditorButton>
                        <EditorButton icon="download" onClick={() => onCodeAction('importFull')} className="h-8">
                            {tr('import')}
                        </EditorButton>
                        <EditorButton icon="content_copy" onClick={() => onCodeAction('exportStyle')} className="h-8" primary>
                            {tr('copy')}
                        </EditorButton>
                        <EditorButton icon="content_copy" onClick={() => onCodeAction('exportFull')} className="h-8" primary>
                            {tr('copy')}
                        </EditorButton>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
