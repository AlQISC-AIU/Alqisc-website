"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Department } from "@/lib/firebase/types";
import { ADMIN_BASE_PATH } from "@/lib/admin-routes";

const SiteSettingsContext = createContext<Record<string, string>>({});

export function useSiteSettings() {
    return useContext(SiteSettingsContext);
}

export function LayoutShell({ children, settings, departments = [] }: { children: React.ReactNode, settings: Record<string, string>, departments?: Department[] }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith(ADMIN_BASE_PATH);

    if (isAdmin) {
        // Admin pages: no navbar, no footer, no top padding
        return <>{children}</>;
    }

    return (
        <SiteSettingsContext.Provider value={settings}>
            <Navbar settings={settings} departments={departments} />
            <main className="min-h-screen pt-20">{children}</main>
            <Footer settings={settings} />
        </SiteSettingsContext.Provider>
    );
}
