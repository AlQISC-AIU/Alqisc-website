import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

const MINUTE = 60 * 1000;

function limiter(limit: number, maxKeys?: number) {
    let time = 0;
    const instance = createRateLimiter({ limit, windowMs: 10 * MINUTE, now: () => time, maxKeys });
    return { allow: instance.allow, advance: (ms: number) => { time += ms; } };
}

describe("createRateLimiter", () => {
    it("allows requests up to the limit and refuses the next", () => {
        const { allow } = limiter(3);
        expect([allow("a"), allow("a"), allow("a")]).toEqual([true, true, true]);
        expect(allow("a")).toBe(false);
    });

    it("counts each key on its own", () => {
        const { allow } = limiter(1);
        expect(allow("campus-wifi")).toBe(true);
        expect(allow("campus-wifi")).toBe(false);
        expect(allow("home-network")).toBe(true);
    });

    it("lets requests through again once the window has passed", () => {
        const { allow, advance } = limiter(2);
        allow("a");
        advance(6 * MINUTE);
        allow("a");
        expect(allow("a")).toBe(false);
        // The first request is now more than ten minutes old; the second is not.
        advance(5 * MINUTE);
        expect(allow("a")).toBe(true);
        expect(allow("a")).toBe(false);
    });

    it("does not extend a block when refused requests keep arriving", () => {
        const { allow, advance } = limiter(1);
        allow("a");
        for (let minute = 0; minute < 9; minute++) {
            advance(MINUTE);
            expect(allow("a")).toBe(false);
        }
        advance(MINUTE + 1);
        expect(allow("a")).toBe(true);
    });

    it("forgets the least recently used key beyond its capacity", () => {
        const { allow } = limiter(1, 2);
        allow("a");
        allow("b");
        allow("c");
        // "a" was dropped to make room, so it starts afresh.
        expect(allow("a")).toBe(true);
        expect(allow("c")).toBe(false);
    });
});
