"use server";

import { createLearningPath } from "@/app/admin/actions";

export async function createLearningPathAction(fd: FormData) {
  await createLearningPath(fd);
}
