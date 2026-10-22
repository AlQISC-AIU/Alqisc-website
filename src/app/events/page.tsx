"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { CLUB_TIME_ZONE } from "@/lib/feed";
import type { Event } from "@/lib/firebase/types";

const filters = [
  { id: "all", label: "All events" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
] as const;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CLUB_TIME_ZONE,
  });
}

function statusLabel(status: string) {
  return status === "upcoming" ? "Upcoming" : "Past event";
}

export default function EventsPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadError("");
        const response = await fetch("/api/public/events");
        if (!response.ok) throw new Error("Events could not be loaded.");
        setAllEvents(await response.json() as Event[]);
      } catch (error) {
        console.error("Failed to load events", error);
        setLoadError("Events could not be loaded. Please refresh and try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, []);

  const filteredEvents = activeFilter === "all"
    ? allEvents
    : allEvents.filter((event) => event.status === activeFilter);

  return (
    <>
      <InnerPageHero
        image="/images/events/Qur_competion1.jpg"
        title="Events Gallery"
        description="Explore our past and upcoming events that bring the community together."
        imagePosition="center 32%"
      />

      <main className="bg-white py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 border-b border-[var(--primary)]/10 pb-10 text-center">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Browse events</p>
              <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">What&apos;s happening</h2>
              <p className="mt-4 leading-7 text-[var(--gray)]">Select a category to explore what is coming next or revisit recent activities.</p>
            </div>
            <div className="flex max-w-full justify-start gap-2 overflow-x-auto pb-1 sm:justify-center" aria-label="Filter events">
              {filters.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={activeFilter === filter.id}
                  className={`min-h-11 shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                    activeFilter === filter.id
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--primary)]/15 bg-white text-[var(--dark)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading events" aria-live="polite">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white">
                  <div className="aspect-[16/10] animate-pulse bg-[var(--light)]" />
                  <div className="space-y-4 p-6">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--light)]" />
                    <div className="h-7 w-4/5 animate-pulse rounded bg-[var(--light)]" />
                    <div className="h-16 animate-pulse rounded bg-[var(--light)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div role="alert" className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">{loadError}</div>
          ) : filteredEvents.length ? (
            <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <article key={event.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <Link href={`/events/${event.id}`} className="relative block aspect-[16/10] overflow-hidden bg-[var(--light)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary)]">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl font-semibold text-[var(--primary)]/45">Al-QIsc</div>
                    )}
                    <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${
                      event.status === "upcoming"
                        ? "bg-[var(--secondary)] text-[var(--dark)]"
                        : "bg-white text-[var(--gray-dark)]"
                    }`}>
                      {statusLabel(event.status)}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-6">
                    {event.category ? (
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{event.category}</p>
                    ) : null}
                    <h3 className="font-heading text-xl font-bold leading-snug text-[var(--dark)]">
                      <Link href={`/events/${event.id}`} className="transition-colors hover:text-[var(--primary)] focus:outline-none focus:underline">
                        {event.title}
                      </Link>
                    </h3>
                    <div className="mt-4 space-y-2 text-sm text-[var(--gray)]">
                      <p className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                        <span>{formatDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
                      </p>
                      {event.location ? (
                        <p className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                          <span className="line-clamp-2">{event.location}</span>
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-5 line-clamp-3 flex-1 text-sm leading-7 text-[var(--gray)]">{event.description}</p>
                    <Link href={`/events/${event.id}`} className="mt-6 inline-flex items-center gap-2 self-start font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus:outline-none focus:underline">
                      View event
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-6 py-16 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-[var(--primary)]" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-2xl font-bold text-[var(--dark)]">No events in this category</h3>
              <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--gray)]">Choose another filter to continue browsing the Al-QIsc event calendar.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
