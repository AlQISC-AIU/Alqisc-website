import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewsCard } from "@/components/sections/news-card";
import type { FeedItem } from "@/lib/feed";

export function LatestNewsSection({ items }: { items: FeedItem[] }) {
    if (items.length === 0) return null;
    return (
        <section className="bg-white py-20 md:py-24" aria-labelledby="latest-news-title">
            <div className="container mx-auto px-5 sm:px-6 lg:px-8">
                <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">News</p>
                        <h2 id="latest-news-title" className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">
                            Latest updates
                        </h2>
                        <p className="mt-4 leading-7 text-[var(--gray)]">
                            Announcements from the club and our latest posts on Instagram and YouTube.
                        </p>
                    </div>
                    <Link
                        href="/news"
                        className="inline-flex items-center gap-2 self-start font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus:outline-none focus:underline sm:self-auto"
                    >
                        See all news
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
                <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <NewsCard key={item.id} item={item} />
                    ))}
                </div>
            </div>
        </section>
    );
}
