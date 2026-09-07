import fs from "node:fs";
import { NextResponse } from "next/server";
import { localObjectPath, storageKind } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (storageKind() === "s3") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { key } = await ctx.params;
  const joined = key.join("/");
  const abs = localObjectPath(joined);
  if (!abs || !fs.existsSync(abs)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = fs.readFileSync(abs);
  const ext = joined.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "pdf" ? "application/pdf" :
    "application/octet-stream";
  return new NextResponse(buf, { headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" } });
}
