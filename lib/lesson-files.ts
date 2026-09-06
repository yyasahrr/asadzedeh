import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const LESSON_FILE_DIR = path.join(process.cwd(), "data", "lesson-files");
export const MAX_LESSON_FILE_BYTES = 25 * 1024 * 1024;

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".zip",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp3",
  ".m4a",
]);

export function lessonFileExtension(name: string): string | null {
  const extension = path.extname(name).toLowerCase();
  return allowedExtensions.has(extension) ? extension : null;
}

export function newLessonFileId(extension: string): string {
  return `lf-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}${extension}`;
}

export function lessonFilePath(id: string): string | null {
  if (!/^lf-[a-z0-9-]+\.[a-z0-9]+$/i.test(id)) return null;
  const resolved = path.resolve(LESSON_FILE_DIR, id);
  return resolved.startsWith(path.resolve(LESSON_FILE_DIR) + path.sep) ? resolved : null;
}

export function ensureLessonFileDir() {
  fs.mkdirSync(LESSON_FILE_DIR, { recursive: true });
}
