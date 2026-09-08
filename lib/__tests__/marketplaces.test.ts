import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, Settings } from "@/lib/types";

/**
 * Product feeds for Torob / Emalls / Basalam / Digikala.
 *
 * The feed is the only place where the catalogue leaves the site in bulk, so
 * the things worth pinning are the ones that would misprice or over-promise:
 * prices stay integer Toman, a reserved-out product is not advertised as in
 * stock, disabled channels serve nothing, and the feed key actually gates.
 */

const state = vi.hoisted(() => ({
  settings: null as unknown as Settings,
  products: [] as Product[],
}));

vi.mock("@/lib/store", () => ({
  getSettings: () => state.settings,
  getProducts: () => state.products,
}));

vi.mock("@/lib/env", () => ({ appUrl: () => "https://fallback.test" }));

const { buildFeed, channelEnabled, feedKeyOk, feedToCsv } = await import("@/lib/marketplaces");
const { defaultMarketplaces } = await import("@/lib/seed");

function product(overrides: Partial<Product> = {}): Product {
  return {
    slug: "dar-qali",
    title: "دار قالی چوبی",
    category: "ابزار",
    kind: "physical",
    price: 1_850_000,
    stock: 5,
    allowBackorder: false,
    image: "/images/dar.jpg",
    gallery: [],
    excerpt: "دار قالی دست‌ساز",
    description: [],
    specs: [{ label: "جنس", value: "چوب راش" }],
    shippingMethods: ["post"],
    weightGrams: 12000,
    featured: false,
    active: true,
    sku: "AZ-DAR-01",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 3,
    ...overrides,
  } as Product;
}

function configure(overrides: Partial<Settings["marketplaces"]> = {}) {
  state.settings = {
    site: { siteUrl: "https://asadzedeh.ir" },
    seo: { canonicalBaseUrl: "https://asadzedeh.ir" },
    marketplaces: {
      enabled: true,
      feedKey: "",
      channels: defaultMarketplaces.map((c) => ({ ...c, enabled: true })),
      ...overrides,
    },
  } as unknown as Settings;
}

beforeEach(() => {
  configure();
  state.products = [product()];
});

describe("channelEnabled", () => {
  it("is false when the master switch is off, even if the channel is on", () => {
    configure({ enabled: false });
    expect(channelEnabled("torob")).toBe(false);
  });

  it("is false for an individually disabled channel", () => {
    configure({ channels: defaultMarketplaces.map((c) => ({ ...c, enabled: c.id !== "emalls" })) });
    expect(channelEnabled("torob")).toBe(true);
    expect(channelEnabled("emalls")).toBe(false);
  });
});

describe("feedKeyOk", () => {
  it("allows anything when no key is configured", () => {
    expect(feedKeyOk(null)).toBe(true);
  });

  it("requires an exact match once a key is set", () => {
    configure({ feedKey: "s3cret" });
    expect(feedKeyOk(null)).toBe(false);
    expect(feedKeyOk("wrong")).toBe(false);
    expect(feedKeyOk("s3cret")).toBe(true);
  });
});

describe("buildFeed", () => {
  it("emits integer Toman prices and absolute URLs", () => {
    const [item] = buildFeed("torob");
    expect(item.price).toBe(1_850_000);
    expect(Number.isInteger(item.price)).toBe(true);
    expect(item.page_url.startsWith("https://asadzedeh.ir/shop/dar-qali")).toBe(true);
    expect(item.image_link).toBe("https://asadzedeh.ir/images/dar.jpg");
  });

  it("tags links with the channel's utm_source", () => {
    expect(buildFeed("emalls")[0].page_url).toContain("utm_source=emalls");
  });

  it("does not advertise stock that is already reserved", () => {
    state.products = [product({ stock: 2, reservedStock: 2 })];
    // inStockOnly is the default, so the product drops out entirely.
    expect(buildFeed("torob")).toHaveLength(0);
  });

  it("keeps a backorder product available", () => {
    state.products = [product({ stock: 0, allowBackorder: true })];
    expect(buildFeed("torob")[0].availability).toBe("instock");
  });

  it("never publishes an inactive product, even when inStockOnly is off", () => {
    configure({ channels: defaultMarketplaces.map((c) => ({ ...c, enabled: true, inStockOnly: false })) });
    state.products = [product({ active: false })];
    expect(buildFeed("torob")).toHaveLength(0);
  });

  it("reports out-of-stock rather than hiding it when inStockOnly is off", () => {
    configure({ channels: defaultMarketplaces.map((c) => ({ ...c, enabled: true, inStockOnly: false })) });
    state.products = [product({ stock: 0 })];
    expect(buildFeed("torob")[0].availability).toBe("outofstock");
  });

  it("prefers the SKU as the stable feed id", () => {
    expect(buildFeed("torob")[0].id).toBe("AZ-DAR-01");
    state.products = [product({ sku: undefined })];
    expect(buildFeed("torob")[0].id).toBe("dar-qali");
  });
});

describe("feedToCsv", () => {
  it("quotes values containing separators", () => {
    state.products = [product({ title: 'دار قالی, "ویژه"' })];
    const csv = feedToCsv(buildFeed("emalls"));
    const [header, row] = csv.split("\n");
    expect(header.split(",")[0]).toBe("id");
    expect(row).toContain('"دار قالی, ""ویژه"""');
  });

  it("emits one row per product", () => {
    state.products = [product(), product({ slug: "sh", sku: "AZ-2" })];
    expect(feedToCsv(buildFeed("torob")).split("\n")).toHaveLength(3);
  });
});
