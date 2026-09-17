import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430];

for (const width of widths) {
  test(`mobile header and cart fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem("az_cart", JSON.stringify([{
        kind: "course",
        slug: "mobile-layout-course",
        title: "عنوان بلند دوره برای بررسی چیدمان سبد خرید در نمایشگرهای کوچک",
        price: 1_250_000,
        image: "/images/hero-weaver.jpg",
      }]));
    });

    await page.goto("/cart");
    await expect(page.getByRole("link", { name: "ورود به حساب" })).toBeVisible();
    await expect(page.getByRole("link", { name: /سبد خرید/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "باز کردن منو" })).toBeVisible();
    await expect(page.getByTestId("cart-item")).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      itemRight: document.querySelector<HTMLElement>("[data-testid='cart-item']")?.getBoundingClientRect().right ?? 0,
      itemLeft: document.querySelector<HTMLElement>("[data-testid='cart-item']")?.getBoundingClientRect().left ?? 0,
    }));
    expect(layout.page).toBeLessThanOrEqual(layout.viewport);
    expect(layout.itemLeft).toBeGreaterThanOrEqual(0);
    expect(layout.itemRight).toBeLessThanOrEqual(layout.viewport);
  });

  test(`OTP challenge fits and keeps the phone read-only at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/auth?tab=otp&next=/checkout");
    await page.locator("#otp-phone").fill("09129998877");
    await page.getByRole("button", { name: "ارسال کد ورود", exact: true }).click();
    await page.waitForURL(/tab=otp.*sent=1/);

    await expect(page.locator("input[aria-label^='رقم']")).toHaveCount(6);
    await expect(page.locator("#otp-phone2")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "ارسال مجدد کد", exact: true })).toBeDisabled();
    await expect(page.getByText(/اعتبار کد:/)).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(layout.page).toBeLessThanOrEqual(layout.viewport);

    await page.getByRole("button", { name: "تغییر شماره موبایل", exact: true }).click();
    await expect(page.locator("#otp-phone")).toBeVisible();
    await expect(page).toHaveURL(/next=%2Fcheckout/);
  });
}
