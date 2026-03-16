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
  const [loadFailed, setLoadFailed] = useState(false);
  const dragStateRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setLoadFailed(false);
  }, [source]);

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
    if (event.ctrlKey) {
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      setZoom((prev) => clampZoom(prev + delta));
      return;
    }

    if (event.shiftKey) {
      setOffsetX((prev) => prev - event.deltaY * 0.45);
      return;
    }

    setOffsetY((prev) => prev - event.deltaY * 0.45);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLImageElement>) {
    if (submitting || loadFailed) return;
    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      startX: offsetX,
      startY: offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLImageElement>) {
    if (!dragStateRef.current || submitting || loadFailed) return;
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
    if (loadFailed) return;
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
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white px-5 py-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-primary">裁剪顶部配图</h3>
              <p className="mt-1 text-xs text-muted">按 16:9 裁切，建议用于 1600 x 900 px 横版头图。</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-sm hover:bg-surface"
            >
              关闭
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-border bg-slate-100">
                <div
                  className="relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden bg-slate-200"
                  onWheel={handleWheel}
                >
                  {loadFailed ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
                      图片预览加载失败。请先关闭弹窗，重新上传后再裁剪。
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={source}
                        alt=""
                        className="absolute inset-0 h-full w-full select-none object-cover"
                        style={previewStyle}
                        draggable={false}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerEnd}
                        onPointerCancel={handlePointerEnd}
                        onError={() => setLoadFailed(true)}
                      />
                      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/50" />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">按住图片可直接拖动位置；滚动鼠标滚轮可上下移动图片查看下部；按住 Ctrl 再滚轮可缩放；按住 Shift 再滚轮可左右微调。</p>
                <div className="flex gap-2 self-end sm:self-auto">
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
                    disabled={submitting || loadFailed}
                    className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {submitting ? "处理中..." : "使用裁剪结果"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
