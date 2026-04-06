import Chip from "../../ui/Chip";
import type { Category } from "../../types/hair";
import { useLanguage } from "../../../i18n";

interface HairCategoriesProps {
    categories?: Category[];
    className?: string;
}

export default function HairCategories({ categories, className = "" }: HairCategoriesProps) {
    const { t } = useLanguage();
    const hasCategories = (categories?.length ?? 0) > 0;

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {hasCategories ? (
                categories?.map((cat) => (
                    <Chip key={cat.id_category} variant="glass">
                        {cat.description}
                    </Chip>
                ))
            ) : (
                <Chip variant="glass" className="opacity-50">
                    {t('hairSalon.categoryNormal')}
                </Chip>
            )}
        </div>
    );
}
