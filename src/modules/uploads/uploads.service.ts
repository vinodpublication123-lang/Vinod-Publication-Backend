import { randomUUID } from "crypto";
import path from "path";
import { storage } from "../../lib/storage";
import { AppError } from "../../lib/errors";

// ── Key builders ──────────────────────────────────────────────────────────────

function buildKey(folder: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${folder}/${randomUUID()}${ext}`;
}

// ── Upload helpers ────────────────────────────────────────────────────────────

async function uploadFile(
  folder: string,
  file: Express.Multer.File
): Promise<{ url: string; filename: string }> {
  if (!file.buffer || file.buffer.length === 0) {
    throw new AppError("Uploaded file is empty", 400);
  }

  const key = buildKey(folder, file.originalname);
  const url = await storage.upload(key, file.buffer, file.mimetype);
  return { url, filename: key };
}

// ── Public service functions ──────────────────────────────────────────────────

export async function uploadBookCover(file: Express.Multer.File) {
  return uploadFile("book-covers", file);
}

export async function uploadAuthorAvatar(file: Express.Multer.File) {
  return uploadFile("author-avatars", file);
}

export async function uploadProductImage(file: Express.Multer.File) {
  return uploadFile("product-images", file);
}

export async function uploadProductGalleryImage(file: Express.Multer.File) {
  return uploadFile("product-gallery", file);
}

export async function uploadAudio(file: Express.Multer.File) {
  return uploadFile("audio", file);
}
