import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/seo/paths";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  if (isPrivatePath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|fonts/).*)"],
};
