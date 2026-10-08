const SKIN_BASE_SATURATION = 0.5;
const SKIN_SHADOW_SATURATION = 1.7;
const SKIN_SHADOW_VALUE = 0.95;
const SKIN_REFERENCE_SATURATION = 0.21;
const SKIN_SHADOW_COMPENSATION = 0.15;

export const DEFAULT_SKIN_COLOR = '#FFD3C9';
export const DEFAULT_EYE_COLOR = '#222629';

type Rgb = [number, number, number];

const SKIN_FILES = {
    body: '/hair/skin/body_layer1.png',
    bodyShadow: '/hair/skin/body_layer2.png',
    sclera: '/hair/skin/eye_0.png',
    iris: '/hair/skin/eye_1.png',
    iris2: '/hair/skin/eye_2.png',
    brows: '/hair/skin/eye_3.png',
    nose: '/hair/skin/nose.png',
    mouth: '/hair/skin/mouth.png',
    mouthShadow: '/hair/skin/mouth_shadow.png',
    hairBase: '/hair/hair_base.png',
} as const;

type SkinImageKey = keyof typeof SKIN_FILES;
export type SkinImages = Record<SkinImageKey, ImageData>;

function hexToRgb(hex: string): Rgb {
    const value = parseInt(hex.replace('#', ''), 16);
    return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

function selfSaturate(color: Rgb, strength: number, value: number): Rgb {
    const max = Math.max(color[0], color[1], color[2]);
    if (max <= 0) return [0, 0, 0];
    return [
        color[0] * Math.pow(color[0] / max, strength) * value,
        color[1] * Math.pow(color[1] / max, strength) * value,
        color[2] * Math.pow(color[2] / max, strength) * value,
    ];
}

function skinSaturationGain(saturation: number): number {
    const keep = 1 - saturation;
    return Math.pow(keep, 1 + SKIN_BASE_SATURATION) - Math.pow(keep, 1 + SKIN_SHADOW_SATURATION);
}

export function skinBaseTone(color: Rgb): Rgb {
    return selfSaturate(color, SKIN_BASE_SATURATION, 1);
}

export function skinShadowTone(color: Rgb): Rgb {
    const max = Math.max(color[0], color[1], color[2]);
    const min = Math.min(color[0], color[1], color[2]);
    const saturation = max <= 0 ? 0 : (max - min) / max;
    const missing = Math.max(0, 1 - skinSaturationGain(saturation) / skinSaturationGain(SKIN_REFERENCE_SATURATION));
    return selfSaturate(color, SKIN_SHADOW_SATURATION, SKIN_SHADOW_VALUE * (1 - SKIN_SHADOW_COMPENSATION * missing));
}

function loadImage(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Canvas unavailable'));
                return;
            }
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, image.width, image.height));
        };
        image.onerror = () => reject(new Error(`Failed to load ${url}`));
        image.src = url;
    });
}

let pending: Promise<SkinImages> | null = null;

export function loadSkinImages(): Promise<SkinImages> {
    if (!pending) {
        pending = Promise.all(Object.entries(SKIN_FILES).map(async ([key, url]) => [key, await loadImage(url)] as const))
            .then((entries) => Object.fromEntries(entries) as SkinImages);
    }
    return pending;
}

function composite(target: Uint8ClampedArray, layer: ImageData, tint: Rgb): void {
    const source = layer.data;
    for (let i = 0; i < target.length && i < source.length; i += 4) {
        const alpha = source[i + 3] / 255;
        if (alpha <= 0) continue;
        const red = source[i] * tint[0];
        const green = source[i + 1] * tint[1];
        const blue = source[i + 2] * tint[2];
        const destinationAlpha = target[i + 3] / 255;
        const outAlpha = alpha + destinationAlpha * (1 - alpha);
        target[i] = (red * alpha + target[i] * destinationAlpha * (1 - alpha)) / outAlpha;
        target[i + 1] = (green * alpha + target[i + 1] * destinationAlpha * (1 - alpha)) / outAlpha;
        target[i + 2] = (blue * alpha + target[i + 2] * destinationAlpha * (1 - alpha)) / outAlpha;
        target[i + 3] = outAlpha * 255;
    }
}

export function composeBodySkin(images: SkinImages, hairColor: string, skinColor = DEFAULT_SKIN_COLOR, eyeColor = DEFAULT_EYE_COLOR): ImageData {
    const output = new ImageData(64, 64);
    const skin = hexToRgb(skinColor);
    const base = skinBaseTone(skin);
    const shadow = skinShadowTone(skin);
    const eye = hexToRgb(eyeColor);
    const hair = hexToRgb(hairColor);
    composite(output.data, images.body, base);
    composite(output.data, images.bodyShadow, shadow);
    composite(output.data, images.sclera, [1, 1, 1]);
    composite(output.data, images.iris, eye);
    composite(output.data, images.iris2, eye);
    composite(output.data, images.brows, hair);
    composite(output.data, images.nose, base);
    composite(output.data, images.mouth, base);
    composite(output.data, images.mouthShadow, shadow);
    return output;
}

export function composeHairBase(images: SkinImages, hairColor: string): ImageData {
    const output = new ImageData(64, 64);
    composite(output.data, images.hairBase, hexToRgb(hairColor));
    return output;
}
