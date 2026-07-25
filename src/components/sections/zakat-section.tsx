"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const zakatSlides = [
  {
    title: "What is",
    highlight: "Zakatul Fitri",
    description:
      "Zakat al Fitr is a charitable donation of food that must be given before Eid prayer, before the end of the month of Ramadan, for the love of Allah. Zakat al Fitr is compulsory upon every self-supporting adult Muslim who has food in excess of their needs, on behalf of themselves and their dependants.",
    image: "/images/zakat/slider2.jpg",
  },
  {
    title: "How much is",
    highlight: "Zakat al Fitri per person?",
    description:
      "The amount of Zakat ul-Fitr is traditionally one saa of staple food, equivalent to about three kilograms. Scholars have estimated the monetary value of Zakat ul-Fitr in the UK to be approximately £5 per person. For Zakat ul-Fitr 2025, this value may vary slightly depending on local food prices.",
    image: "/images/zakat/slider3.jpg",
  },
];

export function ZakatSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % zakatSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % zakatSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + zakatSlides.length) % zakatSlides.length
    );
  };

  return (
    <section className="relative min-h-[620px] overflow-hidden bg-[var(--light)] md:min-h-[680px]">
      {/* Slides */}
      {zakatSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/80 md:bg-white/70" aria-hidden="true" />

          {/* Content */}
          <div className="container relative z-10 mx-auto flex h-full items-center px-5 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-center text-[var(--dark)] md:text-left">
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {slide.title}{" "}
                <span className="text-[var(--primary)]">{slide.highlight}</span>
              </h2>
              <p className="mb-8 text-base leading-relaxed text-[var(--gray)] sm:text-lg">
                {slide.description}
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <a
                  href="https://islamic-relief.org/zakat-calculator/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="lg">
                    Zakat Calculator
                  </Button>
                </a>
                <a
                  href="https://islamqa.info/en/articles/69/all-about-zakat-al-fitr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--primary)]/80 hover:bg-[var(--primary)] rounded-full items-center justify-center text-white transition-colors z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[var(--primary)]/80 hover:bg-[var(--primary)] rounded-full items-center justify-center text-white transition-colors z-20"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {zakatSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? "bg-[var(--secondary)]" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
