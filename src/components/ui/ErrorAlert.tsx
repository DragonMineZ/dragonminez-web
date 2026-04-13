import React, { useEffect } from 'react';

interface ErrorAlertProps {
    message: string;
    show: boolean;
    onClose: () => void;
    duration?: number;
}

export default function ErrorAlert({ message, show, onClose, duration = 4000 }: ErrorAlertProps) {
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-8 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
            <div className="flex items-center bg-[#8B0000] border border-white/10 rounded-full overflow-hidden shadow-2xl">
                <div className="flex items-center py-3.5 pl-8 pr-4 gap-3">
                    <span className="material-symbols-outlined text-white/90 text-[22px] [font-variation-settings:'wght'_600]">
                        report
                    </span>
                    <p className="text-white font-bold tracking-tight text-sm md:text-base whitespace-nowrap">
                        {message}
                    </p>
                </div>

                <button 
                  onClick={onClose}
                  className="w-12 h-12 flex items-center justify-center transition-all hover:bg-black/10 border-l border-white/5"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px] text-white/50 hover:text-white transition-colors">
                    close
                  </span>
                </button>
            </div>
        </div>
    );
}
