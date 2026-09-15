import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clapperboard, Cloud, Eye, Settings, ShieldCheck, Timer, Video } from "lucide-react";
import { deleteVideo, updateVideoTitle } from "../actions";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TableShell, Td } from "@/components/admin/TableShell";
import { VideoUploader } from "@/components/admin/VideoUploader";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getClasses, getCourses, getSettings, getUsers, getVideos } from "@/lib/store";
import { formatBytes, formatDuration } from "@/lib/video";
import { storageKind } from "@/lib/storage";
import { objectStorageConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "کتابخانه ویدیو" };
export const dynamic = "force-dynamic";

const statusMeta: Record<string, { label: string; cls: string }> = {
  uploading: { label: "در حال آپلود", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  uploaded: { label: "آپلودشده", cls: "bg-sand-100 text-ink-700 ring-ink-900/10" },
  processing: { label: "در حال پردازش", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  ready: { label: "آماده پخش", cls: "bg-teal-50 text-teal-800 ring-teal-200" },
  failed: { label: "خطا", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "videos")) return <Denied />;
  const { preview } = await searchParams;
  const videos = getVideos();
  const courses = getCourses();
  const classes = getClasses();
  const users = new Map(getUsers().map((u) => [u.id, u.name]));
  const settings = getSettings();
  const previewVideo = preview ? videos.find((v) => v.id === preview) : undefined;
  const totalBytes = videos.reduce((s, v) => s + v.sizeBytes, 0);
  const kind = storageKind();
  const configured = objectStorageConfigured();

  const usage = (id: string) => {
    const out: { label: string; href: string }[] = [];
    for (const c of courses) {
      if (c.trailer?.kind === "upload" && c.trailer.src === id) out.push({ label: `تیزر: ${c.shortTitle}`, href: `/admin/courses/${c.slug}/edit` });
      const n = (c.lessons ?? []).filter((l) => l.videoId === id).length;
      if (n) out.push({ label: `${c.shortTitle} (${toFa(n)} جلسه)`, href: `/admin/courses/${c.slug}/lessons` });
    }
    for (const k of classes) {
      if (k.trailer?.kind === "upload" && k.trailer.src === id) out.push({ label: `تیزر کلاس: ${k.title}`, href: `/admin/classes/${k.slug}/edit` });
      const lessonCount = (k.lessons ?? []).filter((lesson) => lesson.videoId === id).length;
      if (lessonCount) out.push({ label: `${k.title} (${toFa(lessonCount)} درس)`, href: `/admin/classes/${k.slug}/lessons` });
    }
    return out;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-navy-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-white">
              <Video className="h-5 w-5" />
            </span>
            کتابخانه ویدیو
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-full bg-navy-800 px-3 py-1 text-xs font-black text-white">{toFa(videos.length)} ویدیو</span>
            <span className="inline-flex items-center rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-700 ring-1 ring-ink-900/10">{formatBytes(totalBytes)}</span>
            <span className="text-xs text-ink-500">ذخیره در باکت خصوصی • پخش امن با توکن امضاشده</span>
          </div>
        </div>
        <Link href="/admin/videos/settings" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white shadow-sm hover:bg-navy-700">
          <Settings className="h-4 w-4" /> تنظیمات پخش
        </Link>
      </div>

      {/* Storage not configured banner */}
      {!configured && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-amber-900">فضای ابری پیکربندی نشده — آپلود در Production مسدود است</p>
            <p className="mt-1 text-xs leading-6 text-amber-800/80">
              برای نگهداری ویدیوها باید متغیرهای <code dir="ltr" className="rounded bg-white px-1 py-0.5 text-[11px] ring-1 ring-amber-200">S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY</code> را در
              هاست تنظیم کنید. در حالت توسعه فایل‌ها موقتاً روی دیسک ذخیره می‌شوند و با هر دیپلوی پاک می‌شوند.{" "}
              <Link href="/admin/videos/settings" className="font-bold text-amber-900 underline">
                رفتن به تنظیمات
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${configured ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
              <Cloud className="h-5 w-5" />
            </div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${configured ? "bg-teal-50 text-teal-800 ring-teal-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
              {configured ? (kind === "s3" ? "S3 متصل" : "لوکال (dev)") : "نیاز به تنظیم"}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-black text-navy-900">فضای ابری خصوصی</h3>
          <p className="mt-1 text-xs leading-6 text-ink-600">
            {configured ? (kind === "s3" ? "باکت private، بدون URL عمومی. همه ویدیوها از مسیر امن پخش می‌شوند." : "در dev روی دیسک؛ در prod باید S3 باشد.") : "کلیدهای S3 را تنظیم کنید تا ویدیوها ماندگار شوند."}
          </p>
          <p className="mt-2 text-[11px] font-mono text-ink-400" dir="ltr">
            videos/ • lesson-files/ • uploads/
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-black text-navy-900">پخش امن همیشه فعال</h3>
          <p className="mt-1 text-xs leading-6 text-ink-600">توکن کوتاه‌مدت، بررسی ثبت‌نام، بایند به User-Agent، Range و inline.</p>
          <p className="mt-2 text-[11px] font-mono text-ink-400" dir="ltr">
            /api/video/[id]/stream?t=…
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-navy-700 ring-1 ring-ink-900/10">
            <Timer className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-black text-navy-900">لینک امضاشده {toFa(Math.round(settings.video.signedUrlSeconds / 60))} دقیقه‌ای</h3>
          <p className="mt-1 text-xs leading-6 text-ink-600">واترمارک متحرک هر {toFa(settings.video.watermarkIntervalSec)} ثانیه جابه‌جا می‌شود.</p>
          <p className="mt-2 text-[11px] text-ink-500">کپی لینک به‌سرعت منقضی می‌شود.</p>
        </div>
      </div>

      {previewVideo && (
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-navy-900">
              <Clapperboard className="h-4 w-4 text-teal-700" /> پیش‌نمایش: {previewVideo.title}
            </h2>
            <Link href="/admin/videos" className="inline-flex h-8 items-center rounded-lg bg-sand-100 px-3 text-xs font-bold text-ink-600 hover:bg-sand-200">
              بستن
            </Link>
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-xl bg-black">
            <SecurePlayer videoId={previewVideo.id} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-500">پیش‌نمایش مدیر بدون واترمارک شماره؛ هنرجویان شماره خودشان را روی تصویر می‌بینند.</p>
        </div>
      )}

      {/* Upload only — single source of truth for this RC */}
      <div className="mx-auto max-w-2xl">
        <VideoUploader />
      </div>

      {/* Video table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-navy-900">همه ویدیوها</h2>
          <span className="text-xs text-ink-500">{toFa(videos.length)} مورد • مجموع {formatBytes(totalBytes)}</span>
        </div>

        <TableShell head={["ویدیو", "مشخصات", "وضعیت", "استفاده", "آپلودکننده", ""]}>
          {videos.length === 0 && (
            <tr>
              <Td colSpan={6}>
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100 text-ink-400">
                    <Video className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-navy-900">هنوز ویدیویی نیست</p>
                  <p className="max-w-sm text-xs leading-6 text-ink-500">از بخش بالا فایل را مستقیم به فضای ابری خصوصی آپلود کنید. فایل‌ها در videos/ ذخیره و فقط با پلیر امن پخش می‌شوند.</p>
                </div>
              </Td>
            </tr>
          )}
          {videos.map((v) => {
            const st = statusMeta[v.status] ?? statusMeta.uploaded;
            const used = usage(v.id);
            return (
              <tr key={v.id} className="group align-top transition-colors hover:bg-sand-50/60">
                <Td className="min-w-[260px]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-white">
                      <Clapperboard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <form action={updateVideoTitle} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={v.id} />
                        <input
                          name="title"
                          defaultValue={v.title}
                          className="h-8 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-bold text-navy-900 hover:border-ink-900/10 focus:border-teal-600 focus:bg-white focus:outline-none"
                        />
                        <button type="submit" className="h-7 shrink-0 cursor-pointer rounded-lg bg-sand-100 px-2.5 text-[11px] font-bold text-ink-600 hover:bg-sand-200">
                          ذخیره
                        </button>
                      </form>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-ink-500">
                        <span dir="ltr" className="truncate font-mono">
                          {v.id}
                        </span>
                        <span>•</span>
                        <span dir="ltr" className="truncate">
                          {v.originalName}
                        </span>
                      </p>
                      {v.note && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] leading-5 text-amber-800 ring-1 ring-amber-200">{v.note}</p>}
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="text-sm font-medium text-ink-800">{formatDuration(v.durationSec) || "—"}</div>
                  <div className="mt-0.5 text-xs text-ink-500">{formatBytes(v.sizeBytes)}</div>
                </Td>
                <Td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${st.cls}`}>{st.label}</span>
                  <div className="mt-1 text-[11px] text-ink-400">{v.createdAt}</div>
                </Td>
                <Td className="min-w-[160px] max-w-[220px]">
                  {used.length === 0 ? (
                    <span className="text-xs text-ink-400">استفاده نشده</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {used.slice(0, 3).map((u) => (
                        <Link key={u.href + u.label} href={u.href} className="inline-flex max-w-full truncate rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100">
                          <span className="truncate">{u.label}</span>
                        </Link>
                      ))}
                      {used.length > 3 && <span className="inline-flex rounded-full bg-sand-100 px-2 py-1 text-[11px] font-bold text-ink-600">+{toFa(used.length - 3)}</span>}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-600">{users.get(v.uploadedBy) ?? <span dir="ltr">{v.uploadedBy.slice(0, 10)}…</span>}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/videos?preview=${v.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-600 shadow-sm ring-1 ring-ink-900/10 hover:bg-teal-50 hover:text-teal-700">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <DeleteButton action={deleteVideo} hidden={{ name: "id", value: v.id }} label={v.title} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </TableShell>
      </div>
    </div>
  );
}
