"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface GalleryImage {
  src: string;
  alt: string;
  title?: string;
}

interface HighlightsCarouselProps {
  images: GalleryImage[];
  title?: string;
  subtitle?: string;
}

export function HighlightsCarousel({
  images,
  title = "Recent Highlights",
  subtitle = "Al-QIsc Club",
}: HighlightsCarouselProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Handle responsive items per view
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

  // Intersection Observer for visibility
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

  // Auto-scroll carousel
  useEffect(() => {
    if (lightboxOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, images.length - itemsPerView);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length, itemsPerView, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") setLightboxIndex((current) => (current + 1) % images.length);
      if (event.key === "ArrowLeft") setLightboxIndex((current) => (current - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, lightboxOpen]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    const maxIndex = Math.max(0, images.length - itemsPerView);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <section ref={sectionRef} className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          {/* Header */}
          <div
            className={cn(
              "text-center max-w-xl mx-auto pb-12 transition-all duration-700",
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
              aria-label="Previous slide"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 z-10 w-12 h-12 bg-[var(--secondary)] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              aria-label="Next slide"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 z-10 w-12 h-12 bg-[var(--secondary)] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Carousel Track */}
            <div className="overflow-hidden mx-8 md:mx-12">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-3"
                    style={{ width: `${100 / itemsPerView}%` }}
                  >
                    <button
                      type="button"
                      aria-label={`Open ${image.title || image.alt}`}
                      className="w-full bg-white rounded-2xl shadow-lg overflow-hidden p-6 md:p-8 cursor-pointer group"
                      onClick={() => openLightbox(index)}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {/* Zoom overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                              <svg
                                className="w-7 h-7 text-[var(--primary)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      {image.title && (
                        <div className="pt-4 text-center">
                          <h4 className="font-heading font-semibold text-[var(--dark)]">
                            {image.title}
                          </h4>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.max(1, images.length - itemsPerView + 1) }).map(
                (_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      currentIndex === index
                        ? "bg-[var(--primary)] w-8"
                        : "bg-gray-300 hover:bg-[var(--secondary)]"
                    )}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            aria-label="Close lightbox"
            className="absolute top-4 right-4 text-white hover:text-[var(--secondary)] transition-colors z-10"
          >
            <X className="w-10 h-10" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevLightboxImage();
            }}
            aria-label="Previous image"
            className="absolute left-4 text-white hover:text-[var(--secondary)] transition-colors"
          >
            <ChevronLeft className="w-14 h-14" />
          </button>

          <div
            className="relative w-full max-w-5xl aspect-[4/3] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextLightboxImage();
            }}
            aria-label="Next image"
            className="absolute right-4 text-white hover:text-[var(--secondary)] transition-colors"
          >
            <ChevronRight className="w-14 h-14" />
          </button>

          <div className="absolute bottom-6 text-white text-center">
            <p className="font-medium text-lg">
              {images[lightboxIndex].title || images[lightboxIndex].alt}
            </p>
            <p className="text-sm text-white/70 mt-1">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
