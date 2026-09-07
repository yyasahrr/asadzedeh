import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTickets, writeDb } from "@/lib/store";
import type { Ticket } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: crypto.randomUUID(),
    subject: "پشتیبانی آنلاین",
    student: user.name,
    userId: user.id,
    phone: user.phone,
    status: "باز",
    priority: "عادی",
    category: "عمومی",
    messages: [
      {
        id: crypto.randomUUID(),
        sender: user.name,
        senderRole: "student",
        text: text.slice(0, 2000),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const tickets = getTickets();
  tickets.unshift(ticket);
  writeDb({ tickets });

  return NextResponse.json({
    ticketId: ticket.id,
    messages: ticket.messages,
  });
}
