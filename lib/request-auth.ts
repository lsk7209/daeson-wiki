export type BasicCredentials = {
  user: string;
  password: string;
};

export function parseBasicAuthorization(
  header: string | null,
): BasicCredentials | null {
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

export function matchesBearerAuthorization(
  header: string | null,
  expectedToken: string,
) {
  if (!header?.startsWith("Bearer ") || !expectedToken) {
    return false;
  }

  return timingSafeEqual(header.slice("Bearer ".length).trim(), expectedToken);
}

export function timingSafeEqual(actual: string, expected: string) {
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
