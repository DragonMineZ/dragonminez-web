import React from 'react';
import FilterDropdown from './FilterDropdown';
import { useLanguage } from '../../i18n';

interface ItemsPerPageSelectorProps {
    currentValue: number;
    options: number[];
    onSelect: (value: number) => void;
}

export default function ItemsPerPageSelector({ currentValue, options, onSelect }: ItemsPerPageSelectorProps) {
    const { t } = useLanguage();

    const dropdownOptions = options.map(value => ({
        id: value,
        label: String(value)
    }));

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-muted whitespace-nowrap">
                {t('hairSalon.itemsPerPage')}:
            </span>
            <FilterDropdown
                label={String(currentValue)}
                options={dropdownOptions}
                selectedId={currentValue}
                onSelect={(id) => onSelect(Number(id))}
            />
        </div>
    );
}
