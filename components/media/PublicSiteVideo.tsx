"use client";
import Image from "next/image";
import { useEffect,useRef,useState } from "react";
import { Play } from "lucide-react";

export function PublicSiteVideo({videoId,poster,fallback,alt,autoplay=false,loop=false,muted=true,className=""}:{videoId:string;poster?:string;fallback:string;alt?:string;autoplay?:boolean;loop?:boolean;muted?:boolean;className?:string}){
 const ref=useRef<HTMLVideoElement>(null);const [src,setSrc]=useState("");const [failed,setFailed]=useState(false);const [reduce,setReduce]=useState(false);
 useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduce(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update)},[]);
 useEffect(()=>{let active=true;fetch(`/api/video/${encodeURIComponent(videoId)}/token`,{method:"POST"}).then(async response=>{const data=await response.json() as {src?:string};if(!response.ok||!data.src)throw new Error();if(active)setSrc(data.src)}).catch(()=>active&&setFailed(true));return()=>{active=false}},[videoId]);
 const image=poster||fallback;if(failed||!src)return <Image src={image} alt={alt||"تصویر جایگزین ویدیو"} fill sizes="(max-width: 1024px) 100vw, 50vw" className={`object-cover ${className}`}/>;
 return <><video ref={ref} src={src} poster={image} autoPlay={autoplay&&!reduce} loop={loop} muted={autoplay?true:muted} playsInline preload="metadata" controls={!autoplay||reduce} controlsList="nodownload noremoteplayback" disablePictureInPicture onError={()=>setFailed(true)} className={`h-full w-full object-cover ${className}`} aria-label={alt||"ویدیوی معرفی"}/>{reduce&&autoplay?<button type="button" onClick={()=>ref.current?.play()} className="absolute inset-x-4 bottom-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-950/80 px-4 text-sm font-bold text-white"><Play className="h-4 w-4"/> پخش ویدیو</button>:null}</>;
}
