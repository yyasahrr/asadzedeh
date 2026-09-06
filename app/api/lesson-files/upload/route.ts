import fs from "node:fs";
import { audit } from "@/lib/audit";
import { can, getSessionUser } from "@/lib/auth";
import {
  ensureLessonFileDir,
  lessonFileExtension,
  lessonFilePath,
  MAX_LESSON_FILE_BYTES,
  newLessonFileId,
} from "@/lib/lesson-files";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const allowed = can(user, "courses") || can(user, "classes") || user?.role === "instructor";
  if (!user || !allowed) return Response.json({ error: "دسترسی ندارید" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
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
  const absolutePath = lessonFilePath(id);
  if (!absolutePath) return Response.json({ error: "نام فایل نامعتبر است" }, { status: 400 });

  ensureLessonFileDir();
  fs.writeFileSync(absolutePath, Buffer.from(await file.arrayBuffer()));

  const attachment = {
    label: file.name.replace(/\.[^.]+$/, ""),
    path: `/api/lesson-files/${id}`,
    fileName: file.name,
    mime: file.type || "application/octet-stream",
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
