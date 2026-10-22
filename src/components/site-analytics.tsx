"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAnalytics } from "@/lib/analytics";

// Sends a page view on every route change.
export function SiteAnalytics() {
    const pathname = usePathname();

    useEffect(() => {
        getAnalytics()?.("event", "page_view", {
            page_path: pathname,
            page_location: window.location.href,
            page_title: document.title,
        });
    }, [pathname]);

    return null;
}
