import Link from "next/link";
import { HomeContentEditor } from "@/components/admin/HomeContentEditor";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { listMedia } from "@/lib/media";
import { galleryImages } from "@/lib/seed";
import { normalizeHomeContent, normalizeSiteMedia } from "@/lib/site-content";
import { getInstructors, getSettings, getVideos } from "@/lib/store";
import { saveHomeContent } from "../../actions";

export default async function HomeContentPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const user=await getSessionUser(); if(!can(user,"content"))return <Denied/>; const query=await searchParams; const settings=getSettings();
 const gallery=[...listMedia().map(value=>({value,label:`کتابخانه رسانه — ${value.split('/').at(-1)}`})),...galleryImages].filter((x,i,a)=>a.findIndex(y=>y.value===x.value)===i);
 const fallback={kind:"image" as const,image:settings.site.hero.image,alt:"کارگاه بافت اسدزاده"};
 return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/content" className="text-xs font-bold text-teal-700">محتوای سایت ←</Link><h1 className="mt-1 text-2xl font-black">صفحه اصلی</h1><p className="mt-1 text-sm text-ink-500">محتوای بازاریابی ساختاریافته؛ بدون HTML یا صفحه‌ساز.</p></div></div>{query.saved?<p className="rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-800">تغییرات صفحه اصلی ذخیره شد.</p>:null}{query.error?<p className="rounded-xl bg-madder-50 p-3 text-sm font-bold text-madder-800">ویدیوی انتخابی باید در کتابخانه موجود و آماده باشد.</p>:null}<form action={saveHomeContent} className="space-y-5"><HomeContentEditor initial={normalizeHomeContent(settings.site.home)} heroMedia={normalizeSiteMedia(settings.site.hero.media,fallback)} gallery={gallery} videos={getVideos().map(({id,title,status})=>({id,title,status}))} instructors={getInstructors().map(({slug,name})=>({slug,name}))}/><button className="sticky bottom-4 rounded-xl bg-navy-800 px-8 py-3 font-black text-white shadow-lg">ذخیره صفحه اصلی</button></form></div>;
}
