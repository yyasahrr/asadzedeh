import type { InPersonClass, OnlineCourse } from "./types";

type InstructorAssignable = Pick<OnlineCourse | InPersonClass, "instructorSlug" | "instructorSlugs">;

export function getInstructorSlugs(item: InstructorAssignable): string[] {
  const candidates = Array.isArray(item.instructorSlugs) ? item.instructorSlugs : [];
  const values = [item.instructorSlug, ...candidates]
    .map((value) => typeof value === "string" ? value.trim() : "")
    .filter(Boolean);
  return [...new Set(values)];
}

export const getCourseInstructorSlugs = (course: InstructorAssignable) => getInstructorSlugs(course);
export const getClassInstructorSlugs = (item: InstructorAssignable) => getInstructorSlugs(item);
export const isInstructorAssigned = (item: InstructorAssignable, slug: string) =>
  getInstructorSlugs(item).includes(slug);

export function normalizeInstructorAssignment<T extends InstructorAssignable>(item: T): T {
  const instructorSlugs = getInstructorSlugs(item);
  return { ...item, instructorSlug: instructorSlugs[0], instructorSlugs };
}
