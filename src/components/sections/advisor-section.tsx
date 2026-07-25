"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AdvisorSectionProps {
  name?: string;
  title?: string;
  description?: string;
  image?: string;
}

export function AdvisorSection({ name, title, description, image }: AdvisorSectionProps) {
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
    <section ref={sectionRef} className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
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
            Meet Our Advisor
          </h5>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--dark)]">
            Guidance and Support
          </h2>
        </div>

        {/* Advisor Content */}
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] md:gap-14">
          {/* Image */}
          <div
            className={cn(
              "justify-self-center transition-all delay-100 duration-500 motion-reduce:transform-none motion-reduce:transition-none",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
          >
            <div className="relative h-[280px] w-[280px] overflow-hidden rounded-full border-4 border-white shadow-md sm:h-[300px] sm:w-[300px]">
              <Image
                src={image || "/images/Advicer.jpeg"}
                alt={`${name || "Mr. Osaid"} - ${title || "Advisor"}`}
                fill
                sizes="(max-width: 639px) 280px, 300px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div
            className={cn(
              "text-center transition-all delay-200 duration-500 motion-reduce:transform-none motion-reduce:transition-none md:text-left",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
          >
            <h3 className="font-heading text-2xl md:text-3xl font-bold text-[var(--dark)] mb-2">
              {name || "Mr. Osaid"}
            </h3>
            <p className="text-[var(--primary)] font-semibold text-lg mb-4">
              {title || "Advisor"}
            </p>
            <p className="text-[var(--gray)] leading-relaxed max-w-lg">
              {description || "Mr. Osaid provides invaluable guidance and mentorship to the Al-Qur'an and Islamic Club (AL-QISC). With a wealth of experience and knowledge, he plays a pivotal role in steering the club toward achieving its mission and goals. His dedication and wisdom are a cornerstone of the club's success."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
