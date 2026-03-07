import React, { useState } from 'react';
import Modal from './Modal';
import CreateHairForm from './CreateHairForm';

export default function CreateHairTrigger({ onSuccess }: { onSuccess?: () => void }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSuccess = () => {
        setIsModalOpen(false);
        if (onSuccess) {
            onSuccess();
        } else {
            window.location.reload();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 font-bold text-black transition-all bg-white rounded-full hover:bg-gray-200 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
                <span className="material-symbols-outlined text-[20px]">
                    add
                </span>
                Publicar Cabello
            </button>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <CreateHairForm onSuccess={handleSuccess} />
            </Modal>
        </>
    );
}
