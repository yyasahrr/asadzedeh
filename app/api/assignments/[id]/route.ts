import { NextResponse } from "next/server";
import { getSessionUser, can } from "@/lib/auth";
import { getSubmissions } from "@/lib/store";
import { readObject } from "@/lib/storage";
import { isValidObjectKey } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sub = getSubmissions().find((s) => s.id === id);
  if (!sub) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Only owner, instructor of course, or staff can download
  const isOwner = sub.userId ? sub.userId === user.id : sub.student === user.name;
  const isStaff = can(user, "submissions");
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // file field may be legacy bare filename or new key assignments/xxx
  const key = sub.file.includes("/") ? sub.file : `assignments/${sub.file}`;
  if (!isValidObjectKey(key) || !key.startsWith("assignments/")) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const obj = await readObject(key);
  if (!obj) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Stream body to response
  const headers: Record<string, string> = {
    "Content-Type": obj.contentType,
    "Cache-Control": "private, no-store",
  };
  if (obj.contentLength) headers["Content-Length"] = String(obj.contentLength);
  // Force download with original extension
  const filename = key.split("/").pop() ?? "assignment";
  headers["Content-Disposition"] = `attachment; filename="${filename}"`;

  // Handle both Node stream and Web stream
  if (typeof (obj.body as ReadableStream).getReader === "function") {
    return new NextResponse(obj.body as unknown as ReadableStream, { status: 200, headers });
  }
  // Node readable -> convert to web stream
  const { Readable } = await import("node:stream");
  const webStream = (Readable.toWeb as unknown as (r: unknown) => ReadableStream)(obj.body as unknown);
  return new NextResponse(webStream, { status: 200, headers });
}
