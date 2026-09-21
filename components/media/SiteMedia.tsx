import Image from "next/image";
import type { SiteMedia as SiteMediaValue } from "@/lib/types";
import { PublicSiteVideo } from "./PublicSiteVideo";

export function SiteMedia({media,fallback,alt,className="",priority=false}:{media:SiteMediaValue;fallback:string;alt?:string;className?:string;priority?:boolean}){
 if(media.kind==="video")return <PublicSiteVideo videoId={media.videoId} poster={media.poster} fallback={fallback} alt={media.alt||alt} autoplay={media.autoplay} loop={media.loop} muted={media.muted} className={className}/>;
 if(media.kind==="embed")return <iframe src={media.src} title={media.title||alt||"ویدیوی معرفی"} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className={`h-full w-full border-0 ${className}`}/>;
 return <Image src={media.image||fallback} alt={media.alt||alt||""} fill priority={priority} sizes="(max-width: 1024px) 100vw, 50vw" className={`object-cover ${className}`}/>;
}
