import Link from "next/link";
import { ArrowRight, ArrowUpRight, Instagram, Megaphone, Youtube } from "lucide-react";
import { formatEventDate, pickText, type FeedItem } from "@/lib/feed";

const KIND = {
    announcement: { label: "Announcement", icon: Megaphone, action: "Read more" },
    instagram: { label: "Instagram", icon: Instagram, action: "View on Instagram" },
    youtube: { label: "YouTube", icon: Youtube, action: "Watch on YouTube" },
} as const;

// Announcements open on this site; Instagram and YouTube posts open where
// they were posted.
export function NewsCard({ item }: { item: FeedItem }) {
    if (item.kind === "event") return null;
    const kind = KIND[item.kind];
    const Icon = kind.icon;
    const title = pickText(item.title);
    const summary = pickText(item.summary);
    const external = item.kind !== "announcement";
    const href = external ? item.permalink : `/news/${item.id}`;
    const date = formatEventDate(item.published_at || "");

    const linkProps = external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {};
    const LinkTag = external ? "a" : Link;

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--light)]">
                {item.thumbnail_url ? (
                    // Instagram and YouTube images come from their own CDNs, whose
                    // links change, so they are not routed through next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.thumbnail_url}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-[var(--primary)]/45">
                        <Icon className="h-10 w-10" aria-hidden="true" />
                    </div>
                )}
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--dark)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                    {kind.label}
                </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
                {date ? <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{date}</p> : null}
                <h3 className="font-heading text-xl font-bold leading-snug text-[var(--dark)] line-clamp-3">{title}</h3>
                {summary && summary !== title ? (
                    <p className="mt-4 line-clamp-3 flex-1 text-sm leading-7 text-[var(--gray)]">{summary}</p>
                ) : (
                    <div className="flex-1" />
                )}
                {href ? (
                    <LinkTag
                        href={href}
                        {...linkProps}
                        className="mt-6 inline-flex items-center gap-2 self-start font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus:outline-none focus:underline"
                    >
                        {kind.action}
                        {external ? (
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        )}
                        {external ? <span className="sr-only">(opens in a new tab)</span> : null}
                    </LinkTag>
                ) : null}
            </div>
        </article>
    );
}
