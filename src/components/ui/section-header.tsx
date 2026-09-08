"use client";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  subtitle?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center" | "right";
  light?: boolean;
}

export function SectionHeader({
  subtitle,
  title,
  description,
  className,
  align = "center",
  light = false,
}: SectionHeaderProps) {
  const alignmentClasses = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right ml-auto",
  };

  return (
    <div
      className={cn(
        "max-w-2xl pb-8",
        alignmentClasses[align],
        className
      )}
    >
      {subtitle && (
        <h5
          className={cn(
            "font-semibold uppercase tracking-wider text-sm mb-2",
            light ? "text-[var(--secondary)]" : "text-[var(--primary)]"
          )}
        >
          {subtitle}
        </h5>
      )}
      <h2
        className={cn(
          "font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-4",
          light ? "text-white" : "text-[var(--dark)]"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn("text-lg", light ? "text-white/80" : "text-[var(--gray)]")}
        >
          {description}
        </p>
      )}
    </div>
  );
}
