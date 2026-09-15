import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, Download, FileText, MapPin, Video } from "lucide-react";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { hasPaidClassAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getClass, getOrders, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "محتوای کلاس حضوری" };
export const dynamic = "force-dynamic";

export default async function InPersonClassContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSessionUser();
  const { slug } = await params;
  if (!user) redirect(`/auth?next=/dashboard/classes/${slug}`);

  const inPersonClass = getClass(slug);
  if (!inPersonClass) notFound();
  if (!hasPaidClassAccess(user, slug)) redirect(`/classes/${slug}`);

  const lessons = [...(inPersonClass.lessons ?? [])].sort((a, b) => a.order - b.order);
  const videos = getVideos();
  const videoById = new Map(videos.map((v) => [v.id, v]));

  // Find the order that purchased this class (for enrollment card)
  const myOrder = getOrders().find(
    (o) => o.status === "پرداخت شده" && (o.userId === user.id || o.phone === user.phone || o.student === user.name) && (o.lines ?? []).some((l) => l.kind === "class" && l.slug === slug)
  );

  // Determine completed vs upcoming sessions
  const completed = lessons.filter((l) => l.completedDate);
  const upcoming = lessons.filter((l) => !l.completedDate);
  const nextSession = upcoming[0];

  // Trailer
  const trailer = inPersonClass.trailer;
  const trailerVideo = trailer?.kind === "upload" ? videoById.get(trailer.src) : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <Link href="/dashboard/classes" className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-teal-700">
          <ArrowRight className="h-3.5 w-3.5" /> کلاس‌های من
        </Link>
        <h1 className="mt-1 text-xl font-black text-navy-900 sm:text-2xl">{inPersonClass.title}</h1>
        <p className="mt-1 text-sm text-ink-600">
          جلسات، فایل‌های تکمیلی و کارت ورود
        </p>
      </header>

      {/* Class info bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-2.5 text-sm">
          <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
          <span className="font-semibold">{inPersonClass.days}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-2.5 text-sm">
          <Clock3 className="h-4 w-4 shrink-0 text-teal-600" />
          <span className="font-semibold">{inPersonClass.time}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-2.5 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
          <span className="font-semibold">{inPersonClass.location}</span>
        </div>
      </div>

      {/* Trailer video */}
      {(trailer?.kind === "upload" && trailerVideo?.status === "ready" && trailerVideo.hls) || trailer?.kind === "embed" ? (
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-3 flex items-center gap-2 font-black text-navy-900">
            <Video className="h-4 w-4 text-teal-700" /> ویدیو معرفی دوره
          </h2>
          <div className="mx-auto max-w-3xl">
            {trailer.kind === "upload" && trailerVideo ? (
              <SecurePlayer videoId={trailerVideo.id} poster={inPersonClass.image} />
            ) : trailer.kind === "embed" && trailer.src ? (
              <div className="relative aspect-video overflow-hidden rounded-xl">
                <iframe src={trailer.src} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Enrollment card */}
      {myOrder && (
        <a
          href={`/api/enrollment-card?class=${slug}&order=${myOrder.id}`}
          className="flex items-center gap-3 rounded-2xl bg-teal-600 p-5 text-white shadow-card transition-colors hover:bg-teal-700"
          download
        >
          <CreditCard className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <p className="font-black">کارت ورود به کلاس</p>
            <p className="mt-0.5 text-sm text-teal-100">فرمت PDF — قابل چاپ</p>
          </div>
          <Download className="h-5 w-5" />
        </a>
      )}

      {/* Session timeline */}
      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/12 bg-card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-ink-400" />
          <p className="mt-3 font-black text-navy-900">هنوز جلسه‌ای ثبت نشده است</p>
          <p className="mt-1 text-sm text-ink-500">جلسات پس از ثبت توسط ادمین در اینجا نمایش داده می‌شوند.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-black text-navy-900">جلسات دوره ({toFa(lessons.length)} جلسه)</h2>

          {/* Completed sessions */}
          {completed.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-teal-700">جلسات برگزار شده</p>
              {completed.map((l) => (
                <div key={l.id} className="flex items-start gap-3 rounded-xl bg-teal-50/50 px-4 py-3 ring-1 ring-teal-600/10">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy-900">{l.title}</span>
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-700">
                        {l.completedDate}
                      </span>
                    </div>
                    {l.description && <p className="mt-1 text-xs text-ink-500 line-clamp-2">{l.description}</p>}
                    {l.attachments && l.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-600/20 hover:bg-teal-50"
                          >
                            <FileText className="h-3 w-3" />
                            {att.label || att.fileName || "فایل"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next session */}
          {nextSession && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-ochre-700">جلسه بعدی</p>
              <div className="flex items-start gap-3 rounded-xl bg-ochre-50/50 px-4 py-3 ring-2 ring-ochre-500/30">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ochre-500 text-[11px] font-black text-white">
                  {toFa(nextSession.order)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-navy-900">{nextSession.title}</span>
                  {nextSession.description && <p className="mt-1 text-xs text-ink-500 line-clamp-2">{nextSession.description}</p>}
                  {nextSession.attachments && nextSession.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {nextSession.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-ochre-700 ring-1 ring-ochre-500/20 hover:bg-ochre-50"
                        >
                          <FileText className="h-3 w-3" />
                          {att.label || att.fileName || "فایل"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Remaining sessions */}
          {upcoming.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink-400">جلسات آینده</p>
              {upcoming.slice(1).map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-sand-50 px-4 py-3 opacity-60">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-black text-ink-600">
                    {toFa(l.order)}
                  </div>
                  <span className="text-sm font-semibold text-ink-600">{l.title}</span>
                  {l.attachments && l.attachments.length > 0 && (
                    <span className="text-[11px] text-ink-400">{toFa(l.attachments.length)} فایل</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
