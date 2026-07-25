"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, Menu } from "lucide-react";

export interface ClassItemProps {
  id: string;
  title: string;
  image: string;
  schedule: string;
  venue: string;
  fee: string;
  objective: string;
  benefits: string[];
  enrollLink: string;
}

interface ClassesSectionProps {
  classes: ClassItemProps[];
}

export function ClassesSection({ classes }: ClassesSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
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

  if (!classes || classes.length === 0) {
    return null;
  }

  const activeClass = classes[activeTab];

  return (
    <section ref={sectionRef} className="bg-white py-20 md:py-24 lg:py-28">
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
            Al-Qisc
          </h5>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--dark)]">
            Join Our Classes
          </h2>
        </div>

        <div
          className={cn(
            "grid gap-7 transition-all delay-200 duration-500 motion-reduce:transform-none motion-reduce:transition-none lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8",
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          )}
        >
          <div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
              role="group"
              aria-label="Available classes"
            >
              {classes.map((classItem, index) => (
                <button
                  key={classItem.id}
                  id={`class-tab-${classItem.id}`}
                  onClick={() => setActiveTab(index)}
                  aria-pressed={activeTab === index}
                  aria-controls={`class-panel-${classItem.id}`}
                  className={cn(
                    "flex min-w-[240px] items-center rounded-xl border p-4 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] lg:min-w-0 lg:w-full",
                    activeTab === index
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                      : "border-[var(--primary)]/15 bg-white text-[var(--dark)] hover:border-[var(--primary)]"
                  )}
                >
                  <Menu className={cn(
                    "w-5 h-5 mr-3",
                    activeTab === index ? "text-[var(--secondary)]" : "text-[var(--primary)]"
                  )} />
                  <span className="font-semibold">{classItem.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            key={activeClass.id}
            id={`class-panel-${activeClass.id}`}
            aria-live="polite"
            aria-atomic="true"
            className="class-panel-enter rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] p-5 sm:p-6 lg:p-7"
          >
            <div className="grid gap-7 md:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)] md:items-center lg:gap-9">
              <div>
                <div className="relative aspect-[4/5] max-h-[480px] overflow-hidden rounded-xl bg-white shadow-sm">
                  <Image
                    src={activeClass.image}
                    alt={activeClass.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 38vw"
                    className="object-cover"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                  Class Overview
                </p>
                <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-4">
                  {activeClass.title.replace(/^\d+\.\s*/, "")}
                </h3>

                <dl className="space-y-3 text-[var(--gray)]">
                  <div><dt className="inline font-semibold text-[var(--dark)]">Schedule: </dt><dd className="inline">{activeClass.schedule}</dd></div>
                  <div><dt className="inline font-semibold text-[var(--dark)]">Venue: </dt><dd className="inline">{activeClass.venue}</dd></div>
                  <div><dt className="inline font-semibold text-[var(--dark)]">Fee: </dt><dd className="inline">{activeClass.fee}</dd></div>
                </dl>
                <p className="mt-4 leading-relaxed text-[var(--gray)]">{activeClass.objective}</p>

                {/* Benefits */}
                <div className="mt-4 space-y-2">
                  {activeClass.benefits.map((benefit, index) => (
                    <p key={index} className="flex items-center text-[var(--gray)]">
                      <Check className="w-5 h-5 text-[var(--secondary)] mr-3 flex-shrink-0" />
                      {benefit}
                    </p>
                  ))}
                </div>

                <Link
                  href={activeClass.enrollLink}
                  target={activeClass.enrollLink.startsWith("http") ? "_blank" : undefined}
                  rel={activeClass.enrollLink.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-7 inline-flex rounded-lg bg-[var(--primary)] px-7 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]"
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
