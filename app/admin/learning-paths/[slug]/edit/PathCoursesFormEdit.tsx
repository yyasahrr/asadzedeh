"use client";

import { useRef } from "react";
import { PathCoursesManager } from "@/components/admin/PathCoursesManager";

interface CourseOption {
  slug: string;
  shortTitle: string;
  price: number;
}

interface PathCourse {
  courseSlug: string;
  order: number;
  note?: string;
}

interface PathCoursesFormEditProps {
  courses: CourseOption[];
  initial: PathCourse[];
}

export function PathCoursesFormEdit({
  courses,
  initial,
}: PathCoursesFormEditProps) {
  const jsonRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <PathCoursesManager
        courses={courses}
        initial={initial}
        onChange={(value) => {
          if (jsonRef.current) jsonRef.current.value = JSON.stringify(value.courses);
        }}
      />
      <input type="hidden" name="pathCourses" ref={jsonRef} defaultValue={JSON.stringify(initial)} />
    </div>
  );
}
