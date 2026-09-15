import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GraduationCap, KeyRound, Pencil, Plus, Star, UserX } from "lucide-react";
import { deleteInstructor } from "../actions";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TableShell, Td } from "@/components/admin/TableShell";
import { can, getSessionUser } from "@/lib/auth";
import { toFa, formatPrice } from "@/lib/format";
import { getClasses, getCourses, getEnrollments, getInstructors, getOrders, getUserById } from "@/lib/store";

export const metadata: Metadata = { title: "مدرسان" };
export const dynamic = "force-dynamic";

export default async function InstructorsAdminPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "instructors")) return <Denied />;
  const instructors = getInstructors();
  const courses = getCourses();
  const classes = getClasses();
  const enrollments = getEnrollments();
  const paidOrders = getOrders().filter((o) => o.status === "پرداخت شده");

  const stats = (slug: string) => {
    const myCourses = courses.filter((c) => c.instructorSlug === slug);
    const myClasses = classes.filter((c) => c.instructorSlug === slug);
    const slugs = new Set(myCourses.map((c) => c.slug));
    const students = enrollments.filter((e) => slugs.has(e.courseSlug)).length;
    const revenue = paidOrders.reduce((sum, o) => {
      if (o.lines?.length) return sum + o.lines.filter((l) => l.kind === "course" && slugs.has(l.slug)).reduce((s, l) => s + l.price * l.qty, 0);
      return sum + (myCourses.some((c) => o.item.includes(c.shortTitle) || o.item.includes(c.title)) ? o.amount : 0);
    }, 0);
    return { courses: myCourses.length, classes: myClasses.length, students, revenue };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy-900">مدرسان</h1>
          <p className="mt-1 text-sm text-ink-600">
            {toFa(instructors.length)} مدرس • هر مدرس با حساب متصل، پنل اختصاصی <code className="rounded bg-sand-100 px-1 text-xs" dir="ltr">/instructor</code> دارد.
          </p>
        </div>
        <Link href="/admin/instructors/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">
          <Plus className="h-4 w-4" /> مدرس جدید
        </Link>
      </div>

      <TableShell head={["مدرس", "تخصص", "دوره / کلاس", "هنرجویان", "درآمد دوره‌ها", "سهم", "حساب", "عملیات"]}>
        {instructors.map((i) => {
          const st = stats(i.slug);
          const linked = i.userId ? getUserById(i.userId) : undefined;
          return (
            <tr key={i.slug} className={i.active === false ? "opacity-60" : ""}>
              <Td>
                <div className="flex items-center gap-3">
                  <Image src={i.image} alt={i.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                      {i.name}
                      {i.featured && <Star className="h-3.5 w-3.5 fill-ochre-400 text-ochre-500" />}
                      {i.active === false && <span className="rounded-md bg-sand-200 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">غیرفعال</span>}
                    </p>
                    <p className="text-xs text-ink-500" dir="ltr">/{i.slug}</p>
                  </div>
                </div>
              </Td>
              <Td className="text-sm text-ink-700">
                {i.specialty}
                <br />
                <span className="text-xs text-ink-500">{i.experience}</span>
              </Td>
              <Td className="text-sm text-ink-700 whitespace-nowrap">{toFa(st.courses)} / {toFa(st.classes)}</Td>
              <Td className="text-sm text-ink-700">{toFa(st.students)}</Td>
              <Td className="text-sm text-ink-700 whitespace-nowrap">{formatPrice(st.revenue)}</Td>
              <Td className="text-sm text-ink-700">{toFa(i.commissionPercent ?? 60)}٪</Td>
              <Td>
                {linked ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800" title={linked.phone}>
                    <KeyRound className="h-3 w-3" /> متصل
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-sand-200 px-2 py-0.5 text-[11px] font-bold text-ink-600">
                    <UserX className="h-3 w-3" /> بدون حساب
                  </span>
                )}
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Link href={`/instructors#${i.slug}`} target="_blank" title="صفحه عمومی" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50">
                    <GraduationCap className="h-4 w-4" />
                  </Link>
                  <Link href={`/admin/instructors/${i.slug}/edit`} title="ویرایش" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-700 hover:bg-sand-100">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteButton action={deleteInstructor} hidden={{ name: "slug", value: i.slug }} label={i.name} />
                </div>
              </Td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
