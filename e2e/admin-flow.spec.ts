import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD, E2E_ADMIN_PHONE } from "./env";
import { totp } from "../lib/totp";

async function loginAdmin(page: Page) {
  await page.goto("/auth");
  await page.locator("#auth-phone").fill(E2E_ADMIN_PHONE);
  await page.locator("#auth-pass").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: /ورود/ }).first().click();
  await page.waitForURL(/\/(admin|account\/security|auth\/verify)/, { timeout: 30_000 });
}

test.describe("admin journey", () => {
  test("an administrator can reach the admin panel", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/admin/courses");
    await expect(page.getByRole("link", { name: /دوره/ }).first()).toBeVisible();
  });

  test("an administrator can create and publish a course", async ({ page }) => {
    await loginAdmin(page);

    const title = `دوره تست خودکار ${Date.now()}`;
    await page.goto("/admin/courses/new");
    await page.locator("#f-title").fill(title);
    await page.locator("#f-price").fill("1850000");
    await page.locator("#f-excerpt").fill("دوره‌ای که توسط تست خودکار ساخته شده است.");
    await page.locator("#f-outcomes").fill("یادگیری چله‌کشی\nاجرای گره فارسی");
    await page.getByRole("button", { name: /انتشار دوره/ }).click();

    await page.goto("/courses");
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });

  test("2FA enrolment issues recovery codes and accepts a real TOTP code", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/account/security");

    await page.getByRole("button", { name: /Google Authenticator|فعال‌سازی/ }).first().click();

    // The shared secret is displayed for manual entry; read it and derive a code
    // with the same TOTP implementation the server verifies against.
    const secret = (await page.locator("code[dir='ltr']").first().innerText()).trim();
    expect(secret.length).toBeGreaterThan(10);

    await page.getByLabel(/کد/).last().fill(totp(secret));
    await page.getByRole("button", { name: /فعال|تأیید/ }).last().click();

    await expect(page.getByText(/کدهای بازیابی/).first()).toBeVisible({ timeout: 20_000 });
  });
});
