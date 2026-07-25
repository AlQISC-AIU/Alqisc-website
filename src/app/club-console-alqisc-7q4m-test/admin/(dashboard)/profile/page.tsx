"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorField } from "@/components/admin/image-editor";
import { deleteImageAction, uploadImageAction } from "@/lib/firebase/storage";
import { KeyRound, Loader2, Save } from "lucide-react";
import { notifications } from "@/components/ui/notification-provider";

type Profile = { email: string; displayName: string; photoUrl: string };

async function readError(response: Response, fallback: string) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
}

export default function AdminProfilePage() {
    const [profile, setProfile] = useState<Profile>({ email: "", displayName: "", photoUrl: "" });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passwordSending, setPasswordSending] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Profile action failed");
    const setNotice = (message: string) => message && notifications.success(message, "Profile updated");
    const photoPreview = useMemo(
        () => photoFile ? URL.createObjectURL(photoFile) : "",
        [photoFile]
    );

    useEffect(() => () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    useEffect(() => {
        void (async () => {
            try {
                const response = await fetch("/api/admin/profile", { cache: "no-store" });
                if (!response.ok) throw new Error(await readError(response, "Unable to load your profile."));
                const body = (await response.json()) as { profile: Profile };
                setProfile(body.profile);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const saveProfile = async () => {
        setSaving(true); setError(""); setNotice("");
        let nextPhotoUrl = profile.photoUrl;
        try {
            if (photoFile) {
                const oldPhoto = profile.photoUrl;
                const upload = await uploadImageAction(photoFile, "profiles");
                nextPhotoUrl = upload.url;
                const response = await fetch("/api/admin/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ displayName: profile.displayName, photoUrl: nextPhotoUrl }),
                });
                if (!response.ok) {
                    await deleteImageAction(nextPhotoUrl).catch(() => undefined);
                    throw new Error(await readError(response, "Unable to save your profile."));
                }
                if (oldPhoto) await deleteImageAction(oldPhoto).catch(() => undefined);
            } else {
                const response = await fetch("/api/admin/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ displayName: profile.displayName, photoUrl: nextPhotoUrl }),
                });
                if (!response.ok) throw new Error(await readError(response, "Unable to save your profile."));
            }
            setProfile((current) => ({ ...current, photoUrl: nextPhotoUrl }));
            setPhotoFile(null);
            setNotice("Your profile was updated. Refresh other open admin pages to see the new name and photo.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
        } finally { setSaving(false); }
    };

    const sendPasswordEmail = async () => {
        setPasswordSending(true); setError(""); setNotice("");
        const response = await fetch("/api/admin/profile", { method: "POST" });
        if (!response.ok) setError(await readError(response, "Unable to send password email."));
        else setNotice(`A password update link was sent to ${profile.email}.`);
        setPasswordSending(false);
    };

    return <>
        <AdminTopbar title="My Profile" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div> : <>
                    <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <div><h2 className="text-lg font-bold text-[var(--dark)]">Profile details</h2><p className="text-sm text-[var(--gray)]">Change the name and photo shown in the admin panel.</p></div>
                        <div><label className="mb-2 block text-sm font-semibold text-[var(--dark)]">Email</label><input value={profile.email} disabled className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500" /></div>
                        <div><label className="mb-2 block text-sm font-semibold text-[var(--dark)]">Display name</label><input value={profile.displayName} minLength={2} maxLength={80} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" /></div>
                        <ImageEditorField label="Profile photo" value={photoPreview || profile.photoUrl} aspectRatio={1} onEdited={setPhotoFile} onRemove={() => { setPhotoFile(null); setProfile((current) => ({ ...current, photoUrl: "" })); }} previewClassName="h-28 w-28" />
                        <button type="button" onClick={() => void saveProfile()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile</button>
                    </section>
                    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-[var(--dark)]">Password</h2><p className="mt-1 text-sm text-[var(--gray)]">Firebase will email you a secure link. Your password is never visible to another administrator.</p><button type="button" onClick={() => void sendPasswordEmail()} disabled={passwordSending} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 px-4 py-2.5 text-sm font-semibold text-[var(--primary)] disabled:opacity-60">{passwordSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Email password update link</button></section>
                </>}
            </div>
        </main>
    </>;
}
