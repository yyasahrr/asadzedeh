import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/seed";
import { mergeSettings } from "@/lib/store";
import fs from "node:fs";
import { normalizeAboutContent, normalizeHomeContent } from "@/lib/site-content";

describe("settings compatibility", () => {
  it("deep-merges new nested defaults into legacy JSONB settings", () => {
    const legacy = {
      site: { ...defaultSettings.site, socials: { instagram: "https://instagram.com/example", telegram: "" } },
      support: { enabled: true, telegram: "example", whatsapp: "989121234567", label: "کمک", whatsappMessage: "سلام" },
    } as unknown as Partial<typeof defaultSettings>;
    const merged = mergeSettings(defaultSettings, legacy);
    expect(merged.site.socials.bale).toBe("");
    expect(merged.site.trustBadges.tvto.enabled).toBe(false);
    expect(merged.support.phone).toBe("");
    expect(merged.support.bale).toBe("");
    expect(merged.support.instagram).toBe("");
  });

  it("restores every Home and About CMS section without erasing site siblings", () => {
    const saved = structuredClone(defaultSettings);
    saved.site.home = normalizeHomeContent(saved.site.home);
    saved.site.about = normalizeAboutContent(saved.site.about, saved.site.aboutIntro);
    saved.site.hero.media = { kind: "image", image: "/images/saved-hero.jpg", alt: "saved" };
    saved.site.home.roadmap.title = "saved-roadmap";
    saved.site.home.spotlight.quote = "saved-spotlight";
    saved.site.home.workshop.title = "saved-workshop";
    saved.site.home.studentWorks.title = "saved-student-works";
    saved.site.home.testimonials.title = "saved-testimonials";
    saved.site.home.trust.stats[0].label = "saved-trust";
    saved.site.home.finalCta.title = "saved-final-cta";
    saved.site.about.hero.title = "saved-about-hero";
    saved.site.about.intro.heading = "saved-about-intro";
    saved.site.about.gallery.items[0].alt = "saved-about-gallery";
    saved.site.about.timeline.title = "saved-about-timeline";
    saved.site.about.values.title = "saved-about-values";
    saved.site.about.ctas[0].label = "saved-about-cta";
    saved.site.socials.instagram = "https://instagram.com/preserved";
    saved.site.workshop.address = "preserved-address";

    const restored = mergeSettings(defaultSettings, saved);
    const home = normalizeHomeContent(restored.site.home);
    const about = normalizeAboutContent(restored.site.about, restored.site.aboutIntro);
    expect(restored.site.hero.media).toEqual(saved.site.hero.media);
    expect(home.roadmap.title).toBe("saved-roadmap");
    expect(home.spotlight.quote).toBe("saved-spotlight");
    expect(home.workshop.title).toBe("saved-workshop");
    expect(home.studentWorks.title).toBe("saved-student-works");
    expect(home.testimonials.title).toBe("saved-testimonials");
    expect(home.trust.stats[0].label).toBe("saved-trust");
    expect(home.finalCta.title).toBe("saved-final-cta");
    expect(about.hero.title).toBe("saved-about-hero");
    expect(about.intro.heading).toBe("saved-about-intro");
    expect(about.gallery.items[0].alt).toBe("saved-about-gallery");
    expect(about.timeline.title).toBe("saved-about-timeline");
    expect(about.values.title).toBe("saved-about-values");
    expect(about.ctas[0].label).toBe("saved-about-cta");
    expect(restored.site.socials.instagram).toBe("https://instagram.com/preserved");
    expect(restored.site.workshop.address).toBe("preserved-address");
  });

  it("save actions preserve current settings and sibling site branches", () => {
    const actions = fs.readFileSync("app/admin/actions.ts", "utf8");
    expect(actions).toContain("settings: { ...current, site: { ...current.site, hero: { ...current.site.hero, media }, home } }");
    expect(actions).toContain("settings: { ...current, site: { ...current.site, about } }");
  });
});
