import { Button } from "@/components/ui/Button";
import { PatternDivider } from "@/components/PatternDivider";

export default function NotFound() {
  return (
    <div className="shell flex flex-col items-center py-24 text-center">
      <p className="text-7xl font-black text-navy-800/15">۴۰۴</p>
      <h1 className="mt-2 text-2xl font-black text-navy-900">این گره به جایی وصل نیست!</h1>
      <p className="mt-3 max-w-md text-[15px] leading-8 text-ink-600">
        صفحه‌ای که دنبالش می‌گردید پیدا نشد؛ شاید آدرس اشتباه است یا صفحه جابه‌جا شده.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button href="/">بازگشت به خانه</Button>
        <Button href="/courses" variant="outline">مشاهده دوره‌ها</Button>
      </div>
      <PatternDivider ornament className="mt-12 w-full max-w-md" />
    </div>
  );
}
