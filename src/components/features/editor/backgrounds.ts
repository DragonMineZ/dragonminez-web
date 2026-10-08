import type { CSSProperties } from 'react';

export type ViewportBackground = 'plain' | 'timeChamber' | 'namek';

export const BACKGROUNDS: readonly ViewportBackground[] = ['plain', 'timeChamber', 'namek'];

export const BACKGROUND_LABEL_KEYS: Record<ViewportBackground, string> = {
    plain: 'backgroundPlain',
    timeChamber: 'backgroundTimeChamber',
    namek: 'backgroundNamek',
};

const BACKGROUND_IMAGES: Record<Exclude<ViewportBackground, 'plain'>, string> = {
    timeChamber: '/hair/backgrounds/time_chamber.webp',
    namek: '/hair/backgrounds/namek.webp',
};

export const PLAIN_BACKGROUND_CLASS = 'bg-gradient-to-b from-surface-elevated to-background';

export function backgroundStyle(background: ViewportBackground, position = 'center'): CSSProperties | undefined {
    if (background === 'plain') return undefined;
    return {
        backgroundImage: `url(${BACKGROUND_IMAGES[background]})`,
        backgroundSize: 'cover',
        backgroundPosition: position,
    };
}

export function nextBackground(background: ViewportBackground): ViewportBackground {
    return BACKGROUNDS[(BACKGROUNDS.indexOf(background) + 1) % BACKGROUNDS.length];
}

const STORAGE_KEY = 'dmz.hairEditor.background';

export function loadStoredBackground(): ViewportBackground {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return BACKGROUNDS.includes(stored as ViewportBackground) ? (stored as ViewportBackground) : 'plain';
    } catch {
        return 'plain';
    }
}

export function storeBackground(background: ViewportBackground): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, background);
    } catch {
        return;
    }
}
