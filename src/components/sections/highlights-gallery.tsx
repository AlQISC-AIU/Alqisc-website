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

interface HighlightsGalleryProps {
  images: GalleryImage[];
  title?: string;
  subtitle?: string;
}

export function HighlightsGallery({
  images,
  title = "Recent Highlights",
  subtitle = "Al-QIsc Club",
}: HighlightsGalleryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <section ref={sectionRef} className="py-20">
        <div className="container mx-auto px-4">
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

          {/* Gallery Grid */}
          <div
            className={cn(
              "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-700 delay-300",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            )}
          >
            {images.slice(0, 8).map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => openLightbox(index)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-[var(--primary)]"
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
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
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
            className="absolute top-4 right-4 text-white hover:text-[var(--secondary)] transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Previous image"
            className="absolute left-4 text-white hover:text-[var(--secondary)] transition-colors"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <div
            className="relative w-full max-w-4xl aspect-video mx-4"
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
              nextImage();
            }}
            aria-label="Next image"
            className="absolute right-4 text-white hover:text-[var(--secondary)] transition-colors"
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          <div className="absolute bottom-4 text-white text-center">
            <p className="font-medium">
              {images[lightboxIndex].title || images[lightboxIndex].alt}
            </p>
            <p className="text-sm text-white/70">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
