import React from 'react';
import Modal from './Modal';
import titleImage from '../../assets/dmz-title.png';
import { useLanguage } from '../../i18n';

interface InfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    buttonLabel?: string;
}

export default function InfoDialog({
    isOpen,
    onClose,
    title,
    description,
    buttonLabel
}: InfoDialogProps) {
    const { t } = useLanguage();

    const displayTitle = title || t('common.error');
    const displayDescription = description || "";
    const displayButtonLabel = buttonLabel || t('common.back');

    return (
        <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
            <div className="flex flex-col items-center text-center py-4">
                <img
                    src={titleImage.src}
                    alt="DragonMine 2 Logo"
                    className="w-[200px] md:w-[260px] h-auto mb-8 drop-shadow-glow-orange animate-pulse-subtle"
                />

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                    {displayTitle}
                </h2>

                <p className="text-white/60 text-base md:text-lg mb-8 max-w-[90%] font-medium leading-relaxed">
                    {displayDescription}
                </p>

                <div className="flex justify-center w-full px-4 sm:px-0">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-[160px] px-8 py-3.5 rounded-full bg-white text-surface font-bold hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-glass"
                    >
                        {displayButtonLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
