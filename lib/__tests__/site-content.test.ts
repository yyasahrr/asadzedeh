import{describe,expect,it}from"vitest";import{defaultAboutContent,defaultHomeContent,normalizeAboutContent,normalizeHomeContent,normalizeSiteMedia,safeEmbedUrl}from"../site-content";
describe("CMS normalization",()=>{
 it("supplies deep home defaults",()=>{const home=normalizeHomeContent(undefined);expect(home.roadmap.stages.length).toBeGreaterThan(0);expect(home.workshop.items[0].media.kind).toBe("image")});
 it("keeps custom order and valid rating range",()=>{const home=normalizeHomeContent({testimonials:{items:[{id:"b",name:"B",role:"",text:"ok",rating:9,active:true,order:2},{id:"a",name:"A",role:"",text:"ok",rating:0,active:true,order:0}]}});expect(home.testimonials.items.map(x=>x.id)).toEqual(["a","b"]);expect(home.testimonials.items.every(x=>x.rating>=1&&x.rating<=5)).toBe(true)});
 it("uses legacy about intro",()=>{const about=normalizeAboutContent(undefined,["اول","دوم"]);expect(about.intro.paragraphs.map(x=>x.text)).toEqual(["اول","دوم"])});
 it("fails malformed media closed",()=>{const fallback={kind:"image" as const,image:"/fallback.jpg"};expect(normalizeSiteMedia({kind:"video",videoId:"../../bad"},fallback)).toEqual(fallback);expect(normalizeSiteMedia({kind:"embed",src:"javascript:alert(1)"},fallback)).toEqual(fallback)});
 it("allows supported safe embeds only",()=>{expect(safeEmbedUrl("https://www.aparat.com/video/video/embed/videohash/x")).toContain("aparat.com");expect(safeEmbedUrl("//youtube.com/embed/x")).toBe("");expect(safeEmbedUrl("https://evil.example/embed/x")).toBe("")});
 it("falls back invalid icons and CTA links",()=>{const about=normalizeAboutContent({values:{items:[{id:"x",icon:"<svg>",title:"x",text:"y",active:true,order:0}]},ctas:[{label:"bad",href:"javascript:1",enabled:true}]},[]);expect(about.values.items[0].icon).toBe("star");expect(about.ctas[0].href).toBe("/")});
 it("exports stable defaults",()=>{expect(defaultHomeContent.finalCta.enabled).toBe(true);expect(defaultAboutContent.timeline.items.length).toBe(5)});
});
