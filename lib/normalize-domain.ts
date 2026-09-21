import { normalizeInstructorAssignment } from "./instructors";
import type { InPersonClass, OnlineCourse } from "./types";

export function normalizeCourse(course: OnlineCourse): OnlineCourse {
  return normalizeInstructorAssignment({
    ...course,
    instructor: typeof course.instructor === "string" && course.instructor.trim() ? course.instructor : "مدرس اسدزاده",
    outcomes: Array.isArray(course.outcomes) ? course.outcomes : [],
    syllabus: Array.isArray(course.syllabus) ? course.syllabus : [],
    lessons: Array.isArray(course.lessons) ? course.lessons : [],
    chapters: Array.isArray(course.chapters) ? course.chapters : [],
  });
}

export function normalizeClass(item: InPersonClass): InPersonClass {
  return normalizeInstructorAssignment({
    ...item,
    title: typeof item.title === "string" && item.title.trim() ? item.title : "کلاس حضوری",
    image: typeof item.image === "string" && item.image.trim() ? item.image : "/images/workshop-loom.jpg",
    excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
    days: typeof item.days === "string" ? item.days : "",
    time: typeof item.time === "string" ? item.time : "",
    location: typeof item.location === "string" && item.location.trim() ? item.location : "کارگاه اسدزاده، ارومیه",
    instructor: typeof item.instructor === "string" && item.instructor.trim() ? item.instructor : "مدرس اسدزاده",
    startDate: typeof item.startDate === "string" ? item.startDate : "",
    includes: Array.isArray(item.includes) ? item.includes : [],
    lessons: Array.isArray(item.lessons) ? item.lessons : [],
    chapters: Array.isArray(item.chapters) ? item.chapters : [],
    sessionSchedule: Array.isArray(item.sessionSchedule) ? item.sessionSchedule : [],
    faq: Array.isArray(item.faq) ? item.faq.filter((entry) => entry && typeof entry.q === "string" && typeof entry.a === "string") : [],
    sessions: Number.isFinite(item.sessions) ? item.sessions : 0,
    capacity: Number.isFinite(item.capacity) ? item.capacity : 0,
    price: Number.isFinite(item.price) ? item.price : 0,
    remaining: Number.isFinite(item.remaining) ? item.remaining : 0,
    reservedSeats: Number.isFinite(item.reservedSeats) ? item.reservedSeats : 0,
  });
}
