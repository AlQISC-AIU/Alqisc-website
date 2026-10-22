"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { NewsCard } from "@/components/sections/news-card";
import type { FeedItem, FeedKind } from "@/lib/feed";

const filters: { id: "all" | Exclude<FeedKind, "event">; label: string }[] = [
  { id: "all", label: "All news" },
  { id: "announcement", label: "Announcements" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

// Filters in the browser, like the Events page, so switching tabs is instant.
export function NewsBrowser({ items }: { items: FeedItem[] }) {
  const [active, setActive] = useState<(typeof filters)[number]["id"]>("all");
  const shown = active === "all" ? items : items.filter((item) => item.kind === active);

  return (
    <>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 border-b border-[var(--primary)]/10 pb-10 text-center">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Stay in touch</p>
          <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">What&apos;s new at AL-QISC</h2>
          <p className="mt-4 leading-7 text-[var(--gray)]">The same updates you see in the AL-QISC mobile app.</p>
        </div>
        <div className="flex max-w-full justify-start gap-2 overflow-x-auto pb-1 sm:justify-center" aria-label="Filter news">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              onClick={() => setActive(filter.id)}
              aria-pressed={active === filter.id}
              className={`min-h-11 shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                active === filter.id
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--primary)]/15 bg-white text-[var(--dark)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-6 py-16 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-[var(--primary)]" aria-hidden="true" />
          <h3 className="mt-5 font-heading text-2xl font-bold text-[var(--dark)]">Nothing here yet</h3>
          <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--gray)]">Check back soon, or choose another filter.</p>
        </div>
      )}
    </>
  );
}
