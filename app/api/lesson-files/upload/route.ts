import { audit } from "@/lib/audit";
import { can, getSessionUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  MAX_LESSON_FILE_BYTES,
  lessonFileExtension,
  newLessonFileId,
  storeLessonFile,
} from "@/lib/lesson-files";
import { isProduction } from "@/lib/env";
import { storageDurable } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Upload a lesson attachment into private object storage.
 *
 * The attachment is referenced by `/api/lesson-files/<id>`, an authorising
 * route — never by an object URL, so the bucket can stay private and nothing
 * here puts a storage credential or key in the response.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  const allowed = can(user, "courses") || can(user, "classes") || user?.role === "instructor";
  if (!user || !allowed) return Response.json({ error: "دسترسی ندارید" }, { status: 403 });

  // Teaching material must outlive a deploy. On an ephemeral container disk it
  // would not, so production refuses instead of accepting a file it cannot keep.
  if (isProduction() && !storageDurable()) {
    logger.error({ event: "lessonFile.upload.noObjectStorage" });
    return Response.json(
      { error: "فضای ذخیره‌سازی ابری پیکربندی نشده است؛ فایل درس باید روی Object Storage ذخیره شود." },
      { status: 503 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "فایلی انتخاب نشده است" }, { status: 400 });
  }
  if (file.size > MAX_LESSON_FILE_BYTES) {
    return Response.json({ error: "حجم فایل باید کمتر از ۲۵ مگابایت باشد" }, { status: 400 });
  }

  const extension = lessonFileExtension(file.name);
  if (!extension) {
    return Response.json({ error: "فرمت فایل پشتیبانی نمی‌شود" }, { status: 400 });
  }

  const id = newLessonFileId(extension);
  const contentType = file.type || "application/octet-stream";

  try {
    await storeLessonFile(id, Buffer.from(await file.arrayBuffer()), contentType);
  } catch (error) {
    // Nothing was written to the database yet, so a storage failure leaves no
    // dangling attachment reference behind.
    logger.error({ event: "lessonFile.upload.failed", id, err: String(error) });
    return Response.json({ error: "ذخیره فایل ناموفق بود" }, { status: 502 });
  }

  const attachment = {
    label: file.name.replace(/\.[^.]+$/, ""),
    path: `/api/lesson-files/${id}`,
    fileName: file.name,
    mime: contentType,
    sizeBytes: file.size,
  };
  await audit({
    action: "content.update",
    actor: { id: user.id, name: user.name, role: user.role },
    target: `lesson-file:${id}`,
    detail: { fileName: file.name, size: file.size },
  });

  return Response.json({ attachment });
}
