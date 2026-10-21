import type { Analytics } from "firebase/analytics";
import { ANALYTICS_MEASUREMENT_ID, getFirebaseApp } from "./app";

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    if (!ANALYTICS_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST) {
        return Promise.resolve(null);
    }

    analyticsPromise ??= (async () => {
        const { initializeAnalytics, isSupported } = await import("firebase/analytics");
        if (!(await isSupported())) return null;
        return initializeAnalytics(getFirebaseApp(), {
            config: { send_page_view: false },
        });
    })();

    return analyticsPromise;
}
