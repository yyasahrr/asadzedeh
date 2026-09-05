import { BadgeCheck } from "lucide-react";
import { stats } from "@/lib/data";

const honors = [
  "حاضر در نمایشگاه بین‌المللی فرش دستباف تهران",
  "دارای گواهی مهارت سازمان فنی‌وحرفه‌ای",
  "همکاری با کارگاه‌های ایلات فارس و کردستان",
  "داوری جشنواره ملی گلیم و گبه",
];

export function TrustStats() {
  return (
    <section aria-label="اعتمادسازی" className="shell -mt-2 pb-2">
      <div className="rounded-3xl bg-card px-6 py-8 shadow-card ring-1 ring-ink-900/5 sm:px-10">
        <dl className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "lg:border-r lg:border-ink-900/10" : ""}>
              <dt className="order-2 mt-1 block text-sm font-semibold text-ink-600">{s.label}</dt>
              <dd className="text-3xl font-black text-navy-800 sm:text-4xl">{s.value}</dd>
              <p className="mt-1 text-xs text-ink-400">{s.hint}</p>
            </div>
          ))}
        </dl>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-2 border-t border-dashed border-ink-900/10 pt-6">
          {honors.map((h) => (
            <li
              key={h}
              className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3.5 py-1.5 text-xs font-semibold text-ink-700"
            >
              <BadgeCheck className="h-4 w-4 text-teal-600" />
              {h}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
