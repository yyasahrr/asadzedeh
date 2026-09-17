import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin Jalali date integration", () => {
  const picker = fs.readFileSync(path.join(process.cwd(), "components/admin/JalaliDatePicker.tsx"), "utf8");
  const lessonManager = fs.readFileSync(path.join(process.cwd(), "components/admin/LessonManager.tsx"), "utf8");
  const classForm = fs.readFileSync(path.join(process.cwd(), "components/admin/ClassForm.tsx"), "utf8");
  const sessionEditor = fs.readFileSync(path.join(process.cwd(), "components/admin/ClassSessionEditor.tsx"), "utf8");

  it("uses the Jalali picker for every editable admin class/session date", () => {
    expect(lessonManager).toContain('<JalaliDatePicker id="l-completedDate"');
    expect(classForm).toContain('<JalaliDatePicker id="k-start"');
    expect(sessionEditor).toContain("<JalaliDatePicker");
    expect(`${lessonManager}${classForm}${sessionEditor}`).not.toContain('type="date"');
  });

  it("renders Persian months, weekdays, RTL, and stores a hidden canonical value", () => {
    expect(picker).toContain("JALALI_MONTHS.map");
    expect(picker).toContain('const WEEKDAYS = ["شنبه"');
    expect(picker).toContain('dir="rtl"');
    expect(picker).toContain('type="hidden" name={name} value={stored}');
    expect(picker).toContain("jalaliSelectionToStoredDate");
  });
});
