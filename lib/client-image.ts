"use client";

export const MAX_UPLOAD_IMAGE_MB = 3;
export const MAX_UPLOAD_IMAGE_BYTES = MAX_UPLOAD_IMAGE_MB * 1024 * 1024;

function dataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = (base64.match(/=*$/)?.[0].length ?? 0);
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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = dataUrl;
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

export async function readImageWithLimit(file: File, maxBytes = MAX_UPLOAD_IMAGE_BYTES): Promise<string> {
  if (file.size <= maxBytes) return readFileAsDataUrl(file);

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
    throw new Error(`压缩后仍超过 ${(maxBytes / 1024 / 1024).toFixed(0)}MB，请换更小的图片。`);
  }
  return compressed;
}
