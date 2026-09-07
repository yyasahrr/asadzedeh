"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex flex-col items-center py-24 text-center">
      <p className="text-7xl font-black text-navy-800/15">۵۰۰</p>
      <h1 className="mt-2 text-2xl font-black text-navy-900">گره این صفحه شل شده</h1>
      <p className="mt-3 max-w-md text-[15px] leading-8 text-ink-600">
        مشکلی در نمایش این صفحه پیش آمد. لطفاً دوباره تلاش کنید یا به خانه برگردید.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>تلاش دوباره</Button>
        <Button href="/" variant="outline">بازگشت به خانه</Button>
      </div>
    </div>
  );
}
