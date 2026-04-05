import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
    onFormChange?: (formKey: string) => void;
}

export default function HairViewer3D({ 
    code, 
    hairName, 
    headY = 0.25,
    headScaleX = 1,
    headScaleY = 1,
    headScaleZ = 1,
    onFormChange 
}: HairViewer3DProps) {
    const [hairForms, setHairForms] = useState<Record<string, HairFormData>>({});
    const [availableForms, setAvailableForms] = useState<string[]>([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullSet, setIsFullSet] = useState(false);

    useEffect(() => {
        if (!code) {
            setError('No code provided');
            setIsLoading(false);
            return;
        }

        try {
            const decoded = decodeHairCode(code);
            
            if (!decoded || !decoded.data) {
                setError('Failed to decode hair code');
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
            console.error('Error parsing hair:', e);
            setError('Error parsing hair data');
            setIsLoading(false);
        }
    }, [code]);

    useEffect(() => {
        if (onFormChange && availableForms.length > 0) {
            const currentFormKey = availableForms[currentFormIndex] || availableForms[0];
            onFormChange(currentFormKey);
        }
    }, [currentFormIndex, availableForms, onFormChange]);

    const handlePrevForm = () => {
        setCurrentFormIndex((prev) => (prev - 1 + availableForms.length) % availableForms.length);
    };

    const handleNextForm = () => {
        setCurrentFormIndex((prev) => (prev + 1) % availableForms.length);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="h-10 w-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500">
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
            {hairName && (
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                    {hairName}
                </h3>
            )}

            <div className="flex-1 bg-background rounded-2xl overflow-hidden">
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
                        />
                    </Suspense>
                    <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        minDistance={2}
                        maxDistance={10}
                    />
                </Canvas>
            </div>

            {isFullSet && availableForms.length > 1 && (
                <div className="flex items-center justify-center gap-6 mt-6">
                    <button
                        onClick={handlePrevForm}
                        className="bg-glass border border-glass-strong rounded-full text-white hover:bg-glass-strong transition-all p-2"
                    >
                        <span className="material-symbols-outlined text-2xl">chevron_left</span>
                    </button>
                    <span className="text-white font-bold uppercase tracking-wider min-w-[100px] text-center text-lg">
                        {currentFormKey}
                    </span>
                    <button
                        onClick={handleNextForm}
                        className="bg-glass border border-glass-strong rounded-full text-white hover:bg-glass-strong transition-all p-2"
                    >
                        <span className="material-symbols-outlined text-2xl">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
}
