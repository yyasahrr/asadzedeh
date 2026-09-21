import Link from "next/link";
import { AboutContentEditor } from "@/components/admin/AboutContentEditor";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { listMedia } from "@/lib/media";
import { galleryImages } from "@/lib/seed";
import { normalizeAboutContent } from "@/lib/site-content";
import { getSettings, getVideos } from "@/lib/store";
import { saveAboutContent } from "../../actions";

export default async function AboutContentPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const user=await getSessionUser();if(!can(user,"content"))return <Denied/>;const query=await searchParams;const settings=getSettings();const gallery=[...listMedia().map(value=>({value,label:`کتابخانه رسانه — ${value.split('/').at(-1)}`})),...galleryImages].filter((x,i,a)=>a.findIndex(y=>y.value===x.value)===i);
 return <div className="space-y-5"><Link href="/admin/content" className="text-xs font-bold text-teal-700">محتوای سایت ←</Link><div><h1 className="text-2xl font-black">درباره ما</h1><p className="mt-1 text-sm text-ink-500">روایت، گالری، خط زمانی و ارزش‌های برند.</p></div>{query.saved?<p className="rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-800">تغییرات درباره ما ذخیره شد.</p>:null}{query.error?<p className="rounded-xl bg-madder-50 p-3 text-sm font-bold text-madder-800">ویدیوی انتخابی باید آماده باشد.</p>:null}<form action={saveAboutContent} className="space-y-5"><AboutContentEditor initial={normalizeAboutContent(settings.site.about,settings.site.aboutIntro)} gallery={gallery} videos={getVideos().map(({id,title,status})=>({id,title,status}))}/><button className="sticky bottom-4 rounded-xl bg-navy-800 px-8 py-3 font-black text-white shadow-lg">ذخیره درباره ما</button></form></div>;
}
