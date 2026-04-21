import React, { useState, useEffect } from 'react';
import FloatingMenuButton from './FloatingMenuButton';
import FloatingLanguageSelector from './FloatingLanguageSelector';
import Tooltip from './Tooltip';
import SuccessAlert from './SuccessAlert';
import { useLanguage } from '../../i18n';

export function FloatingMenu() {
    const { language, t, isLoaded: isI18nLoaded } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme ? savedTheme === 'dark' : true;
        setIsDark(theme);
        if (theme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        setShowAlert(true);
    }, [language]);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
        if (newDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center justify-end pointer-events-none w-fit h-fit">
            <div
                className={`flex flex-col gap-3 mb-4 transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
                    }`}
            >
                <Tooltip content={isI18nLoaded ? (isDark ? t('floatingMenu.themeLight') : t('floatingMenu.themeDark')) : ''} position="top">
                    <FloatingMenuButton
                        onClick={toggleTheme}
                        icon={isDark ? 'light_mode' : 'dark_mode'}
                        variant="option"
                    />
                </Tooltip>

                <div className="relative flex items-center justify-end">
                    <FloatingLanguageSelector isOpen={isLangOpen} />
                    <Tooltip content={isI18nLoaded ? t('floatingMenu.language') : ''} position="top">
                        <FloatingMenuButton
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            icon="translate"
                            variant="option"
                        />
                    </Tooltip>
                </div>
            </div>

            <Tooltip content={isI18nLoaded ? (isOpen ? t('floatingMenu.close') : t('floatingMenu.options')) : ''} position="top">
                <FloatingMenuButton
                    onClick={handleToggle}
                    iconClassName={`${isOpen ? 'rotate-90' : 'rotate-0'}`}
                    icon="settings"
                    variant={isOpen ? 'mainActive' : 'main'}
                />
            </Tooltip>

            <SuccessAlert
                show={showAlert}
                message={isI18nLoaded ? t('languages.languageSuccess') : ''}
                duration={2000}
                onClose={() => setShowAlert(false)}
            />
        </div>
    );
}

export default FloatingMenu;
