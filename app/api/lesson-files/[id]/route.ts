import fs from "node:fs";
import path from "node:path";
import { can, getSessionUser } from "@/lib/auth";
import { hasPaidClassAccess, isEnrolled } from "@/lib/access";
import { lessonFilePath } from "@/lib/lesson-files";
import { getClasses, getCourses, getInstructorByUser } from "@/lib/store";
import type { InPersonClass, Lesson, LessonAttachment, OnlineCourse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface AttachmentContext {
  attachment: LessonAttachment;
  lesson: Lesson;
  course?: OnlineCourse;
  inPersonClass?: InPersonClass;
}

function findAttachment(id: string): AttachmentContext | null {
  const expectedPath = `/api/lesson-files/${id}`;
  for (const course of getCourses()) {
    for (const lesson of course.lessons ?? []) {
      const attachment = lesson.attachments?.find((item) => item.path === expectedPath);
      if (attachment) return { attachment, course, lesson };
    }
  }
  for (const inPersonClass of getClasses()) {
    for (const lesson of inPersonClass.lessons ?? []) {
      const attachment = lesson.attachments?.find((item) => item.path === expectedPath);
      if (attachment) return { attachment, inPersonClass, lesson };
    }
  }
  return null;
}

function downloadName(attachment: LessonAttachment, id: string) {
  const extension = path.extname(id);
  const raw = attachment.fileName || `${attachment.label}${extension}`;
  return raw.replace(/[\r\n"]/g, "").slice(0, 160) || `attachment${extension}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const absolutePath = lessonFilePath(id);
  const context = findAttachment(id);
  if (!absolutePath || !context || !fs.existsSync(absolutePath)) {
    return new Response("not found", { status: 404 });
  }

  const user = await getSessionUser();
  let allowed = !!user && (can(user, "courses") || can(user, "classes"));
  if (!allowed && user?.role === "instructor") {
    const instructor = getInstructorByUser(user.id);
    allowed = !!instructor &&
      (context.course?.instructorSlug === instructor.slug || context.inPersonClass?.instructorSlug === instructor.slug);
  }
  if (!allowed && context.course) allowed = isEnrolled(user, context.course.slug) || context.lesson.free;
  if (!allowed && context.inPersonClass) allowed = hasPaidClassAccess(user, context.inPersonClass.slug);
  if (!allowed) return new Response("forbidden", { status: 403 });

  const stat = fs.statSync(absolutePath);
  const stream = fs.createReadStream(absolutePath);
  const fileName = encodeURIComponent(downloadName(context.attachment, id));
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "content-type": context.attachment.mime || "application/octet-stream",
      "content-length": String(stat.size),
      "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
