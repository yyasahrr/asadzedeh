import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getClass, getOrder, getSettings } from "@/lib/store";
import { generateEnrollmentCardPdf, type EnrollmentCardData } from "@/lib/enrollment-card-pdf";

function generateCode(classSlug: string, orderId: string): string {
  const base = `${classSlug}-${orderId}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const hex = Math.abs(hash).toString(36).toUpperCase().padStart(6, "0");
  return `ASD-${hex.slice(0, 6)}`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classSlug = searchParams.get("class");
  const orderId = searchParams.get("order");
  if (!classSlug || !orderId) {
    return NextResponse.json({ error: "missing class or order param" }, { status: 400 });
  }

  const inPersonClass = getClass(classSlug);
  if (!inPersonClass) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }

  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // Verify this order belongs to the user and includes this class
  const isOwner = order.userId === user.id || order.phone === user.phone || order.student === user.name;
  const hasClass = order.status === "پرداخت شده" && (order.lines ?? []).some((l) => l.kind === "class" && l.slug === classSlug);
  if (!isOwner || !hasClass) {
    return NextResponse.json({ error: "access denied" }, { status: 403 });
  }

  const code = generateCode(classSlug, orderId);
  const siteUrl = getSettings().site.siteUrl;

  const cardData: EnrollmentCardData = {
    studentName: user.name,
    classTitle: inPersonClass.title,
    instructor: inPersonClass.instructor,
    startDate: inPersonClass.startDate,
    days: inPersonClass.days,
    time: inPersonClass.time,
    sessions: inPersonClass.sessions,
    location: inPersonClass.location,
    code,
    siteUrl,
  };

  try {
    const pdfBuffer = await generateEnrollmentCardPdf(cardData);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="enrollment-card-${classSlug}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Enrollment card PDF generation failed:", error);
    return NextResponse.json({ error: "pdf generation failed" }, { status: 500 });
  }
}
