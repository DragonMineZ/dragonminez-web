import React, { useState, useRef, useEffect } from 'react';
import FloatingMenuButton from './FloatingMenuButton';
import FloatingLanguageSelector from './FloatingLanguageSelector';
import Tooltip from './Tooltip';

export function FloatingMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);

    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const menuRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsClient(true);
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme ? savedTheme === 'dark' : true; // Default to true (dark) if no saved theme
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
                // Ensure it's not off-screen if window was resized while closed
                const safeX = Math.min(Math.max(10, parsed.x), window.innerWidth - 70);
                const safeY = Math.min(Math.max(10, parsed.y), window.innerHeight - 70);
                setPosition({ x: safeX, y: safeY });
            } catch (e) {
                setPosition(null);
            }
        }

        const handleResize = () => {
            // Re-adjust position on window resize to avoid losing the button
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
        // Start Drag Tracking
        e.preventDefault();
        if (e.button !== 0) return; // Left/Main touch only

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

        // Drag threshold
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

            // Boundaries
            const maxX = window.innerWidth - 60; // 56px + some margin
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
            // Treat as click
            if (isOpen) {
                setIsOpen(false);
                setIsLangOpen(false);
            } else {
                setIsOpen(true);
            }
        } else if (position) {
            // Store new position
            localStorage.setItem('floating-menu-pos', JSON.stringify(position));
        }

        // Small delay to prevent accidental click bindings
        setTimeout(() => setIsDragging(false), 50);
    };

    if (!isClient) return null; // Avoid Hydration mismatch

    return (
        <div
            className={`fixed z-[9999] flex flex-col items-center justify-end ${!position ? 'bottom-6 right-6' : ''}`}
            style={position ? { left: position.x, top: position.y, touchAction: 'none' } : { touchAction: 'none' }}
        >
            {/* Options container (appears above main button) */}
            <div
                className={`flex flex-col gap-3 mb-4 transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
                    }`}
            >
                {/* Theme Toggle Button */}
                <Tooltip content={isDark ? "Modo Claro" : "Modo Oscuro"} position="top">
                    <FloatingMenuButton
                        onClick={toggleTheme}
                        icon={isDark ? 'light_mode' : 'dark_mode'}
                        variant="option"
                    />
                </Tooltip>

                {/* Language Button with expanding options list */}
                <div className="relative flex items-center justify-end">
                    <FloatingLanguageSelector isOpen={isLangOpen} />
                    <Tooltip content="Idioma" position="top">
                        <FloatingMenuButton
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            icon="translate"
                            variant="option"
                        />
                    </Tooltip>
                </div>
            </div>

            {/* Main Draggable FAB */}
            <div className="touch-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                <Tooltip content={isOpen ? "Cerrar Opciones" : "Menú de Opciones"} position="top">
                    <FloatingMenuButton
                        ref={menuRef}
                        iconClassName={`${isOpen ? 'rotate-90' : 'rotate-0'}`}
                        icon="settings"
                        variant={isOpen ? 'mainActive' : 'main'}
                        style={{ pointerEvents: 'none' }} // Div detects events for better dragging compatibility
                    />
                </Tooltip>
            </div>
        </div>
    );
}

export default FloatingMenu;
