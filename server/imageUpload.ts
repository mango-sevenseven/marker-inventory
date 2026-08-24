import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import type { RequestHandler } from "express";
import type { createMediaRepository } from "./mediaRepository.js";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class UploadValidationError extends Error {
  status = 415;
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function hasExpectedSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

export const receiveImage: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new UploadValidationError("只支持 JPG、PNG 和 WebP 图片"));
      return;
    }
    callback(null, true);
  },
}).single("image");

export function createStoreImage(options: {
  uploadsDirectory: string;
  media: ReturnType<typeof createMediaRepository>;
}) {
  return async (file: Express.Multer.File) => {
    if (!hasExpectedSignature(file.buffer, file.mimetype)) {
      throw new UploadValidationError("图片内容与文件类型不匹配");
    }

    const id = randomUUID();
    const storedName = `${id}.${extensionForMime(file.mimetype)}`;
    const destination = path.join(options.uploadsDirectory, storedName);
    await writeFile(destination, file.buffer, { flag: "wx" });

    const record = {
      id,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      relativePath: `uploads/${storedName}`,
      createdAt: new Date().toISOString(),
    };

    try {
      options.media.insert(record);
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }

    return { id, url: `/media/${storedName}`, mimeType: file.mimetype, size: file.size };
  };
}
