export function isPrivatePath(pathname: string): boolean {
  return /^(?:\/admin|\/dashboard|\/instructor|\/account|\/auth|\/checkout|\/cart|\/api)(\/|$)/.test(pathname);
}
