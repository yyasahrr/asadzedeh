import { describe, expect, it } from "vitest";
import { isNotificationEventId, NOTIFICATION_EVENTS } from "@/lib/notification-events";
import { maskPhone, validateTemplateVariables } from "@/lib/sms-automation";
import { normalizeIranianMobile } from "@/lib/admin-student-accounts";

describe("notification event registry", () => {
  it("keeps authentication events independently configurable", () => {
    expect(isNotificationEventId("auth.login.otp.requested")).toBe(true);
    expect(isNotificationEventId("auth.password.reset.requested")).toBe(true);
    expect(isNotificationEventId("auth.phone.change.requested")).toBe(true);
    expect(isNotificationEventId("made.up.event")).toBe(false);
  });
  it("accepts only declared template variables", () => {
    expect(validateTemplateVariables("order.shipped", ["customerName", "orderId", "trackingCode"])).toBe(true);
    expect(validateTemplateVariables("order.shipped", ["customerName", "password"])).toBe(false);
    expect(NOTIFICATION_EVENTS["order.shipped"].variables).not.toContain("password");
  });
  it("masks recipients and normalizes Iranian digits", () => {
    expect(maskPhone("09123456789")).toBe("0912***6789");
    expect(normalizeIranianMobile("+۹۸ ۹۱۲ ۳۴۵ ۶۷۸۹")).toBe("09123456789");
  });
});
