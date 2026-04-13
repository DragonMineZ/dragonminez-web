// ── TTL Cache
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class TtlCache<T = unknown> {
    private readonly store = new Map<string, CacheEntry<T>>();
    private readonly maxSize: number;

    constructor(maxSize = 200) {
        this.maxSize = maxSize;
    }

    get(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }

    set(key: string, data: T, ttlMs: number): void {
        if (this.store.size >= this.maxSize) {
            const firstKey = this.store.keys().next().value;
            if (firstKey !== undefined) this.store.delete(firstKey);
        }
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    invalidate(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}

// ── Rate Limiter
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private readonly store = new Map<string, RateLimitEntry>();
    private readonly limit: number;
    private readonly windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.limit = limit;
        this.windowMs = windowMs;
        const timer = setInterval(() => this.purgeExpired(), 300_000);
        if (typeof timer === "object" && "unref" in timer) {
            (timer as NodeJS.Timeout).unref();
        }
    }

    check(key: string): boolean {
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || now > entry.resetAt) {
            this.store.set(key, { count: 1, resetAt: now + this.windowMs });
            return true;
        }

        if (entry.count >= this.limit) return false;

        entry.count++;
        return true;
    }

    retryAfter(key: string): number {
        const entry = this.store.get(key);
        if (!entry) return 0;
        return Math.ceil(Math.max(0, entry.resetAt - Date.now()) / 1000);
    }

    private purgeExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.resetAt) this.store.delete(key);
        }
    }
}

// ── Singletons
export const readLimiter = new RateLimiter(60, 60_000);
export const writeLimiter = new RateLimiter(20, 60_000);
export const likeLimiter = new RateLimiter(30, 60_000);
export const hairsCache = new TtlCache<unknown>(100);
export const categoriesCache = new TtlCache<unknown>(1);

