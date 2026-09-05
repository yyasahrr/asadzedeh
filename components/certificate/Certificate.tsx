import type { Certificate as CertificateData } from "@/lib/types";
import { toFa } from "@/lib/format";
import { LogoMark } from "../Logo";

/** Official seal of the academy (pure SVG, madder red). */
function Seal() {
  return (
    <svg viewBox="0 0 160 160" className="h-28 w-28 -rotate-12 opacity-90 sm:h-32 sm:w-32" aria-hidden>
      <circle cx="80" cy="80" r="74" fill="none" stroke="#9D382C" strokeWidth="4" />
      <circle cx="80" cy="80" r="64" fill="none" stroke="#9D382C" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="46" fill="none" stroke="#9D382C" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="68" y="68" width="24" height="24" fill="#9D382C" transform="rotate(45 80 80)" />
      <text x="80" y="42" textAnchor="middle" fontSize="13" fontWeight="800" fill="#9D382C">
        آموزشگاه هنری
      </text>
      <text x="80" y="128" textAnchor="middle" fontSize="15" fontWeight="900" fill="#9D382C">
        اسدزاده
      </text>
    </svg>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="6" y="6" width="12" height="12" fill="#C08A3E" transform="rotate(45 12 12)" />
      <rect x="9.5" y="9.5" width="5" height="5" fill="#FBF5E9" transform="rotate(45 12 12)" />
    </svg>
  );
}

export function Certificate({ cert }: { cert: CertificateData }) {
  return (
    <div
      className="print-sheet relative mx-auto aspect-[297/210] w-full max-w-5xl overflow-hidden rounded-2xl bg-[#FBF5E9] shadow-lift ring-1 ring-navy-900/20"
      role="img"
      aria-label={`گواهی پایان دوره ${cert.course} برای ${cert.student}`}
    >
      {/* Frames */}
      <div className="pointer-events-none absolute inset-3 rounded-xl border-[3px] border-navy-800/80" aria-hidden />
      <div className="pointer-events-none absolute inset-5 rounded-lg border border-ochre-600/70" aria-hidden />
      <Corner className="absolute top-4 right-4 h-5 w-5" />
      <Corner className="absolute top-4 left-4 h-5 w-5" />
      <Corner className="absolute bottom-4 right-4 h-5 w-5" />
      <Corner className="absolute bottom-4 left-4 h-5 w-5" />

      <div className="bg-lattice absolute inset-0 opacity-60" aria-hidden />

      <div className="relative flex h-full flex-col items-center justify-between px-8 py-6 text-center sm:px-14 sm:py-8">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <p className="text-base font-black text-navy-900 sm:text-lg">آموزشگاه هنری اسدزاده</p>
          </div>
          <h2 className="mt-2 text-[clamp(1.35rem,5vw,2.25rem)] font-black text-navy-900">گواهی پایان دوره</h2>
          <p className="mt-1 text-[10px] font-bold tracking-[0.3em] text-ink-400 uppercase" dir="ltr">
            Certificate of Completion
          </p>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-sm text-ink-600 sm:text-base">گواهی می‌شود</p>
          <p className="mt-1 max-w-full truncate border-b-2 border-ochre-600/60 px-4 pb-2 text-[clamp(1.3rem,6vw,2.25rem)] font-black text-madder-700 sm:px-8">
            {cert.student}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-ink-700 sm:text-base sm:leading-9">
            دوره آموزشی <strong className="text-navy-900">«{cert.course}»</strong> را به مدت{" "}
            <strong className="text-navy-900">{toFa(cert.hours)} ساعت</strong> با موفقیت به پایان رسانده
            و شایستگی دریافت این گواهی را کسب کرده است.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] font-bold text-ink-600 sm:text-sm">
            <span>تاریخ صدور: {cert.date}</span>
            <span dir="ltr">Code: {cert.code}</span>
          </div>
        </div>

        <div className="flex w-full items-end justify-between gap-4">
          <div className="flex flex-col items-center gap-1">
            <p className="font-black text-navy-900 italic sm:text-lg" style={{ fontFamily: "serif" }}>
              ناصر اسد زاده
            </p>
            <span className="h-px w-36 bg-ink-900/40 sm:w-44" aria-hidden />
            <p className="text-xs text-ink-500">مدیر آموزشگاه و استاد دوره</p>
          </div>
          <Seal />
          <div className="hidden flex-col items-center gap-1 sm:flex">
            <p className="text-xs font-bold text-ink-500">اعتبار گواهی</p>
            <p className="max-w-40 text-[11px] leading-5 text-ink-500" dir="ltr">
              asadzedeh.ir/verify/{cert.code}
            </p>
          </div>
        </div>
      </div>

      <div className="pattern-strip absolute inset-x-0 bottom-0 h-1.5" aria-hidden />
    </div>
  );
}
