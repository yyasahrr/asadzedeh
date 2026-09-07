import { expect, test } from "@playwright/test";

/**
 * Security regressions. Each test here exists because the corresponding hole
 * was real at some point — keep them even when they look boring.
 */

const PRIVATE_PATHS = ["/admin", "/dashboard", "/account", "/auth", "/cart", "/checkout", "/instructor"];

/**
 * app/admin/layout.tsx answers an unauthorised visitor with a login gate instead
 * of a redirect, so the assertion is "no admin chrome, no admin data" rather
 * than "the URL changed".
 */
async function expectAdminGate(page: import("@playwright/test").Page) {
  await expect(page.getByText("این بخش مخصوص همکاران است").first()).toBeVisible();
  // The authenticated sidebar (with its logout button) must not be rendered.
  await expect(page.getByRole("button", { name: "خروج" })).toHaveCount(0);
}

test.describe("access control", () => {
  test("the admin panel shows a login gate to an anonymous visitor", async ({ page }) => {
    await page.goto("/admin");
    await expectAdminGate(page);
  });

  test("a student cannot open admin pages", async ({ page }) => {
    const phone = `09${String(Date.now()).slice(-8)}`;
    await page.goto("/auth?tab=register");
    await page.getByLabel(/نام/).first().fill("هنرجوی تست");
    await page.locator("#reg-phone").fill(phone);
    await page.locator("#reg-pass").fill("Student!2345678");
    await page.getByRole("button", { name: /ثبت‌نام|ایجاد حساب/ }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/admin/users");
    await expectAdminGate(page);
  });
});

test.describe("checkout price integrity", () => {
  test("a cart that posts its own price is charged the server price", async ({ page }) => {
    // 1. Honest cart → record what the server asks for.
    await page.goto("/courses");
    const href = await page.locator("a[href^='/courses/']").first().getAttribute("href");
    await page.goto(href!);
    const title = await page.locator("h1").first().innerText();
    await page.getByRole("button", { name: /افزودن به سبد خرید/ }).click();

    await page.goto("/checkout");
    const honest = await page.locator("dt:has-text('قابل پرداخت') + dd").innerText();

    // 2. Tampered cart: same item, price rewritten to 1 Toman.
    await page.evaluate(
      ([courseSlug, courseTitle]) => {
        window.localStorage.setItem(
          "az_cart",
          JSON.stringify([
            { kind: "course", slug: courseSlug, title: courseTitle, price: 1, image: "", qty: 1 },
          ]),
        );
      },
      [href!.replace("/courses/", ""), title] as [string, string],
    );

    await page.goto("/checkout");
    const tampered = await page.locator("dt:has-text('قابل پرداخت') + dd").innerText();

    expect(tampered).toBe(honest);
    expect(tampered).not.toContain("۱ تومان");
  });
});

test.describe("operational endpoints", () => {
  test("/api/health reports the database without leaking configuration", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain("ok");
    expect(body).not.toContain("postgres://");
    expect(body).not.toContain("APP_SECRET");
    expect(body).not.toContain("PASSWORD");
  });

  test("security headers are set on a public page", async ({ page }) => {
    const res = await page.goto("/");
    const headers = res?.headers() ?? {};
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["permissions-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toContain("frame-ancestors");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
  });

  test("robots.txt keeps private areas out of crawlers", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const path of PRIVATE_PATHS) {
      expect(body, `robots.txt must disallow ${path}`).toContain(`Disallow: ${path}`);
    }
  });

  test("the sitemap never advertises a private route", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    for (const path of PRIVATE_PATHS) {
      expect(body, `sitemap.xml must not contain ${path}`).not.toContain(`<loc>${path}`);
    }
    expect(body).toContain("/courses");
  });
});
