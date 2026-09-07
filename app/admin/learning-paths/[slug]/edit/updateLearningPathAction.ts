"use server";

import { updateLearningPath } from "@/app/admin/actions";

export async function updateLearningPathAction(fd: FormData) {
  await updateLearningPath(fd);
}
