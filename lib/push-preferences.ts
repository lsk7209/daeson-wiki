import { getTursoClient, isTursoConfigured } from "./turso.ts";
import {
  DEFAULT_PUSH_PREFERENCES,
  normalizeStoredPushPreferences,
  type PushPreferences,
} from "./push-schedule.ts";

const SETTING_KEY = "push_preferences_v1";

export async function getPushPreferences(): Promise<PushPreferences> {
  if (!isTursoConfigured()) {
    return DEFAULT_PUSH_PREFERENCES;
  }

  const result = await getTursoClient().execute({
    sql: "select value from app_settings where key = ? limit 1",
    args: [SETTING_KEY],
  });
  const rawValue = result.rows[0]?.value;

  if (typeof rawValue !== "string") {
    return DEFAULT_PUSH_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return normalizeStoredPushPreferences(parsed);
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
}

export async function savePushPreferences(preferences: PushPreferences) {
  if (!isTursoConfigured()) {
    return false;
  }

  await getTursoClient().execute({
    sql: `
      insert into app_settings (key, value, updated_at)
      values (?, ?, ?)
      on conflict (key) do update set
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    args: [SETTING_KEY, JSON.stringify(preferences), new Date().toISOString()],
  });

  return true;
}
