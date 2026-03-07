import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    showCloseButton?: boolean;
}

export default function Modal({ isOpen, onClose, children, showCloseButton = true }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-xl animate-in fade-in zoom-in duration-200">
                <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0b] shadow-2xl shadow-black/50 ring-1 ring-white/5">
                    {/* Header/Close Button (Overlay) */}
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50 transition-all hover:bg-white/10 hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}

                    <div className="p-8 md:p-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
