import { FeedEditor } from "@/components/admin/feed-editor";
import { isEditableKind } from "@/lib/feed";

export default async function NewFeedItemPage({
    searchParams,
}: {
    searchParams: Promise<{ kind?: string }>;
}) {
    const { kind } = await searchParams;
    return <FeedEditor kind={isEditableKind(kind) ? kind : "event"} />;
}
