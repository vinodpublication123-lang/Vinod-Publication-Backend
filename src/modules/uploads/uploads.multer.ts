import multer from "multer";
import { AppError } from "../../lib/errors";

// ── Allowed MIME types ────────────────────────────────────────────────────────

const IMAGE_MIMES: Record<string, boolean> = {
  "image/jpeg": true,
  "image/jpg": true,
  "image/png": true,
  "image/webp": true,
};

const AUDIO_MIMES: Record<string, boolean> = {
  "audio/mpeg": true,      // mp3
  "audio/mp3": true,
  "audio/wav": true,
  "audio/x-wav": true,
  "audio/mp4": true,       // m4a
  "audio/m4a": true,
  "audio/x-m4a": true,
};

// ── Multer configs ────────────────────────────────────────────────────────────

/** Memory storage — we pipe raw bytes directly to S3, never touch disk. */
const memoryStorage = multer.memoryStorage();

export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new AppError(`File type not allowed: ${file.mimetype}. Only jpg, png, webp accepted.`, 415));
    }
  },
});

export const audioUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (AUDIO_MIMES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new AppError(`File type not allowed: ${file.mimetype}. Only mp3, wav, m4a accepted.`, 415));
    }
  },
});
