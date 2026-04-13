import HairViewer3D from './HairViewer3D';
import ViewerControls from './ViewerControls';
import ViewerDebug from './ViewerDebug';
import { useHairViewer } from '../../../hooks/useHairViewer';

interface HairViewerPageProps {
    code: string;
    name?: string;
}

export default function HairViewerPage({ code: initialCode, name: initialName = '' }: HairViewerPageProps) {
    const {
        code, setCode,
        hairName, setHairName,
        headY, setHeadY,
        headScaleX, setHeadScaleX,
        headScaleY, setHeadScaleY,
        headScaleZ, setHeadScaleZ,
        currentForm, setCurrentForm,
        customColor, setCustomColor,
        copied,
        handleRenderReset,
        handleCopy,
        handleResetColor
    } = useHairViewer(initialCode, initialName);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
                <ViewerControls
                    code={code}
                    setCode={setCode}
                    hairName={hairName}
                    setHairName={setHairName}
                    onRender={handleRenderReset}
                    onCopy={handleCopy}
                    copied={copied}
                    customColor={customColor}
                    setCustomColor={setCustomColor}
                    onResetColor={handleResetColor}
                />

                <div className="flex-1 min-w-0">
                    <div className="h-full bg-background rounded-3xl overflow-hidden border border-glass shadow-glass relative group/viewer">

                        <HairViewer3D
                            code={code}
                            hairName={hairName}
                            headY={headY}
                            headScaleX={headScaleX}
                            headScaleY={headScaleY}
                            headScaleZ={headScaleZ}
                            onFormChange={setCurrentForm}
                            customColor={customColor}
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
