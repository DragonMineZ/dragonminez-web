interface ActionButtonsProps {
    onEdit: () => void;
    onDelete: () => void;
}

export default function ActionButtons({ onEdit, onDelete }: ActionButtonsProps) {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onEdit();
                }}
                className="group/action flex items-center justify-center w-10 h-10 text-gray-400 hover:bg-[#E2E2DF] hover:text-[#121214] border border-white/5 hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                title="Editar"
            >
                <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                    edit
                </span>
            </button>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onDelete();
                }}
                className="group/action flex items-center justify-center w-10 h-10 text-gray-400 hover:bg-[#E2E2DF] hover:text-[#121214] border border-white/5 hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                title="Eliminar"
            >
                <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                    delete
                </span>
            </button>
        </div>
    );
}
