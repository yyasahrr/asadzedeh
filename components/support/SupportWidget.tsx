"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Headphones, Mail, MessageCircle, Phone, Send, X, Link as LinkIcon } from "lucide-react";
import type { SupportChannel, SupportWidgetSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Floating support button.
 *
 * Tapping it fans out the channels an operator configured in the admin panel
 * (Telegram, WhatsApp, phone, …). Every destination is external, so this is a
 * pure link launcher — no session, no socket, nothing to keep alive.
 */

const ICONS: Record<SupportChannel["kind"], typeof Send> = {
  telegram: Send,
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  instagram: Camera,
  link: LinkIcon,
};

const STYLES: Record<SupportChannel["kind"], string> = {
  telegram: "bg-[#229ED9] hover:bg-[#1b87ba]",
  whatsapp: "bg-[#25D366] hover:bg-[#1eb455]",
  phone: "bg-navy-800 hover:bg-navy-700",
  email: "bg-ochre-600 hover:bg-ochre-700",
  instagram: "bg-[#C13584] hover:bg-[#a52c70]",
  link: "bg-teal-600 hover:bg-teal-700",
};

/** Turn an operator-entered username / number into a real destination URL. */
export function channelHref(channel: SupportChannel): string {
  const value = channel.value.trim();
  const digits = value.replace(/[^\d+]/g, "");
  switch (channel.kind) {
    case "telegram":
      if (/^https?:\/\//i.test(value)) return value;
      return `https://t.me/${value.replace(/^@/, "")}`;
    case "whatsapp": {
      if (/^https?:\/\//i.test(value)) return value;
      // wa.me wants an international number without + or leading zero.
      const normalized = digits.replace(/^\+/, "").replace(/^00/, "").replace(/^0/, "98");
      return `https://wa.me/${normalized}`;
    }
    case "phone":
      return `tel:${digits}`;
    case "email":
      return `mailto:${value}`;
    case "instagram":
      if (/^https?:\/\//i.test(value)) return value;
      return `https://instagram.com/${value.replace(/^@/, "")}`;
    default:
      return /^https?:\/\/|^\//i.test(value) ? value : `https://${value}`;
  }
}

export function SupportWidget({ settings }: { settings: SupportWidgetSettings }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const channels = (settings.channels ?? []).filter((c) => c.enabled && c.value.trim());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!settings.enabled || channels.length === 0) return null;

  const side = settings.position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";

  return (
    <div ref={rootRef} className={cn("fixed bottom-4 z-50 flex flex-col items-stretch gap-3 sm:bottom-6", side)}>
      {open && (
        <div
          id="support-widget-panel"
          className="w-64 origin-bottom animate-[fade-in_.15s_ease-out] rounded-2xl bg-card p-4 shadow-lift ring-1 ring-ink-900/10"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-navy-900">{settings.title}</p>
              {settings.description && (
                <p className="mt-1 text-[11px] leading-5 text-ink-500">{settings.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن"
              className="cursor-pointer rounded-lg p-1 text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="mt-3 space-y-2">
            {channels.map((channel) => {
              const Icon = ICONS[channel.kind] ?? LinkIcon;
              const external = channel.kind !== "phone" && channel.kind !== "email";
              return (
                <li key={channel.id}>
                  <a
                    href={channelHref(channel)}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition-colors",
                      STYLES[channel.kind] ?? STYLES.link,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {channel.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="support-widget-panel"
        aria-label={open ? "بستن پشتیبانی" : "راه‌های ارتباط با پشتیبانی"}
        className={cn(
          "group relative flex h-14 w-14 cursor-pointer items-center justify-center self-end rounded-full bg-gradient-to-tr from-teal-600 to-navy-800 text-white shadow-lift transition-transform hover:scale-105 active:scale-95",
          settings.position === "bottom-right" ? "self-end" : "self-start",
        )}
      >
        <span className="absolute inset-0 rounded-full bg-teal-500/40 motion-safe:animate-ping" aria-hidden />
        {open ? <X className="relative h-6 w-6" /> : <Headphones className="relative h-6 w-6" />}
      </button>
    </div>
  );
}
