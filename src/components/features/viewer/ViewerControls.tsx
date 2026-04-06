import Field from '../../ui/Field';
import Button from '../../ui/Button';

interface ViewerControlsProps {
    code: string;
    setCode: (val: string) => void;
    hairName: string;
    setHairName: (val: string) => void;
    onRender: () => void;
    onCopy: () => void;
    copied: boolean;
    customColor: string;
    setCustomColor: (val: string) => void;
    onResetColor: () => void;
}

export default function ViewerControls({
    code,
    setCode,
    hairName,
    setHairName,
    onRender,
    onCopy,
    copied,
    customColor,
    setCustomColor,
    onResetColor
}: ViewerControlsProps) {
    return (
        <div className="w-full lg:w-80 shrink-0 bg-surface border border-glass rounded-3xl p-6 flex flex-col gap-6 shadow-glass">
            <Button
                variant="secondary"
                className="w-full justify-start gap-3"
                onClick={() => window.location.href = '/hairsalon'}
            >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to List
            </Button>

            <div className="space-y-4">
                <div className="bg-surface-elevated/50 border border-glass rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Hair Code</h3>
                        <span className="text-[10px] text-muted font-bold px-2 py-0.5 bg-glass rounded-full">RAW DATA</span>
                    </div>
                    <Field
                        as="textarea"
                        value={code}
                        onChange={(e: any) => setCode(e.target.value)}
                        placeholder="Paste DMZ code here..."
                        maxLength={10000}
                        className="font-mono text-xs bg-background/50"
                        rows={6}
                    />
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onRender}
                            className="flex-1 bg-foreground text-background font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all text-sm shadow-sm active:scale-[0.98]"
                        >
                            Render
                        </button>
                        <button
                            onClick={onCopy}
                            className="flex-1 bg-glass border border-glass-strong text-foreground font-bold px-4 py-2.5 rounded-xl hover:bg-glass-strong transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-lg">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                            {copied ? 'Done' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="bg-surface-elevated/50 border border-glass rounded-2xl p-4 space-y-4">
                    <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Appearance</h3>
                    <div className="space-y-3">
                        <label className="text-xs text-muted font-medium ml-1">Custom Hair Color</label>
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-background border border-glass rounded-2xl overflow-hidden flex-shrink-0 relative focus-within:ring-2 ring-foreground/20 transition-all shadow-inner">
                                <input
                                    type="color"
                                    value={customColor || '#000000'}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer opacity-0"
                                    title="Choose color"
                                />
                                <div
                                    className="w-full h-full pointer-events-none"
                                    style={{ backgroundColor: customColor || 'transparent' }}
                                >
                                    {!customColor && (
                                        <div className="w-full h-full flex items-center justify-center opacity-20">
                                            <div className="w-6 h-0.5 bg-foreground rotate-45 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onResetColor}
                                disabled={!customColor}
                                className="flex-1 bg-glass border border-glass-strong text-foreground text-xs font-bold py-3 rounded-xl hover:bg-glass-strong transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Reset Color
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs text-muted font-medium">Identification</label>
                            <span className="material-symbols-outlined text-[14px] text-muted-foreground/30">lock</span>
                        </div>
                        <Field
                            type="text"
                            value={hairName || 'Unnamed Design'}
                            readOnly
                            placeholder="Unnamed..."
                            className="bg-background/30 italic cursor-default"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
