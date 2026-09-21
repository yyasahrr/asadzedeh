import { getSettings } from "./store";
import { normalizeAboutContent, normalizeHomeContent, normalizeSiteMedia } from "./site-content";
import type { SiteMedia } from "./types";

function addVideo(ids:Set<string>, media:SiteMedia|undefined){if(media?.kind==="video"&&/^v-[a-z0-9-]+$/i.test(media.videoId))ids.add(media.videoId);}
export function getPublicSiteVideoIds():Set<string>{
 const ids=new Set<string>(); const site=getSettings().site; const fallback:SiteMedia={kind:"image",image:site.hero.image};
 addVideo(ids,normalizeSiteMedia(site.hero.media,fallback));
 const home=normalizeHomeContent(site.home); if(home.workshop.enabled)for(const item of home.workshop.items)if(item.active)addVideo(ids,item.media);
 const about=normalizeAboutContent(site.about,site.aboutIntro); if(about.gallery.enabled)for(const item of about.gallery.items)if(item.active)addVideo(ids,item.media);
 return ids;
}
export function isPublicSiteVideo(videoId:string):boolean{return getPublicSiteVideoIds().has(videoId);}
