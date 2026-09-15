"use client";

import { useState } from "react";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";

interface LegalPage {
  slug: string;
  title: string;
  content: string;
  lastUpdated?: string;
}

interface Props {
  initialPages: LegalPage[];
}

export function LegalSettingsManager({ initialPages }: Props) {
  const [pages, setPages] = useState<LegalPage[]>(initialPages);
  const [activeSlug, setActiveSlug] = useState(initialPages[0]?.slug ?? "");

  const currentPage = pages.find((p) => p.slug === activeSlug);

  const updatePage = (field: keyof LegalPage, value: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.slug === activeSlug ? { ...p, [field]: value } : p
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setActiveSlug(p.slug)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              activeSlug === p.slug
                ? "bg-navy-800 text-white"
                : "bg-sand-100 text-navy-800 hover:bg-sand-200"
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {currentPage && (
        <div className="space-y-4 rounded-xl bg-sand-50 p-4 ring-1 ring-ink-900/5">
          <div>
            <FieldLabel htmlFor={`legal-title-${currentPage.slug}`}>عنوان صفحه</FieldLabel>
            <Input
              id={`legal-title-${currentPage.slug}`}
              value={currentPage.title}
              onChange={(e) => updatePage("title", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`legal-content-${currentPage.slug}`}>محتوا (HTML)</FieldLabel>
            <Textarea
              id={`legal-content-${currentPage.slug}`}
              value={currentPage.content}
              onChange={(e) => updatePage("content", e.target.value)}
              rows={12}
              className="font-mono text-xs leading-6"
              dir="ltr"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              محتوا به صورت HTML ذخیره می‌شود. از تگ‌های h2, h3, p, ul, li, strong استفاده کنید.
            </p>
          </div>
          <input type="hidden" name={`legal-${currentPage.slug}-title`} value={currentPage.title} />
          <input type="hidden" name={`legal-${currentPage.slug}-content`} value={currentPage.content} />
        </div>
      )}
    </div>
  );
}
