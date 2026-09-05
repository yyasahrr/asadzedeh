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
    <section aria-label="اعتمادسازی" className="shell pb-2">
      <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr]">
        <dl className="bento-surface grid grid-cols-2 gap-5 p-6 text-center lg:grid-cols-4 lg:p-8">
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "lg:border-r lg:border-ink-900/10" : ""}>
              <dt className="order-2 mt-1 block text-sm font-semibold text-ink-600">{s.label}</dt>
              <dd className="text-3xl font-black text-navy-800 sm:text-4xl">{s.value}</dd>
              <p className="mt-1 text-xs text-ink-400">{s.hint}</p>
            </div>
          ))}
        </dl>
        <ul className="persian-corner flex flex-col justify-center gap-2 overflow-hidden rounded-3xl bg-moss-700 p-6 text-white">
          {honors.map((h) => (
            <li
              key={h}
              className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-3.5 py-2 text-xs font-semibold text-white/85"
            >
              <BadgeCheck className="h-4 w-4 text-ochre-200" />
              {h}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
