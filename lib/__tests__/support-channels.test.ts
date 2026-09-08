import { describe, expect, it } from "vitest";
import { channelHref } from "@/components/support/SupportWidget";
import type { SupportChannel } from "@/lib/types";

/**
 * Destination URLs for the floating support button.
 *
 * Operators type these by hand in the admin panel — "@username", "0912…",
 * "+98912…", or a full link — and a wrong normalisation means the support
 * button silently goes nowhere, which is worse than not having one.
 */

const channel = (overrides: Partial<SupportChannel>): SupportChannel => ({
  id: "c",
  kind: "telegram",
  label: "تلگرام",
  value: "",
  enabled: true,
  ...overrides,
});

describe("channelHref — telegram", () => {
  it("builds a t.me link from a username", () => {
    expect(channelHref(channel({ value: "asadzedeh" }))).toBe("https://t.me/asadzedeh");
  });

  it("tolerates a leading @", () => {
    expect(channelHref(channel({ value: "@asadzedeh" }))).toBe("https://t.me/asadzedeh");
  });

  it("passes a full URL through unchanged", () => {
    expect(channelHref(channel({ value: "https://t.me/joinchat/xyz" }))).toBe("https://t.me/joinchat/xyz");
  });
});

describe("channelHref — whatsapp", () => {
  it("converts a local 09… number to international form", () => {
    expect(channelHref(channel({ kind: "whatsapp", value: "09121234567" }))).toBe("https://wa.me/989121234567");
  });

  it("accepts an already international number", () => {
    expect(channelHref(channel({ kind: "whatsapp", value: "+989121234567" }))).toBe("https://wa.me/989121234567");
  });

  it("strips separators an operator might type", () => {
    expect(channelHref(channel({ kind: "whatsapp", value: "0912 123 4567" }))).toBe("https://wa.me/989121234567");
  });

  it("handles the 00 international prefix", () => {
    expect(channelHref(channel({ kind: "whatsapp", value: "00989121234567" }))).toBe("https://wa.me/989121234567");
  });
});

describe("channelHref — other kinds", () => {
  it("builds a tel: link", () => {
    expect(channelHref(channel({ kind: "phone", value: "021-12345678" }))).toBe("tel:02112345678");
  });

  it("builds a mailto: link", () => {
    expect(channelHref(channel({ kind: "email", value: "hello@asadzedeh.ir" }))).toBe("mailto:hello@asadzedeh.ir");
  });

  it("builds an instagram profile link", () => {
    expect(channelHref(channel({ kind: "instagram", value: "@asadzedeh.carpet" }))).toBe(
      "https://instagram.com/asadzedeh.carpet",
    );
  });

  it("adds a scheme to a bare custom domain", () => {
    expect(channelHref(channel({ kind: "link", value: "asadzedeh.ir/support" }))).toBe(
      "https://asadzedeh.ir/support",
    );
  });

  it("leaves a site-relative custom link alone", () => {
    expect(channelHref(channel({ kind: "link", value: "/support" }))).toBe("/support");
  });
});
