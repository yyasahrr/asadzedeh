export const NOTIFICATION_EVENTS = {
  "auth.login.otp.requested": { label: "کد ورود", description: "درخواست رمز یک‌بارمصرف ورود", category: "authentication", variables: ["code", "expiresIn"] },
  "auth.password.reset.requested": { label: "بازیابی رمز عبور", description: "درخواست کد بازیابی رمز", category: "authentication", variables: ["code", "expiresIn"] },
  "auth.password.reset.completed": { label: "تغییر رمز عبور", description: "تکمیل بازیابی رمز", category: "authentication", variables: ["customerName"] },
  "auth.phone.change.requested": { label: "تأیید تغییر شماره", description: "کد تأیید شماره جدید", category: "authentication", variables: ["code", "expiresIn"] },
  "auth.phone.changed": { label: "تغییر شماره", description: "تکمیل تغییر شماره", category: "authentication", variables: ["customerName"] },
  "user.registered": { label: "ثبت‌نام کاربر", description: "ایجاد حساب جدید", category: "account", variables: ["customerName"] },
  "user.account.disabled": { label: "غیرفعال شدن حساب", description: "غیرفعال شدن حساب", category: "account", variables: ["customerName"] },
  "user.account.enabled": { label: "فعال شدن حساب", description: "فعال شدن دوباره حساب", category: "account", variables: ["customerName"] },
  "order.created": { label: "ثبت سفارش", description: "سفارش جدید", category: "commerce", variables: ["customerName", "orderId"] },
  "order.paid": { label: "پرداخت سفارش", description: "پرداخت سفارش", category: "commerce", variables: ["customerName", "orderId", "amount", "orderType"] },
  "order.cancelled": { label: "لغو سفارش", description: "لغو سفارش", category: "commerce", variables: ["customerName", "orderId"] },
  "order.shipped": { label: "ارسال سفارش", description: "ارسال و ثبت کد رهگیری", category: "commerce", variables: ["customerName", "orderId", "trackingCode"] },
  "payment.success": { label: "پرداخت موفق", description: "تأیید تراکنش", category: "commerce", variables: ["customerName", "orderId", "amount", "orderType"] },
  "payment.failed": { label: "پرداخت ناموفق", description: "ناموفق بودن تراکنش", category: "commerce", variables: ["customerName", "orderId", "amount"] },
  "course.enrolled": { label: "فعال شدن دوره", description: "دسترسی به دوره", category: "education", variables: ["customerName", "courseTitle"] },
  "class.enrolled": { label: "ثبت‌نام کلاس", description: "ثبت‌نام کلاس حضوری", category: "education", variables: ["customerName", "classTitle"] },
  "certificate.ready": { label: "آماده شدن گواهی", description: "گواهی آماده دریافت", category: "education", variables: ["customerName", "certificateCode"] },
  "certificate.issued": { label: "صدور گواهی", description: "صدور گواهی", category: "education", variables: ["customerName", "certificateCode"] },
  "support.ticket.created": { label: "ثبت تیکت", description: "تیکت پشتیبانی جدید", category: "support", variables: ["customerName", "ticketId"] },
  "support.ticket.replied": { label: "پاسخ تیکت", description: "پاسخ جدید پشتیبانی", category: "support", variables: ["customerName", "ticketId"] },
} as const;

export type NotificationEventId = keyof typeof NOTIFICATION_EVENTS;
export type NotificationPayload = Record<string, string | number | boolean | null | undefined>;

export function isNotificationEventId(value: string): value is NotificationEventId {
  return Object.hasOwn(NOTIFICATION_EVENTS, value);
}
