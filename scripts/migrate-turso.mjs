import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

loadLocalEnv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.log("No migrations found.");
  process.exit(0);
}

const { createClient } = await import("@libsql/client");
const client = createClient({
  url,
  authToken,
});

for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  await client.executeMultiple(sql);
  console.log(`Applied ${file}`);
}

console.log(`Applied ${files.length} migration file(s).`);

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const env = readFileSync(envPath, "utf8");

    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = unquote(value);
      }
    }
  } catch {
    // The command also supports normal process env vars.
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
