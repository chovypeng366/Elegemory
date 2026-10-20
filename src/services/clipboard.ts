import {
  readImage,
  writeImage,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";
import { isTauri } from "./env";

export interface EncodedImage {
  base64: string;
  width: number;
  height: number;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("读取图片失败"));
    reader.readAsDataURL(blob);
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("图片编码失败"));
        return;
      }
      blobToBase64(blob).then(resolve, reject);
    }, "image/png");
  });
}

export async function imageBlobToPng(blob: Blob): Promise<EncodedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("剪贴板中的图片格式无法识别");
  }

  try {
    if (!bitmap.width || !bitmap.height) {
      throw new Error("图片尺寸无效");
    }
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error("图片尺寸过大（超过 4000 万像素），暂不支持");
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建图片画布");

    context.drawImage(bitmap, 0, 0);
    const base64 = await canvasToPng(canvas);
    return { base64, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function rgbaToPng(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<EncodedImage> {
  if (rgba.length !== width * height * 4) {
    throw new Error("剪贴板图片数据不完整");
  }
  if (width * height > 40_000_000) {
    throw new Error("图片尺寸过大（超过 4000 万像素），暂不支持");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建图片画布");

  const clamped = new Uint8ClampedArray(rgba.length);
  clamped.set(rgba);
  context.putImageData(new ImageData(clamped, width, height), 0, 0);

  const base64 = await canvasToPng(canvas);
  return { base64, width, height };
}

export async function readClipboardImage(): Promise<EncodedImage | null> {
  if (!isTauri()) return null;

  let image;
  try {
    image = await readImage();
  } catch {
    return null;
  }

  try {
    const { width, height } = await image.size();
    const rgba = await image.rgba();
    return await rgbaToPng(rgba, width, height);
  } finally {
    await image.close().catch(() => undefined);
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text.trim()) throw new Error("没有可复制的文字");
  if (isTauri()) {
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}

export async function copyImageToClipboard(path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("浏览器预览模式不支持复制图片，请在桌面应用中使用");
  }
  if (!path) throw new Error("找不到原始图片");
  await writeImage(path);
}
