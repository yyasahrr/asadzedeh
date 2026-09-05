import { ExternalLink } from "lucide-react";
import { getSettings } from "@/lib/store";
import { SectionHeading } from "../ui/SectionHeading";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** Convert an Instagram permalink (post/reel) to its /embed URL. */
function toEmbed(url: string): string | null {
  const m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const kind = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
  return `https://www.instagram.com/${kind}/${m[2]}/embed/`;
}

/**
 * "A glimpse of Instagram" section shown right before the footer.
 * Uses Instagram's official iframe embeds (no API key needed):
 *  - specific posts/reels when configured in admin → grid of post embeds
 *  - otherwise the profile embed for the configured username
 *  - or a fully custom embed URL override
 */
export function InstagramEmbed() {
  const ig = getSettings().instagram;
  if (!ig.enabled || (!ig.username && !ig.embedUrl && ig.posts.length === 0)) return null;
  const postEmbeds = ig.posts.map(toEmbed).filter((u): u is string => !!u);
  const profileUrl = `https://www.instagram.com/${ig.username}/`;
  const profileEmbed = ig.embedUrl || `https://www.instagram.com/${ig.username}/embed/`;

  return (
    <section className="shell pb-16" aria-labelledby="instagram-heading">
      <SectionHeading
        eyebrow="یک نما از اینستاگرام"
        title={ig.title || "اینستاگرام اسدزاده"}
        description={ig.description}
        link={ig.username ? { href: profileUrl, label: `@${ig.username}` } : undefined}
      />

      <div className="bento-surface overflow-hidden p-3 sm:p-4">
        {postEmbeds.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {postEmbeds.map((src) => (
              <div key={src} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-900/5">
                <iframe
                  src={src}
                  title="پست اینستاگرام اسدزاده"
                  loading="lazy"
                  className="h-[520px] w-full"
                  allow="encrypted-media"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-900/5">
              <iframe
                src={profileEmbed}
                title={`پروفایل اینستاگرام ${ig.username}`}
                loading="lazy"
                className="h-[560px] w-full"
                allow="encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
            <div className="persian-corner flex flex-col justify-center gap-4 rounded-2xl bg-navy-900 p-6 text-white">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-ochre-400 via-madder-600 to-navy-700">
                <InstagramIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-black">@{ig.username}</p>
                <p className="mt-2 text-sm leading-7 text-white/70">ویدیوهای کوتاه آموزشی، آثار هنرجویان و پشت‌صحنه کارگاه؛ هر هفته چند پست تازه.</p>
              </div>
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
              >
                دنبال کردن در اینستاگرام <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">
        اگر محتوای اینستاگرام نمایش داده نمی‌شود، ممکن است دسترسی شبکه شما به اینستاگرام محدود باشد؛{" "}
        <a href={profileUrl} target="_blank" rel="noreferrer" className="font-bold text-teal-700 hover:underline">مستقیم باز کنید</a>.
      </p>
    </section>
  );
}
