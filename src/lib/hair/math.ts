export const PIXEL = 1 / 16;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
    return value < min ? min : Math.min(value, max);
}

export function clampFinite(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return clamp(value, min, max);
}

export function lerp(factor: number, from: number, to: number): number {
    return from + (to - from) * factor;
}

export function smoothstep(value: number): number {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
}

export function wrapDegrees(degrees: number): number {
    let wrapped = degrees % 360;
    if (wrapped >= 180) wrapped -= 360;
    if (wrapped < -180) wrapped += 360;
    return wrapped;
}

export function fround(value: number): number {
    return Math.fround(value);
}

export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(other: Vec3): this {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        return this;
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    zero(): this {
        return this.set(0, 0, 0);
    }

    add(other: Vec3): this {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
        return this;
    }

    addXYZ(x: number, y: number, z: number): this {
        this.x += x;
        this.y += y;
        this.z += z;
        return this;
    }

    sub(other: Vec3): this {
        this.x -= other.x;
        this.y -= other.y;
        this.z -= other.z;
        return this;
    }

    mul(scalar: number): this {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    negate(): this {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    dot(other: Vec3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    cross(other: Vec3, out: Vec3): Vec3 {
        const x = this.y * other.z - this.z * other.y;
        const y = this.z * other.x - this.x * other.z;
        const z = this.x * other.y - this.y * other.x;
        return out.set(x, y, z);
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    distance(other: Vec3): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    normalize(): this {
        const length = this.length();
        if (length > 0) this.mul(1 / length);
        return this;
    }

    lerp(other: Vec3, factor: number): this {
        this.x += (other.x - this.x) * factor;
        this.y += (other.y - this.y) * factor;
        this.z += (other.z - this.z) * factor;
        return this;
    }
}

export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    identity(): this {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
        return this;
    }

    set(x: number, y: number, z: number, w: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    copy(other: Quat): this {
        return this.set(other.x, other.y, other.z, other.w);
    }

    clone(): Quat {
        return new Quat(this.x, this.y, this.z, this.w);
    }

    mulXYZW(rx: number, ry: number, rz: number, rw: number): this {
        const x = this.w * rx + this.x * rw + this.y * rz - this.z * ry;
        const y = this.w * ry - this.x * rz + this.y * rw + this.z * rx;
        const z = this.w * rz + this.x * ry - this.y * rx + this.z * rw;
        const w = this.w * rw - this.x * rx - this.y * ry - this.z * rz;
        return this.set(x, y, z, w);
    }

    mul(other: Quat): this {
        return this.mulXYZW(other.x, other.y, other.z, other.w);
    }

    premul(other: Quat): this {
        const x = other.w * this.x + other.x * this.w + other.y * this.z - other.z * this.y;
        const y = other.w * this.y - other.x * this.z + other.y * this.w + other.z * this.x;
        const z = other.w * this.z + other.x * this.y - other.y * this.x + other.z * this.w;
        const w = other.w * this.w - other.x * this.x - other.y * this.y - other.z * this.z;
        return this.set(x, y, z, w);
    }

    rotateX(angle: number): this {
        const half = angle * 0.5;
        return this.mulXYZW(Math.sin(half), 0, 0, Math.cos(half));
    }

    rotateY(angle: number): this {
        const half = angle * 0.5;
        return this.mulXYZW(0, Math.sin(half), 0, Math.cos(half));
    }

    rotateZ(angle: number): this {
        const half = angle * 0.5;
        return this.mulXYZW(0, 0, Math.sin(half), Math.cos(half));
    }

    rotationAxis(angle: number, axisX: number, axisY: number, axisZ: number): this {
        const half = angle * 0.5;
        const sin = Math.sin(half);
        const inverseLength = 1 / Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
        return this.set(axisX * inverseLength * sin, axisY * inverseLength * sin, axisZ * inverseLength * sin, Math.cos(half));
    }

    rotateAxis(angle: number, axisX: number, axisY: number, axisZ: number): this {
        const half = angle * 0.5;
        const sin = Math.sin(half);
        const inverseLength = 1 / Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ);
        return this.mulXYZW(axisX * inverseLength * sin, axisY * inverseLength * sin, axisZ * inverseLength * sin, Math.cos(half));
    }

    conjugate(out: Quat = this): Quat {
        return out.set(-this.x, -this.y, -this.z, this.w);
    }

    invert(out: Quat = this): Quat {
        const inverseNorm = 1 / (this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        return out.set(-this.x * inverseNorm, -this.y * inverseNorm, -this.z * inverseNorm, this.w * inverseNorm);
    }

    normalize(): this {
        const inverseNorm = 1 / Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        return this.set(this.x * inverseNorm, this.y * inverseNorm, this.z * inverseNorm, this.w * inverseNorm);
    }

    transform(vector: Vec3, out: Vec3 = vector): Vec3 {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const ww = w * w;
        const xy = x * y;
        const xz = x * z;
        const yz = y * z;
        const xw = x * w;
        const zw = z * w;
        const yw = y * w;
        const k = 1 / (xx + yy + zz + ww);
        const vx = vector.x;
        const vy = vector.y;
        const vz = vector.z;
        return out.set(
            (xx - yy - zz + ww) * k * vx + 2 * (xy - zw) * k * vy + 2 * (xz + yw) * k * vz,
            2 * (xy + zw) * k * vx + (yy - xx - zz + ww) * k * vy + 2 * (yz - xw) * k * vz,
            2 * (xz - yw) * k * vx + 2 * (yz + xw) * k * vy + (zz - xx - yy + ww) * k * vz
        );
    }

    slerp(target: Quat, alpha: number, out: Quat = this): Quat {
        const cosom = this.x * target.x + this.y * target.y + this.z * target.z + this.w * target.w;
        const absCosom = Math.abs(cosom);
        let scale0: number;
        let scale1: number;
        if (1 - absCosom > 1e-6) {
            const sinSqr = 1 - absCosom * absCosom;
            const sinom = 1 / Math.sqrt(sinSqr);
            const omega = Math.atan2(sinSqr * sinom, absCosom);
            scale0 = Math.sin((1 - alpha) * omega) * sinom;
            scale1 = Math.sin(alpha * omega) * sinom;
        } else {
            scale0 = 1 - alpha;
            scale1 = alpha;
        }
        scale1 = cosom >= 0 ? scale1 : -scale1;
        return out.set(
            scale0 * this.x + scale1 * target.x,
            scale0 * this.y + scale1 * target.y,
            scale0 * this.z + scale1 * target.z,
            scale0 * this.w + scale1 * target.w
        );
    }

    getEulerAnglesXYZ(out: Vec3): Vec3 {
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const w = this.w;
        const sinY = clamp(2 * (x * z + y * w), -1, 1);
        return out.set(
            Math.atan2(x * w - y * z, 0.5 - x * x - y * y),
            Math.asin(sinY),
            Math.atan2(z * w - x * y, 0.5 - y * y - z * z)
        );
    }
}

export class Mat4 {
    readonly m = new Float64Array(16);

    constructor() {
        this.identity();
    }

    identity(): this {
        this.m.fill(0);
        this.m[0] = 1;
        this.m[5] = 1;
        this.m[10] = 1;
        this.m[15] = 1;
        return this;
    }

    private mulRight(b: ArrayLike<number>): this {
        const a = this.m;
        const result = new Float64Array(16);
        for (let row = 0; row < 4; row++) {
            for (let column = 0; column < 4; column++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) sum += a[row * 4 + k] * b[k * 4 + column];
                result[row * 4 + column] = sum;
            }
        }
        this.m.set(result);
        return this;
    }

    translate(x: number, y: number, z: number): this {
        return this.mulRight([1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]);
    }

    scale(x: number, y: number, z: number): this {
        return this.mulRight([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
    }

    rotateX(angle: number): this {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return this.mulRight([1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]);
    }

    rotateY(angle: number): this {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return this.mulRight([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]);
    }

    rotateZ(angle: number): this {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return this.mulRight([c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }

    transformPosition(x: number, y: number, z: number, out: Vec3 = new Vec3()): Vec3 {
        const m = this.m;
        return out.set(
            m[0] * x + m[1] * y + m[2] * z + m[3],
            m[4] * x + m[5] * y + m[6] * z + m[7],
            m[8] * x + m[9] * y + m[10] * z + m[11]
        );
    }
}
