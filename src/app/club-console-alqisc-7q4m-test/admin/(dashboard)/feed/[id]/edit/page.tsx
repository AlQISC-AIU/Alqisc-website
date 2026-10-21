import { notFound, redirect } from "next/navigation";
import { FeedEditor } from "@/components/admin/feed-editor";
import { adminPath } from "@/lib/admin-routes";
import { isEditableKind } from "@/lib/feed";
import { requireAdminSession } from "@/lib/firebase/admin";
import { getFeedItem } from "@/lib/firebase/feed-admin";
import { FEED_ID } from "@/lib/firebase/feed-route";

export const dynamic = "force-dynamic";

export default async function EditFeedItemPage({ params }: { params: Promise<{ id: string }> }) {
    await requireAdminSession();
    const { id } = await params;
    if (!FEED_ID.test(id)) notFound();

    const item = await getFeedItem(id);
    if (!item) notFound();
    // Imported posts are managed from the list (archive, republish, priority).
    if (item.source !== "alqisc" || !isEditableKind(item.kind)) redirect(adminPath("/feed"));

    return <FeedEditor kind={item.kind} initial={item} />;
}
