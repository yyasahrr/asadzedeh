import { expect, test } from "@playwright/test";

function e2ePhone(): string {
  return `09${String(Date.now()).slice(-8)}`;
}

test.describe("store journey", () => {
  test("browse a product → cart → checkout → order confirmation", async ({ page }) => {
    const phone = e2ePhone();

    await page.goto("/shop");
    const productLink = page.locator("a[href^='/shop/']").first();
    const href = await productLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);

    const productTitle = await page.locator("h1").first().innerText();

    await page.getByRole("button", { name: /افزودن به سبد خرید/ }).first().click();
    await page.goto("/cart");
    await page.getByRole("link", { name: /پرداخت|تکمیل/ }).first().click();
    await page.waitForURL(/\/checkout/);

    await page.locator("#co-name").fill("خریدار تست");
    await page.locator("#co-phone").fill(phone);

    // Physical goods need a shipping method and an address.
    const shipping = page.locator("input[name='shippingMethod']").first();
    if (await shipping.count()) {
      await shipping.check();
      await page.locator("#co-province").fill("تهران");
      await page.locator("#co-city").fill("تهران");
      await page.locator("#co-postal").fill("1234567890");
      await page.locator("#co-address").fill("خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳");
    }

    await page.getByRole("button", { name: /^پرداخت/ }).click();
    await page.waitForURL(/\/checkout\/success/, { timeout: 30_000 });

    await expect(page.getByText(productTitle).first()).toBeVisible();
  });
});
