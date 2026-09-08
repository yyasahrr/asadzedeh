"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import type { SupportChannel } from "@/lib/types";
import { channelHref } from "@/components/support/SupportWidget";

const KINDS: { value: SupportChannel["kind"]; label: string; hint: string }[] = [
  { value: "telegram", label: "تلگرام", hint: "نام کاربری بدون @ یا لینک کامل" },
  { value: "whatsapp", label: "واتساپ", hint: "شماره با کد کشور، مثل ۹۸۹۱۲۱۲۳۴۵۶۷" },
  { value: "phone", label: "تماس تلفنی", hint: "شماره تماس" },
  { value: "email", label: "ایمیل", hint: "آدرس ایمیل" },
  { value: "instagram", label: "اینستاگرام", hint: "نام کاربری بدون @" },
  { value: "link", label: "لینک دلخواه", hint: "آدرس کامل" },
];

/**
 * Editor for the floating support button's channels.
 *
 * The list is serialised into one hidden field so the whole set is submitted
 * atomically — a half-saved channel list would leave visitors with a button
 * that goes nowhere.
 */
export function SupportChannelsManager({ initial }: { initial: SupportChannel[] }) {
  const [channels, setChannels] = useState<SupportChannel[]>(initial);

  const update = (id: string, patch: Partial<SupportChannel>) =>
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const add = () =>
    setChannels((prev) => [
      ...prev,
      {
        id: `ch-${Date.now().toString(36)}`,
        kind: "telegram",
        label: "تلگرام",
        value: "",
        enabled: true,
      },
    ]);

  return (
    <div className="space-y-3">
      <input type="hidden" name="channels" value={JSON.stringify(channels)} />

      {channels.map((channel) => {
        const kind = KINDS.find((k) => k.value === channel.kind);
        return (
          <div key={channel.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-900/5 ring-inset">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel htmlFor={`${channel.id}-kind`}>نوع</FieldLabel>
                <Select
                  id={`${channel.id}-kind`}
                  value={channel.kind}
                  onChange={(e) => {
                    const next = e.target.value as SupportChannel["kind"];
                    const preset = KINDS.find((k) => k.value === next);
                    update(channel.id, { kind: next, label: preset?.label ?? channel.label });
                  }}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor={`${channel.id}-label`}>عنوان دکمه</FieldLabel>
                <Input
                  id={`${channel.id}-label`}
                  value={channel.label}
                  maxLength={40}
                  onChange={(e) => update(channel.id, { label: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`${channel.id}-value`}>مقدار</FieldLabel>
                <Input
                  id={`${channel.id}-value`}
                  value={channel.value}
                  dir="ltr"
                  className="text-left"
                  placeholder={kind?.hint}
                  onChange={(e) => update(channel.id, { value: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex h-11 flex-1 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold ring-1 ring-ink-900/5 ring-inset">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(e) => update(channel.id, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-teal-600"
                  />
                  فعال
                </label>
                <button
                  type="button"
                  onClick={() => setChannels((prev) => prev.filter((c) => c.id !== channel.id))}
                  aria-label="حذف"
                  className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-madder-50 text-madder-700 transition-colors hover:bg-madder-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {channel.value.trim() && (
              <p dir="ltr" className="mt-2 truncate text-left text-[11px] text-ink-400">
                {channelHref(channel)}
              </p>
            )}
          </div>
        );
      })}

      {channels.length < 8 && (
        <button
          type="button"
          onClick={add}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-sand-100 px-5 text-sm font-bold text-navy-900 transition-colors hover:bg-sand-200"
        >
          <Plus className="h-4 w-4" /> افزودن راه ارتباطی
        </button>
      )}
    </div>
  );
}
