import crypto from "node:crypto";
import {
  deleteObject,
  headObject,
  isValidObjectKey,
  putObject,
  readObject,
  type ObjectHead,
  type ObjectRead,
} from "./storage";

/**
 * Lesson attachments (PDFs, slides, audio) in object storage.
 *
 * These used to live in `data/lesson-files`. A PaaS container disk is wiped on
 * every deploy, which would silently delete teaching material students had
 * already paid for — so attachments now live in the same private bucket as
 * videos and are served through an authorising route, never by a public URL.
 */

export const LESSON_FILE_PREFIX = "lesson-files";
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
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = name.slice(dot).toLowerCase();
  return allowedExtensions.has(extension) ? extension : null;
}

export function newLessonFileId(extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `lf-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

/** Object key for an attachment id. Null when the id is not one we generated. */
export function lessonFileKey(id: string): string | null {
  if (!/^lf-[a-z0-9-]+\.[a-z0-9]+$/i.test(id)) return null;
  const key = `${LESSON_FILE_PREFIX}/${id}`;
  return isValidObjectKey(key) ? key : null;
}

export async function storeLessonFile(
  id: string,
  body: Buffer,
  contentType: string,
): Promise<{ key: string; size: number }> {
  const key = lessonFileKey(id);
  if (!key) throw new Error("نام فایل نامعتبر است");
  const stored = await putObject(key, body, contentType);
  return { key: stored.key, size: stored.size };
}

export async function readLessonFile(id: string): Promise<ObjectRead | null> {
  const key = lessonFileKey(id);
  if (!key) return null;
  return readObject(key);
}

export async function lessonFileHead(id: string): Promise<ObjectHead | null> {
  const key = lessonFileKey(id);
  if (!key) return null;
  return headObject(key);
}

export async function deleteLessonFile(id: string): Promise<void> {
  const key = lessonFileKey(id);
  if (!key) return;
  await deleteObject(key);
}
