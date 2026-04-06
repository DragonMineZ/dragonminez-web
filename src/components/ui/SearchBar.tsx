import { useState } from "react";
import { useLanguage } from "../../i18n";

interface SearchBarProps {
    onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    const handleClear = () => {
        setQuery("");
        onSearch("");
    };

    return (
        <div className="w-full">
            <div className="group/search relative bg-surface border border-glass rounded-full overflow-hidden transition-all duration-300 focus-within:border-white/60 hover:border-glass-strong shadow-lg">
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    placeholder={t('hairSalon.searchPlaceholder')}
                    className="w-full h-14 pl-8 pr-16 bg-transparent text-foreground placeholder:text-muted/50 font-medium text-lg outline-none"
                />
                <div className="absolute right-2 top-2 bottom-2 w-12 flex items-center justify-center transition-all duration-300">
                    {query ? (
                        <button
                            onClick={handleClear}
                            className="group/clear w-full h-full flex items-center justify-center bg-surface border border-glass rounded-full text-muted hover:bg-foreground hover:text-background transition-all duration-300"
                        >
                            <span className="material-symbols-outlined text-[24px] group-hover/clear:[font-variation-settings:'FILL'_1]">
                                close
                            </span>
                        </button>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <span className="material-symbols-outlined text-[24px]">
                                search
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
