"use client";

import { SectionHeader } from "@/components/ui/section-header";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface Highlight {
  id: string;
  title: string;
  image: string;
}

interface HighlightsSectionProps {
  highlights: Highlight[];
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, highlights.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <SectionHeader
          subtitle="Al-QIsc Club"
          title="Recent Highlights"
          align="center"
        />

        <div className="relative mt-12">
          {/* Gallery Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out gap-6"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView + 2)}%)`,
              }}
            >
              {highlights.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0"
                  style={{ width: `calc(${100 / itemsPerView}% - 1rem)` }}
                >
                  <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer">
                    {/* Placeholder background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]" />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors" />

                    {/* Content */}
                    <div className="absolute inset-0 flex items-end p-6">
                      <div className="text-white">
                        <h3 className="font-heading text-xl font-bold group-hover:text-[var(--secondary)] transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-white/80 text-sm mt-1">
                          Click to view gallery
                        </p>
                      </div>
                    </div>

                    {/* Hover effect */}
                    <div className="absolute inset-0 border-4 border-transparent group-hover:border-[var(--secondary)] rounded-2xl transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentIndex === maxIndex}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--gray)]/30"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
