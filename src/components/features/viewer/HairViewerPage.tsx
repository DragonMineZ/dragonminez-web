import { useState, useCallback } from 'react';
import HairViewer3D from './HairViewer3D';
import ViewerControls from './ViewerControls';
import ViewerDebug from './ViewerDebug';
import { useClipboard } from '../../../hooks/useClipboard';

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

    const { copied, copy } = useClipboard();

    const handleRender = useCallback(() => {
        setHeadY(0.25);
        setHeadScaleX(1);
        setHeadScaleY(1);
        setHeadScaleZ(1);
    }, []);

    const handleCopy = useCallback(() => {
        if (code) {
            copy(code);
        }
    }, [code, copy]);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex-1 flex gap-6 p-6">
                <ViewerControls
                    code={code}
                    setCode={setCode}
                    hairName={hairName}
                    setHairName={setHairName}
                    onRender={handleRender}
                    onCopy={handleCopy}
                    copied={copied}
                />

                {/* 3D Viewer - Center */}
                <div className="flex-1 min-w-0">
                    <div className="h-full bg-background rounded-2xl overflow-hidden">
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

                <ViewerDebug
                    headY={headY} setHeadY={setHeadY}
                    headScaleX={headScaleX} setHeadScaleX={setHeadScaleX}
                    headScaleY={headScaleY} setHeadScaleY={setHeadScaleY}
                    headScaleZ={headScaleZ} setHeadScaleZ={setHeadScaleZ}
                    currentForm={currentForm}
                />
            </div>
        </div>
    );
}
