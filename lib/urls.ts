/** Return a normalized http(s) URL, or an empty string for unsafe/malformed input. */
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const input = value.trim();
  if (!input || input === "#") return "";
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeOrigin(value: unknown, fallback: string): string {
  const safe = safeHttpUrl(value) || safeHttpUrl(fallback);
  if (!safe) throw new Error("A valid absolute application URL is required");
  return new URL(safe).origin;
}

export function safeCanonicalOverride(value: unknown): string {
  return safeHttpUrl(value);
}

/** Safe source accepted by Next/image and the public badge renderer. */
export function safeImageSource(value: unknown): string {
  if (typeof value !== "string") return "";
  const input = value.trim();
  if (input.startsWith("/") && !input.startsWith("//") && !input.includes("\\")) return input;
  return safeHttpUrl(input);
}
