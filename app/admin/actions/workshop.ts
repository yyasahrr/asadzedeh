"use server";

import { numAllowZero, str } from "@/lib/validation/form";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getSettings, writeDb } from "@/lib/store";
import { isValidLatitude, isValidLongitude, clampText } from "@/lib/validation/legacy";
import { getSessionUser, can } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

function actor(u: SessionUser) {
  return { id: u.id, name: u.name, role: u.role };
}

async function staff(perm: "settings"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !can(user, perm)) {
    redirect("/admin");
  }
  return user;
}

function revalidateAll() {
  ["/", "/courses", "/classes", "/blog", "/paths", "/instructors", "/shop", "/admin", "/dashboard", "/instructor"].forEach((p) =>
    revalidatePath(p, "page")
  );
}

export async function saveWorkshopLocation(fd: FormData) {
  const me = await staff("settings");
  const lat = numAllowZero(fd, "lat");
  const lng = numAllowZero(fd, "lng");
  const address = clampText(str(fd, "address"), 300);
  const mapProvider = (str(fd, "mapProvider") as "neshan" | "openstreetmap") || "neshan";

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    redirect("/admin/workshop?error=" + encodeURIComponent("مختصات نامعتبر است. عرض بین -90 تا 90 و طول بین -180 تا 180 باشد."));
  }

  if (!address) {
    redirect("/admin/workshop?error=" + encodeURIComponent("نشانی را وارد کنید."));
  }

  writeDb({
    settings: {
      ...getSettings(),
      site: {
        ...getSettings().site,
        workshop: {
          lat,
          lng,
          address,
          mapProvider,
        },
      },
    },
  });
  await audit({ action: "settings.update", actor: actor(me), detail: { section: "workshop" } });
  revalidateAll();
  redirect("/admin/workshop?saved=1");
}
