"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorField } from "@/components/admin/image-editor";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    X,
    Plus,
    Trash2,
    UserPlus,
    Edit3,
    Facebook,
    Instagram,
    Twitter,
    Linkedin,
    Github,
    Mail,
    Phone,
    Globe,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import type { Department, Team, Member } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";

// Extended types for the nested structure
type MemberWithTeam = Member;
type TeamWithMembers = Team & { members: MemberWithTeam[] };
type DepartmentWithNested = Department & { teams: TeamWithMembers[] };

// Social media platform definitions
const socialPlatforms = [
    { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@username", color: "#E4405F" },
    { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "facebook.com/username", color: "#1877F2" },
    { key: "twitter", label: "Twitter / X", icon: Twitter, placeholder: "@username", color: "#1DA1F2" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/username", color: "#0A66C2" },
    { key: "github", label: "GitHub", icon: Github, placeholder: "github.com/username", color: "#333333" },
    { key: "email", label: "Email", icon: Mail, placeholder: "email@example.com", color: "#34708D" },
    { key: "phone", label: "Phone", icon: Phone, placeholder: "+60 12-345 6789", color: "#25D366" },
    { key: "website", label: "Website", icon: Globe, placeholder: "https://example.com", color: "#FF6B35" },
];

type SocialLinks = Record<string, string>;

interface MemberForm {
    name: string;
    role: string;
    teamId: string;
    socials: SocialLinks;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    github: Github,
    email: Mail,
    phone: Phone,
    website: Globe,
};

const colorMap: Record<string, string> = {
    instagram: "#E4405F",
    facebook: "#1877F2",
    twitter: "#1DA1F2",
    linkedin: "#0A66C2",
    github: "#333333",
    email: "#34708D",
    phone: "#25D366",
    website: "#FF6B35",
};

export default function EditDepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const [dept, setDept] = useState<DepartmentWithNested | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingDept, setIsSavingDept] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Department action failed");

    // Department details form state
    const [activeTab, setActiveTab] = useState<"details" | "members">("details");
    const [name, setName] = useState("");
    const [fullName, setFullName] = useState("");
    const [description, setDescription] = useState("");
    const [objectives, setObjectives] = useState<string[]>([""]);
    const [responsibilities, setResponsibilities] = useState<string[]>([""]);

    // Department image state
    const [deptImageUrl, setDeptImageUrl] = useState("");
    const [deptImagePreview, setDeptImagePreview] = useState<string | null>(null);
    const [deptImageFile, setDeptImageFile] = useState<File | null>(null);

    // Member Modal State
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [isSavingMember, setIsSavingMember] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [memberForm, setMemberForm] = useState<MemberForm>({
        name: "",
        role: "",
        teamId: "",
        socials: {},
    });

    // Member image state
    const [memberImageUrl, setMemberImageUrl] = useState("");
    const [memberImagePreview, setMemberImagePreview] = useState<string | null>(null);
    const [memberImageFile, setMemberImageFile] = useState<File | null>(null);

    // Team creation
    const [newTeamTitle, setNewTeamTitle] = useState("");
    const [isAddingTeam, setIsAddingTeam] = useState(false);

    const fetchDepartment = async () => {
        setLoading(true);
        const firebase = createClient();

        // Fetch department and nested teams/members
        const { data: deptData, error: deptError } = await firebase
            .from("departments")
            .select(`
                *,
                teams (
                    *,
                    members (*)
                )
            `)
            .eq("slug", slug)
            .single();

        if (deptError || !deptData) {
            setLoading(false);
            return;
        }

        // Sort teams and members
        const nestedDepartment = deptData as DepartmentWithNested;
        const sortedTeams = (nestedDepartment.teams || [])
            .sort((a: Team, b: Team) => a.display_order - b.display_order)
            .map((team: TeamWithMembers) => ({
                ...team,
                members: (team.members || [])
                    .sort((a: Member, b: Member) => a.display_order - b.display_order),
            }));

        const d = { ...nestedDepartment, teams: sortedTeams };
        setDept(d);
        setName(d.name);
        setFullName(d.full_name);
        setDescription(d.description || "");
        setObjectives(d.objectives && d.objectives.length > 0 ? d.objectives : [""]);
        setResponsibilities(d.responsibilities && d.responsibilities.length > 0 ? d.responsibilities : [""]);
        setDeptImageUrl(d.image_url || "");

        // Handle URL search parameters for auto-opening member modals
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const action = params.get("action");
            const teamId = params.get("team");
            const editMemberId = params.get("member");
            
            if (action === "add-member" && teamId) {
                setActiveTab("members");
                setEditingMemberId(null);
                setMemberForm({
                    name: "",
                    role: "",
                    teamId: teamId,
                    socials: {},
                });
                setMemberImageUrl("");
                setMemberImagePreview(null);
                setMemberImageFile(null);
                setShowMemberModal(true);
                window.history.replaceState(null, '', window.location.pathname + "?tab=members");
            } else if (action === "edit-member" && editMemberId) {
                setActiveTab("members");
                let foundMember = null;
                for (const t of d.teams) {
                    foundMember = t.members?.find((member) => member.id === editMemberId) || null;
                    if (foundMember) break;
                }
                
                if (foundMember) {
                    setEditingMemberId(foundMember.id);
                    const parsedSocials = typeof foundMember.socials === 'object' && foundMember.socials !== null ? foundMember.socials as SocialLinks : {};
                    setMemberForm({
                        name: foundMember.name,
                        role: foundMember.role || "",
                        teamId: foundMember.team_id || "",
                        socials: parsedSocials,
                    });
                    setMemberImageUrl(foundMember.image_url || "");
                    setMemberImagePreview(null);
                    setMemberImageFile(null);
                    setShowMemberModal(true);
                    window.history.replaceState(null, '', window.location.pathname + "?tab=members");
                }
            } else if (params.get("tab") === "members") {
                setActiveTab("members");
            }
        }
        
        setLoading(false);
    };

    useEffect(() => {
        fetchDepartment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const handleDeptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dept) return;
        setIsSavingDept(true);
        setError("");
        let uploadedImageUrl = "";

        try {
            const newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            const cleanedObjectives = objectives.filter((o) => o.trim() !== "");
            const cleanedResponsibilities = responsibilities.filter((r) => r.trim() !== "");

            let image_url = deptImageUrl;

            if (deptImageFile) {
                const result = await uploadImageAction(deptImageFile, "departments");
                image_url = result.url;
                uploadedImageUrl = result.url;
            }

            const firebase = createClient();
            const { error: dbError } = await firebase
                .from("departments")
                .update({
                    slug: newSlug,
                    name,
                    full_name: fullName,
                    description,
                    image_url,
                    objectives: cleanedObjectives,
                    responsibilities: cleanedResponsibilities,
                })
                .eq("id", dept.id);

            if (dbError) throw new Error(dbError.message);
            if (uploadedImageUrl) {
                await deleteImageAction(deptImageUrl).catch((imageError) =>
                    console.error("Failed to delete replaced department image", imageError)
                );
            }

            notifications.success("The department was updated successfully.", "Department updated");
            router.push("/club-console-alqisc-7q4m-test/admin/departments");
            router.refresh();
        } catch (err) {
            if (uploadedImageUrl) await deleteImageAction(uploadedImageUrl).catch(() => undefined);
            setError(err instanceof Error ? err.message : "Failed to update department");
        }

        setIsSavingDept(false);
    };

    // --- Teams Handlers ---
    const handleAddTeam = async () => {
        if (!dept || !newTeamTitle.trim()) return;
        setIsAddingTeam(true);
        try {
            const firebase = createClient();

            // Get max display_order
            const { data: existing } = await firebase
                .from("teams")
                .select("display_order")
                .eq("department_id", dept.id)
                .order("display_order", { ascending: false })
                .limit(1);

            const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

            const { error: dbError } = await firebase
                .from("teams")
                .insert({
                    department_id: dept.id,
                    title: newTeamTitle,
                    display_order: nextOrder
                });

            if (dbError) throw new Error(dbError.message);

            setNewTeamTitle("");
            await fetchDepartment();
            notifications.success("The team was added successfully.", "Team added");
        } catch (err) {
            notifications.error(err instanceof Error ? err.message : "Failed to add team", "Team not added");
        }
        setIsAddingTeam(false);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Are you sure you want to delete this team and all its members?")) return;
        const firebase = createClient();

        // Members deletion will cascade if configured, but let's assume we do it safely:
        try {
            await firebase.from("teams").delete().eq("id", teamId);
            await fetchDepartment();
            notifications.success("The team and its members were deleted.", "Team deleted");
        } catch (err) {
            console.error(err);
            notifications.error(err instanceof Error ? err.message : "Failed to delete team", "Team not deleted");
        }
    };

    // --- Members Handlers ---
    const openAddMember = (teamId?: string) => {
        setEditingMemberId(null);
        setMemberForm({
            name: "",
            role: "",
            teamId: teamId || (dept?.teams[0]?.id || ""),
            socials: {},
        });
        setMemberImageUrl("");
        setMemberImagePreview(null);
        setMemberImageFile(null);
        setShowMemberModal(true);
    };

    const openEditMember = (member: MemberWithTeam) => {
        setEditingMemberId(member.id);
        const parsedSocials = typeof member.socials === 'object' && member.socials !== null ? member.socials as SocialLinks : {};
        setMemberForm({
            name: member.name,
            role: member.role || "",
            teamId: member.team_id || "",
            socials: parsedSocials,
        });
        setMemberImageUrl(member.image_url || "");
        setMemberImagePreview(null);
        setMemberImageFile(null);
        setShowMemberModal(true);
    };

    const handleSaveMember = async () => {
        if (!memberForm.name.trim() || !memberForm.teamId) {
            notifications.warning("Name and team are required before saving a member.", "Missing information");
            return;
        }

        setIsSavingMember(true);
        let uploadedImageUrl = "";
        try {
            let image_url = memberImageUrl;

            // Handle image upload & replace
            if (memberImageFile) {
                const result = await uploadImageAction(memberImageFile, "members");
                image_url = result.url;
                uploadedImageUrl = result.url;
            }

            const firebase = createClient();

            // Clean socials
            const cleanedSocials: SocialLinks = {};
            for (const [k, v] of Object.entries(memberForm.socials)) {
                if (v && v.trim() !== "") cleanedSocials[k] = v.trim();
            }

            if (editingMemberId) {
                // Update
                const { error: dbError } = await firebase
                    .from("members")
                    .update({
                        name: memberForm.name,
                        role: memberForm.role,
                        team_id: memberForm.teamId,
                        socials: cleanedSocials,
                        image_url
                    })
                    .eq("id", editingMemberId);

                if (dbError) throw new Error(dbError.message);
            } else {
                // Create
                const { data: existing } = await firebase
                    .from("members")
                    .select("display_order")
                    .eq("team_id", memberForm.teamId)
                    .order("display_order", { ascending: false })
                    .limit(1);

                const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

                const { error: dbError } = await firebase
                    .from("members")
                    .insert({
                        team_id: memberForm.teamId,
                        name: memberForm.name,
                        role: memberForm.role,
                        socials: cleanedSocials,
                        image_url,
                        display_order: nextOrder
                    });
                if (dbError) throw new Error(dbError.message);
            }

            if (editingMemberId && uploadedImageUrl) {
                await deleteImageAction(memberImageUrl).catch((imageError) =>
                    console.error("Failed to delete replaced member photo", imageError)
                );
            }

            setShowMemberModal(false);
            await fetchDepartment();
            notifications.success(editingMemberId ? "The member was updated successfully." : "The member was added successfully.", editingMemberId ? "Member updated" : "Member added");
        } catch (err) {
            if (uploadedImageUrl) await deleteImageAction(uploadedImageUrl).catch(() => undefined);
            notifications.error(err instanceof Error ? err.message : "Failed to save member", "Member not saved");
        }
        setIsSavingMember(false);
    };

    const handleDeleteMember = async (member: MemberWithTeam) => {
        if (!confirm(`Are you sure you want to remove ${member.name}?`)) return;
        const firebase = createClient();

        try {
            const { error: databaseError } = await firebase.from("members").delete().eq("id", member.id);
            if (databaseError) throw databaseError;
            await deleteImageAction(member.image_url || "").catch((imageError) =>
                console.error("Failed to delete Firebase member photo", imageError)
            );
            await fetchDepartment();
            notifications.success(`${member.name} was removed successfully.`, "Member removed");
        } catch (err) {
            console.error(err);
            notifications.error(err instanceof Error ? err.message : "Failed to remove member", "Member not removed");
        }
    };

    // --- Social handlers ---
    const updateSocial = (key: string, value: string) => setMemberForm(p => ({ ...p, socials: { ...p.socials, [key]: value } }));
    const removeSocial = (key: string) => setMemberForm(p => { const s = { ...p.socials }; delete s[key]; return { ...p, socials: s }; });
    const MAX_SOCIALS = 4;
    const addSocial = (key: string) => {
        if (Object.keys(memberForm.socials).length >= MAX_SOCIALS) return;
        setMemberForm(p => ({ ...p, socials: { ...p.socials, [key]: "" } }));
    };
    const getActiveSocials = (socials: unknown) => {
        if (!socials || typeof socials !== 'object') return [];
        return Object.entries(socials as SocialLinks).filter(([, v]) => v && v.trim() !== "");
    };
    const getAvailablePlatforms = () => {
        if (Object.keys(memberForm.socials).length >= MAX_SOCIALS) return [];
        return socialPlatforms.filter(p => !(p.key in memberForm.socials));
    };

    if (loading) {
        return (
            <>
                <AdminTopbar title="Edit Department" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            </>
        );
    }

    if (!dept) {
        return (
            <>
                <AdminTopbar title="Edit Department" />
                <div className="flex-1 p-8 text-center">
                    <p className="text-[var(--gray)]">Department not found.</p>
                    <Link href="/club-console-alqisc-7q4m-test/admin/departments" className="text-[var(--primary)] hover:underline mt-2 inline-block">
                        ← Back to Departments
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminTopbar title="Edit Department" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/club-console-alqisc-7q4m-test/admin/departments" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Departments
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">{dept.full_name}</span>
                </div>

                {/* Tabs */}
                <div data-tour="dept-tabs" className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm mb-6 w-fit overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`px-5 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === "details"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--gray)] hover:text-[var(--dark)] hover:bg-gray-50"
                            }`}
                    >
                        Department Details
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`px-5 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === "members"
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--gray)] hover:text-[var(--dark)] hover:bg-gray-50"
                            }`}
                    >
                        Members ({dept.teams.reduce((a, t) => a + (t.members?.length || 0), 0)})
                    </button>
                </div>

                {/* Details Tab */}
                {activeTab === "details" && (
                    <form onSubmit={handleDeptSubmit} className="max-w-4xl pb-10">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Short Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                    Description <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                                />
                            </div>

                            {/* Department Image */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Department Photo</label>
                                <ImageEditorField
                                    label="Department photo"
                                    value={deptImagePreview || deptImageUrl}
                                    aspectRatio={16 / 9}
                                    previewClassName="h-40 w-full sm:w-72"
                                    onEdited={(file) => {
                                        setDeptImageFile(file);
                                        setDeptImagePreview(URL.createObjectURL(file));
                                    }}
                                    onRemove={() => {
                                        setDeptImagePreview(null);
                                        setDeptImageFile(null);
                                        setDeptImageUrl("");
                                    }}
                                />
                            </div>

                            {/* Objectives */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-2">Objectives</label>
                                <div className="space-y-2">
                                    {objectives.map((obj, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={obj}
                                                onChange={(e) => {
                                                    const n = [...objectives];
                                                    n[idx] = e.target.value;
                                                    setObjectives(n);
                                                }}
                                                placeholder={`Objective ${idx + 1}`}
                                                className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                            />
                                            {objectives.length > 1 && (
                                                <button type="button" onClick={() => setObjectives(objectives.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setObjectives([...objectives, ""])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add Objective
                                </button>
                            </div>

                            {/* Responsibilities */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-2">Responsibilities</label>
                                <div className="space-y-2">
                                    {responsibilities.map((resp, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={resp}
                                                onChange={(e) => {
                                                    const n = [...responsibilities];
                                                    n[idx] = e.target.value;
                                                    setResponsibilities(n);
                                                }}
                                                placeholder={`Responsibility ${idx + 1}`}
                                                className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                            />
                                            {responsibilities.length > 1 && (
                                                <button type="button" onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => setResponsibilities([...responsibilities, ""])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add Responsibility
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                            <Link href="/club-console-alqisc-7q4m-test/admin/departments" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                                <X className="w-4 h-4" /> Cancel
                            </Link>
                            <button type="submit" disabled={isSavingDept} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60">
                                {isSavingDept ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Save Department</>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Members Tab */}
                {activeTab === "members" && (
                    <div className="max-w-5xl pb-10">
                        {dept.teams.map((team) => (
                            <div key={team.id} className="mb-8">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--dark)] flex items-center gap-2">
                                        {team.title}
                                        <button onClick={() => handleDeleteTeam(team.id)} className="text-gray-400 hover:text-red-500 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity" title="Delete Team">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </h3>
                                    <button
                                        data-tour="dept-add-member"
                                        onClick={() => openAddMember(team.id)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Add Member
                                    </button>
                                </div>

                                {team.members && team.members.length > 0 ? (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {team.members.map((member) => {
                                            const activeSocials = getActiveSocials(member.socials).slice(0, 4);

                                            return (
                                                <div
                                                    key={member.id}
                                                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group hover:border-[var(--primary)]/20 hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Photo */}
                                                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow flex-shrink-0 bg-gray-100">
                                                            {member.image_url ? (
                                                                <Image src={member.image_url} alt={member.name} fill className="object-cover" sizes="56px" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400"><UserPlus className="w-6 h-6" /></div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-[var(--dark)] truncate">{member.name}</p>
                                                            <p className="text-xs text-[var(--gray)] truncate">{member.role}</p>

                                                            {/* Social Icons — max 4 */}
                                                            {activeSocials.length > 0 && (
                                                                <div className="flex gap-1.5 mt-2">
                                                                    {activeSocials.map(([key]) => {
                                                                        const Icon = iconMap[key];
                                                                        const color = colorMap[key] || "#666";
                                                                        return Icon ? (
                                                                            <div
                                                                                key={key}
                                                                                className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                                                                                style={{ backgroundColor: color + "18" }}
                                                                                title={key.charAt(0).toUpperCase() + key.slice(1)}
                                                                            >
                                                                                <span style={{ color }}><Icon className="w-3 h-3" /></span>
                                                                            </div>
                                                                        ) : null;
                                                                    })}
                                                                    {Object.keys(member.socials || {}).length > 4 && (
                                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-[var(--gray)]">
                                                                            +{Object.keys(member.socials || {}).length - 4}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditMember(member)}
                                                                className="p-1.5 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMember(member)}
                                                                className="p-1.5 text-[var(--gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-[var(--gray)] italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        No members in this team yet.
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add New Team Section */}
                        <div className="mt-8 p-5 bg-white rounded-2xl border border-dashed border-gray-300">
                            <h4 className="text-sm font-semibold text-[var(--dark)] mb-3">Add New Team</h4>
                            <div className="flex gap-3 max-w-sm">
                                <input
                                    type="text"
                                    value={newTeamTitle}
                                    onChange={(e) => setNewTeamTitle(e.target.value)}
                                    placeholder="e.g. Core Team"
                                    className="flex-1 px-4 py-2.5 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                />
                                <button
                                    onClick={handleAddTeam}
                                    disabled={!newTeamTitle.trim() || isAddingTeam}
                                    className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isAddingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Member Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-[var(--dark)]">
                                {editingMemberId ? "Edit Member" : "Add New Member"}
                            </h3>
                            <button onClick={() => setShowMemberModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-[var(--gray)]" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Photo Upload */}
                            <div>
                                <p className="mb-2 text-sm font-medium text-[var(--dark)]">Member Photo</p>
                                <ImageEditorField
                                    label="Member photo"
                                    value={memberImagePreview || memberImageUrl}
                                    aspectRatio={1}
                                    previewClassName="h-24 w-24 rounded-full"
                                    onEdited={(file) => {
                                        setMemberImageFile(file);
                                        setMemberImagePreview(URL.createObjectURL(file));
                                    }}
                                    onRemove={() => {
                                        setMemberImagePreview(null);
                                        setMemberImageFile(null);
                                        setMemberImageUrl("");
                                    }}
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={memberForm.name}
                                        onChange={(e) => {
                                            const words = e.target.value.trimStart().split(/\s+/);
                                            if (words.length <= 2 || e.target.value.length < memberForm.name.length) {
                                                setMemberForm({ ...memberForm, name: e.target.value });
                                            }
                                        }}
                                        placeholder="First Last"
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                    <p className="text-xs text-[var(--gray)] mt-1">Maximum 2 names (first & last).</p>
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        value={memberForm.role}
                                        onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                                        placeholder="e.g. Head of Department"
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Team */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Team <span className="text-red-400">*</span></label>
                                <select
                                    value={memberForm.teamId}
                                    onChange={(e) => setMemberForm({ ...memberForm, teamId: e.target.value })}
                                    className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                >
                                    <option value="" disabled>Select a team</option>
                                    {dept.teams.map((t) => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Social Media Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-[var(--dark)]">
                                        Social Media & Contact
                                    </label>
                                    <span className="text-[10px] text-[var(--gray)] bg-gray-100 px-2 py-0.5 rounded-full">
                                        Max 4 shown on card
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--gray)] mb-3">
                                    Add the member&apos;s social media links. Only the first 4 will be displayed on the member card.
                                </p>

                                {/* Active Social Links */}
                                <div className="space-y-2">
                                    {Object.entries(memberForm.socials).map(([key, value]) => {
                                        const platform = socialPlatforms.find((p) => p.key === key);
                                        if (!platform) return null;
                                        const Icon = platform.icon;
                                        return (
                                            <div key={key} className="flex items-center gap-2">
                                                <div
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: platform.color + "15" }}
                                                >
                                                    <Icon className="w-4 h-4" style={{ color: platform.color }} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => updateSocial(key, e.target.value)}
                                                    placeholder={platform.placeholder}
                                                    className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeSocial(key)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add More Social Links */}
                                {getAvailablePlatforms().length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs font-medium text-[var(--gray)] mb-2">Add platform:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {getAvailablePlatforms().map((platform) => {
                                                const Icon = platform.icon;
                                                return (
                                                    <button
                                                        key={platform.key}
                                                        type="button"
                                                        onClick={() => addSocial(platform.key)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--gray)] bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
                                                    >
                                                        <Icon className="w-3.5 h-3.5" style={{ color: platform.color }} />
                                                        {platform.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowMemberModal(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMember}
                                disabled={isSavingMember}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isSavingMember && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingMemberId ? "Save Changes" : "Add Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
