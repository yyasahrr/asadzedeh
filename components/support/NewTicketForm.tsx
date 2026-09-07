"use client";

import { useRef } from "react";
import { createTicket } from "@/app/support/actions";

export function NewTicketForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={createTicket} className="mt-4 space-y-4">
      <div>
        <label htmlFor="ticket-subject" className="mb-1 block text-sm font-bold text-navy-900">موضوع</label>
        <input
          id="ticket-subject"
          name="subject"
          required
          maxLength={120}
          placeholder="موضوع تیکت را وارد کنید"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ticket-category" className="mb-1 block text-sm font-bold text-navy-900">دسته‌بندی</label>
          <select
            id="ticket-category"
            name="category"
            className="h-11 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="عمومی">عمومی</option>
            <option value="فنی">فنی</option>
            <option value="مالی">مالی</option>
            <option value="آموزشی">آموزشی</option>
          </select>
        </div>
        <div>
          <label htmlFor="ticket-priority" className="mb-1 block text-sm font-bold text-navy-900">اولویت</label>
          <select
            id="ticket-priority"
            name="priority"
            className="h-11 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="عادی">عادی</option>
            <option value="مهم">مهم</option>
            <option value="فوری">فوری</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ticket-text" className="mb-1 block text-sm font-bold text-navy-900">متن پیام</label>
        <textarea
          id="ticket-text"
          name="text"
          required
          maxLength={2000}
          rows={5}
          placeholder="توضیحات خود را بنویسید..."
          className="w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => (document.getElementById("new-ticket-dialog") as HTMLDialogElement | null)?.close()}
          className="inline-flex h-10 items-center rounded-xl bg-sand-200 px-5 text-sm font-bold text-ink-700"
        >
          انصراف
        </button>
        <button type="submit" className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-teal-600 px-6 text-sm font-bold text-white transition-colors hover:bg-teal-700">
          ارسال تیکت
        </button>
      </div>
    </form>
  );
}
