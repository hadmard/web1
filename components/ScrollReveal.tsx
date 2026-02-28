"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "up" | "fade-up" | "fade-left" | "fade-right" | "zoom-soft";

type ScrollRevealProps = {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  rootMargin?: string;
};

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
  rootMargin = "0px 0px -8% 0px",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView(entry.isIntersecting);
        });
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const mode: Direction = direction === "up" ? "fade-up" : direction;

  return (
    <div
      ref={ref}
      data-reveal={mode}
      data-reveal-delay={String(delay)}
      className={`reveal reveal--${mode} ${inView ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
