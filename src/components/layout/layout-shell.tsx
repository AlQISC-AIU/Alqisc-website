"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Department } from "@/lib/firebase/types";
import { ADMIN_BASE_PATH } from "@/lib/admin-routes";

export function LayoutShell({ children, settings, departments = [] }: { children: React.ReactNode, settings: Record<string, string>, departments?: Department[] }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith(ADMIN_BASE_PATH);

    if (isAdmin) {
        // Admin pages: no navbar, no footer, no top padding
        return <>{children}</>;
    }

    return (
        <>
            <Navbar settings={settings} departments={departments} />
            <main className="min-h-screen pt-20">{children}</main>
            <Footer settings={settings} />
        </>
    );
}
