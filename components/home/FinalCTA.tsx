import { MessageCircle, Phone } from "lucide-react";
import { Button } from "../ui/Button";

export function FinalCTA() {
  return (
    <section className="shell pb-16" aria-labelledby="final-cta">
      <div className="bg-lattice-light relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-12 text-center sm:px-12 lg:py-16">
        <div className="pattern-strip absolute inset-x-0 top-0" aria-hidden />
        <p className="text-sm font-bold text-ochre-200">مشاوره رایگان انتخاب مسیر</p>
        <h2 id="final-cta" className="mx-auto mt-3 max-w-2xl text-2xl leading-snug font-black text-balance text-white sm:text-3xl sm:leading-snug">
          هنوز مطمئن نیستید از کجا شروع کنید؟
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-white/70">
          در یک تماس ۱۵ دقیقه‌ای، سطح، بودجه و هدفتان را بررسی می‌کنیم و بهترین مسیر را پیشنهاد می‌دهیم؛
          بدون هیچ تعهدی برای خرید.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/paths" variant="highlight" size="lg">
            <MessageCircle className="h-5 w-5" />
            رزرو مشاوره رایگان
          </Button>
          <a
            href="tel:+982112345678"
            className="inline-flex h-[52px] items-center gap-2 rounded-xl border border-white/25 px-8 font-bold text-white transition-colors hover:bg-white/10"
          >
            <Phone className="h-5 w-5" />
            <span dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</span>
          </a>
        </div>
      </div>
    </section>
  );
}
