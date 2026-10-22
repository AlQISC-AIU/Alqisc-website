// Google Analytics through gtag.js. The site keeps reporting to the Analytics
// property it used before moving to al-qisc-prod. Firebase Analytics can't do
// that, because it only uses a property linked to the current Firebase project.
// The ID stays in NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (a G-... value); without
// it, or under the local emulators, analytics is off.
const MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "";

type Gtag = (...args: unknown[]) => void;

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: Gtag;
    }
}

let gtag: Gtag | null = null;

export function getAnalytics(): Gtag | null {
    if (typeof window === "undefined") return null;
    if (!MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST) return null;
    if (gtag) return gtag;

    // Google's standard snippet: calls queue in dataLayer until gtag.js loads.
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        // gtag.js reads the arguments object itself, not an array.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(script);

    gtag = window.gtag;
    return gtag;
}
