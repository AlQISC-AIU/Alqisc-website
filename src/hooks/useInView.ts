"use client";

import { useEffect, useRef, useState, RefObject } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView<T extends HTMLElement>(
  options: UseInViewOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}

// Animation variants matching WOW.js
export const animations = {
  fadeIn: "animate-fadeIn",
  fadeInUp: "animate-fadeInUp",
  fadeInDown: "animate-fadeInDown",
  fadeInLeft: "animate-fadeInLeft",
  fadeInRight: "animate-fadeInRight",
  zoomIn: "animate-zoomIn",
  slideInLeft: "animate-slideInLeft",
  slideInRight: "animate-slideInRight",
};
