"use client";

import { ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AnimationType =
  | "fadeIn"
  | "fadeInUp"
  | "fadeInDown"
  | "fadeInLeft"
  | "fadeInRight"
  | "zoomIn"
  | "slideInUp"
  | "slideInDown";

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  className?: string;
}

export function AnimatedSection({
  children,
  animation = "fadeInUp",
  delay = 0,
  duration = 600,
  className,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            element.classList.add("animate-visible");
          }, delay);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(element);

    return () => observer.unobserve(element);
  }, [delay]);

  const animationStyles: Record<AnimationType, string> = {
    fadeIn: "opacity-0 transition-opacity",
    fadeInUp: "opacity-0 translate-y-10 transition-all",
    fadeInDown: "opacity-0 -translate-y-10 transition-all",
    fadeInLeft: "opacity-0 -translate-x-10 transition-all",
    fadeInRight: "opacity-0 translate-x-10 transition-all",
    zoomIn: "opacity-0 scale-95 transition-all",
    slideInUp: "opacity-0 translate-y-20 transition-all",
    slideInDown: "opacity-0 -translate-y-20 transition-all",
  };

  return (
    <div
      ref={ref}
      className={cn(
        animationStyles[animation],
        "animate-visible:opacity-100 animate-visible:translate-x-0 animate-visible:translate-y-0 animate-visible:scale-100",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
