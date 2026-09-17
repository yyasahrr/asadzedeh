export function resolveNeshanWebMapKey(stored?: string | null, environment?: string | null): string | undefined {
  return stored?.trim() || environment?.trim() || undefined;
}
