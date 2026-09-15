import type { Metadata } from "next";
import Image from "next/image";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteMedia } from "../actions";
import { listMedia } from "@/lib/media";

export const metadata: Metadata = { title: "رسانه" };

export default async function MediaPage() {
  const user = await getSessionUser();
  if (!can(user, "media")) return <Denied />;
  const files = listMedia();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">کتابخانه رسانه</h1>
      <MediaUploader />
      {files.length === 0 ? (
        <p className="rounded-2xl bg-card p-10 text-center text-sm text-ink-500 shadow-card">
          هنوز تصویری آپلود نشده است. از بالا شروع کنید.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {files.map((f) => (
            <figure key={f} className="group overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
              <div className="relative aspect-video bg-sand-100">
                <Image src={f} alt={f} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                <span className="absolute top-2 left-2">
                  <DeleteButton action={deleteMedia} hidden={{ name: "path", value: f }} label={f} />
                </span>
              </div>
              <figcaption className="truncate px-3 py-2.5 text-xs text-ink-500" dir="ltr">{f}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="text-[13px] leading-6 text-ink-500">
        راهنما: مسیر هر تصویر (مثلاً <span dir="ltr">/uploads/xyz.jpg</span>) را می‌توانید در فرم دوره، کلاس، مقاله و محتوای سایت استفاده کنید؛ یا مستقیم از همان فرم‌ها آپلود کنید.
      </p>
    </div>
  );
}
