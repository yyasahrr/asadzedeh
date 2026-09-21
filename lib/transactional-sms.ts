import { audit } from "./audit";
import { claimNotificationEvent, finishNotificationEvent } from "./db/notification-events";
import { effectiveSmsSettings } from "./integrations";
import { getSettings } from "./store";
import { getSmsDriver } from "./sms";
import type { SmsTemplateEvent } from "./types";

type BusinessEvent = Exclude<SmsTemplateEvent, "otp">;
type EventPayloads = {
  orderCreated: { customerName: string; orderId: string };
  paymentSuccess: { customerName: string; orderId: string; amount: string };
  courseEnrollment: { customerName: string; courseTitle: string };
  classEnrollment: { customerName: string; classTitle: string };
  orderShipped: { customerName: string; orderId: string; trackingCode: string };
  certificateReady: { customerName: string; certificateCode: string };
};
export const MELIPAYAMAK_TEMPLATE_DEFINITIONS = {
  otp: { params: ["code"] }, orderCreated: { params: ["customerName", "orderId"] },
  paymentSuccess: { params: ["customerName", "orderId", "amount"] }, courseEnrollment: { params: ["customerName", "courseTitle"] },
  classEnrollment: { params: ["customerName", "classTitle"] }, orderShipped: { params: ["customerName", "orderId", "trackingCode"] },
  certificateReady: { params: ["customerName", "certificateCode"] },
} as const satisfies Record<SmsTemplateEvent, { params: readonly string[] }>;
const eventParameters: { [E in BusinessEvent]: (payload: EventPayloads[E]) => string[] } = {
  orderCreated: (p) => [p.customerName, p.orderId], paymentSuccess: (p) => [p.customerName, p.orderId, p.amount],
  courseEnrollment: (p) => [p.customerName, p.courseTitle], classEnrollment: (p) => [p.customerName, p.classTitle],
  orderShipped: (p) => [p.customerName, p.orderId, p.trackingCode], certificateReady: (p) => [p.customerName, p.certificateCode],
};
export type TransactionalSmsRequest<E extends BusinessEvent = BusinessEvent> = { event: E; eventKey: string; phone: string; payload: EventPayloads[E] };

export async function sendTransactionalSms<E extends BusinessEvent>(request: TransactionalSmsRequest<E>): Promise<{ ok: boolean; skipped?: boolean }> {
  const template = getSettings().sms.templates?.[request.event];
  if (!template?.enabled || !template.templateId) return { ok: true, skipped: true };
  const settings = effectiveSmsSettings();
  const driver = getSmsDriver(settings.provider);
  if (!driver?.sendTemplate) return { ok: false, skipped: true };
  const parameters = eventParameters[request.event](request.payload as never);
  if (!/^09\d{9}$/.test(request.phone) || parameters.some((value) => !value.trim() || value.length > 160)) return { ok: false, skipped: true };
  let claim: { claimed: boolean; id: string };
  try {
    claim = await claimNotificationEvent(request.eventKey, request.event, request.phone);
  } catch (error) {
    await audit({ action: "sms.transactional.claim_failed", level: "warn", detail: { event: request.event, eventKey: request.eventKey, error: error instanceof Error ? error.message : "unknown" } });
    return { ok: false };
  }
  if (!claim.claimed) return { ok: true, skipped: true };
  try {
    const result = await driver.sendTemplate(request.phone, template.templateId, parameters, {
      apiKey: settings.apiKey, secret: settings.secret, sender: settings.sender, templateId: template.templateId,
    });
    await finishNotificationEvent(claim.id, result.ok ? `ارسال شد (${driver.label})` : `ناموفق: ${result.error ?? "خطای ارسال"}`);
    if (!result.ok) await audit({ action: "sms.transactional.failed", level: "warn", detail: { event: request.event, eventKey: request.eventKey, error: result.error } });
    return { ok: result.ok };
  } catch (error) {
    await finishNotificationEvent(claim.id, "ناموفق: خطای ارتباط");
    await audit({ action: "sms.transactional.failed", level: "warn", detail: { event: request.event, eventKey: request.eventKey, error: error instanceof Error ? error.message : "unknown" } });
    return { ok: false };
  }
}
