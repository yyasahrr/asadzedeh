import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTicket, getTickets, writeDb } from "@/lib/store";
import type { TicketMessage } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (ticket.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ messages: ticket.messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (ticket.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const msg: TicketMessage = {
    id: `tm-${Date.now().toString(36)}`,
    sender: user.name,
    senderRole: "student",
    text: text.slice(0, 2000),
    createdAt: now,
  };

  ticket.messages.push(msg);
  ticket.updatedAt = now;
  if (ticket.status === "بسته شده") ticket.status = "باز";

  writeDb({
    tickets: getTickets().map((t) => (t.id === id ? ticket : t)),
  });

  return NextResponse.json({ messages: ticket.messages });
}
