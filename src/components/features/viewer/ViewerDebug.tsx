interface ViewerDebugProps {
    headY: number;
    setHeadY: (val: number) => void;
    headScaleX: number;
    setHeadScaleX: (val: number) => void;
    headScaleY: number;
    setHeadScaleY: (val: number) => void;
    headScaleZ: number;
    setHeadScaleZ: (val: number) => void;
    currentForm: string;
}

export default function ViewerDebug({
    headY, setHeadY,
    headScaleX, setHeadScaleX,
    headScaleY, setHeadScaleY,
    headScaleZ, setHeadScaleZ,
    currentForm
}: ViewerDebugProps) {
    return (
        <div className="w-full lg:w-72 shrink-0 bg-surface border border-glass rounded-3xl p-6 flex flex-col gap-6 shadow-glass">
            <div className="flex items-center justify-between">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Adjustment</h3>
                <span className="material-symbols-outlined text-muted text-lg">tune</span>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] text-muted font-bold uppercase tracking-widest ml-1">Position</h4>
                    <div className="bg-surface-elevated/50 border border-glass rounded-2xl p-4 space-y-4">
                        <div>
                            <label className="flex justify-between text-muted text-xs mb-2 ml-1">
                                <span>Vertical Offset</span>
                                <span className="text-foreground font-mono font-bold bg-glass px-1.5 py-0.5 rounded text-[10px]">{headY.toFixed(3)}</span>
                            </label>
                            <input
                                type="range" min="-0.5" max="0.5" step="0.001"
                                value={headY} onChange={(e) => setHeadY(parseFloat(e.target.value))}
                                className="w-full accent-foreground h-1.5 bg-glass rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] text-muted font-bold uppercase tracking-widest ml-1">Scaling</h4>
                    <div className="bg-surface-elevated/50 border border-glass rounded-2xl p-4 space-y-4">
                        <div>
                            <label className="flex justify-between text-muted text-xs mb-2 ml-1">
                                <span>Width</span>
                                <span className="text-foreground font-mono font-bold bg-glass px-1.5 py-0.5 rounded text-[10px]">{headScaleX.toFixed(3)}</span>
                            </label>
                            <input
                                type="range" min="0.5" max="1.5" step="0.001"
                                value={headScaleX} onChange={(e) => setHeadScaleX(parseFloat(e.target.value))}
                                className="w-full accent-foreground h-1.5 bg-glass rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-muted text-xs mb-2 ml-1">
                                <span>Height</span>
                                <span className="text-foreground font-mono font-bold bg-glass px-1.5 py-0.5 rounded text-[10px]">{headScaleY.toFixed(3)}</span>
                            </label>
                            <input
                                type="range" min="0.5" max="1.5" step="0.001"
                                value={headScaleY} onChange={(e) => setHeadScaleY(parseFloat(e.target.value))}
                                className="w-full accent-foreground h-1.5 bg-glass rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-muted text-xs mb-2 ml-1">
                                <span>Depth</span>
                                <span className="text-foreground font-mono font-bold bg-glass px-1.5 py-0.5 rounded text-[10px]">{headScaleZ.toFixed(3)}</span>
                            </label>
                            <input
                                type="range" min="0.5" max="1.5" step="0.001"
                                value={headScaleZ} onChange={(e) => setHeadScaleZ(parseFloat(e.target.value))}
                                className="w-full accent-foreground h-1.5 bg-glass rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-glass-strong">
                <div className="bg-glass rounded-xl p-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted font-bold uppercase">Form</span>
                    <span className="text-foreground text-xs font-black uppercase tracking-tight">{currentForm}</span>
                </div>
            </div>
        </div>
    );
}
