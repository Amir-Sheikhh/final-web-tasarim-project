import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./http.js";
import { logWarn } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../public/uploads");

export const postMediaTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv"
};

export const profileImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function sanitizeFileName(value) {
  const baseName = path.basename(normalizeText(value) || "upload");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "upload";
}

function parseUpload(upload, { allowedTypes, maxBytes, emptyMessage, tooLargeMessage }) {
  if (!upload) {
    return null;
  }

  const match = /^data:([^;]+);base64,([a-zA-Z0-9+/=]+)$/.exec(upload.dataUrl ?? "");

  if (!match) {
    throw new AppError(emptyMessage, 400);
  }

  const [, dataMime, base64] = match;

  if (dataMime !== upload.type || !allowedTypes[upload.type]) {
    throw new AppError("Desteklenmeyen medya turu.", 400);
  }

  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) {
    throw new AppError(emptyMessage, 400);
  }

  if (buffer.length > maxBytes) {
    throw new AppError(tooLargeMessage, 413);
  }

  return {
    buffer,
    mime: upload.type,
    originalName: sanitizeFileName(upload.name),
    extension: allowedTypes[upload.type]
  };
}

async function saveUpload(upload, options) {
  const parsed = parseUpload(upload, options);

  if (!parsed) {
    return null;
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${options.prefix}-${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`;
  const absolutePath = path.join(uploadDir, fileName);
  await fs.writeFile(absolutePath, parsed.buffer, { flag: "wx" });

  return {
    url: `/uploads/${fileName}`,
    mime: parsed.mime,
    name: parsed.originalName,
    path: absolutePath
  };
}

export async function savePostMedia(upload) {
  const saved = await saveUpload(upload, {
    prefix: "post",
    allowedTypes: postMediaTypes,
    maxBytes: 8 * 1024 * 1024,
    emptyMessage: "Medya dosyasi bos olamaz.",
    tooLargeMessage: "Medya dosyasi en fazla 8 MB olabilir."
  });

  if (!saved) {
    return null;
  }

  return {
    ...saved,
    type: saved.mime.startsWith("image/") ? "image" : "video"
  };
}

export async function saveProfileImage(upload) {
  const saved = await saveUpload(upload, {
    prefix: "profile",
    allowedTypes: profileImageTypes,
    maxBytes: 5 * 1024 * 1024,
    emptyMessage: "Profil fotografi bos olamaz.",
    tooLargeMessage: "Profil fotografi en fazla 5 MB olabilir."
  });

  if (!saved) {
    return null;
  }

  return {
    ...saved,
    type: "image"
  };
}

export async function removeSavedUpload(upload) {
  if (!upload?.path) {
    return;
  }

  try {
    await fs.unlink(upload.path);
  } catch (error) {
    logWarn("upload_cleanup_failed", {
      path: upload.path,
      error: error.message
    });
  }
}

export async function removeUploadByUrl(url) {
  if (!url?.startsWith("/uploads/")) {
    return;
  }

  const targetPath = path.join(uploadDir, path.basename(url));

  try {
    await fs.unlink(targetPath);
  } catch (error) {
    logWarn("upload_cleanup_failed", {
      path: targetPath,
      error: error.message
    });
  }
}
