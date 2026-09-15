import Image from "next/image";
import { Clapperboard } from "lucide-react";
import type { Trailer } from "@/lib/types";
import { getVideo } from "@/lib/store";
import { SecurePlayer } from "./SecurePlayer";

/**
 * Public trailer for a course/class page:
 *  - upload → secure player (public token, no watermark)
 *  - embed  → sandboxed iframe (Aparat / YouTube / …)
 *  - none   → cover image
 */
export function TrailerBlock({ trailer, image, title, badge }: { trailer?: Trailer; image: string; title: string; badge?: string }) {
  const video = trailer?.kind === "upload" ? getVideo(trailer.src) : undefined;
  const showPlayer = !!video && video.status !== "failed";
  const showEmbed = trailer?.kind === "embed" && /^https?:\/\//.test(trailer.src);

  return (
    <div className="relative overflow-hidden rounded-xl shadow-card">
      {showPlayer ? (
        <SecurePlayer videoId={video!.id} poster={trailer?.poster || image} className="rounded-xl" />
      ) : showEmbed ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={trailer!.src}
            title={`تیزر ${title}`}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <Image src={image} alt={title} width={1000} height={560} className="aspect-video w-full object-cover" priority />
      )}
      {(showPlayer || showEmbed) && (
        <span className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          <Clapperboard className="h-3.5 w-3.5" /> تیزر معرفی
        </span>
      )}
      {badge && (
        <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-madder-700 px-4 py-1.5 text-sm font-bold text-white shadow-card">
          {badge}
        </span>
      )}
    </div>
  );
}
