"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import Image from "next/image";
import Link from "next/link";
import {
    ChevronDown,
    ChevronUp,
    Edit3,
    Trash2,
    Plus,
    UserPlus,
    GripVertical,
    Loader2,
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import type { Department, Team, Member } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";
import { getUniqueMemberCount } from "@/lib/member-identity";

// Extended types for the nested structure
type MemberWithTeam = Member;
type TeamWithMembers = Team & { members: MemberWithTeam[] };
type DepartmentWithNested = Department & { teams: TeamWithMembers[] };

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<DepartmentWithNested[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        const firebase = createClient();

        // Fetch departments along with related teams and their members
        const { data, error } = await firebase
            .from("departments")
            .select(`
                *,
                teams (
                    *,
                    members (*)
                )
            `)
            .order("display_order", { ascending: true });

        if (error) {
            setErrorMessage(error.message);
        } else if (data) {
            // Sort teams and members by their display_order
            const sortedData = (data as DepartmentWithNested[]).map((dept) => ({
                ...dept,
                teams: (dept.teams || [])
                    .sort((a: Team, b: Team) => a.display_order - b.display_order)
                    .map((team: TeamWithMembers) => ({
                        ...team,
                        members: (team.members || [])
                            .sort((a: Member, b: Member) => a.display_order - b.display_order),
                    })),
            })) as DepartmentWithNested[];

            setDepartments(sortedData);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void fetchDepartments(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchDepartments]);

    const toggleStatus = async (dept: DepartmentWithNested) => {
        const firebase = createClient();
        const tempDepts = [...departments];
        const index = tempDepts.findIndex((d) => d.id === dept.id);

        if (index > -1) {
            tempDepts[index] = { ...dept, is_active: !dept.is_active };
            setDepartments(tempDepts);
        }

        const { error } = await firebase
            .from("departments")
            .update({ is_active: !dept.is_active })
            .eq("id", dept.id);

        if (error) {
            notifications.error(error.message, "Status not changed");
            fetchDepartments(); // Revert on error
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const firebase = createClient();

        // Delete department (this should cascade if configured in DB, otherwise might fail if teams exist)
        // Since we didn't specify cascade purely in schema script sometimes, it is better to delete teams first 
        // Or handle it server side properly via a function. For now, doing simple delete.
        const { error } = await firebase.from("departments").delete().eq("id", id);

        if (!error) {
            setDepartments((prev) => prev.filter((d) => d.id !== id));
            notifications.success("The department was deleted successfully.", "Department deleted");
        } else {
            notifications.error(error.message, "Department not deleted");
            setDeletingId(null);
            return;
        }

        setDeletingId(null);
        setShowDeleteModal(null);
    };

    const getTotalMembers = (dept: DepartmentWithNested) => {
        return getUniqueMemberCount(dept.teams || []);
    };

    return (
        <>
            <AdminTopbar title="Departments" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {errorMessage && (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{errorMessage}</span>
                        <button type="button" onClick={() => void fetchDepartments()} className="font-semibold underline">Retry</button>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">
                            Manage Departments
                        </h2>
                        <p className="text-sm text-[var(--gray)] mt-1">
                            {departments.length} departments · Click to expand and manage members
                        </p>
                    </div>
                    <Link data-tour="dept-add" href="/club-console-alqisc-7q4m-test/admin/departments/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm self-start sm:self-auto">
                        <Plus className="w-4 h-4" />
                        Add Department
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : departments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <p className="text-[var(--gray)]">No departments found.</p>
                    </div>
                ) : (
                    <div data-tour="department-list" className="space-y-3">
                        {departments.map((dept) => {
                            const isExpanded = expandedDept === dept.slug;

                            return (
                                <div
                                    key={dept.id}
                                    className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200"
                                >
                                    {/* Department Header */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            setExpandedDept(isExpanded ? null : dept.slug)
                                        }
                                        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 text-left hover:bg-gray-50/50 transition-colors cursor-pointer select-none"
                                    >
                                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block cursor-grab" />

                                        {/* Department info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
                                                    {dept.name}
                                                </span>
                                                <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--dark)] truncate">
                                                    {dept.full_name}
                                                </h3>
                                            </div>
                                            <p className="text-xs sm:text-sm text-[var(--gray)] line-clamp-1">
                                                {getTotalMembers(dept)} members ·{" "}
                                                {(dept.objectives || []).length} objectives
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Active toggle */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStatus(dept);
                                                }}
                                                className="hidden sm:flex items-center gap-1.5"
                                            >
                                                <button
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${dept.is_active ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                                    title={dept.is_active ? "Active" : "Hidden"}
                                                >
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dept.is_active ? "left-5" : "left-0.5"}`} />
                                                </button>
                                            </div>

                                            {/* Edit */}
                                            <Link
                                                href={`/club-console-alqisc-7q4m-test/admin/departments/${dept.slug}/edit`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                                                title="Edit department"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Link>

                                            {/* Delete */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteModal(dept.id);
                                                }}
                                                className="p-2 text-[var(--gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete department"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            {/* Expand icon */}
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-[var(--gray)]" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-[var(--gray)]" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content — Teams & Members */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-4 sm:px-6 py-4 sm:py-6 bg-gray-50/30">
                                            {dept.teams && dept.teams.length > 0 ? (
                                                dept.teams.map((team) => (
                                                    <div key={team.id} className="mb-6 last:mb-0">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                                                                {team.title}
                                                            </h4>
                                                            <Link href={`/club-console-alqisc-7q4m-test/admin/departments/${dept.slug}/edit?action=add-member&team=${team.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-lg hover:bg-[var(--primary)]/20 transition-colors">
                                                                <UserPlus className="w-3.5 h-3.5" />
                                                                Add Member
                                                            </Link>
                                                        </div>

                                                        {/* Members Grid */}
                                                        {team.members && team.members.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                                {team.members.map((member) => (
                                                                    <div
                                                                        key={member.id}
                                                                        className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 group hover:border-[var(--primary)]/20 hover:shadow-sm transition-all"
                                                                    >
                                                                        <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-gray-100">
                                                                            {member.image_url && (
                                                                                <Image src={member.image_url} alt={member.name} fill className="object-cover" sizes="44px" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-semibold text-[var(--dark)] truncate leading-tight">
                                                                                {member.name}
                                                                            </p>
                                                                            <p className="text-xs text-[var(--gray)] truncate">
                                                                                {member.role}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                            <Link href={`/club-console-alqisc-7q4m-test/admin/departments/${dept.slug}/edit?action=edit-member&member=${member.id}`} className="p-1.5 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors">
                                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-[var(--gray)] italic pb-2">No members in this team yet.</div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-sm text-[var(--gray)] mb-6">No teams assigned. <Link href={`/club-console-alqisc-7q4m-test/admin/departments/${dept.slug}/edit`} className="text-[var(--primary)] hover:underline">Edit department to add teams.</Link></div>
                                            )}

                                            {/* Department Quick Info */}
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--gray)] mb-2">
                                                            Objectives
                                                        </h5>
                                                        <ul className="space-y-1">
                                                            {(dept.objectives || []).length > 0 ? (
                                                                dept.objectives.map((obj, i) => (
                                                                    <li key={i} className="text-xs text-[var(--gray)] flex items-start gap-1.5">
                                                                        <span className="w-1 h-1 rounded-full bg-[var(--secondary)] mt-1.5 flex-shrink-0" />
                                                                        {obj}
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="text-xs text-[var(--gray)] italic">No objectives specified</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--gray)] mb-2">
                                                            Responsibilities
                                                        </h5>
                                                        <ul className="space-y-1">
                                                            {(dept.responsibilities || []).length > 0 ? (
                                                                dept.responsibilities.map((resp, i) => (
                                                                    <li key={i} className="text-xs text-[var(--gray)] flex items-start gap-1.5">
                                                                        <span className="w-1 h-1 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                                                                        {resp}
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="text-xs text-[var(--gray)] italic">No responsibilities specified</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Department?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{departments.find((d) => d.id === showDeleteModal)?.name}&quot;? All teams and members associated with this department will also be deleted. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const dept = departments.find(d => d.id === showDeleteModal);
                                    if (dept) handleDelete(dept.id);
                                }}
                                disabled={deletingId === showDeleteModal}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {deletingId === showDeleteModal ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
