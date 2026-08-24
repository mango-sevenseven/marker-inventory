import { uploadDataUrl } from "@/data/remotePersistence";

const MAX_IMAGE_EDGE = 1200;
const JPEG_QUALITY = 0.82;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择"));
    reader.readAsDataURL(file);
  });
}

export async function prepareItemImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  const source = await readAsDataUrl(file);
  if (typeof Image === "undefined" || typeof document === "undefined") return source;

  const image = new Image();
  image.src = source;
  try {
    await image.decode();
  } catch {
    return source;
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && file.size <= 500_000) return source;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function prepareAndUploadItemImage(
  file: File,
  upload: (dataUrl: string) => Promise<string> = uploadDataUrl,
): Promise<string> {
  const prepared = await prepareItemImage(file);
  try {
    return await upload(prepared);
  } catch {
    return prepared;
  }
}
