"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getFirebaseAnalytics } from "@/lib/firebase/analytics";

export function FirebaseAnalytics() {
    const pathname = usePathname();

    useEffect(() => {
        let active = true;

        void (async () => {
            const analytics = await getFirebaseAnalytics();
            if (!active || !analytics) return;
            const { logEvent } = await import("firebase/analytics");
            logEvent(analytics, "page_view", {
                page_path: pathname,
                page_location: window.location.href,
                page_title: document.title,
            });
        })();

        return () => {
            active = false;
        };
    }, [pathname]);

    return null;
}
