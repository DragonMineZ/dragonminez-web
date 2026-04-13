import Tooltip from "./Tooltip";
import { useLanguage } from "../../i18n";

interface ActionButtonsProps {
    onEdit: () => void;
    onDelete: () => void;
}

export default function ActionButtons({ onEdit, onDelete }: ActionButtonsProps) {
    const { t } = useLanguage();
    return (
        <div className="flex items-center gap-2">
            <Tooltip content={t('hairSalon.editDesign')}>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit();
                    }}
                    className="group/action flex items-center justify-center w-10 h-10 text-muted hover:bg-foreground hover:text-background border border-glass hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                    aria-label={t('hairSalon.editDesign')}
                >
                    <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                        edit
                    </span>
                </button>
            </Tooltip>
            <Tooltip content={t('hairSalon.deleteDesign')}>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete();
                    }}
                    className="group/action flex items-center justify-center w-10 h-10 text-muted hover:bg-foreground hover:text-background border border-glass hover:border-transparent rounded-xl transition-all duration-300 shadow-sm"
                    aria-label={t('hairSalon.deleteDesign')}
                >
                    <span className="material-symbols-outlined text-[24px] group-hover/action:[font-variation-settings:'FILL'_1]">
                        delete
                    </span>
                </button>
            </Tooltip>
        </div>
    );
}
