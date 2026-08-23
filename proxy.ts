import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SCA_AREA_HEADER, resolveScaRouting } from "./lib/sca/routing";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SCA_AREA_HEADER);

  const { isScaArea, rewritePathname } = resolveScaRouting(
    request.headers.get("host"),
    request.nextUrl.pathname
  );

  if (isScaArea) {
    requestHeaders.set(SCA_AREA_HEADER, "1");
  }

  if (rewritePathname !== null) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePathname;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif)$).*)"
  ]
};
