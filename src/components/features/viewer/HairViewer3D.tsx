import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useLanguage } from '../../../i18n';
import { decodeHairCode } from '../../../lib/hair_decoder';
import { parseNbt, extractHairForms } from '../../../lib/nbt_reader';
import type { HairFormData } from '../../../lib/nbt_reader';
import HairScene from './HairScene';

export interface HairViewer3DProps {
    code: string;
    hairName?: string;
    headY?: number;
    headScaleX?: number;
    headScaleY?: number;
    headScaleZ?: number;
    customColor?: string;
    onFormChange?: (formKey: string) => void;
}

export default function HairViewer3D({
    code,
    hairName,
    headY = 0.25,
    headScaleX = 1,
    headScaleY = 1,
    headScaleZ = 1,
    customColor,
    onFormChange
}: HairViewer3DProps) {
    const { t } = useLanguage();

    // ── Estado
    const [hairForms, setHairForms] = useState<Record<string, HairFormData>>({});
    const [availableForms, setAvailableForms] = useState<string[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullSet, setIsFullSet] = useState(false);

    // ── Efectos
    useEffect(() => {
        setError(null);
        if (!code) {
            setError(t('viewer.noCode'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const decoded = decodeHairCode(code);

            if (!decoded || !decoded.data) {
                setError(t('viewer.decodeError'));
                setIsLoading(false);
                return;
            }

            const hairData = parseNbt(decoded.data);
            const { forms, availableForms: formsList } = extractHairForms(hairData, decoded.isFullSet);

            setHairForms(forms);
            setAvailableForms(formsList);
            setIsFullSet(decoded.isFullSet);
            setCurrentFormIndex(0);
            setIsLoading(false);
        } catch (e) {
            setError(t('viewer.parseError'));
            setIsLoading(false);
        }
    }, [code, t]);

    useEffect(() => {
        if (onFormChange && availableForms.length > 0) {
            const currentFormKey = availableForms[currentFormIndex] || availableForms[0];
            onFormChange(currentFormKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFormIndex, availableForms]);

    // ── Handlers
    const handlePrevForm = () => {
        setCurrentFormIndex((prev) => (prev - 1 + availableForms.length) % availableForms.length);
    };

    const handleNextForm = () => {
        setCurrentFormIndex((prev) => (prev + 1) % availableForms.length);
    };

    // ── Render
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="h-10 w-10 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-error font-medium animate-shake">
                {error}
            </div>
        );
    }

    const currentFormKey = availableForms[currentFormIndex] || availableForms[0];
    const currentHairData = hairForms[currentFormKey] || {};
    const isSSJ = currentFormKey.toLowerCase().includes('ssj');
    const isSSJ3 = currentFormKey.toLowerCase().includes('ssj3') || currentFormKey.toLowerCase() === 't';

    const cameraPosition: [number, number, number] = isSSJ3 ? [0, -0.5, 5] : [0, 0.5, 4];
    const cameraFov = isSSJ3 ? 60 : 75;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-[50vh] lg:min-h-0 bg-surface border border-glass rounded-2xl overflow-hidden relative">
                <Canvas
                    camera={{ position: cameraPosition, fov: cameraFov }}
                    gl={{ antialias: true }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <Suspense fallback={null}>
                        <HairScene
                            hairData={currentHairData}
                            isSSJ={isSSJ}
                            isSSJ3={isSSJ3}
                            headY={headY}
                            headScaleX={headScaleX}
                            headScaleY={headScaleY}
                            headScaleZ={headScaleZ}
                            customColor={customColor}
                        />
                    </Suspense>
                    <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        minDistance={2}
                        maxDistance={10}
                    />
                </Canvas>

                {hairName && (
                    <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
                        <div className="pointer-events-auto bg-surface/80 backdrop-blur-xl border border-glass shadow-dropdown rounded-2xl text-foreground font-bold text-center text-base px-6 py-2.5 max-w-[80%] truncate">
                            {hairName}
                        </div>
                    </div>
                )}

                {isFullSet && availableForms.length > 1 && (
                    <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 md:gap-6 pointer-events-none px-4">
                        <button
                            onClick={handlePrevForm}
                            className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-surface/80 backdrop-blur-xl border border-glass rounded-2xl text-foreground hover:bg-foreground hover:text-background transition-all shadow-dropdown group/btn active:scale-95"
                            title={t('viewer.prevForm')}
                        >
                            <span className="material-symbols-outlined text-2xl group-hover/btn:-translate-x-0.5 transition-transform">chevron_left</span>
                        </button>
                        <div className="pointer-events-auto flex flex-col items-center justify-center h-12 bg-surface/80 backdrop-blur-xl border border-glass rounded-2xl text-foreground min-w-[140px] px-6 shadow-dropdown">
                            <span className="text-[10px] text-muted font-black uppercase tracking-[0.2em] leading-none mb-1">{t('viewer.currentForm')}</span>
                            <span className="font-black uppercase tracking-tight text-sm leading-none">{currentFormKey}</span>
                        </div>
                        <button
                            onClick={handleNextForm}
                            className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-surface/80 backdrop-blur-xl border border-glass rounded-2xl text-foreground hover:bg-foreground hover:text-background transition-all shadow-dropdown group/btn active:scale-95"
                            title={t('viewer.nextForm')}
                        >
                            <span className="material-symbols-outlined text-2xl group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

