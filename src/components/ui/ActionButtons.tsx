import Tooltip from "./Tooltip";

interface ActionButtonsProps {
    onEdit: () => void;
    onDelete: () => void;
}

export default function ActionButtons({ onEdit, onDelete }: ActionButtonsProps) {
    return (
        <div className="flex items-center gap-2">
            <Tooltip content="Editar diseño">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit();
                    }}
                    className="group/action flex items-center justify-center w-10 h-10 text-muted hover:bg-white hover:text-surface border border-glass hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                    aria-label="Editar"
                >
                    <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                        edit
                    </span>
                </button>
            </Tooltip>
            <Tooltip content="Eliminar diseño">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete();
                    }}
                    className="group/action flex items-center justify-center w-10 h-10 text-muted hover:bg-white hover:text-surface border border-glass hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                    aria-label="Eliminar"
                >
                    <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                        delete
                    </span>
                </button>
            </Tooltip>
        </div>
    );
}
