import { useState, useCallback, useEffect } from 'react';
import { useClipboard } from './useClipboard';

export function useHairViewer(initialCode: string, initialName: string = '') {
    const [code, setCode] = useState(initialCode);
    const [hairName, setHairName] = useState(initialName);
    const [headY, setHeadY] = useState(0.25);
    const [headScaleX, setHeadScaleX] = useState(1);
    const [headScaleY, setHeadScaleY] = useState(1);
    const [headScaleZ, setHeadScaleZ] = useState(1);
    const [currentForm, setCurrentForm] = useState('Base');
    const [customColor, setCustomColor] = useState<string>('');

    const { copied, copy } = useClipboard();

    // Sync state with initialCode/initialName prop (Astro hydration support)
    useEffect(() => {
        if (initialCode) setCode(initialCode);
        if (initialName) setHairName(initialName);
    }, [initialCode, initialName]);

    const handleRenderReset = useCallback(() => {
        // Reset debug offsets/scales but keep code and color
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

    const handleResetColor = useCallback(() => {
        setCustomColor('');
    }, []);

    return {
        // State
        code,
        setCode,
        hairName,
        setHairName,
        headY,
        setHeadY,
        headScaleX,
        setHeadScaleX,
        headScaleY,
        setHeadScaleY,
        headScaleZ,
        setHeadScaleZ,
        currentForm,
        setCurrentForm,
        customColor,
        setCustomColor,
        copied,

        // Actions
        handleRenderReset,
        handleCopy,
        handleResetColor
    };
}
