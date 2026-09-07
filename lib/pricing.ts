import type { LearningPath, OnlineCourse } from "./types";

export function getLearningPathCoursesTotal(path: LearningPath, courses: OnlineCourse[]): number {
  return path.pathCourses.reduce((sum, pc) => {
    const course = courses.find((c) => c.slug === pc.courseSlug);
    return sum + (course?.price ?? 0);
  }, 0);
}

export function getLearningPathFinalPrice(path: LearningPath, courses: OnlineCourse[]): number {
  const total = getLearningPathCoursesTotal(path, courses);
  if (path.pricingMode === "FIXED" && path.fixedPrice != null) {
    return Math.max(0, Math.min(path.fixedPrice, total));
  }
  if (path.pricingMode === "PERCENTAGE" && path.discountPercentage != null) {
    const pct = Math.max(0, Math.min(path.discountPercentage, 100));
    return Math.round(total * (1 - pct / 100));
  }
  return total;
}

export function getLearningPathDiscount(path: LearningPath, courses: OnlineCourse[]): number {
  return Math.max(0, getLearningPathCoursesTotal(path, courses) - getLearningPathFinalPrice(path, courses));
}

export function couponDiscount(subtotal: number, code: string, percent = 10): number {
  if (!code) return 0;
  return Math.round((subtotal * Math.max(0, Math.min(percent, 100))) / 100);
}
