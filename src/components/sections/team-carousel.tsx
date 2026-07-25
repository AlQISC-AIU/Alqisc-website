"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  name: string;
  role: string;
  image: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface TeamCarouselProps {
  members: TeamMember[];
  title?: string;
  subtitle?: string;
}

export function TeamCarousel({
  members,
  title = "Top Management",
  subtitle = "Al-Qisc",
}: TeamCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [itemsPerView, setItemsPerView] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 768) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, members.length - itemsPerView);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [members.length, itemsPerView]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    const maxIndex = Math.max(0, members.length - itemsPerView);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <section
      ref={sectionRef}
      className="overflow-x-clip bg-[var(--light)] py-20 md:py-24 lg:py-28"
    >
      <div className="container mx-auto min-w-0 px-5 sm:px-6 lg:px-8">
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
            {subtitle}
          </h5>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--dark)]">
            {title}
          </h2>
        </div>

        {/* Carousel */}
        <div
          className={cn(
            "relative transition-all duration-700 delay-300",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          )}
        >
          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-[var(--primary)] hover:text-white sm:h-12 sm:w-12 md:-translate-x-4"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-[var(--primary)] hover:text-white sm:h-12 sm:w-12 md:translate-x-4"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Carousel Track */}
          <div className="mx-7 min-w-0 overflow-hidden sm:mx-8">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
              }}
            >
              {members.map((member, index) => (
                <div
                  key={index}
                  className="min-w-0 flex-shrink-0 px-2 sm:px-3"
                  style={{ width: `${100 / itemsPerView}%` }}
                >
                  <div className="bg-[#f0f0f0] rounded-2xl overflow-hidden team-item shadow-lg">
                    {/* Top Chevron Decoration */}
                    <div className="relative h-28 bg-[#f0f0f0]">
                      <svg
                        viewBox="0 0 300 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full"
                      >
                        <path d="M0,0 L300,0 L300,50 L150,100 L0,50 Z" fill="var(--secondary)" />
                      </svg>
                    </div>

                    {/* Profile Image */}
                    <div className="relative -mt-20 flex justify-center">
                      <div className="relative h-36 w-36 overflow-hidden rounded-full bg-white ring-[5px] ring-[var(--secondary)] sm:h-44 sm:w-44">
                        <Image
                          src={member.image}
                          alt={member.name}
                          fill
                          sizes="(max-width: 639px) 144px, 176px"
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="text-center py-8 px-5">
                      <h4 className="font-heading font-bold text-xl text-[var(--dark)] mb-1">
                        {member.name}
                      </h4>
                      <p className="text-[var(--gray)] text-base mb-6">
                        {member.role}
                      </p>

                      {/* Social Links */}
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {member.facebook && (
                          <a
                            href={member.facebook}
                            aria-label="Facebook"
                            title="Facebook"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                            </svg>
                          </a>
                        )}
                        {member.twitter && (
                          <a
                            href={member.twitter}
                            aria-label="Twitter"
                            title="Twitter"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.44 4.83c-.8.37-1.5.38-2.22.02.93-.56.98-.96 1.32-2.02-.88.52-1.86.9-2.9 1.1-.82-.88-2-1.43-3.3-1.43-2.5 0-4.55 2.04-4.55 4.54 0 .36.03.7.1 1.04-3.77-.2-7.12-2-9.36-4.75-.4.67-.6 1.45-.6 2.3 0 1.56.8 2.95 2 3.77-.74-.03-1.44-.23-2.05-.57v.06c0 2.2 1.56 4.03 3.64 4.44-.67.2-1.37.2-2.06.08.58 1.8 2.26 3.12 4.25 3.16C5.78 18.1 3.37 18.74 1 18.46c2 1.3 4.4 2.04 6.97 2.04 8.35 0 12.92-6.92 12.92-12.93 0-.2 0-.4-.02-.6.9-.63 1.96-1.22 2.56-2.14z"/>
                            </svg>
                          </a>
                        )}
                        {member.instagram && (
                          <a
                            href={member.instagram}
                            aria-label="Instagram"
                            title="Instagram"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </a>
                        )}
                        {member.linkedin && (
                          <a
                            href={member.linkedin}
                            aria-label="LinkedIn"
                            title="LinkedIn"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </a>
                        )}
                        {member.github && (
                          <a
                            href={member.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            title="GitHub"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </a>
                        )}
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            aria-label="Email"
                            title="Email"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                          </a>
                        )}
                        {member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            aria-label="Phone"
                            title="Phone"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                          </a>
                        )}
                        {member.website && (
                          <a
                            href={member.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Website"
                            title="Website"
                            className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--dark)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.max(1, members.length - itemsPerView + 1) }).map(
              (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all",
                    currentIndex === index
                      ? "bg-[var(--primary)] w-8"
                      : "bg-[var(--gray)]/30 hover:bg-[var(--gray)]/50"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
