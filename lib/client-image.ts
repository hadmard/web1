"use client";

import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const MAX_UPLOAD_IMAGE_MB = 3;
export const MAX_UPLOAD_IMAGE_BYTES = MAX_UPLOAD_IMAGE_MB * 1024 * 1024;

function dataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.match(/=*$/)?.[0].length ?? 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/webp";
  const binary = window.atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = source;
  });
}

async function compressImageToLimit(file: File, maxBytes: number): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const img = await loadImage(original);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片压缩");

  let scale = 1;
  let quality = 0.9;
  let best = original;
  let bestSize = dataUrlSizeBytes(original);

  for (let i = 0; i < 10; i += 1) {
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/webp", quality);
    const size = dataUrlSizeBytes(dataUrl);
    if (size < bestSize) {
      best = dataUrl;
      bestSize = size;
    }
    if (size <= maxBytes) return dataUrl;

    if (quality > 0.45) {
      quality -= 0.12;
    } else {
      scale *= 0.85;
      quality = 0.82;
    }
  }

  return best;
}

async function prepareImageFile(file: File, maxBytes: number) {
  if (file.size <= maxBytes) return file;

  const limitMb = (maxBytes / 1024 / 1024).toFixed(0);
  const fileMb = (file.size / 1024 / 1024).toFixed(2);
  const shouldCompress = window.confirm(
    `图片大小 ${fileMb}MB，超过上限 ${limitMb}MB。是否自动压缩到 ${limitMb}MB 以内？`
  );
  if (!shouldCompress) {
    throw new Error(`已取消上传：图片超过 ${limitMb}MB。`);
  }

  const compressed = await compressImageToLimit(file, maxBytes);
  const compressedBytes = dataUrlSizeBytes(compressed);
  if (compressedBytes > maxBytes) {
    throw new Error(`压缩后仍超过 ${limitMb}MB，请更换更小的图片。`);
  }

  const nextName = file.name.replace(/\.[^.]+$/, "") || `image-${Date.now()}`;
  return dataUrlToFile(compressed, `${nextName}.webp`);
}

export async function readImageWithLimit(file: File, maxBytes = MAX_UPLOAD_IMAGE_BYTES): Promise<string> {
  const prepared = await prepareImageFile(file, maxBytes);
  return readFileAsDataUrl(prepared);
}

export async function uploadImageToServer(
  file: File,
  options?: {
    folder?: string;
    maxBytes?: number;
  }
): Promise<string> {
  const prepared = await prepareImageFile(file, options?.maxBytes ?? MAX_UPLOAD_IMAGE_BYTES);
  const formData = new FormData();
  formData.set("file", prepared);
  if (options?.folder) formData.set("folder", options.folder);

  const res = await fetch("/api/upload/image", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== "string") {
    throw new Error(data.error ?? "图片上传到服务器失败");
  }

  return typeof data.servedUrl === "string" ? data.servedUrl : resolveUploadedImageUrl(data.url);
}

export async function uploadRemoteImageToServer(
  remoteUrl: string,
  options?: {
    folder?: string;
  }
): Promise<string> {
  const formData = new FormData();
  formData.set("remoteUrl", remoteUrl);
  if (options?.folder) formData.set("folder", options.folder);

  const res = await fetch("/api/upload/image", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== "string") {
    throw new Error(data.error ?? "远程图片转存失败");
  }

  return typeof data.servedUrl === "string" ? data.servedUrl : resolveUploadedImageUrl(data.url);
}

export type CropSelection = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  aspectWidth?: number;
  aspectHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
};

export async function cropImageSourceToFile(
  source: string,
  selection: CropSelection,
  fileName = `cropped-${Date.now()}.webp`
): Promise<File> {
  const img = await loadImage(source);
  const aspectWidth = selection.aspectWidth ?? 16;
  const aspectHeight = selection.aspectHeight ?? 9;
  const outputWidth = selection.outputWidth ?? 1600;
  const outputHeight = selection.outputHeight ?? 900;
  const frameWidth = 1600;
  const frameHeight = Math.round((frameWidth * aspectHeight) / aspectWidth);

  const baseScale = Math.max(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight);
  const zoom = Math.max(1, selection.zoom || 1);
  const displayWidth = img.naturalWidth * baseScale * zoom;
  const displayHeight = img.naturalHeight * baseScale * zoom;
  const left = (frameWidth - displayWidth) / 2 + selection.offsetX;
  const top = (frameHeight - displayHeight) / 2 + selection.offsetY;

  let sourceX = (-left / displayWidth) * img.naturalWidth;
  let sourceY = (-top / displayHeight) * img.naturalHeight;
  let sourceWidth = (frameWidth / displayWidth) * img.naturalWidth;
  let sourceHeight = (frameHeight / displayHeight) * img.naturalHeight;

  sourceWidth = Math.min(sourceWidth, img.naturalWidth);
  sourceHeight = Math.min(sourceHeight, img.naturalHeight);
  sourceX = Math.max(0, Math.min(sourceX, img.naturalWidth - sourceWidth));
  sourceY = Math.max(0, Math.min(sourceY, img.naturalHeight - sourceHeight));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片裁剪");

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

  const dataUrl = canvas.toDataURL("image/webp", 0.92);
  return dataUrlToFile(dataUrl, fileName);
}
