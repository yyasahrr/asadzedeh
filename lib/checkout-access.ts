import type { OrderLine } from "./types";

export function checkoutRequiresAccount(lines: Pick<OrderLine, "kind">[]): boolean {
  return lines.some((line) => line.kind === "course" || line.kind === "learning_path");
}
