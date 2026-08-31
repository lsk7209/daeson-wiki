import { NextRequest, NextResponse } from "next/server";
import {
  parseBasicAuthorization,
  timingSafeEqual,
} from "@/lib/request-auth";

const REALM = "Daeson Wiki";

export function proxy(request: NextRequest) {
  if (
    /^\/api\/push\/dispatch\/(morning|afternoon|evening)$/.test(
      request.nextUrl.pathname,
    )
  ) {
    return NextResponse.next();
  }

  if (process.env.BASIC_AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Private access is not configured.", {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return NextResponse.next();
  }

  const credentials = parseBasicAuthorization(
    request.headers.get("authorization"),
  );

  if (
    credentials &&
    timingSafeEqual(credentials.user, expectedUser) &&
    timingSafeEqual(credentials.password, expectedPassword)
  ) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sw.js).*)",
  ],
};
