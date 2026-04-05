import React from 'react';
import Tooltip from './Tooltip';

interface FloatingLanguageSelectorProps {
    isOpen: boolean;
}

export function FloatingLanguageSelector({ isOpen }: FloatingLanguageSelectorProps) {
    const flagClass = "w-10 h-10 rounded-full overflow-hidden hover:scale-105 transition-all cursor-pointer border border-transparent hover:border-gray-400 shadow-sm shrink-0 hover:ring-4 hover:ring-gray-400/50";

    return (
        <div
            className={`absolute right-[56px] flex items-center justify-between bg-white border border-glass rounded-full shadow-dropdown transition-all duration-300 origin-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto h-[56px] w-[160px] px-2 mr-3' : 'opacity-0 scale-75 pointer-events-none translate-x-4 h-[56px] w-[56px] px-1 mr-3'
                }`}
        >
            <Tooltip content="Português">
                <button className={flagClass}>
                    <img src="https://flagcdn.com/w40/br.png" alt="Português" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
            <Tooltip content="Español">
                <button className={flagClass}>
                    <img src="https://flagcdn.com/w40/es.png" alt="Español" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
            <Tooltip content="English">
                <button className={flagClass}>
                    <img src="https://flagcdn.com/w40/us.png" alt="English" className="w-full h-full object-cover" />
                </button>
            </Tooltip>
        </div>
    );
}

export default FloatingLanguageSelector;
