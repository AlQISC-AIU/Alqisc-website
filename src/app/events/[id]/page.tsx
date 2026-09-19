import { getCachedEventById } from "@/lib/firebase/public-content";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSiteUrl } from "@/lib/site-url";

const getEvent = cache(getCachedEventById);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id).catch(() => null);

  if (!event) return { title: "Event Not Found" };
  const description = event.description || `Event hosted by AL-QISC at Albukhary International University.`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: {
      type: "website",
      url: `/events/${event.id}`,
      title: event.title,
      description,
      images: event.image_url ? [{ url: event.image_url, alt: event.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.image_url ? [event.image_url] : [],
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) notFound();

  const event = await getEvent(id).catch(() => null);
  if (!event) notFound();

  const siteUrl = getSiteUrl();
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date,
    eventStatus: event.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : event.status === "upcoming"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${siteUrl}/events/${event.id}`,
    image: event.image_url ? [event.image_url] : undefined,
    location: {
      "@type": "Place",
      name: event.location || "Albukhary International University",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Alor Setar",
        addressRegion: "Kedah",
        addressCountry: "MY",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "AL-QISC",
      url: `${siteUrl}/`,
    },
  };

  const eventDate = new Date(event.date);
  const formattedDate = Number.isNaN(eventDate.getTime())
    ? event.date
    : eventDate.toLocaleDateString("en-MY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  const statusLabel = event.status === "upcoming"
    ? "Upcoming"
    : event.status === "cancelled"
      ? "Cancelled"
      : "Past Event";

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/</g, "\\u003c") }}
      />
      <section className="bg-[var(--light)] pb-14 pt-32 md:pb-16 md:pt-36">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gray)] transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Link>
          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider">
              <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-white">
                {event.category || "Event"}
              </span>
              <span className={`rounded-full px-3 py-1 ${event.status === "upcoming" ? "bg-[var(--secondary)] text-[var(--dark)]" : "bg-white text-[var(--gray)]"}`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="mt-5 text-balance font-heading text-4xl font-bold leading-tight text-[var(--dark)] md:text-5xl lg:text-6xl">
              {event.title}
            </h1>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)] lg:gap-10">
            <div>
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] shadow-sm">
                {event.image_url ? (
                  <Image
                    src={event.image_url}
                    alt={event.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-[var(--gray)]">
                    <Calendar className="h-12 w-12 text-[var(--primary)]/35" />
                    <span className="mt-3 text-sm">Event image coming soon</span>
                  </div>
                )}
              </div>

              <article className="mt-10 md:mt-12">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Event Information</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--dark)] md:text-3xl">
                  About the Event
                </h2>
                <div className="mt-5 whitespace-pre-wrap text-base leading-8 text-[var(--gray)]">
                  {event.description}
                </div>
              </article>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28">
              <dl className="overflow-hidden rounded-2xl border border-[var(--primary)]/15 bg-white shadow-sm">
                <div className="flex gap-4 border-b border-[var(--primary)]/10 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--light)] text-[var(--primary)]">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Date</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--dark)]">{formattedDate}</dd>
                  </div>
                </div>
                <div className="flex gap-4 border-b border-[var(--primary)]/10 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--light)] text-[var(--primary)]">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Time</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--dark)]">{event.time || "To be announced"}</dd>
                  </div>
                </div>
                <div className="flex gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--light)] text-[var(--primary)]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Location</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--dark)]">{event.location || "To be announced"}</dd>
                  </div>
                </div>
              </dl>

              {event.status === "upcoming" && event.registration_url ? (
                <div className="rounded-2xl bg-[var(--primary)] p-6 text-white">
                  <h2 className="font-heading text-2xl font-bold">Join This Event</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">
                    Reserve your place and receive the latest information from the event team.
                  </p>
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--secondary)] px-6 py-3.5 font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--secondary-dark)]"
                  >
                    Register Now <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--light)] p-6">
                  <h2 className="font-heading text-xl font-bold text-[var(--dark)]">Have a Question?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--gray)]">
                    Contact AL-QISC for information about this event or similar upcoming activities.
                  </p>
                  <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                    Contact us <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
