import React, { useEffect } from 'react';

interface SuccessAlertProps {
    message: string;
    show: boolean;
    onClose: () => void;
    duration?: number;
}

export default function SuccessAlert({ message, show, onClose, duration = 3000 }: SuccessAlertProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
            <div className="flex items-center bg-surface border border-glass rounded-full overflow-hidden shadow-alert backdrop-blur-md">
                <div className="flex items-center justify-center w-14 h-14 bg-surface-elevated/40 border-r border-glass-strong outline-none ml-0.5">
                    <span className="material-symbols-outlined text-foreground text-[28px] [font-variation-settings:'wght'_600]">
                        check
                    </span>
                </div>

                <div className="px-8 py-3 whitespace-nowrap">
                    <p className="text-foreground text-lg font-bold tracking-tight">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}
