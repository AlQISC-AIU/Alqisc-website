"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface HeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  showButtons?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  description,
  backgroundImage = "/images/backround.JPG",
  showButtons = true,
}: HeroProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-[var(--primary-dark)] pt-24 sm:min-h-[680px] lg:min-h-[720px] lg:pt-28">
      {/* Background Image - Full width */}
      <div className="absolute inset-0 h-full w-full bg-[var(--primary-dark)]">
        {backgroundImage && (
          <Image
            src={backgroundImage}
            alt=""
            fill
            className={`hero-background h-full w-full object-cover ${isVisible ? "is-visible" : ""}`}
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-5 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {subtitle && (
            <p className={`hero-reveal hero-reveal-subtitle mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)] md:text-base ${isVisible ? "is-visible" : ""}`}>
              {subtitle}
            </p>
          )}
          <h1 className={`hero-reveal hero-reveal-title mb-5 text-balance font-heading text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl ${isVisible ? "is-visible" : ""}`}>
            {title}
          </h1>
          {description && (
            <p className={`hero-reveal hero-reveal-description mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg ${isVisible ? "is-visible" : ""}`}>
              {description}
            </p>
          )}
          {showButtons && (
            <div className="flex flex-col flex-wrap justify-center gap-3 sm:flex-row">
              <Link
                href="/classes"
                className={`hero-reveal hero-reveal-action hero-action-1 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--secondary)] px-8 py-4 text-lg font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--secondary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] focus:ring-offset-2 sm:w-auto ${isVisible ? "is-visible" : ""}`}
              >
                Join Our Classes
              </Link>
              <Link
                href="/about"
                className={`hero-reveal hero-reveal-action hero-action-2 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--primary)] px-8 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 sm:w-auto ${isVisible ? "is-visible" : ""}`}
              >
                Learn About AL-QISC
              </Link>
              <Link
                href="/contact"
                className={`hero-reveal hero-reveal-action hero-action-3 inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-white bg-transparent px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black sm:w-auto ${isVisible ? "is-visible" : ""}`}
              >
                Contact Us
              </Link>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
