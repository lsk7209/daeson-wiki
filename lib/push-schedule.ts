export const PUSH_SLOTS = [
  {
    id: "morning",
    label: "아침",
    time: "08:00",
    position: 0,
  },
  {
    id: "afternoon",
    label: "오후",
    time: "13:00",
    position: 1,
  },
  {
    id: "evening",
    label: "저녁",
    time: "20:00",
    position: 2,
  },
] as const;

export type PushSlotId = (typeof PUSH_SLOTS)[number]["id"];

export type PushPreferences = {
  enabled: boolean;
  slots: PushSlotId[];
};

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  enabled: false,
  slots: ["morning"],
};

const slotIds = new Set<string>(PUSH_SLOTS.map((slot) => slot.id));

export function isPushSlotId(value: unknown): value is PushSlotId {
  return typeof value === "string" && slotIds.has(value);
}

export function getPushSlot(slotId: PushSlotId) {
  return PUSH_SLOTS.find((slot) => slot.id === slotId)!;
}

export function parsePushPreferences(value: unknown): PushPreferences | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.enabled !== "boolean" || !Array.isArray(candidate.slots)) {
    return null;
  }

  if (!candidate.slots.every(isPushSlotId)) {
    return null;
  }

  const slots = Array.from(new Set(candidate.slots));
  if (slots.length !== candidate.slots.length || slots.length > PUSH_SLOTS.length) {
    return null;
  }

  if (candidate.enabled && slots.length === 0) {
    return null;
  }

  return {
    enabled: candidate.enabled,
    slots,
  };
}

export function normalizeStoredPushPreferences(value: unknown): PushPreferences {
  return parsePushPreferences(value) ?? DEFAULT_PUSH_PREFERENCES;
}

export function isSlotEnabled(
  preferences: PushPreferences,
  slotId: PushSlotId,
) {
  return preferences.enabled && preferences.slots.includes(slotId);
}

export function getKoreaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: "year" | "month" | "day") => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Missing ${type} in Korea date.`);
    }
    return value;
  };

  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function getDailyChannel(slotId: PushSlotId) {
  return `pwa:daily:${slotId}`;
}
