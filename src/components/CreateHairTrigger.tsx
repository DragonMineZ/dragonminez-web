import React, { useState } from 'react';
import Modal from './Modal';
import CreateHairForm from './CreateHairForm';

export default function CreateHairTrigger() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="group relative inline-flex items-center gap-2 px-6 py-3 font-bold text-white transition-all bg-orange-600 rounded-xl hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] active:scale-95"
            >
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90">
                    add
                </span>
                + Publicar
            </button>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <CreateHairForm onSuccess={() => window.location.reload()} />
            </Modal>
        </>
    );
}
