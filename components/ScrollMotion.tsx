"use client";

import { useEffect } from "react";

type MotionTier = "high" | "medium" | "low";

function getDeviceTier(reduceMotion: boolean): MotionTier {
  if (reduceMotion) return "low";
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
  const memory = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number"
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    : 4;
  const isCoarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (isCoarsePointer && (cores <= 8 || memory <= 8)) return "medium";
  if (cores >= 8 && memory >= 8) return "high";
  if (cores <= 4 || memory <= 4) return "low";
  return "medium";
}

export function ScrollMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let motionTier = getDeviceTier(reduceMotion);
    document.documentElement.dataset.motionTier = motionTier;

    let rafSamples = 0;
    let slowFrames = 0;
    let lastFrameAt = performance.now();
    let tierSamplerRaf = 0;

    const sampleTier = () => {
      tierSamplerRaf = window.requestAnimationFrame((now) => {
        const frameDelta = now - lastFrameAt;
        lastFrameAt = now;
        rafSamples += 1;
        if (frameDelta > 20) slowFrames += 1;
        if (rafSamples < 24) {
          sampleTier();
          return;
        }
        if (motionTier === "high" && slowFrames >= 8) {
          motionTier = "medium";
          document.documentElement.dataset.motionTier = motionTier;
        } else if (motionTier === "medium" && slowFrames >= 12) {
          motionTier = "low";
          document.documentElement.dataset.motionTier = motionTier;
        }
      });
    };

    if (!reduceMotion) sampleTier();

    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const mouseZones = Array.from(document.querySelectorAll<HTMLElement>("[data-mouse-zone]"));
    const staggerParents = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal-stagger]"));

    const defaultDelayByMode: Record<string, number> = {
      "fade-up": 0,
      "fade-left": 20,
      "fade-right": 20,
      "zoom-soft": 30,
    };

    for (const parent of staggerParents) {
      const base = Number(parent.dataset.revealStagger ?? "70");
      const children = Array.from(parent.querySelectorAll<HTMLElement>(":scope > [data-reveal]"));
      children.forEach((child, idx) => {
        if (child.dataset.revealDelay) return;
        child.dataset.revealDelay = String(Math.max(0, Math.round(base * idx)));
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("is-animating");
          el.classList.add("is-visible");
          window.setTimeout(() => el.classList.remove("is-animating"), 780);
          if (el.dataset.revealOnce !== "false") io.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el) => {
      const mode = (el.dataset.reveal || "fade-up").trim();
      const delayRaw = el.dataset.revealDelay;
      const delay = delayRaw != null ? Number(delayRaw) : defaultDelayByMode[mode] ?? 0;
      el.classList.add("reveal");
      el.classList.remove("reveal--fade-up", "reveal--fade-left", "reveal--fade-right", "reveal--zoom-soft");
      el.classList.add(`reveal--${mode}`);
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      io.observe(el);
    });

    let ticking = false;
    let lastParallaxY = -1;
    const onScroll = () => {
      if (ticking || reduceMotion || motionTier !== "high") return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - lastParallaxY) < 6) {
          ticking = false;
          return;
        }
        lastParallaxY = y;
        for (const el of parallaxEls) {
          const speed = Number(el.dataset.parallax ?? "0.05");
          el.style.setProperty("--parallax-y", `${Math.round(y * speed)}px`);
        }
        ticking = false;
      });
    };

    if (motionTier === "high") {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const zoneHandlers: Array<{
      zone: HTMLElement;
      move: (e: PointerEvent) => void;
      leave: () => void;
    }> = [];

    if (!reduceMotion && motionTier === "high") {
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
      if (tierSamplerRaf) window.cancelAnimationFrame(tierSamplerRaf);
      window.removeEventListener("scroll", onScroll);
      for (const { zone, move, leave } of zoneHandlers) {
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerleave", leave);
      }
    };
  }, []);

  return null;
}
