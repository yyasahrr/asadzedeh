/** Domain errors — keep infrastructure details off the client. */

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number = 400,
    readonly expose = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "یافت نشد") {
    super(message, "not_found", 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "دسترسی مجاز نیست") {
    super(message, "forbidden", 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "ابتدا وارد شوید") {
    super(message, "unauthorized", 401);
  }
}

export class ValidationError extends AppError {
  constructor(message = "ورودی نامعتبر است") {
    super(message, "validation", 422);
  }
}

export class ConflictError extends AppError {
  constructor(message = "تداخل داده") {
    super(message, "conflict", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "تعداد درخواست‌ها بیش از حد مجاز است") {
    super(message, "rate_limited", 429);
  }
}

export class PaymentError extends AppError {
  constructor(message = "خطای پرداخت") {
    super(message, "payment", 402);
  }
}

export class StorageError extends AppError {
  constructor(message = "خطای ذخیره‌سازی فایل") {
    super(message, "storage", 500, false);
  }
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof AppError && error.expose) return error.message;
  return "خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.";
}
