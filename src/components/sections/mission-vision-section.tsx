"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MissionVisionProps {
  missionText?: string;
  visionText?: string;
}

export function MissionVisionSection({ missionText, visionText }: MissionVisionProps) {
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
    <section
      ref={sectionRef}
      className="relative py-20 md:py-24 lg:py-28"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/visionbg.jpg"
          alt="Background"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-white/85" />
      </div>

      <div className="container relative z-10 mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={cn(
            "mx-auto max-w-xl pb-10 text-center transition-all duration-500 motion-reduce:transform-none motion-reduce:transition-none md:pb-12",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          )}
        >
          <h5 className="text-[var(--primary)] font-semibold text-sm uppercase tracking-wider mb-2">
            Our Objectives
          </h5>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--dark)]">
            Mission and Vision
          </h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:gap-8">
          {/* Mission Card */}
          <div
            className={cn(
              "flex h-full flex-col rounded-2xl border border-[var(--primary)]/10 bg-white p-7 text-center shadow-sm transition-all delay-100 duration-500 motion-reduce:transform-none motion-reduce:transition-none sm:p-9 lg:p-10",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            )}
          >
            <i
              className="fas fa-seedling mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl"
              aria-hidden="true"
            />
            <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-4">
              Mission
            </h3>
            <p className="text-[var(--gray)] leading-relaxed flex-1">
              {missionText || "To promote Islamic values and teachings through meaningful activities by enhancing understanding of the Quran, empowering young Islamic leaders to serve their communities, fostering an inclusive and welcoming environment, and strengthening brotherhood and sisterhood through collaboration."}
            </p>
          </div>

          {/* Vision Card */}
          <div
            className={cn(
              "flex h-full flex-col rounded-2xl border border-[var(--primary)]/10 bg-white p-7 text-center shadow-sm transition-all delay-200 duration-500 motion-reduce:transform-none motion-reduce:transition-none sm:p-9 lg:p-10",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            )}
          >
            <i
              className="fas fa-dove mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl"
              aria-hidden="true"
            />
            <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-4">
              Vision
            </h3>
            <p className="text-[var(--gray)] leading-relaxed">
              {visionText || "To become a distinguished platform for fostering Islamic education and community engagement, inspiring a deep love for the Quran and its teachings, and uniting a diverse Ummah through collaborative and spiritually enriching activities."}
            </p>
            <p className="mt-4 text-[var(--gray-dark)] italic text-sm">
              Guided by Aqidah, Akhlaq, Adab, Amanah, and Amalan principles, the
              club strives to nurture compassionate Islamic leaders dedicated to
              serving humanity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
