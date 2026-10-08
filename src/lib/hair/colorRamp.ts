import { clamp, DEG_TO_RAD, smoothstep } from './math';

export const STOPS = 9;
const BASE_STOP = Math.floor(STOPS / 2);

const WARM_HUE = 95.0 * DEG_TO_RAD;
const COOL_HUE = 285.0 * DEG_TO_RAD;
const NEUTRAL_HUE = 265.0 * DEG_TO_RAD;
const SHADOW_DEPTH = 0.24;
const SHADOW_FLOOR = 0.30;
const SHADOW_CHROMA_GAIN = 0.30;
const SHADOW_HUE_SHIFT = 22.0 * DEG_TO_RAD;
const HIGHLIGHT_LIFT = 0.30;
const HIGHLIGHT_DESATURATION = 0.30;
const HIGHLIGHT_HUE_SHIFT = 12.0 * DEG_TO_RAD;
const NEUTRAL_SHADOW_CHROMA = 0.028;
const NEUTRAL_HIGHLIGHT_CHROMA = 0.032;
const NEUTRAL_CHROMA_LOW = 0.012;
const NEUTRAL_CHROMA_HIGH = 0.05;
const GAMUT_ITERATIONS = 14;
const GAMUT_EPSILON = 1.0e-4;
const TWO_PI = Math.PI * 2;

export type ColorRamp = Float32Array;

const cache = new Map<number, ColorRamp>();

export function resolveRamp(rgb: number): ColorRamp {
    const color = rgb & 0xffffff;
    let ramp = cache.get(color);
    if (!ramp) {
        if (cache.size > 512) cache.clear();
        ramp = build(color);
        cache.set(color, ramp);
    }
    return ramp;
}

export function sampleRamp(ramp: ColorRamp, shade: number, out: Float32Array | number[], outOffset = 0): void {
    const position = (clamp(shade, -1, 1) + 1) * 0.5 * (STOPS - 1);
    const stop = Math.min(STOPS - 2, Math.floor(position));
    const fraction = position - stop;
    const a = stop * 3;
    const b = a + 3;
    out[outOffset] = ramp[a] + (ramp[b] - ramp[a]) * fraction;
    out[outOffset + 1] = ramp[a + 1] + (ramp[b + 1] - ramp[a + 1]) * fraction;
    out[outOffset + 2] = ramp[a + 2] + (ramp[b + 2] - ramp[a + 2]) * fraction;
}

function build(rgb: number): ColorRamp {
    const colors = new Float32Array(STOPS * 3);
    const red = ((rgb >> 16) & 0xff) / 255;
    const green = ((rgb >> 8) & 0xff) / 255;
    const blue = (rgb & 0xff) / 255;
    const lab = toOklab(red, green, blue);
    const lightness = lab[0];
    const chroma = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    const hue = Math.atan2(lab[2], lab[1]);
    const chromatic = smoothstep((chroma - NEUTRAL_CHROMA_LOW) / (NEUTRAL_CHROMA_HIGH - NEUTRAL_CHROMA_LOW));

    for (let stop = 0; stop < STOPS; stop++) {
        const index = stop * 3;
        if (stop === BASE_STOP) {
            colors[index] = red;
            colors[index + 1] = green;
            colors[index + 2] = blue;
            continue;
        }
        const shade = -1 + (2 * stop) / (STOPS - 1);
        const linear = shift(lightness, chroma, hue, lab[1], lab[2], chromatic, shade);
        colors[index] = toSrgb(linear[0]);
        colors[index + 1] = toSrgb(linear[1]);
        colors[index + 2] = toSrgb(linear[2]);
    }
    return colors;
}

function shift(lightness: number, chroma: number, hue: number, baseA: number, baseB: number, chromatic: number, shade: number): number[] {
    const amount = Math.abs(shade);
    let targetLightness: number;
    let targetChroma: number;
    let targetHue: number;
    let neutralChroma: number;
    let neutralHue: number;
    if (shade < 0) {
        targetLightness = lightness - amount * SHADOW_DEPTH * (SHADOW_FLOOR + (1 - SHADOW_FLOOR) * lightness);
        targetChroma = chroma * (1 + amount * SHADOW_CHROMA_GAIN);
        targetHue = hue + towards(hue, COOL_HUE, SHADOW_HUE_SHIFT * amount);
        neutralChroma = NEUTRAL_SHADOW_CHROMA * amount * (0.4 + 0.6 * lightness);
        neutralHue = COOL_HUE;
    } else {
        targetLightness = lightness + amount * HIGHLIGHT_LIFT * (1 - lightness);
        targetChroma = chroma * (1 - amount * HIGHLIGHT_DESATURATION * lightness);
        targetHue = hue + towards(hue, WARM_HUE, HIGHLIGHT_HUE_SHIFT * amount);
        neutralChroma = NEUTRAL_HIGHLIGHT_CHROMA * amount * (1 - lightness);
        neutralHue = NEUTRAL_HUE;
    }
    const a = targetChroma * Math.cos(targetHue) * chromatic + (neutralChroma * Math.cos(neutralHue) + baseA) * (1 - chromatic);
    const b = targetChroma * Math.sin(targetHue) * chromatic + (neutralChroma * Math.sin(neutralHue) + baseB) * (1 - chromatic);
    return fitToGamut(clamp(targetLightness, 0, 1), a, b);
}

function fitToGamut(lightness: number, a: number, b: number): number[] {
    let linear = toLinearRgb(lightness, a, b);
    if (inGamut(linear)) return linear;
    let low = 0;
    let high = 1;
    for (let i = 0; i < GAMUT_ITERATIONS; i++) {
        const middle = (low + high) * 0.5;
        linear = toLinearRgb(lightness, a * middle, b * middle);
        if (inGamut(linear)) low = middle;
        else high = middle;
    }
    return toLinearRgb(lightness, a * low, b * low);
}

function towards(from: number, to: number, maxStep: number): number {
    let delta = (to - from) % TWO_PI;
    if (delta > Math.PI) delta -= TWO_PI;
    if (delta < -Math.PI) delta += TWO_PI;
    return Math.abs(delta) <= maxStep ? delta : Math.sign(delta) * maxStep;
}

function inGamut(rgb: number[]): boolean {
    for (const channel of rgb) {
        if (channel < -GAMUT_EPSILON || channel > 1 + GAMUT_EPSILON) return false;
    }
    return true;
}

function toOklab(red: number, green: number, blue: number): number[] {
    const r = toLinearChannel(red);
    const g = toLinearChannel(green);
    const b = toLinearChannel(blue);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
}

function toLinearRgb(lightness: number, a: number, b: number): number[] {
    let l = lightness + 0.3963377774 * a + 0.2158037573 * b;
    let m = lightness - 0.1055613458 * a - 0.0638541728 * b;
    let s = lightness - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l;
    m = m * m * m;
    s = s * s * s;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
}

function toLinearChannel(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function toSrgb(channel: number): number {
    const clamped = clamp(channel, 0, 1);
    return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}
