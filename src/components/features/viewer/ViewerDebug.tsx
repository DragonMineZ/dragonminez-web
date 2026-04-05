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
        <div className="w-full lg:w-72 shrink-0 bg-surface border border-glass rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">Debug</h3>

            <div className="space-y-4">
                <div>
                    <label className="flex justify-between text-muted text-sm mb-1">
                        <span>Y Offset</span>
                        <span className="text-white font-mono">{headY.toFixed(3)}</span>
                    </label>
                    <input
                        type="range" min="-0.5" max="0.5" step="0.001"
                        value={headY} onChange={(e) => setHeadY(parseFloat(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>

                <div>
                    <label className="flex justify-between text-muted text-sm mb-1">
                        <span>Width</span>
                        <span className="text-white font-mono">{headScaleX.toFixed(3)}</span>
                    </label>
                    <input
                        type="range" min="0.5" max="1.5" step="0.001"
                        value={headScaleX} onChange={(e) => setHeadScaleX(parseFloat(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>

                <div>
                    <label className="flex justify-between text-muted text-sm mb-1">
                        <span>Height</span>
                        <span className="text-white font-mono">{headScaleY.toFixed(3)}</span>
                    </label>
                    <input
                        type="range" min="0.5" max="1.5" step="0.001"
                        value={headScaleY} onChange={(e) => setHeadScaleY(parseFloat(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>

                <div>
                    <label className="flex justify-between text-muted text-sm mb-1">
                        <span>Depth</span>
                        <span className="text-white font-mono">{headScaleZ.toFixed(3)}</span>
                    </label>
                    <input
                        type="range" min="0.5" max="1.5" step="0.001"
                        value={headScaleZ} onChange={(e) => setHeadScaleZ(parseFloat(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-glass-strong">
                <p className="text-gray-500 text-xs text-center">
                    Form: <span className="text-white font-bold uppercase">{currentForm}</span>
                </p>
            </div>
        </div>
    );
}
