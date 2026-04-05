interface ViewerControlsProps {
    code: string;
    setCode: (val: string) => void;
    hairName: string;
    setHairName: (val: string) => void;
    onRender: () => void;
    onCopy: () => void;
    copied: boolean;
}

export default function ViewerControls({
    code,
    setCode,
    hairName,
    setHairName,
    onRender,
    onCopy,
    copied
}: ViewerControlsProps) {
    return (
        <div className="w-80 shrink-0 bg-surface border border-glass rounded-2xl p-6 flex flex-col gap-4">
            <a
                href="/hairsalon"
                className="flex items-center justify-center gap-2 bg-white text-black font-bold px-4 py-3 rounded-xl hover:bg-gray-200 transition-all"
            >
                <span className="material-symbols-outlined">arrow_back</span>
                Back to List
            </a>

            <div className="bg-surface-elevated border border-glass-strong rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Hair Code</h3>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste DMZ1/DMZ4/DMZ5, DMZF1/DMZF4/DMZF5 code..."
                    className="w-full h-24 bg-black/40 border border-glass rounded-xl text-white font-mono text-sm p-3 resize-none focus:outline-none focus:border-white/20"
                />
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={onRender}
                        className="flex-1 bg-white text-black font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
                    >
                        Render
                    </button>
                    <button
                        onClick={onCopy}
                        className="flex-1 bg-glass border border-glass-strong text-white font-bold px-4 py-2 rounded-lg hover:bg-glass-strong transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">
                            {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            <div className="bg-surface-elevated border border-glass-strong rounded-xl p-4">
                <h3 className="text-white font-bold mb-3">Hair Name</h3>
                <input
                    type="text"
                    value={hairName}
                    onChange={(e) => setHairName(e.target.value)}
                    placeholder="Enter hair name..."
                    className="w-full bg-black/40 border border-glass rounded-xl text-white px-4 py-2 focus:outline-none focus:border-white/20"
                />
            </div>
        </div>
    );
}
