"use client";

import { useEffect, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ReadingProgressBar({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      const target = document.getElementById(targetId);
      if (!target) {
        setProgress(0);
        return;
      }

      const rect = target.getBoundingClientRect();
      const startY = window.scrollY + rect.top;
      const maxScrollable = Math.max(target.scrollHeight - window.innerHeight, 1);
      const value = (window.scrollY - startY) / maxScrollable;
      setProgress(clamp(value, 0, 1));
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [targetId]);

  return (
    <div className="fixed top-0 left-0 z-[70] h-1 w-full pointer-events-none">
      <div
        className="h-full bg-[var(--color-accent)] origin-left transition-transform duration-100 ease-linear"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
