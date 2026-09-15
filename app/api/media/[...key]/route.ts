import { NextResponse } from "next/server";
import { isValidObjectKey, readObject, storageKind } from "@/lib/storage";
import { LESSON_FILE_PREFIX } from "@/lib/lesson-files";
import { VIDEO_PREFIX } from "@/lib/video";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Prefixes this route must never serve.
 *
 * Course videos and lesson attachments are paid-for material delivered by
 * routes that check enrolment first. They live in the same bucket as public
 * site imagery, so without this guard `/api/media/videos/<key>` would hand out
 * a lesson to anyone who could name the key — the bucket being private would
 * not help, because this route holds the credentials.
 */
const PRIVATE_PREFIXES = [`${VIDEO_PREFIX}/`, `${LESSON_FILE_PREFIX}/`];

/**
 * Serve an uploaded media object (site imagery, PDFs) from object storage.
 *
 * This is the one storage read that is deliberately unauthenticated: these are
 * the images the public pages render, referenced as `/api/media/<key>` in HTML.
 * Two consequences of that, both intentional:
 *
 *   - the bucket still has no public read, so nothing is reachable without
 *     going through this route;
 *   - the key is the only thing a caller controls, and it is validated before
 *     any storage call, so this route cannot be turned into a read primitive
 *     for arbitrary objects.
 *
 * Course videos and lesson attachments are NOT served here — they go through
 * routes that check enrolment first.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const joined = key.map((segment) => decodeURIComponent(segment)).join("/");

  if (!isValidObjectKey(joined)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Same answer as a missing object: an unauthorised caller must not be able to
  // probe which private keys exist.
  if (PRIVATE_PREFIXES.some((prefix) => joined.startsWith(prefix))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let read;
  try {
    read = await readObject(joined);
  } catch (error) {
    logger.error({ event: "media.read.failed", key: joined, err: String(error) });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!read) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(read.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": read.contentType,
      "Content-Length": String(read.size),
      // Immutable: keys contain a random component, so a key never changes
      // meaning and a long cache lifetime is safe.
      "Cache-Control": storageKind() === "s3" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
