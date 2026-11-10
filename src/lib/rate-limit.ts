// A small sliding-window rate limiter kept in the server's memory.
//
// It is a first line of defence, not a guarantee: each running copy of the
// server counts on its own, and a copy that restarts forgets what it counted.

interface RateLimiterOptions {
    /** How many requests one key may make inside the window. */
    limit: number;
    windowMs: number;
    /** Injected in tests. */
    now?: () => number;
    /** Keys remembered at once; the oldest are dropped beyond this. */
    maxKeys?: number;
}

export interface RateLimiter {
    /** Records a request for `key` and reports whether it is within the limit. */
    allow(key: string): boolean;
}

export function createRateLimiter({ limit, windowMs, now = Date.now, maxKeys = 5000 }: RateLimiterOptions): RateLimiter {
    const requests = new Map<string, number[]>();

    return {
        allow(key) {
            const time = now();
            const recent = (requests.get(key) || []).filter((at) => at > time - windowMs);
            // A refused request is not counted, so being limited does not by
            // itself keep a key limited once the window has passed.
            const allowed = recent.length < limit;
            if (allowed) recent.push(time);

            // Re-inserting keeps the map ordered by most recent use.
            requests.delete(key);
            requests.set(key, recent);
            if (requests.size > maxKeys) {
                const oldest = requests.keys().next().value;
                if (oldest !== undefined) requests.delete(oldest);
            }
            return allowed;
        },
    };
}
