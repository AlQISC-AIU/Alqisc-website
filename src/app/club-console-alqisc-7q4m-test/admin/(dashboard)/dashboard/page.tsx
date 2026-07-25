"use client";

import { useState, useEffect } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import {
    Users,
    Calendar,
    BookOpen,
    FileText,
    TrendingUp,
    ArrowRight,
    ChevronRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/firebase/client";
import {
    hasAdminPermission,
    type AdminAccess,
    type AdminPermission,
} from "@/lib/admin-access";

const recentActivity = [
    {
        action: "Event updated",
        detail: "Weekly Islamic Talk — date changed",
        time: "2 min ago",
        type: "event",
        permission: "events" as AdminPermission,
    },
    {
        action: "New member added",
        detail: "Reka Tatian — Education Department",
        time: "15 min ago",
        type: "member",
        permission: "departments" as AdminPermission,
    },
    {
        action: "Blog post published",
        detail: "Ramadan Preparation Guide",
        time: "1 hr ago",
        type: "blog",
        permission: "blog" as AdminPermission,
    },
    {
        action: "Class updated",
        detail: "Arabic Language — schedule changed",
        time: "2 hrs ago",
        type: "class",
        permission: "classes" as AdminPermission,
    },
    {
        action: "Settings updated",
        detail: "Contact phone number updated",
        time: "3 hrs ago",
        type: "settings",
        permission: "settings" as AdminPermission,
    },
];

export default function DashboardPage() {
    const [counts, setCounts] = useState({
        departments: 0,
        events: 0,
        classes: 0,
        blog: 0
    });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [access, setAccess] = useState<AdminAccess | null>(null);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const firebase = createClient();
                const [profileResponse, ...results] = await Promise.all([
                    fetch("/api/admin/profile", { cache: "no-store" }),
                    firebase.from('departments').select('*', { count: 'exact', head: true }),
                    firebase.from('events').select('*', { count: 'exact', head: true }),
                    firebase.from('classes').select('*', { count: 'exact', head: true }),
                    firebase.from('blog_posts').select('*', { count: 'exact', head: true }),
                ]);
                if (!profileResponse.ok) throw new Error("Your access permissions could not be loaded.");
                const profileBody = (await profileResponse.json()) as {
                    profile: {
                        role: AdminAccess["role"];
                        permissions: AdminPermission[];
                        departmentIds: string[];
                        isPrimary: boolean;
                        isLegacy?: boolean;
                    };
                };
                setAccess({
                    role: profileBody.profile.role,
                    permissions: profileBody.profile.permissions,
                    departmentIds: profileBody.profile.departmentIds,
                    isPrimary: profileBody.profile.isPrimary,
                    isLegacy: profileBody.profile.isLegacy === true,
                });
                const failed = results.find((result) => result.error)?.error;
                if (failed) throw failed;
                setCounts({
                    departments: results[0].count || 0,
                    events: results[1].count || 0,
                    classes: results[2].count || 0,
                    blog: results[3].count || 0
                });
            } catch (error) {
                setLoadError(error instanceof Error ? error.message : "Dashboard counts could not be loaded.");
            } finally {
                setLoading(false);
            }
        };

        fetchCounts();
    }, []);

    const stats = [
        {
            label: "Departments",
            value: counts.departments,
            icon: Users,
            href: "/club-console-alqisc-7q4m-test/admin/departments",
            color: "bg-[var(--primary)]/5 text-[var(--primary)]",
            iconBg: "bg-[var(--primary)]/10",
            permission: "departments" as AdminPermission,
        },
        {
            label: "Events",
            value: counts.events,
            icon: Calendar,
            href: "/club-console-alqisc-7q4m-test/admin/events",
            color: "bg-[var(--primary)]/5 text-[var(--primary)]",
            iconBg: "bg-[var(--primary)]/10",
            permission: "events" as AdminPermission,
        },
        {
            label: "Classes",
            value: counts.classes,
            icon: BookOpen,
            href: "/club-console-alqisc-7q4m-test/admin/classes",
            color: "bg-[var(--primary)]/5 text-[var(--primary)]",
            iconBg: "bg-[var(--primary)]/10",
            permission: "classes" as AdminPermission,
        },
        {
            label: "Blog Posts",
            value: counts.blog,
            icon: FileText,
            href: "/club-console-alqisc-7q4m-test/admin/blog",
            color: "bg-[var(--primary)]/5 text-[var(--primary)]",
            iconBg: "bg-[var(--primary)]/10",
            permission: "blog" as AdminPermission,
        },
    ];

    return (
        <>
            <AdminTopbar title="Dashboard" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {loadError && (
                    <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
                )}
                {/* Welcome */}
                <div className="mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">
                        Welcome back! 👋
                    </h2>
                    <p className="text-[var(--gray)] text-sm mt-1">
                        Here&apos;s an overview of your AlQISC website content.
                    </p>
                </div>

                {/* Stats Grid */}
                <div data-tour="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                    {stats.filter((stat) =>
                        access && hasAdminPermission(access, stat.permission)
                    ).map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Link
                                key={stat.label}
                                href={stat.href}
                                className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-3 sm:mb-4">
                                    <div
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${stat.iconBg}`}
                                    >
                                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary)]" />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-2xl sm:text-3xl font-bold text-[var(--dark)]">
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : stat.value}
                                    </p>
                                </div>
                                <p className="text-xs sm:text-sm text-[var(--gray)] mt-0.5">
                                    {stat.label}
                                </p>
                            </Link>
                        );
                    })}
                </div>

                {/* Quick Actions + Recent Activity */}
                <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Quick Actions */}
                    <div data-tour="quick-actions" className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--dark)] mb-4">
                            Quick Actions
                        </h3>
                        <div className="space-y-2">
                            {[
                                { label: "Add New Event", href: "/club-console-alqisc-7q4m-test/admin/events/new", icon: Calendar, permission: "events" as AdminPermission },
                                { label: "Write Blog Post", href: "/club-console-alqisc-7q4m-test/admin/blog/new", icon: FileText, permission: "blog" as AdminPermission },
                                { label: "Manage Members", href: "/club-console-alqisc-7q4m-test/admin/departments", icon: Users, permission: "departments" as AdminPermission },
                                { label: "Edit Settings", href: "/club-console-alqisc-7q4m-test/admin/settings", icon: TrendingUp, permission: "settings" as AdminPermission },
                            ].filter((action) =>
                                access && hasAdminPermission(access, action.permission)
                            ).map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={action.label}
                                        href={action.href}
                                        className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--light)] rounded-xl hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all duration-200 text-[var(--dark)] group"
                                    >
                                        <Icon className="w-4 h-4 text-[var(--gray)] group-hover:text-[var(--primary)]" />
                                        <span className="text-sm font-medium">{action.label}</span>
                                        <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-[var(--primary)]" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--dark)] mb-4">
                            Recent Activity
                        </h3>
                        <div className="space-y-3 sm:space-y-4 opacity-50">
                            <p className="text-xs text-center pb-4 text-gray-500">Activity logging features coming soon.</p>
                            {recentActivity.filter((activity) =>
                                access && hasAdminPermission(access, activity.permission)
                            ).map((activity, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-50 last:border-0 last:pb-0"
                                >
                                    <div className="w-2 h-2 rounded-full bg-[var(--secondary)] mt-2 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--dark)]">
                                            {activity.action}
                                        </p>
                                        <p className="text-xs sm:text-sm text-[var(--gray)] truncate">
                                            {activity.detail}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {activity.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
