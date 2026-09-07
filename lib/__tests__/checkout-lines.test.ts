import { beforeAll, describe, expect, it } from "vitest";

// NODE_ENV is typed read-only in @types/node, so go through Object.assign.
Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

let buildLines: typeof import("@/lib/checkout-lines")["buildLines"];
let linesSubtotal: typeof import("@/lib/checkout-lines")["linesSubtotal"];
let store: typeof import("@/lib/store");
let seedData: typeof import("@/lib/data");
let seedDb: typeof import("@/lib/seed");

const course = () => seedData.onlineCourses[0];
const klass = () => seedData.inPersonClasses[0];
const physical = () => seedDb.products.find((p) => p.kind === "physical" && !p.allowBackorder)!;

beforeAll(async () => {
  ({ buildLines, linesSubtotal } = await import("@/lib/checkout-lines"));
  store = await import("@/lib/store");
  seedData = await import("@/lib/data");
  seedDb = await import("@/lib/seed");

  store.writeDb({
    courses: seedData.onlineCourses,
    classes: seedData.inPersonClasses,
    products: seedDb.products,
    learningPaths: seedData.learningPaths,
  });
});

describe("checkout line building — the browser never sets a price", () => {
  it("replaces a tampered course price and title with server data", () => {
    const { lines, problems } = buildLines([
      {
        kind: "course",
        slug: course().slug,
        title: "دوره رایگان هک شده",
        price: 1,
        image: "",
      },
    ]);

    expect(problems).toEqual([]);
    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(course().price);
    expect(lines[0].price).not.toBe(1);
    expect(lines[0].title).toBe(course().title);
    expect(lines[0].qty).toBe(1);
  });

  it("replaces a tampered product price with server data", () => {
    const product = physical();
    const { lines } = buildLines([
      { kind: "product", slug: product.slug, title: "x", price: 0, image: "", qty: 1 },
    ]);

    expect(lines[0].price).toBe(product.price);
    expect(linesSubtotal(lines)).toBe(product.price);
  });

  it("computes the subtotal from server prices only", () => {
    const product = physical();
    const { lines } = buildLines([
      { kind: "product", slug: product.slug, title: "x", price: 1, image: "", qty: 2 },
      { kind: "course", slug: course().slug, title: "y", price: 1, image: "" },
    ]);

    expect(linesSubtotal(lines)).toBe(product.price * 2 + course().price);
  });

  it("rejects an unknown slug instead of inventing a line", () => {
    const { lines, problems } = buildLines([
      { kind: "course", slug: "does-not-exist", title: "x", price: 100, image: "" },
    ]);

    expect(lines).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it("refuses a quantity above available stock", () => {
    const product = physical();
    store.writeDb({
      products: store.getProducts().map((p) =>
        p.slug === product.slug ? { ...p, stock: 2, reservedStock: 1 } : p,
      ),
    });

    const { lines, problems } = buildLines([
      { kind: "product", slug: product.slug, title: "x", price: 1, image: "", qty: 2 },
    ]);

    expect(lines).toEqual([]);
    expect(problems[0]).toContain("1");
  });

  it("clamps an absurd quantity into the allowed range", () => {
    const product = physical();
    store.writeDb({
      products: store.getProducts().map((p) =>
        p.slug === product.slug ? { ...p, stock: 500, reservedStock: 0, allowBackorder: true } : p,
      ),
    });

    const { lines } = buildLines([
      { kind: "product", slug: product.slug, title: "x", price: 1, image: "", qty: 10_000 },
    ]);

    expect(lines[0].qty).toBe(99);
  });

  it("refuses an inactive product", () => {
    const product = physical();
    store.writeDb({
      products: store.getProducts().map((p) => (p.slug === product.slug ? { ...p, active: false } : p)),
    });

    const { lines, problems } = buildLines([
      { kind: "product", slug: product.slug, title: "x", price: 1, image: "", qty: 1 },
    ]);

    expect(lines).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it("refuses a class whose seats are all held by unpaid orders", () => {
    const target = klass();
    store.writeDb({
      classes: store.getClasses().map((c) =>
        c.slug === target.slug ? { ...c, remaining: 2, reservedSeats: 2 } : c,
      ),
    });

    const { lines, problems } = buildLines([
      { kind: "class", slug: target.slug, title: "x", price: 1, image: "" },
    ]);

    expect(lines).toEqual([]);
    expect(problems[0]).toContain("ظرفیت");
  });

  it("ignores a tampered class price", () => {
    const target = klass();
    store.writeDb({
      classes: store.getClasses().map((c) =>
        c.slug === target.slug ? { ...c, remaining: 5, reservedSeats: 0 } : c,
      ),
    });

    const { lines } = buildLines([
      { kind: "class", slug: target.slug, title: "x", price: 1, image: "" },
    ]);

    expect(lines[0].price).toBe(target.price);
  });
});
