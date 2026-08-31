import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("push storage preserves single-device and date-slot idempotency", async () => {
  process.env.TURSO_DATABASE_URL = "file::memory:";
  process.env.TURSO_AUTH_TOKEN = "local-test-token";

  const { closeTursoClient, getTursoClient } = await import("../lib/turso.ts");
  const {
    getActivePushSubscription,
    upsertPushSubscription,
  } = await import("../lib/push-subscriptions.ts");
  const { getPushPreferences, savePushPreferences } = await import(
    "../lib/push-preferences.ts"
  );
  const { claimDailyDelivery, finishDailyDelivery } = await import(
    "../lib/push-deliveries.ts"
  );

  try {
    for (const migration of [
      "0001_initial.sql",
      "0002_push_subscriptions.sql",
      "0003_daily_delivery_slot_uniqueness.sql",
    ]) {
      const sql = await readFile(path.join(process.cwd(), "db", "migrations", migration), "utf8");
      await getTursoClient().executeMultiple(sql);
    }

    await upsertPushSubscription({
      endpoint: "https://push.example.test/first",
      p256dh: "first-key",
      auth: "first-auth",
      userAgent: "first-phone",
    });
    await upsertPushSubscription({
      endpoint: "https://push.example.test/second",
      p256dh: "second-key",
      auth: "second-auth",
      userAgent: "second-phone",
    });

    const active = await getActivePushSubscription();
    assert.equal(active?.endpoint, "https://push.example.test/second");

    const subscriptions = await getTursoClient().execute(
      "select endpoint, enabled from push_subscriptions order by endpoint",
    );
    assert.deepEqual(
      subscriptions.rows.map((row) => [String(row.endpoint), Number(row.enabled)]),
      [
        ["https://push.example.test/first", 0],
        ["https://push.example.test/second", 1],
      ],
    );

    await savePushPreferences({ enabled: true, slots: ["morning", "evening"] });
    assert.deepEqual(await getPushPreferences(), {
      enabled: true,
      slots: ["morning", "evening"],
    });

    const firstClaim = {
      targetDate: "2026-08-31",
      verseId: "verse-before-release",
      channel: "pwa:daily:morning",
    };
    const changedVerseClaim = {
      ...firstClaim,
      verseId: "verse-after-release",
    };

    assert.equal(await claimDailyDelivery(firstClaim), true);
    assert.equal(await claimDailyDelivery(changedVerseClaim), false);
    await finishDailyDelivery(firstClaim, "sent");

    const deliveries = await getTursoClient().execute(
      "select verse_id, channel, status from daily_delivery_log",
    );
    assert.deepEqual(deliveries.rows, [
      {
        verse_id: "verse-before-release",
        channel: "pwa:daily:morning",
        status: "sent",
      },
    ]);
  } finally {
    closeTursoClient();
  }
});

test("expired push endpoints are classified without exposing response details", async () => {
  const { describePushError, isExpiredPushEndpoint } = await import(
    "../lib/web-push-sender.ts"
  );

  assert.equal(isExpiredPushEndpoint({ statusCode: 404 }), true);
  assert.equal(isExpiredPushEndpoint({ statusCode: 410 }), true);
  assert.equal(isExpiredPushEndpoint({ statusCode: 500 }), false);
  assert.equal(
    describePushError({ statusCode: 500, endpoint: "secret-endpoint", body: "secret-body" }),
    "Push service rejected the request (500).",
  );
});
