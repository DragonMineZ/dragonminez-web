import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
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
            <Button onClick={() => setIsModalOpen(true)}>
                <span className="material-symbols-outlined text-[20px]">
                    add
                </span>
                Publicar Cabello
            </Button>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} noPadding={true}>
                <CreateHairForm onSuccess={handleSuccess} />
            </Modal>
        </>
    );
}
