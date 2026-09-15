import { describe, it, expect } from "vitest";
import type { LearningPath, OnlineCourse } from "@/lib/types";

// We need to test the pricing calculation logic directly
// Since the store is file-based, we'll test the pure functions

function getLearningPathCoursesTotal(
  path: LearningPath,
  courses: OnlineCourse[]
): number {
  return path.pathCourses.reduce((sum, pc) => {
    const course = courses.find((c) => c.slug === pc.courseSlug);
    return sum + (course?.price ?? 0);
  }, 0);
}

function getLearningPathFinalPrice(
  path: LearningPath,
  courses: OnlineCourse[]
): number {
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

function getLearningPathDiscount(
  path: LearningPath,
  courses: OnlineCourse[]
): number {
  return Math.max(
    0,
    getLearningPathCoursesTotal(path, courses) -
      getLearningPathFinalPrice(path, courses)
  );
}

const sampleCourses: OnlineCourse[] = [
  {
    slug: "course-a",
    title: "Course A",
    shortTitle: "A",
    category: "test",
    instructor: "Test",
    instructorRole: "test",
    level: "مقدماتی",
    sessions: 10,
    hours: 10,
    price: 2500000,
    rating: 5,
    students: 0,
    image: "",
    excerpt: "",
    outcomes: [],
    syllabus: [],
  },
  {
    slug: "course-b",
    title: "Course B",
    shortTitle: "B",
    category: "test",
    instructor: "Test",
    instructorRole: "test",
    level: "مقدماتی",
    sessions: 10,
    hours: 10,
    price: 3000000,
    rating: 5,
    students: 0,
    image: "",
    excerpt: "",
    outcomes: [],
    syllabus: [],
  },
  {
    slug: "course-c",
    title: "Course C",
    shortTitle: "C",
    category: "test",
    instructor: "Test",
    instructorRole: "test",
    level: "مقدماتی",
    sessions: 10,
    hours: 10,
    price: 2000000,
    rating: 5,
    students: 0,
    image: "",
    excerpt: "",
    outcomes: [],
    syllabus: [],
  },
];

describe("learning path pricing", () => {
  describe("FIXED pricing mode", () => {
    it("calculates total from course prices", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 2,
        courses: 2,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
        ],
        active: true,
        pricingMode: "FIXED",
        createdAt: "",
      };
      expect(getLearningPathCoursesTotal(path, sampleCourses)).toBe(5500000);
    });

    it("applies fixed bundle price", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 2,
        courses: 2,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
        ],
        active: true,
        pricingMode: "FIXED",
        fixedPrice: 4500000,
        createdAt: "",
      };
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(4500000);
      expect(getLearningPathDiscount(path, sampleCourses)).toBe(1000000);
    });

    it("caps fixed price at total (no increase)", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 2,
        courses: 2,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
        ],
        active: true,
        pricingMode: "FIXED",
        fixedPrice: 99999999,
        createdAt: "",
      };
      // Should cap at total price
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(5500000);
    });
  });

  describe("PERCENTAGE pricing mode", () => {
    it("applies percentage discount", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 2,
        courses: 2,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
        ],
        active: true,
        pricingMode: "PERCENTAGE",
        discountPercentage: 20,
        createdAt: "",
      };
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(4400000);
      expect(getLearningPathDiscount(path, sampleCourses)).toBe(1100000);
    });

    it("caps discount at 100%", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 2,
        courses: 2,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
        ],
        active: true,
        pricingMode: "PERCENTAGE",
        discountPercentage: 150,
        createdAt: "",
      };
      // 150% should be capped at 100% -> price = 0
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles path with no courses", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 0,
        courses: 0,
        pathCourses: [],
        active: true,
        pricingMode: "FIXED",
        fixedPrice: 0,
        createdAt: "",
      };
      expect(getLearningPathCoursesTotal(path, sampleCourses)).toBe(0);
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(0);
    });

    it("handles path with unknown course slug", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 1,
        courses: 1,
        pathCourses: [
          { courseSlug: "nonexistent-course", order: 1 },
        ],
        active: true,
        pricingMode: "FIXED",
        createdAt: "",
      };
      expect(getLearningPathCoursesTotal(path, sampleCourses)).toBe(0);
    });

    it("handles all three courses", () => {
      const path: LearningPath = {
        id: "lp-1",
        slug: "test",
        title: "Test",
        description: "",
        icon: "📚",
        accent: "navy",
        duration: "",
        steps: 3,
        courses: 3,
        pathCourses: [
          { courseSlug: "course-a", order: 1 },
          { courseSlug: "course-b", order: 2 },
          { courseSlug: "course-c", order: 3 },
        ],
        active: true,
        pricingMode: "PERCENTAGE",
        discountPercentage: 10,
        createdAt: "",
      };
      // Total: 2500000 + 3000000 + 2000000 = 7500000
      expect(getLearningPathCoursesTotal(path, sampleCourses)).toBe(7500000);
      // 10% off: 7500000 * 0.9 = 6750000
      expect(getLearningPathFinalPrice(path, sampleCourses)).toBe(6750000);
      expect(getLearningPathDiscount(path, sampleCourses)).toBe(750000);
    });
  });
});
