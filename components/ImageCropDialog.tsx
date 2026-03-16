"use client";

import { useEffect, useMemo, useState } from "react";
import { cropImageSourceToFile } from "@/lib/client-image";

type ImageCropDialogProps = {
  source: string;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

export function ImageCropDialog({ source, onCancel, onConfirm }: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
    }),
    [offsetX, offsetY, zoom]
  );

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
            <div className="relative mx-auto aspect-[16/9] w-full max-w-3xl overflow-hidden bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={previewStyle}
                draggable={false}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-muted">缩放</span>
              <input type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted">左右位置</span>
              <input type="range" min="-240" max="240" step="1" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="w-full" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted">上下位置</span>
              <input type="range" min="-180" max="180" step="1" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="w-full" />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">调整到你觉得最舒服的画面后，再点击使用裁剪结果。</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
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
