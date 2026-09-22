import { emitNotificationEvent } from "./sms-automation";
import type { NotificationEventId } from "./notification-events";
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
export type TransactionalSmsRequest<E extends BusinessEvent = BusinessEvent> = { event: E; eventKey: string; phone: string; payload: EventPayloads[E] };

export async function sendTransactionalSms<E extends BusinessEvent>(request: TransactionalSmsRequest<E>): Promise<{ ok: boolean; skipped?: boolean }> {
  const map: Record<BusinessEvent, NotificationEventId> = { orderCreated:"order.created", paymentSuccess:"payment.success", courseEnrollment:"course.enrolled", classEnrollment:"class.enrolled", orderShipped:"order.shipped", certificateReady:"certificate.ready" };
  const result = await emitNotificationEvent({ eventId: map[request.event], eventKey: request.eventKey.replace(`${request.event}:`, `${map[request.event]}:`), recipient: request.phone, payload: request.payload });
  return { ok: result.ok, skipped: result.sent === 0 };
}
