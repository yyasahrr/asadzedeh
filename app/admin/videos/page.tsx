import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clapperboard, Eye, HardDrive, RefreshCw, Settings, ShieldCheck, TriangleAlert } from "lucide-react";
import { deleteVideo, retranscodeVideo, updateVideoTitle } from "../actions";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TableShell, Td } from "@/components/admin/TableShell";
import { VideoUploader } from "@/components/admin/VideoUploader";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { spotPlayerConfigured } from "@/lib/spotplayer";
import { getClasses, getCourses, getSettings, getUsers, getVideos } from "@/lib/store";
import { findFfmpeg, formatBytes, formatDuration } from "@/lib/video";

export const metadata: Metadata = { title: "کتابخانه ویدیو" };
export const dynamic = "force-dynamic";

const statusMeta: Record<string, { label: string; cls: string }> = {
  uploaded: { label: "آپلودشده", cls: "bg-sand-200 text-ink-700" },
  processing: { label: "در حال پردازش", cls: "bg-ochre-100 text-ochre-800" },
  ready: { label: "آماده پخش", cls: "bg-teal-100 text-teal-800" },
  failed: { label: "خطا", cls: "bg-red-100 text-red-700" },
};

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ preview?: string; queued?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "videos")) return <Denied />;
  const { preview, queued } = await searchParams;
  const videos = getVideos();
  const courses = getCourses();
  const classes = getClasses();
  const users = new Map(getUsers().map((u) => [u.id, u.name]));
  const settings = getSettings();
  const ffmpeg = findFfmpeg();
  const previewVideo = preview ? videos.find((v) => v.id === preview) : undefined;
  const totalBytes = videos.reduce((s, v) => s + v.sizeBytes, 0);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy-900">کتابخانه ویدیو</h1>
          <p className="mt-1 text-sm text-ink-600">
            {toFa(videos.length)} ویدیو • {formatBytes(totalBytes)} • فایل‌ها در مخزن خصوصی سرور نگهداری می‌شوند و فقط از طریق پلیر امن پخش می‌شوند.
          </p>
        </div>
        <Link href="/admin/videos/settings" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">
          <Settings className="h-4 w-4" /> تنظیمات امنیت ویدیو
        </Link>
      </div>

      {/* Status strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${ffmpeg ? "bg-teal-50 ring-teal-200" : "bg-ochre-50 ring-ochre-200"}`}>
          {ffmpeg ? <CircleCheck className="h-5 w-5 text-teal-700" /> : <TriangleAlert className="h-5 w-5 text-ochre-700" />}
          <div className="text-sm">
            <p className="font-bold text-ink-900">ffmpeg {ffmpeg ? "فعال" : "پیدا نشد"}</p>
            <p className="text-xs text-ink-600">{ffmpeg ? "تبدیل HLS و واترمارک حک‌شده در دسترس است." : "پخش امن با فایل اصلی انجام می‌شود؛ برای HLS، ffmpeg نصب کنید."}</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${spotPlayerConfigured() ? "bg-teal-50 ring-teal-200" : "bg-sand-50 ring-ink-900/10"}`}>
          <ShieldCheck className={`h-5 w-5 ${spotPlayerConfigured() ? "text-teal-700" : "text-ink-400"}`} />
          <div className="text-sm">
            <p className="font-bold text-ink-900">اسپات‌پلیر {spotPlayerConfigured() ? "متصل" : "حالت نمایشی"}</p>
            <p className="text-xs text-ink-600">{settings.spotplayer.enabled ? (settings.spotplayer.test ? "لایسنس‌ها در حالت تست صادر می‌شوند." : "لایسنس واقعی برای خریداران صادر می‌شود.") : "غیرفعال — از تنظیمات فعال کنید."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-900/10">
          <HardDrive className="h-5 w-5 text-navy-700" />
          <div className="text-sm">
            <p className="font-bold text-ink-900">لینک امضاشده: {toFa(Math.round(settings.video.signedUrlSeconds / 60))} دقیقه</p>
            <p className="text-xs text-ink-600">واترمارک متحرک هر {toFa(settings.video.watermarkIntervalSec)} ثانیه جابه‌جا می‌شود.</p>
          </div>
        </div>
      </div>

      {queued && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <RefreshCw className="h-4 w-4" /> پردازش مجدد در صف قرار گرفت.
        </div>
      )}

      {previewVideo && (
        <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-navy-900"><Clapperboard className="h-4 w-4 text-teal-700" /> پیش‌نمایش: {previewVideo.title}</h2>
            <Link href="/admin/videos" className="text-xs font-bold text-ink-500 hover:text-ink-800">بستن</Link>
          </div>
          <div className="mx-auto max-w-3xl">
            <SecurePlayer videoId={previewVideo.id} />
          </div>
        </div>
      )}

      <VideoUploader />

      <TableShell head={["ویدیو", "مدت / حجم", "وضعیت", "استفاده در", "آپلودکننده", "عملیات"]}>
        {videos.length === 0 && (
          <tr>
            <Td colSpan={6} className="text-center text-sm text-ink-500">هنوز ویدیویی آپلود نشده است.</Td>
          </tr>
        )}
        {videos.map((v) => {
          const st = statusMeta[v.status] ?? statusMeta.uploaded;
          const used = usage(v.id);
          return (
            <tr key={v.id} className="align-top">
              <Td>
                <form action={updateVideoTitle} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={v.id} />
                  <input name="title" defaultValue={v.title} className="h-9 w-48 rounded-lg border border-transparent bg-transparent px-2 text-sm font-bold text-ink-900 hover:border-ink-900/10 focus:border-teal-600 focus:bg-white focus:outline-none" aria-label="عنوان ویدیو" />
                  <button type="submit" className="h-8 cursor-pointer rounded-lg bg-sand-100 px-2 text-[11px] font-bold text-ink-600 hover:bg-sand-200">ذخیره</button>
                </form>
                <p className="mt-1 truncate text-xs text-ink-500" dir="ltr">{v.originalName} • {v.id}</p>
                {v.note && <p className="mt-1 text-xs text-ochre-700">{v.note}</p>}
              </Td>
              <Td className="text-sm text-ink-700 whitespace-nowrap">
                {formatDuration(v.durationSec)}
                <br />
                <span className="text-xs text-ink-500">{formatBytes(v.sizeBytes)}{v.hls ? " • HLS" : ""}</span>
              </Td>
              <Td>
                <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                <p className="mt-1 text-[11px] text-ink-500">{v.createdAt}</p>
              </Td>
              <Td className="text-xs">
                {used.length === 0 ? (
                  <span className="text-ink-400">—</span>
                ) : (
                  <ul className="space-y-0.5">
                    {used.map((u) => (
                      <li key={u.href + u.label}>
                        <Link href={u.href} className="font-bold text-teal-700 hover:underline">{u.label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
              <Td className="text-xs text-ink-600 whitespace-nowrap">{users.get(v.uploadedBy) ?? v.uploadedBy}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/videos?preview=${v.id}`} title="پیش‌نمایش" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50">
                    <Eye className="h-4 w-4" />
                  </Link>
                  {ffmpeg && (
                    <form action={retranscodeVideo}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" title="پردازش مجدد (HLS)" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-navy-700 hover:bg-sand-100">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                  <DeleteButton action={deleteVideo} hidden={{ name: "id", value: v.id }} label={v.title} />
                </div>
              </Td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
