import { describe, expect, it } from "vitest";
import { buildFeedItems, renderProductFeedXml } from "@/lib/channels/feed";
import { buildListings, toListing } from "@/lib/channels/basalam";
import type { Product } from "@/lib/types";

/**
 * Channel feeds and marketplace listings.
 *
 * A feed that contrad the shop is worse than no feed: Torob and Emalls suspend
 * listings over a price or availability mismatch. These tests pin the parts that
 * can drift — which products are included, how availability is derived, and that
 * Persian text and ampersands survive XML escaping intact.
 */

function product(over: Partial<Product> = {}): Product {
  return {
    slug: "loom-60",
    title: "دار قالی ۶۰ سانتی",
    category: "ابزار",
    kind: "physical",
    price: 1_200_000,
    stock: 6,
    allowBackorder: false,
    reservedStock: 0,
    image: "/images/loom.jpg",
    gallery: [],
    excerpt: "دار چوبی دست‌ساز",
    description: [],
    specs: [],
    shippingMethods: ["post"],
    weightGrams: 3000,
    featured: false,
    active: true,
    createdAt: "2026-01-01",
    sold: 0,
    ...over,
  } as Product;
}

const BASE = "https://asadzedeh.ir";

describe("feed item selection", () => {
  it("includes only active, priced, physical products", () => {
    const items = buildFeedItems(
      [
        product(),
        product({ slug: "course-1", kind: "course" as Product["kind"], price: 500_000 }),
        product({ slug: "off", active: false }),
        product({ slug: "free", price: 0 }),
      ],
      BASE,
      "torob",
    );
    expect(items.map((i) => i.link)).toEqual([`${BASE}/shop/loom-60`]);
  });

  it("prefers the SKU as the merchant id and falls back to the slug", () => {
    expect(buildFeedItems([product({ sku: "SKU-1" })], BASE, "torob")[0].id).toBe("SKU-1");
    expect(buildFeedItems([product()], BASE, "torob")[0].id).toBe("torob-loom-60");
  });
});

describe("availability", () => {
  it("reports in_stock when sellable units remain", () => {
    expect(buildFeedItems([product({ stock: 6, reservedStock: 2 })], BASE, "torob")[0].availability).toBe("in_stock");
  });

  it("counts stock held by unpaid orders against availability", () => {
    // 4 in stock, all 4 held by unpaid orders: nobody can actually buy one.
    expect(buildFeedItems([product({ stock: 4, reservedStock: 4 })], BASE, "torob")[0].availability).toBe("out_of_stock");
  });

  it("reports preorder rather than a false in_stock for backorder goods", () => {
    expect(buildFeedItems([product({ stock: 0, allowBackorder: true })], BASE, "torob")[0].availability).toBe("preorder");
  });
});

describe("XML rendering", () => {
  it("emits the Google-Shopping envelope the engines expect", () => {
    const xml = renderProductFeedXml(buildFeedItems([product()], BASE, "torob", { brand: "اسدزاده" }));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<g:title>دار قالی ۶۰ سانتی</g:title>");
    expect(xml).toContain("<g:price>1200000 IRR</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:brand>اسدزاده</g:brand>");
  });

  it("escapes characters that would otherwise break the document", () => {
    const xml = renderProductFeedXml(
      buildFeedItems([product({ title: 'قالی <بزرگ> & "اصلی"' })], BASE, "emalls"),
    );
    expect(xml).toContain("&lt;بزرگ&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
    // A raw ampersand or angle bracket must not survive in the title text.
    expect(xml).not.toContain("<g:title>قالی <بزرگ>");
  });

  it("omits empty optional tags rather than emitting blank ones", () => {
    const xml = renderProductFeedXml(buildFeedItems([product({ excerpt: "" })], BASE, "torob"));
    expect(xml).not.toContain("<g:description>");
  });

  it("keeps Persian text intact end to end", () => {
    const xml = renderProductFeedXml(buildFeedItems([product()], BASE, "torob"));
    expect(xml).toContain("فید محصولات کارگاه قالی‌بافی اسدزاده");
  });
});

describe("Basalam listing mapping", () => {
  it("shapes a physical product into a marketplace listing", () => {
    const l = toListing(product({ sku: "SKU-9" }), BASE);
    expect(l).toMatchObject({
      externalId: "SKU-9",
      price: 1_200_000,
      quantity: 6,
      weightGrams: 3000,
      imageUrl: `${BASE}/images/loom.jpg`,
    });
  });

  it("refuses a non-physical or inactive product", () => {
    expect(toListing(product({ kind: "course" as Product["kind"] }), BASE)).toBeNull();
    expect(toListing(product({ active: false }), BASE)).toBeNull();
  });

  it("never reports a negative quantity", () => {
    expect(toListing(product({ stock: 2, reservedStock: 9 }), BASE)?.quantity).toBe(0);
  });

  it("builds the full listing set", () => {
    expect(buildListings([product(), product({ slug: "c", kind: "course" as Product["kind"] })], BASE)).toHaveLength(1);
  });
});
