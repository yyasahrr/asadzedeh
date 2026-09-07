"use client";

import { Plus } from "lucide-react";

export function NewTicketButton() {
  return (
    <button
      type="button"
      onClick={() => (document.getElementById("new-ticket-dialog") as HTMLDialogElement | null)?.showModal()}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
    >
      <Plus className="h-4 w-4" /> تیکت جدید
    </button>
  );
}
