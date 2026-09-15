"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenResponse {
  token: string;
  exp: number;
  source: "hls" | "wm" | "file";
  src: string;
  watermark: { text: string; extra: string; intervalSec: number } | null;
  blockDownload: boolean;
  durationSec: number | null;
  color: string;
  error?: string;
}

/**
 * Custom secure player:
 *  - fetches a short-lived signed token; auto-renews before expiry
 *  - HLS via hls.js (native on Safari), otherwise byte-range MP4
 *  - moving overlay watermark with the viewer's phone number
 *  - blocks context menu / download / PiP / remote playback, hides native controls
 *  - keyboard shortcuts: space, ←/→ (10s), ↑/↓ volume, f fullscreen, m mute
 *  - remembers position per video (localStorage) and reports progress via callback
 */
export function SecurePlayer({
  videoId,
  poster,
  className,
  onProgress,
  autoPlay = false,
  storageKey,
}: {
  videoId: string;
  poster?: string;
  className?: string;
  onProgress?: (pct: number, seconds: number) => void;
  autoPlay?: boolean;
  storageKey?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [meta, setMeta] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [fs, setFs] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [wmPos, setWmPos] = useState({ x: 8, y: 8 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = storageKey ?? `az_pos_${videoId}`;

  /* ---- token + source ---- */
  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/video/${videoId}/token`, { method: "POST", cache: "no-store" });
      const data = (await res.json()) as TokenResponse;
      if (!res.ok) {
        setError(data.error || "دسترسی به ویدیو ممکن نیست");
        return null;
      }
      setMeta(data);
      return data;
    } catch {
      setError("خطا در اتصال به سرور");
      return null;
    }
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await load();
      const video = videoRef.current;
      if (!data || !video || cancelled) return;
      const resumeAt = Number(window.localStorage.getItem(key) ?? 0);

      if (data.source === "hls") {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = data.src;
        } else {
          const { default: Hls } = await import("hls.js");
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false, xhrSetup: (xhr) => xhr.setRequestHeader("x-az-player", "1") });
            hls.loadSource(data.src);
            hls.attachMedia(video);
            hlsRef.current = hls;
          } else {
            setError("مرورگر شما از پخش HLS پشتیبانی نمی‌کند");
          }
        }
      } else {
        video.src = data.src;
      }
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (resumeAt > 5 && resumeAt < video.duration - 10) video.currentTime = resumeAt;
          if (autoPlay) video.play().catch(() => undefined);
        },
        { once: true }
      );
    })();
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [load, key, autoPlay]);

  // Renew the token ~60s before expiry so long lessons never stall.
  useEffect(() => {
    if (!meta) return;
    const ms = Math.max(30_000, meta.exp - Date.now() - 60_000);
    const t = setTimeout(async () => {
      const video = videoRef.current;
      const was = video?.currentTime ?? 0;
      const paused = video?.paused ?? true;
      const data = await load();
      if (!data || !video) return;
      if (data.source !== "hls") {
        video.src = data.src;
        video.currentTime = was;
        if (!paused) video.play().catch(() => undefined);
      } else if (hlsRef.current) {
        const { default: Hls } = await import("hls.js");
        hlsRef.current.destroy();
        const hls = new Hls();
        hls.loadSource(data.src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.currentTime = was;
          if (!paused) video.play().catch(() => undefined);
        });
        hlsRef.current = hls;
      }
    }, ms);
    return () => clearTimeout(t);
  }, [meta, load]);

  /* ---- watermark motion ---- */
  useEffect(() => {
    if (!meta?.watermark?.text) return;
    const interval = Math.max(4, meta.watermark.intervalSec || 12) * 1000;
    const move = () => setWmPos({ x: 5 + Math.random() * 70, y: 6 + Math.random() * 78 });
    move();
    const t = setInterval(move, interval);
    return () => clearInterval(t);
  }, [meta]);

  /* ---- events ---- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setTime(v.currentTime);
      if (v.duration) {
        window.localStorage.setItem(key, String(Math.floor(v.currentTime)));
        onProgress?.(Math.round((v.currentTime / v.duration) * 100), v.currentTime);
      }
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [key, onProgress]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };
  const seek = (delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  };
  const toggleFs = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen().catch(() => undefined);
  };
  const cycleRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const poke = () => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 2600);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        toggle();
        break;
      case "ArrowLeft":
        seek(-10);
        break;
      case "ArrowRight":
        seek(10);
        break;
      case "ArrowUp": {
        e.preventDefault();
        const nv = Math.min(1, volume + 0.1);
        setVolume(nv);
        if (videoRef.current) videoRef.current.volume = nv;
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        const nv = Math.max(0, volume - 0.1);
        setVolume(nv);
        if (videoRef.current) videoRef.current.volume = nv;
        break;
      }
      case "f":
        toggleFs();
        break;
      case "m":
        setMuted((m) => {
          if (videoRef.current) videoRef.current.muted = !m;
          return !m;
        });
        break;
    }
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "۰۰:۰۰";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const pad = (n: number) => String(n).padStart(2, "0").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  const color = meta?.color ?? "#2f8c87";
  const pct = duration ? (time / duration) * 100 : 0;
  const bpct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onTouchStart={poke}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("group relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black text-white shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-teal-500", className)}
      dir="ltr"
      style={{ ["--az" as string]: color }}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        controls={false}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onClick={toggle}
        onDoubleClick={toggleFs}
        className="h-full w-full bg-black"
        draggable={false}
      />

      {/* Moving watermark */}
      {meta?.watermark?.text && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-md bg-black/25 px-2 py-1 text-[11px] font-bold tracking-wider text-white/60 backdrop-blur-[1px] transition-all duration-[1500ms] sm:text-xs"
          style={{ left: `${wmPos.x}%`, top: `${wmPos.y}%` }}
        >
          {meta.watermark.text}
          {meta.watermark.extra && <span className="ms-2 text-white/40">• {meta.watermark.extra}</span>}
        </div>
      )}
      {/* Static corner watermark */}
      {meta?.watermark?.text && (
        <div aria-hidden className="pointer-events-none absolute bottom-16 right-3 z-10 text-[10px] font-bold text-white/30">
          {meta.watermark.text}
        </div>
      )}

      {/* Loading / error overlays */}
      {!meta && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="h-9 w-9 animate-spin text-white/80" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-950/90 p-6 text-center" dir="rtl">
          <Lock className="h-9 w-9 text-ochre-200" />
          <p className="font-bold">{error}</p>
        </div>
      )}
      {meta && !playing && !error && (
        <button
          type="button"
          onClick={toggle}
          aria-label="پخش"
          className="absolute inset-0 z-20 flex items-center justify-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lift transition-transform hover:scale-105" style={{ background: color }}>
            <Play className="ms-1 h-9 w-9" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-10 transition-opacity",
          showUi || !playing ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          className="group/bar relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const p = (e.clientX - r.left) / r.width;
            if (videoRef.current && duration) videoRef.current.currentTime = p * duration;
          }}
          role="slider"
          aria-label="نوار پیشرفت"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bpct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }} />
          <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100" style={{ left: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? "توقف" : "پخش"} className="rounded-lg p-1.5 hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>
          <button type="button" onClick={() => seek(-10)} aria-label="۱۰ ثانیه عقب" className="rounded-lg p-1.5 hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={() => seek(10)} aria-label="۱۰ ثانیه جلو" className="rounded-lg p-1.5 hover:bg-white/10"><RotateCw className="h-4 w-4" /></button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMuted((m) => {
                  if (videoRef.current) videoRef.current.muted = !m;
                  return !m;
                });
              }}
              aria-label="صدا"
              className="rounded-lg p-1.5 hover:bg-white/10"
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const nv = Number(e.target.value);
                setVolume(nv);
                setMuted(nv === 0);
                if (videoRef.current) {
                  videoRef.current.volume = nv;
                  videoRef.current.muted = nv === 0;
                }
              }}
              aria-label="میزان صدا"
              className="hidden w-16 accent-[var(--az)] sm:block"
            />
          </div>
          <span className="ms-1 text-[11px] font-bold tabular-nums text-white/85 sm:text-xs">
            {fmt(time)} / {fmt(duration)}
          </span>
          <span className="flex-1" />
          <button type="button" onClick={cycleRate} className="rounded-lg px-2 py-1 text-xs font-black hover:bg-white/10" aria-label="سرعت پخش">
            {rate}×
          </button>
          <span className="hidden items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70 sm:flex" title="پخش امن با واترمارک اختصاصی">
            <Lock className="h-3 w-3" /> امن
          </span>
          <button type="button" onClick={toggleFs} aria-label="تمام‌صفحه" className="rounded-lg p-1.5 hover:bg-white/10">
            {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
