import { describe, expect, it } from "vitest";
import { parseClassSessions } from "../class-sessions";

function payload(value: unknown) {
  return parseClassSessions(JSON.stringify(value));
}

describe("class session schedule", () => {
  it("sorts multiple sessions and derives the compatibility startDate", () => {
    const result = payload([
      { id: "two", date: "2026-10-19", startTime: "16:00", endTime: "19:00", status: "cancelled" },
      { id: "one", date: "2026-10-17", startTime: "16:00", endTime: "19:00", title: "آغاز", status: "scheduled" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startDate).toBe("2026-10-17");
      expect(result.sessions.map((session) => session.id)).toEqual(["one", "two"]);
      expect(result.sessions[1].status).toBe("cancelled");
    }
  });

  it("supports an empty schedule", () => {
    expect(payload([])).toEqual({ ok: true, sessions: [], startDate: "" });
  });

  it("rejects duplicates, invalid dates, and invalid time ranges", () => {
    expect(payload([
      { date: "2026-10-17", startTime: "16:00", endTime: "19:00" },
      { date: "2026-10-17", startTime: "16:00", endTime: "20:00" },
    ]).ok).toBe(false);
    expect(payload([{ date: "2026-02-30", startTime: "16:00", endTime: "19:00" }]).ok).toBe(false);
    expect(payload([{ date: "2026-10-17", startTime: "19:00", endTime: "16:00" }]).ok).toBe(false);
  });

  it("normalizes edited fields and rejects unknown statuses", () => {
    const edited = payload([{ id: "session-1", date: "2026-10-17", startTime: "17:00", endTime: "20:00", title: "  جلسه ویرایش‌شده  ", status: "postponed" }]);
    expect(edited.ok && edited.sessions[0]).toMatchObject({ id: "session-1", startTime: "17:00", title: "جلسه ویرایش‌شده", status: "postponed" });
    expect(payload([{ date: "2026-10-17", startTime: "16:00", endTime: "19:00", status: "unknown" }]).ok).toBe(false);
  });
});
