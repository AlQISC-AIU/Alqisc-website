import Link from "next/link";
import Image from "next/image";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import type { Event } from "@/lib/firebase/types";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface EventsPreviewSectionProps {
  events: Event[];
}

export function EventsPreviewSection({ events }: EventsPreviewSectionProps) {
  if (events.length === 0) return null;

  return (
    <section className="py-20 bg-[var(--light)]">
      <div className="container mx-auto px-4">
        <SectionHeader
          subtitle="Al-QIsc Club"
          title="Upcoming Events"
          description="Join us in our upcoming events and activities designed to strengthen faith and community."
          align="center"
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {events.slice(0, 3).map((event) => (
            <Card key={event.id} className="group">
              {/* Image */}
              <div className="relative h-48 bg-[var(--primary)]/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                <div className="absolute top-4 left-4 z-20">
                  <span className="px-3 py-1 bg-[var(--secondary)] text-[var(--dark)] text-sm font-semibold rounded-full">
                    {event.category}
                  </span>
                </div>
                {event.image_url ? (
                  <Image
                    src={event.image_url}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--primary)]/20 flex items-center justify-center">
                    <span className="text-[var(--primary)] font-semibold">
                      Event Image
                    </span>
                  </div>
                )}
              </div>

              <CardContent className="p-6">
                <div className="flex items-center gap-4 text-sm text-[var(--gray)] mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold text-[var(--dark)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                  {event.title}
                </h3>
                <p className="text-[var(--gray)] mb-4 line-clamp-2">
                  {event.description}
                </p>
                <Link
                  href={`/events/${event.id}`}
                  className="inline-flex items-center gap-2 text-[var(--primary)] font-semibold hover:gap-3 transition-all"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/events">
            <Button variant="primary" size="lg">
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
