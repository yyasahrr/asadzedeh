export type LoginMethod = "password" | "otp";

/** Keep authentication methods explicit and reject cross-flow credentials. */
export function validAuthIntent(
  entries: { method: FormDataEntryValue | null; password?: FormDataEntryValue | null; code?: FormDataEntryValue | null },
  expected: LoginMethod,
): boolean {
  if (entries.method !== expected) return false;
  if (expected === "password") return !String(entries.code ?? "").trim();
  return !String(entries.password ?? "").trim();
}
