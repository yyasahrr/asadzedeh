import fs from "node:fs";
import path from "node:path";
import { verifySigned } from "@/lib/auth";
import { getVideo } from "@/lib/store";
import { VAULT } from "@/lib/video";

export const dynamic = "force-dynamic";

/**
 * Serves the HLS playlist and segments from the private vault.
 * The playlist is rewritten so every segment URL carries the same signed token.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string[] }> }) {
  const { id, file } = await params;
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const payload = verifySigned<{ v: string; ua: string; exp: number }>(t);
  if (!payload || payload.v !== id) return new Response("forbidden", { status: 403 });
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  if (payload.ua && payload.ua !== ua) return new Response("forbidden", { status: 403 });

  const video = getVideo(id);
  if (!video?.hls) return new Response("not found", { status: 404 });
  const name = file.join("/");
  if (!/^[a-z0-9_.-]+$/i.test(name) || name.includes("..")) return new Response("bad request", { status: 400 });

  const dir = path.join(VAULT, `${id}_hls`);
  const abs = path.join(dir, name);
  if (!abs.startsWith(dir) || !fs.existsSync(abs)) return new Response("not found", { status: 404 });

  if (name.endsWith(".m3u8")) {
    const text = fs.readFileSync(abs, "utf-8").replace(/^(seg_\d+\.ts)$/gm, (seg) => `${seg}?t=${encodeURIComponent(t)}`);
    return new Response(text, {
      headers: { "content-type": "application/vnd.apple.mpegurl", "cache-control": "private, no-store" },
    });
  }
  const stream = fs.createReadStream(abs);
  return new Response(stream as unknown as ReadableStream, {
    headers: { "content-type": "video/mp2t", "cache-control": "private, max-age=60", "content-length": String(fs.statSync(abs).size) },
  });
}
