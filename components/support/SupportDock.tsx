"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { SupportChannelSettings } from "@/lib/types";

/**
 * Floating support button.
 *
 * Replaces the old realtime chat. Rather than an in-app socket that only works
 * while someone is watching it, this hands the visitor to a channel the shop
 * actually staffs. Channels are configured from the admin panel; one with no
 * value is simply not shown, so a shop that only uses Telegram shows one icon.
 */

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.94.46l.34-4.79 8.7-7.86c.38-.34-.08-.53-.59-.19L6.98 13.1l-4.63-1.45c-1.01-.31-1.03-1 .21-1.48l18.1-6.98c.84-.31 1.57.2 1.28 1.41Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.88 9.88 0 0 0 12.04 2Zm0 18.16h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

/** Accept "asadzedeh", "@asadzedeh" or a full t.me link. */
function telegramHref(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://t.me/${v.replace(/^@/, "")}`;
}

/** Accept "989121234567", "+98 912 123 4567" or "09121234567". */
function whatsappHref(number: string, message: string): string {
  let digits = number.replace(/\D/g, "");
  // A local Iranian number needs the country code for wa.me to resolve.
  if (digits.startsWith("0")) digits = `98${digits.slice(1)}`;
  const text = message.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function SupportDock({ settings }: { settings: SupportChannelSettings }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const telegram = settings.telegram.trim();
  const whatsapp = settings.whatsapp.trim();

  // Close on Escape and on any click outside, so the dock never traps focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!settings.enabled || (!telegram && !whatsapp)) return null;

  const channels = [
    telegram && {
      key: "telegram",
      href: telegramHref(telegram),
      label: "تلگرام",
      className: "bg-[#229ED9] text-white hover:bg-[#1b86b8]",
      icon: <TelegramIcon className="h-6 w-6" />,
    },
    whatsapp && {
      key: "whatsapp",
      href: whatsappHref(whatsapp, settings.whatsappMessage),
      label: "واتساپ",
      className: "bg-[#25D366] text-white hover:bg-[#1ebe5b]",
      icon: <WhatsAppIcon className="h-6 w-6" />,
    },
  ].filter(Boolean) as { key: string; href: string; label: string; className: string; icon: React.ReactNode }[];

  return (
    <div ref={wrapRef} className="fixed bottom-5 left-5 z-50 flex flex-col-reverse items-start gap-3 print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={settings.label || "پشتیبانی"}
        className="group flex h-14 cursor-pointer items-center gap-2 rounded-full bg-navy-800 px-5 text-sm font-extrabold text-white shadow-lift transition-all hover:bg-navy-900 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        <span className="hidden sm:inline">{open ? "بستن" : settings.label || "پشتیبانی"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2" role="group" aria-label="راه‌های ارتباط با پشتیبانی">
          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-navy-800 focus-visible:outline-none ${c.className}`}
            >
              {c.icon}
              <span>{c.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
