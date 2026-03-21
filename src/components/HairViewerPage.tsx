import { useState, useCallback } from 'react';
import HairViewer3D from './HairViewer3D';

interface HairViewerPageProps {
    code: string;
}

export default function HairViewerPage({ code: initialCode }: HairViewerPageProps) {
    const [code, setCode] = useState(initialCode);
    const [hairName, setHairName] = useState('');
    const [headY, setHeadY] = useState(0.25);
    const [headScaleX, setHeadScaleX] = useState(1);
    const [headScaleY, setHeadScaleY] = useState(1);
    const [headScaleZ, setHeadScaleZ] = useState(1);
    const [currentForm, setCurrentForm] = useState('Base');
    const [copied, setCopied] = useState(false);

    const handleRender = useCallback(() => {
        setHeadY(0.25);
        setHeadScaleX(1);
        setHeadScaleY(1);
        setHeadScaleZ(1);
    }, []);

    const handleCopy = useCallback(() => {
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [code]);

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCode(e.target.value);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex-1 flex gap-6 p-6">
                {/* Controls Panel - Left */}
                <div className="w-80 shrink-0 bg-[#121214] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <a
                        href="/hairsalon"
                        className="flex items-center justify-center gap-2 bg-white text-black font-bold px-4 py-3 rounded-xl hover:bg-gray-200 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to List
                    </a>

                    <div className="bg-[#18181b] border border-white/10 rounded-xl p-4">
                        <h3 className="text-white font-bold mb-3">Hair Code</h3>
                        <textarea
                            value={code}
                            onChange={handleCodeChange}
                            placeholder="Paste DMZ1/DMZ4/DMZ5, DMZF1/DMZF4/DMZF5 code..."
                            className="w-full h-24 bg-black/40 border border-white/5 rounded-xl text-white font-mono text-sm p-3 resize-none focus:outline-none focus:border-white/20"
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleRender}
                                className="flex-1 bg-white text-black font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
                            >
                                Render
                            </button>
                            <button
                                onClick={handleCopy}
                                className="flex-1 bg-white/5 border border-white/10 text-white font-bold px-4 py-2 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#18181b] border border-white/10 rounded-xl p-4">
                        <h3 className="text-white font-bold mb-3">Hair Name</h3>
                        <input
                            type="text"
                            value={hairName}
                            onChange={(e) => setHairName(e.target.value)}
                            placeholder="Enter hair name..."
                            className="w-full bg-black/40 border border-white/5 rounded-xl text-white px-4 py-2 focus:outline-none focus:border-white/20"
                        />
                    </div>
                </div>

                {/* 3D Viewer - Center */}
                <div className="flex-1 min-w-0">
                    <div className="h-full bg-[#0a0a0b] rounded-2xl overflow-hidden">
                        <HairViewer3D
                            code={code}
                            hairName={hairName}
                            headY={headY}
                            headScaleX={headScaleX}
                            headScaleY={headScaleY}
                            headScaleZ={headScaleZ}
                            onFormChange={setCurrentForm}
                        />
                    </div>
                </div>

                {/* Debug Panel - Right */}
                <div className="w-72 shrink-0 bg-black/70 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-white font-bold text-lg">Debug</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="flex justify-between text-gray-400 text-sm mb-1">
                                <span>Y Offset</span>
                                <span className="text-white font-mono">{headY.toFixed(3)}</span>
                            </label>
                            <input
                                type="range"
                                min="-0.5"
                                max="0.5"
                                step="0.001"
                                value={headY}
                                onChange={(e) => setHeadY(parseFloat(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-gray-400 text-sm mb-1">
                                <span>Width</span>
                                <span className="text-white font-mono">{headScaleX.toFixed(3)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.001"
                                value={headScaleX}
                                onChange={(e) => setHeadScaleX(parseFloat(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-gray-400 text-sm mb-1">
                                <span>Height</span>
                                <span className="text-white font-mono">{headScaleY.toFixed(3)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.001"
                                value={headScaleY}
                                onChange={(e) => setHeadScaleY(parseFloat(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>

                        <div>
                            <label className="flex justify-between text-gray-400 text-sm mb-1">
                                <span>Depth</span>
                                <span className="text-white font-mono">{headScaleZ.toFixed(3)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.001"
                                value={headScaleZ}
                                onChange={(e) => setHeadScaleZ(parseFloat(e.target.value))}
                                className="w-full accent-white"
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/10">
                        <p className="text-gray-500 text-xs text-center">
                            Form: <span className="text-white font-bold uppercase">{currentForm}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
