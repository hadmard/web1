"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const mouseZones = Array.from(document.querySelectorAll<HTMLElement>("[data-mouse-zone]"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("is-visible");
          if (el.dataset.once !== "false") io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el, idx) => {
      const delay = (idx % 8) * 60;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      io.observe(el);
    });

    let ticking = false;
    const onScroll = () => {
      if (ticking || reduceMotion) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        for (const el of parallaxEls) {
          const speed = Number(el.dataset.parallax ?? "0.08");
          el.style.setProperty("--parallax-y", `${Math.round(y * speed)}px`);
        }
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const zoneHandlers: Array<{
      zone: HTMLElement;
      move: (e: PointerEvent) => void;
      leave: () => void;
    }> = [];

    if (!reduceMotion) {
      for (const zone of mouseZones) {
        const move = (e: PointerEvent) => {
          const rect = zone.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          zone.style.setProperty("--mx", `${x.toFixed(4)}`);
          zone.style.setProperty("--my", `${y.toFixed(4)}`);
        };
        const leave = () => {
          zone.style.setProperty("--mx", "0");
          zone.style.setProperty("--my", "0");
        };

        zone.addEventListener("pointermove", move, { passive: true });
        zone.addEventListener("pointerleave", leave, { passive: true });
        zoneHandlers.push({ zone, move, leave });
      }
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      for (const { zone, move, leave } of zoneHandlers) {
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerleave", leave);
      }
    };
  }, []);

  return null;
}
