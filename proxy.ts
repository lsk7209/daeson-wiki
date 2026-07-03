import { NextRequest, NextResponse } from "next/server";

const REALM = "Daeson Wiki";

export function proxy(request: NextRequest) {
  if (process.env.BASIC_AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));

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

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  const encoded = header.slice("Basic ".length).trim();

  if (!encoded) {
    return null;
  }

  let decoded: string;

  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex < 0) {
    return null;
  }

  return {
    user: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function timingSafeEqual(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);
  const maxLength = Math.max(actualBytes.length, expectedBytes.length);
  let diff = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return diff === 0;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sw.js).*)",
  ],
};
