import { ExternalLink, Landmark, MapPin, Navigation, Phone, Clock } from "lucide-react";

const workshopAddress =
  "ارومیه، خیابان امام، خیابان عطایی، کوی دی (نجارخانه)، آموزشگاه اسدزاده";

export function WorkshopLocation() {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshopAddress)}`;

  return (
    <section
      id="workshop-location"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-ink-900/8"
      aria-labelledby="workshop-title"
    >
      <div className="grid lg:grid-cols-[minmax(280px,0.6fr)_1.4fr]">
        {/* Left Panel — Address & Info */}
        <div className="flex flex-col justify-between bg-navy-900 p-5 text-white sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-wide text-ochre-200">نشانی کارگاه حضوری</p>
            <h2 id="workshop-title" className="mt-1.5 font-display text-xl font-black">
              کارگاه اسدزاده در ارومیه
            </h2>

            <address className="mt-3 not-italic text-sm leading-7 text-white/80">
              <span className="block">خیابان امام، خیابان عطایی</span>
              <span className="block">کوی دی (نجارخانه)</span>
              <span className="block font-bold text-white">آموزشگاه اسدزاده</span>
            </address>

            <div className="mt-4 rounded-lg bg-white/8 p-3">
              <p className="text-xs text-white/60">مدرس کارگاه</p>
              <p className="mt-0.5 font-display text-base font-black text-ochre-200">استاد ناصر اسد زاده</p>
            </div>

            <div className="mt-4 rounded-lg bg-white/8 p-3">
              <p className="text-xs text-white/60">نشانه‌های مسیر</p>
              <p className="mt-1 text-xs leading-6 text-white/75">
                ورود از خیابان عطایی به کوی دی. اولین نشانه مسیر بانک سپه (انصار سابق) است. از آنجا به سمت inside کوی دی ادامه دهید تا parking آموزشیگاه.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 border-t border-white/12 pt-4 text-xs text-white/65">
            <p className="flex items-center gap-2">
              <Landmark className="h-4 w-4 shrink-0 text-ochre-200" />
              نشانه مسیر: بانک سپه (انصار سابق)
            </p>
            <p className="flex items-center gap-2">
              <Navigation className="h-4 w-4 shrink-0 text-ochre-200" />
              ورود از خیابان عطایی به کوی دی
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-ochre-200" />
              ساعت کارگاه: شنبه تا پنجشنبه
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-ochre-200" />
              هماهنگی: ۰۲۱-۱۲۳۴۵۶۷۸
            </p>
          </div>

          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-sand-100 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:bg-sand-200 focus-visible:outline-none"
          >
            باز کردن نشانی در نقشه گوگل
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Right Panel — SVG Sketch Map */}
        <div className="relative min-h-80 overflow-hidden bg-[#efe4cb] p-3 sm:p-5" dir="rtl">
          <div className="absolute inset-0 opacity-30 bg-lattice" aria-hidden />
          <svg
            viewBox="0 0 760 430"
            className="relative h-full w-full"
            role="img"
            aria-labelledby="map-title map-description"
          >
            <title id="map-title">کروکی مسیر کارگاه اسدزاده در ارومیه</title>
            <desc id="map-description">
              مسیر از خیابان امام به خیابان عطایی و سپس کوی دی، روبه‌روی بانک سپه تا آموزشگاه اسدزاده
            </desc>

            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9d382c" />
              </marker>
              <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#152f3d" floodOpacity=".2" />
              </filter>
              <linearGradient id="road-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c5b48f" />
                <stop offset="100%" stopColor="#b8a47a" />
              </linearGradient>
            </defs>

            {/* Background streets */}
            <path d="M80 58V380M82 150H704M314 58v92M552 58v92" fill="none" stroke="#c5b48f" strokeWidth="18" strokeLinecap="round" />

            {/* Main road — خیابان امام */}
            <path d="M82 150H704" stroke="#193b5c" strokeWidth="42" strokeLinecap="round" />
            <path d="M82 150H704" stroke="#faf6ec" strokeWidth="3" strokeDasharray="22 18" />

            {/* خیابان عطایی — the turn */}
            <path d="M470 151v84c0 36-28 64-64 64H258v92" fill="none" stroke="#c08a3e" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />

            {/* Route arrows */}
            <path d="M664 150H515" fill="none" stroke="#9d382c" strokeWidth="5" markerEnd="url(#arrow)" />
            <path d="M450 178v43c0 29-23 52-52 52H280v74" fill="none" stroke="#9d382c" strokeWidth="5" strokeDasharray="10 9" markerEnd="url(#arrow)" />

            {/* Street labels */}
            <g fill="#152f3d" fontFamily="var(--font-peyda)" fontWeight="700">
              <text x="690" y="126" fontSize="23" textAnchor="end">خیابان عطایی</text>
              <text x="58" y="285" fontSize="20" transform="rotate(-90 58 285)" textAnchor="middle">خیابان امام</text>
              <text x="326" y="44" fontSize="18" textAnchor="middle">کوی صحیه</text>
              <text x="410" y="330" fontSize="17" textAnchor="middle">کوی دی (نجارخانه)</text>
            </g>

            {/* بانک سپه landmark */}
            <g>
              <rect x="335" y="188" width="118" height="60" rx="8" fill="#fffdf7" stroke="#193b5c" strokeWidth="2" />
              <text x="394" y="212" fill="#6b6e6b" fontSize="13" fontFamily="var(--font-peyda)" textAnchor="middle">نشانه مسیر</text>
              <text x="394" y="235" fill="#152f3d" fontSize="16" fontWeight="700" fontFamily="var(--font-peyda)" textAnchor="middle">بانک سپه</text>
            </g>

            {/* Pin marker */}
            <g transform="translate(255 321)" filter="url(#pin-shadow)">
              <path d="M24 0C10.7 0 0 10.7 0 24c0 18 24 43 24 43s24-25 24-43C48 10.7 37.3 0 24 0Z" fill="#9d382c" />
              <circle cx="24" cy="24" r="9" fill="#fffdf7" />
            </g>

            {/* Destination label */}
            <g transform="translate(120 315)">
              <rect width="142" height="66" rx="11" fill="#193b5c" />
              <text x="71" y="27" fill="#e8d8b8" fontSize="13" fontFamily="var(--font-peyda)" textAnchor="middle">مقصد</text>
              <text x="71" y="50" fill="#fff" fontSize="17" fontWeight="700" fontFamily="var(--font-peyda)" textAnchor="middle">آموزشگاه اسدزاده</text>
            </g>
            <path d="M264 350H255" stroke="#193b5c" strokeWidth="3" />

            {/* ولایت فقیه landmark */}
            <g transform="translate(105 210)">
              <circle cx="38" cy="38" r="36" fill="#fffdf7" stroke="#c5b48f" strokeWidth="2" />
              <text x="38" y="34" fill="#6b6e6b" fontSize="12" fontFamily="var(--font-peyda)" textAnchor="middle">نشانه</text>
              <text x="38" y="53" fill="#152f3d" fontSize="14" fontWeight="700" fontFamily="var(--font-peyda)" textAnchor="middle">ولایت فقیه</text>
            </g>

            {/* Compass rose */}
            <g transform="translate(680 370)">
              <circle cx="20" cy="20" r="18" fill="#fffdf7" stroke="#c5b48f" strokeWidth="1.5" />
              <text x="20" y="14" fill="#9d382c" fontSize="10" fontWeight="700" fontFamily="var(--font-peyda)" textAnchor="middle">N</text>
              <line x1="20" y1="16" x2="20" y2="28" stroke="#9d382c" strokeWidth="1.5" />
              <polygon points="20,16 17,22 23,22" fill="#9d382c" />
            </g>

            {/* Scale bar */}
            <g transform="translate(620 410)">
              <line x1="0" y1="0" x2="60" y2="0" stroke="#152f3d" strokeWidth="2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#152f3d" strokeWidth="2" />
              <line x1="60" y1="-3" x2="60" y2="3" stroke="#152f3d" strokeWidth="2" />
              <text x="30" y="12" fill="#152f3d" fontSize="9" fontFamily="var(--font-peyda)" textAnchor="middle">۲۰۰ متر</text>
            </g>
          </svg>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-card/95 px-2.5 py-1.5 text-[11px] font-bold text-ink-600 ring-1 ring-ink-900/8">
            <MapPin className="h-3.5 w-3.5 text-madder-700" />
            کروکی شماتیک بر اساس نشانی کارگاه
          </div>
        </div>
      </div>
    </section>
  );
}
