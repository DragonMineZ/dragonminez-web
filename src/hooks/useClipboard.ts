import { useState, useCallback } from 'react';

export function useClipboard(timeout = 2000) {
    const [copied, setCopied] = useState(false);

    const copy = useCallback((text: string, onSuccess?: () => void) => {
        if (!navigator?.clipboard) {
            console.warn('Clipboard API not supported');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            if (onSuccess) onSuccess();
            setTimeout(() => setCopied(false), timeout);
        });
    }, [timeout]);

    return { copied, copy };
}
