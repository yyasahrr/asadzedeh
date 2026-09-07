import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { finalizePaidOrderTx, releaseOrderLines } from "@/lib/db/commerce";
import { faToday } from "@/lib/format";
import { logger } from "@/lib/logger";
import { sendSms } from "@/lib/notify";
import { isPaidStatus } from "@/lib/order-status";
import { createSpotLicense } from "@/lib/spotplayer";
import {
  getCourse,
  getEnrollments,
  getLearningPath,
  getOrders,
  getPayments,
  syncCollections,
  writeDb,
} from "@/lib/store";
import type { OrderLine } from "@/lib/types";

/** Expand order lines into the concrete course slugs the buyer is entitled to. */
export function resolveCourseSlugs(lines: OrderLine[] | undefined): string[] {
  const slugs: string[] = [];
  for (const line of lines ?? []) {
    if (line.kind === "course") {
      if (!slugs.includes(line.slug)) slugs.push(line.slug);
    } else if (line.kind === "learning_path") {
      const path = getLearningPath(line.slug);
      for (const entry of path?.pathCourses ?? []) {
        if (!slugs.includes(entry.courseSlug)) slugs.push(entry.courseSlug);
      }
    }
  }
  return slugs;
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

/**
 * Fulfil an order whose payment has been verified.
 *
 * The state change (payment PAID → order PAID → stock settled → enrolments
 * created → order marked settled) happens in ONE database transaction, so a
 * failure anywhere leaves nothing half-applied. Everything here after the
 * transaction is an external side effect that must not be able to roll business
 * state back, and each is safe to skip on a replay.
 *
 * Returns true only when this call is the one that actually fulfilled the order.
 */
export async function finalizePaidOrder(
  orderId: string,
  options: { paymentId?: string; refId?: string; authority?: string } = {},
): Promise<boolean> {
  const order = getOrders().find((candidate) => candidate.id === orderId);
  if (!order) return false;

  const paymentId =
    options.paymentId ??
    getPayments().find((p) => p.orderId === orderId)?.id;

  let result;
  try {
    result = await finalizePaidOrderTx({
      orderId,
      paymentId,
      refId: options.refId,
      authority: options.authority,
      lines: order.lines ?? [],
      userId: order.userId ?? null,
      courseSlugs: resolveCourseSlugs(order.lines),
      newEnrollmentId: (courseSlug) =>
        `en-${Date.now().toString(36)}-${courseSlug.slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`,
      today: faToday(),
    });
  } catch (error) {
    // A gateway reference another payment already recorded, or a duplicate
    // enrolment: both mean "this callback is a replay", not "something broke".
    if (isUniqueViolation(error)) {
      logger.warn({ event: "payment.replay", orderId, refId: options.refId });
      await syncCollections(["orders", "payments", "enrollments", "products", "classes"]);
      return false;
    }
    throw error;
  }

  if (result.outcome !== "finalized") {
    logger.info({ event: "order.finalize.skipped", orderId, outcome: result.outcome });
    return false;
  }

  await syncCollections(["orders", "payments", "enrollments", "products", "classes", "courses"]);
  logger.info({
    event: "order.paid",
    orderId,
    paymentId,
    refId: options.refId,
    enrolments: result.created.length,
  });

  // SpotPlayer licences need the network, so they are issued after commit.
  for (const enrolment of result.created) {
    const course = getCourse(enrolment.courseSlug);
    if (!course?.protection?.spotPlayer || !order.userId) continue;
    const learner = order.userId;
    const r = await createSpotLicense({
      name: order.student,
      phone: order.phone ?? "",
      courseIds: course.protection.spotPlayerCourseIds,
      payload: orderId,
    });
    if (r.ok) {
      writeDb({
        enrollments: getEnrollments().map((e) =>
          e.id === enrolment.id ? { ...e, spotLicense: r.license } : e,
        ),
      });
      await audit({
        action: "spotplayer.license",
        target: `course:${enrolment.courseSlug}`,
        detail: { licenseId: r.license.id, orderId, learner },
      });
    } else {
      await audit({
        action: "spotplayer.error",
        level: "error",
        target: `course:${enrolment.courseSlug}`,
        detail: { error: r.error, orderId },
      });
    }
  }

  if (order.phone) {
    const hasCourse = order.lines?.some((line) => line.kind === "course" || line.kind === "learning_path");
    const hasProduct = order.lines?.some((line) => line.kind === "product" || line.kind === "preorder");
    const parts = [`اسدزاده: سفارش ${orderId} ثبت شد.`];
    if (hasCourse) parts.push("دوره‌ها در پنل هنرجو فعال است.");
    if (hasProduct) parts.push(`کالاها با ${order.shipping?.method ?? "روش انتخابی"} ارسال می‌شود.`);
    await sendSms([order.phone], parts.join(" "));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/orders");
  return true;
}

/** Return reserved stock/seats at most once after a failed or cancelled payment. */
export async function releaseOrder(orderId: string) {
  const order = getOrders().find((candidate) => candidate.id === orderId);
  if (!order?.lines || isPaidStatus(order.status) || order.releasedAt) return false;

  await releaseOrderLines(order.lines);
  await syncCollections(["products", "classes"]);
  writeDb({
    orders: getOrders().map((candidate) =>
      candidate.id === orderId ? { ...candidate, releasedAt: new Date().toISOString() } : candidate,
    ),
  });
  logger.info({ event: "order.reservation.released", orderId });
  return true;
}
