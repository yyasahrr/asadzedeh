import { expect, test, type Page } from "@playwright/test";

/** A unique phone number per run so repeated runs never collide. */
function e2ePhone(): string {
  const tail = String(Date.now()).slice(-8);
  return `09${tail}`;
}

async function register(page: Page, phone: string, password: string) {
  await page.goto("/auth?tab=register");
  await page.getByLabel(/نام/).first().fill("هنرجوی تست");
  await page.locator("#reg-phone").fill(phone);
  await page.locator("#reg-pass").fill(password);
  await page.getByRole("button", { name: /ثبت‌نام|ایجاد حساب/ }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("student journey", () => {
  test("register → buy a course → it appears in the dashboard", async ({ page }) => {
    const phone = e2ePhone();
    await register(page, phone, "Student!2345678");

    // Browse the catalogue and open the first published course.
    await page.goto("/courses");
    const firstCourse = page.locator("a[href^='/courses/']").first();
    const courseHref = await firstCourse.getAttribute("href");
    expect(courseHref).toBeTruthy();
    await page.goto(courseHref!);

    const courseTitle = await page.locator("h1").first().innerText();

    await page.getByRole("button", { name: /افزودن به سبد خرید/ }).click();
    await page.getByRole("link", { name: /مشاهده سبد/ }).click();
    await page.waitForURL(/\/cart/);

    await page.getByRole("link", { name: /پرداخت|تکمیل/ }).first().click();
    await page.waitForURL(/\/checkout/);

    await page.locator("#co-name").fill("هنرجوی تست");
    await page.locator("#co-phone").fill(phone);
    await page.getByRole("button", { name: /^پرداخت/ }).click();

    // Demo gateway settles the order synchronously.
    await page.waitForURL(/\/checkout\/success/, { timeout: 30_000 });

    await page.goto("/dashboard/courses");
    await expect(page.getByText(courseTitle).first()).toBeVisible();
  });

  test("certificate verification page exposes only public facts", async ({ page }) => {
    // Seeded certificate — see lib/seed.ts.
    await page.goto("/verify/AZ-C-1182");
    await expect(page.getByText("سارا محمدی").first()).toBeVisible();
    await expect(page.getByText("گلیم‌بافی مقدماتی").first()).toBeVisible();

    // No contact details or internal identifiers on a public page.
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("09123456789");
    expect(body).not.toContain("@");
  });

  test("an unknown certificate code is reported as invalid", async ({ page }) => {
    await page.goto("/verify/AZ-C-000000");
    await expect(page.getByText(/معتبر نیست|یافت نشد|نامعتبر/).first()).toBeVisible();
  });
});
