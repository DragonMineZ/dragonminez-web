import React, { useState, useRef, useEffect } from 'react';
import FloatingMenuButton from './FloatingMenuButton';
import FloatingLanguageSelector from './FloatingLanguageSelector';
import Tooltip from './Tooltip';
import SuccessAlert from './SuccessAlert';
import { useLanguage } from '../../i18n';

export function FloatingMenu() {
// ── Estado
    const { language, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [showAlert, setShowAlert] = useState(false);
    const isFirstRender = useRef(true);

    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const menuRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsClient(true);
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme ? savedTheme === 'dark' : true;
        setIsDark(theme);
        if (theme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const savedPos = localStorage.getItem('floating-menu-pos');
        if (savedPos) {
            try {
                const parsed = JSON.parse(savedPos);
                const safeX = Math.min(Math.max(10, parsed.x), window.innerWidth - 70);
                const safeY = Math.min(Math.max(10, parsed.y), window.innerHeight - 70);
                setPosition({ x: safeX, y: safeY });
            } catch (e) {
                setPosition(null);
            }
        }

        const handleResize = () => {
            setPosition(prev => {
                if (!prev) return prev;
                return {
                    x: Math.min(prev.x, window.innerWidth - 70),
                    y: Math.min(prev.y, window.innerHeight - 70)
                };
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
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

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        if (e.button !== 0) return;

        setIsDragging(false);

        let currentX = position?.x;
        let currentY = position?.y;

        if (currentX === undefined || currentY === undefined) {
            const wrapper = menuRef.current?.parentElement;
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                currentX = rect.left;
                currentY = rect.top;
                setPosition({ x: currentX, y: currentY });
            } else {
                return;
            }
        }

        dragOffset.current = {
            x: e.clientX - currentX,
            y: e.clientY - currentY,
        };
        if (menuRef.current) {
            menuRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!menuRef.current?.hasPointerCapture(e.pointerId)) return;

        const currentX = position?.x ?? 0;
        const currentY = position?.y ?? 0;

        const moveX = Math.abs(e.clientX - (currentX + dragOffset.current.x));
        const moveY = Math.abs(e.clientY - (currentY + dragOffset.current.y));
        if (moveX > 3 || moveY > 3) {
            setIsDragging(true);
            if (isOpen) {
                setIsOpen(false);
                setIsLangOpen(false);
            }
        }

        if (isDragging) {
            let newX = e.clientX - dragOffset.current.x;
            let newY = e.clientY - dragOffset.current.y;

            const maxX = window.innerWidth - 60;
            const maxY = window.innerHeight - 60;
            newX = Math.max(10, Math.min(newX, maxX));
            newY = Math.max(10, Math.min(newY, maxY));

            setPosition({ x: newX, y: newY });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (menuRef.current) {
            menuRef.current.releasePointerCapture(e.pointerId);
        }
        if (!isDragging) {
            if (isOpen) {
                setIsOpen(false);
                setIsLangOpen(false);
            } else {
                setIsOpen(true);
            }
        } else if (position) {
            localStorage.setItem('floating-menu-pos', JSON.stringify(position));
        }

        setTimeout(() => setIsDragging(false), 50);
    };

    if (!isClient) return null;

    return (
        <div
            className={`fixed z-[9999] flex flex-col items-center justify-end pointer-events-none w-fit h-fit ${!position ? 'bottom-6 right-6' : ''}`}
            style={position ? { left: position.x, top: position.y, touchAction: 'none' } : { touchAction: 'none' }}
        >
            <div
                className={`flex flex-col gap-3 mb-4 transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
                    }`}
            >
                <Tooltip content={isDark ? t('floatingMenu.themeLight') : t('floatingMenu.themeDark')} position="top">
                    <FloatingMenuButton
                        onClick={toggleTheme}
                        icon={isDark ? 'light_mode' : 'dark_mode'}
                        variant="option"
                    />
                </Tooltip>

                <div className="relative flex items-center justify-end">
                    <FloatingLanguageSelector isOpen={isLangOpen} />
                    <Tooltip content={t('floatingMenu.language')} position="top">
                        <FloatingMenuButton
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            icon="translate"
                            variant="option"
                        />
                    </Tooltip>
                </div>
            </div>

            <div className="touch-none pointer-events-auto" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                <Tooltip content={isOpen ? t('floatingMenu.close') : t('floatingMenu.options')} position="top">
                    <FloatingMenuButton
                        ref={menuRef}
                        iconClassName={`${isOpen ? 'rotate-90' : 'rotate-0'}`}
                        icon="settings"
                        variant={isOpen ? 'mainActive' : 'main'}
                        style={{ pointerEvents: 'none' }}
                    />
                </Tooltip>
            </div>

            <SuccessAlert
                show={showAlert}
                message={t('languages.languageSuccess')}
                duration={2000}
                onClose={() => setShowAlert(false)}
            />
        </div>
    );
}

export default FloatingMenu;
