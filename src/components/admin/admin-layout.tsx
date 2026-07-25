"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Calendar,
    BookOpen,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    UserCog,
    CircleUserRound,
} from "lucide-react";

const sidebarLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Departments", href: "/admin/departments", icon: Users },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Classes", href: "/admin/classes", icon: BookOpen },
    { name: "Blog", href: "/admin/blog", icon: FileText },
    { name: "Administrators", href: "/admin/administrators", icon: UserCog },
    { name: "My Profile", href: "/admin/profile", icon: CircleUserRound },
    { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isPrimary, setIsPrimary] = useState(false);

    useEffect(() => {
        void (async () => {
            const response = await fetch("/api/admin/profile", { cache: "no-store" });
            if (!response.ok) return;
            const body = (await response.json()) as { profile: { isPrimary?: boolean } };
            setIsPrimary(body.profile.isPrimary === true);
        })();
    }, []);

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[var(--primary)] text-white rounded-xl shadow-lg hover:bg-[var(--primary-dark)] transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                data-tour="sidebar"
                className={cn(
                    "fixed top-0 left-0 h-full bg-[var(--primary)] text-white z-50 flex flex-col transition-transform duration-300 ease-in-out",
                    "w-[260px]",
                    // Mobile: slide in/out
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    // Desktop: always visible
                    "lg:translate-x-0"
                )}
            >
                {/* Logo & Close */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <Image
                            src="/images/logo.png"
                            alt="Al-QIsc Logo"
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                        />
                        <div>
                            <span className="font-heading text-lg font-bold block leading-tight">
                                AlQISC
                            </span>
                            <span className="text-[10px] text-white/60 uppercase tracking-wider">
                                Admin Panel
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {sidebarLinks.filter((link) => link.href !== "/admin/administrators" || isPrimary).map((link) => {
                        const isActive =
                            pathname === link.href || pathname.startsWith(link.href + "/");
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                data-tour={`nav-${link.name.toLowerCase()}`}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-white/15 text-white shadow-sm"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {/* Gold accent bar for active */}
                                <div
                                    className={cn(
                                        "w-1 h-6 rounded-full transition-all duration-200 -ml-1 mr-1",
                                        isActive ? "bg-[var(--secondary)]" : "bg-transparent"
                                    )}
                                />
                                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-[var(--secondary)]")} />
                                <span className="flex-1">{link.name}</span>
                                {isActive && (
                                    <ChevronRight className="w-4 h-4 text-white/40" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-white/10">
                    <button
                        data-tour="logout"
                        onClick={async () => {
                            const { createClient } = await import("@/lib/firebase/client");
                            const firebase = createClient();
                            await firebase.auth.signOut();
                            window.location.href = "/admin/login";
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

export function AdminTopbar({ title }: { title: string }) {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("Admin");
    const [photoUrl, setPhotoUrl] = useState("");

    useEffect(() => {
        async function loadUser() {
            const response = await fetch("/api/admin/profile", { cache: "no-store" });
            if (!response.ok) return;
            const body = (await response.json()) as { profile: { email: string; displayName: string; photoUrl: string } };
            setUserEmail(body.profile.email);
            setDisplayName(body.profile.displayName || "Admin");
            setPhotoUrl(body.profile.photoUrl || "");
        }
        loadUser();
    }, []);

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
                {/* Left: spacer for mobile menu button + title */}
                <div className="flex items-center gap-4">
                    {/* Spacer so title doesn't overlap mobile hamburger */}
                    <div className="lg:hidden w-10" />
                    <h1 className="font-heading text-lg sm:text-xl font-bold text-[var(--dark)] truncate">
                        {title}
                    </h1>
                </div>

                {/* Right: admin info */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-[var(--dark)]">{displayName}</p>
                        <p className="text-xs text-[var(--gray)]">{userEmail ?? "..."}</p>
                    </div>
                    <Link href="/admin/profile" aria-label="Open my profile" className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                        {photoUrl ? <Image src={photoUrl} alt="" fill sizes="36px" className="object-cover" /> : (displayName || userEmail || "A").charAt(0).toUpperCase()}
                    </Link>
                </div>
            </div>
        </header>
    );
}
