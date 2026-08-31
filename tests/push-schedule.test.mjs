import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PUSH_PREFERENCES,
  getDailyChannel,
  getKoreaDateKey,
  isSlotEnabled,
  parsePushPreferences,
} from "../lib/push-schedule.ts";

test("accepts one to three unique known slots when enabled", () => {
  assert.deepEqual(parsePushPreferences({ enabled: true, slots: ["morning"] }), {
    enabled: true,
    slots: ["morning"],
  });
  assert.deepEqual(
    parsePushPreferences({
      enabled: true,
      slots: ["morning", "afternoon", "evening"],
    }),
    {
      enabled: true,
      slots: ["morning", "afternoon", "evening"],
    },
  );
});

test("rejects invalid, duplicate, and empty enabled slot selections", () => {
  assert.equal(parsePushPreferences({ enabled: true, slots: [] }), null);
  assert.equal(
    parsePushPreferences({ enabled: true, slots: ["morning", "morning"] }),
    null,
  );
  assert.equal(
    parsePushPreferences({ enabled: true, slots: ["midnight"] }),
    null,
  );
  assert.equal(parsePushPreferences({ enabled: "yes", slots: ["morning"] }), null);
});

test("allows disabled delivery with zero slots", () => {
  assert.deepEqual(parsePushPreferences({ enabled: false, slots: [] }), {
    enabled: false,
    slots: [],
  });
  assert.equal(isSlotEnabled(DEFAULT_PUSH_PREFERENCES, "morning"), false);
});

test("uses the Korea calendar date across the UTC boundary", () => {
  assert.equal(getKoreaDateKey(new Date("2026-08-31T14:59:59.000Z")), "2026-08-31");
  assert.equal(getKoreaDateKey(new Date("2026-08-31T15:00:00.000Z")), "2026-09-01");
});

test("builds a stable per-slot delivery channel", () => {
  assert.equal(getDailyChannel("evening"), "pwa:daily:evening");
});
