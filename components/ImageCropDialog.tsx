"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cropImageSourceToFile } from "@/lib/client-image";

type ImageCropDialogProps = {
  source: string;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;

export function ImageCropDialog({ source, onCancel, onConfirm }: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const dragStateRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const previewStyle = useMemo(
    () => ({
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
      transformOrigin: "center center",
      cursor: submitting ? "progress" : "grab",
    }),
    [offsetX, offsetY, submitting, zoom]
  );

  function clampZoom(next: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => clampZoom(prev + delta));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLImageElement>) {
    if (submitting) return;
    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: offsetX,
      startY: offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLImageElement>) {
    if (!dragStateRef.current || submitting) return;
    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;
    setOffsetX(dragStateRef.current.startX + deltaX);
    setOffsetY(dragStateRef.current.startY + deltaY);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLImageElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const file = await cropImageSourceToFile(source, {
        zoom,
        offsetX,
        offsetY,
        aspectWidth: 16,
        aspectHeight: 9,
        outputWidth: 1600,
        outputHeight: 900,
      });
      await onConfirm(file);
    } finally {
      setSubmitting(false);
    }
  }

  function resetCrop() {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-primary">裁剪顶部配图</h3>
            <p className="mt-1 text-xs text-muted">按 16:9 裁切，建议用于 1600 x 900 px 横版头图。</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface"
          >
            关闭
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-slate-100">
            <div
              className="relative mx-auto aspect-[16/9] w-full max-w-3xl overflow-hidden bg-slate-200"
              onWheel={handleWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source}
                alt=""
                className="absolute inset-0 h-full w-full object-cover select-none"
                style={previewStyle}
                draggable={false}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">直接在图片上滚轮缩放、按住拖动调整位置，确认后再使用裁剪结果。</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetCrop}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
              >
                重置
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {submitting ? "处理中..." : "使用裁剪结果"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
