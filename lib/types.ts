/** Shared domain types for the Asadzedeh learning platform. */

export type Level = "مقدماتی" | "متوسط" | "پیشرفته" | "همه سطوح";

export interface OnlineCourse {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  instructor: string;
  instructorRole: string;
  level: Level;
  sessions: number;
  hours: number;
  price: number;
  oldPrice?: number;
  rating: number;
  students: number;
  image: string;
  excerpt: string;
  outcomes: string[];
  syllabus: { title: string; lessons: string[] }[];
  badge?: string;
}

export interface InPersonClass {
  slug: string;
  title: string;
  instructor: string;
  startDate: string;
  days: string;
  time: string;
  sessions: number;
  capacity: number;
  remaining: number;
  location: string;
  price: number;
  image: string;
  excerpt: string;
  includes: string[];
}

export interface LearningPath {
  slug: string;
  title: string;
  description: string;
  steps: number;
  duration: string;
  courses: number;
  icon: string;
  accent: "navy" | "teal" | "madder" | "ochre" | "moss";
}

export interface Instructor {
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  students: number;
  courses: number;
  image: string;
  bio: string;
}

export interface Article {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  minutes: number;
  date: string;
  image: string;
  body: string[];
}

export interface StudentWork {
  id: number;
  title: string;
  student: string;
  course: string;
  image: string;
}
