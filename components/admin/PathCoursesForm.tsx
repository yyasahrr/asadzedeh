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

interface PathCoursesFormProps {
  courses: CourseOption[];
  initial: PathCourse[];
  onTotalChange: (total: number) => void;
}

export function PathCoursesForm({
  courses,
  initial,
  onTotalChange,
}: PathCoursesFormProps) {
  const jsonRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <PathCoursesManager
        courses={courses}
        initial={initial}
        onChange={(value) => {
          if (jsonRef.current) jsonRef.current.value = JSON.stringify(value.courses);
          onTotalChange(value.total);
        }}
      />
      <input type="hidden" name="pathCourses" ref={jsonRef} defaultValue={JSON.stringify(initial)} />
    </div>
  );
}
