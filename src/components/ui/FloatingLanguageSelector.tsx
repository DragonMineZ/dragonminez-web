import React from 'react';
import { useLanguage } from '../../i18n';
import Tooltip from './Tooltip';

interface FloatingLanguageSelectorProps {
    isOpen: boolean;
}

export function FloatingLanguageSelector({ isOpen }: FloatingLanguageSelectorProps) {
    const { language, setLanguage, t } = useLanguage();

    const getFlagClass = (lang: string) => {
        const isActive = language === lang;
        return `w-10 h-10 rounded-full overflow-hidden hover:scale-105 transition-all cursor-pointer border-2 shadow-sm shrink-0 hover:ring-4 hover:ring-foreground/10 ${
            isActive 
            ? 'border-foreground ring-4 ring-foreground/20 scale-110' 
            : 'border-transparent hover:border-foreground/40'
        }`;
    };

    return (
        <div
            className={`absolute right-[56px] flex items-center justify-between bg-foreground border border-glass rounded-full shadow-dropdown transition-all duration-300 origin-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto h-[56px] w-[160px] px-2 mr-3' : 'opacity-0 scale-75 pointer-events-none translate-x-4 h-[56px] w-[56px] px-1 mr-3'
                }`}
        >
            <Tooltip content={t('languages.pt')}>
                <button 
                    className={getFlagClass('pt')} 
                    onClick={() => setLanguage('pt')}
                    aria-label="Português"
                >
                    <img src="https://flagcdn.com/w40/br.png" alt="Português" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
            <Tooltip content={t('languages.es')}>
                <button 
                    className={getFlagClass('es')} 
                    onClick={() => setLanguage('es')}
                    aria-label="Español"
                >
                    <img src="https://flagcdn.com/w40/es.png" alt="Español" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
            <Tooltip content={t('languages.en')}>
                <button 
                    className={getFlagClass('en')} 
                    onClick={() => setLanguage('en')}
                    aria-label="English"
                >
                    <img src="https://flagcdn.com/w40/us.png" alt="English" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
        </div>
    );
}

export default FloatingLanguageSelector;
