import { createClient, type Client } from "@libsql/client";

let cachedClient: Client | null = null;

export function isTursoConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getTursoClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Turso is not configured.");
  }

  cachedClient = createClient({
    url,
    authToken,
  });

  return cachedClient;
}
