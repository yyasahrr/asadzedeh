"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, can } from "@/lib/auth";
import { getTickets, getTicket, writeDb } from "@/lib/store";
import { isTicketStatus } from "@/lib/validation/legacy";
import type { Ticket, TicketMessage } from "@/lib/types";

/* ---------- Student: create ticket ---------- */

export async function createTicket(fd: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/support");

  const subject = String(fd.get("subject") ?? "").trim().slice(0, 120);
  const text = String(fd.get("text") ?? "").trim().slice(0, 2000);
  const category = (String(fd.get("category") ?? "عمومی") as Ticket["category"]) || "عمومی";
  const priority = (String(fd.get("priority") ?? "عادی") as Ticket["priority"]) || "عادی";

  if (!subject || !text) return;

  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: crypto.randomUUID(),
    subject,
    student: user.name,
    userId: user.id,
    phone: user.phone,
    status: "باز",
    priority,
    category,
    messages: [
      {
        id: crypto.randomUUID(),
        sender: user.name,
        senderRole: "student",
        text,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const tickets = getTickets();
  tickets.unshift(ticket);
  writeDb({ tickets });
  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

/* ---------- Student: reply to ticket ---------- */

export async function replyTicket(fd: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/support");

  const ticketId = String(fd.get("ticketId") ?? "").trim();
  const text = String(fd.get("text") ?? "").trim().slice(0, 2000);
  if (!ticketId || !text) return;

  const ticket = getTicket(ticketId);
  if (!ticket) return;
  if (ticket.userId !== user.id) return;

  const now = new Date().toISOString();
  const msg: TicketMessage = {
    id: crypto.randomUUID(),
    sender: user.name,
    senderRole: "student",
    text,
    createdAt: now,
  };

  ticket.messages.push(msg);
  ticket.updatedAt = now;
  if (ticket.status === "بسته شده") ticket.status = "باز";

  writeDb({
    tickets: getTickets().map((t) => (t.id === ticketId ? ticket : t)),
  });
  revalidatePath(`/support/${ticketId}`);
}

/* ---------- Admin: reply to ticket ---------- */

export async function adminReplyTicket(fd: FormData) {
  const me = await getSessionUser();
  if (!me || !can(me, "orders")) return;

  const ticketId = String(fd.get("ticketId") ?? "").trim();
  const text = String(fd.get("text") ?? "").trim().slice(0, 2000);
  const newStatus = String(fd.get("status") ?? "");
  if (!ticketId || !text) return;

  const ticket = getTicket(ticketId);
  if (!ticket) return;

  const now = new Date().toISOString();
  const msg: TicketMessage = {
    id: crypto.randomUUID(),
    sender: me.name,
    senderRole: "admin",
    text,
    createdAt: now,
  };

  ticket.messages.push(msg);
  ticket.updatedAt = now;
  if (newStatus && isTicketStatus(newStatus) && newStatus !== ticket.status) {
    ticket.status = newStatus;
  } else {
    ticket.status = "پاسخ داده شده";
  }

  writeDb({
    tickets: getTickets().map((t) => (t.id === ticketId ? ticket : t)),
  });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}

/* ---------- Admin: change ticket status ---------- */

export async function updateTicketStatus(fd: FormData) {
  const me = await getSessionUser();
  if (!me || !can(me, "orders")) return;

  const ticketId = String(fd.get("ticketId") ?? "").trim();
  const status = String(fd.get("status") ?? "");
  if (!ticketId || !isTicketStatus(status)) return;

  writeDb({
    tickets: getTickets().map((t) =>
      t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t
    ),
  });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}
