"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturedEvent {
  title: string;
  time: string;
  location: string;
  image: string;
  link: string;
  isMain?: boolean;
}

interface FeaturedEventsProps {
  mainEvent: FeaturedEvent;
  sideEvents: FeaturedEvent[];
}

export function FeaturedEvents({ mainEvent, sideEvents }: FeaturedEventsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-24 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <div
            className={cn(
              "lg:col-span-2 transition-all duration-700",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
          >
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] p-6 sm:p-8 lg:p-10">
              <h3 className="text-2xl font-heading font-bold text-[var(--dark)] mb-6">
                Latest News
              </h3>

              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="group relative min-h-[300px] overflow-hidden rounded-xl sm:min-h-[340px] lg:min-h-[400px]">
                  <Image
                    src={mainEvent.image}
                    alt={mainEvent.title}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 42vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 left-4 right-4">
                    <Link href={mainEvent.link}>
                      <Button variant="secondary" size="sm">
                        Register Now
                      </Button>
                    </Link>
                  </div>
                </div>

                <div>
                  <Link
                    href={mainEvent.link}
                    className="text-2xl font-heading font-bold text-[var(--dark)] hover:text-[var(--primary)] transition-colors"
                  >
                    {mainEvent.title}
                  </Link>
                  <div className="mt-4 space-y-2">
                    <p className="flex items-center gap-2 text-[var(--gray)]">
                      <Clock className="w-5 h-5 text-[var(--primary)]" />
                      {mainEvent.time}
                    </p>
                    <p className="flex items-center gap-2 text-[var(--gray)]">
                      <MapPin className="w-5 h-5 text-[var(--primary)]" />
                      {mainEvent.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Events */}
          {sideEvents.length > 0 && (
            <div
              className={cn(
                "transition-all duration-700 delay-200",
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              )}
            >
              <div className="h-full rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] p-6 sm:p-8 lg:p-10">
                <div className="space-y-7">
                {sideEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex gap-4 items-center group"
                  >
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        sizes="(max-width: 639px) 96px, 112px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={event.link}
                        className="font-semibold text-[var(--dark)] hover:text-[var(--primary)] transition-colors line-clamp-2"
                      >
                        {event.title}
                      </Link>
                      <p className="text-sm text-[var(--gray)] flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </p>
                      <p className="text-sm text-[var(--gray)] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
