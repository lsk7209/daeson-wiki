import { getTursoClient, isTursoConfigured } from "./turso.ts";

export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

type DailyDeliveryKey = {
  targetDate: string;
  verseId: string;
  channel: string;
};

export async function claimDailyDelivery(key: DailyDeliveryKey) {
  if (!isTursoConfigured()) {
    return false;
  }

  const result = await getTursoClient().execute({
    sql: `
      insert into daily_delivery_log (target_date, verse_id, channel, status)
      values (?, ?, ?, 'pending')
      on conflict do nothing
    `,
    args: [key.targetDate, key.verseId, key.channel],
  });

  return result.rowsAffected === 1;
}

export async function finishDailyDelivery(
  key: DailyDeliveryKey,
  status: Exclude<DeliveryStatus, "pending">,
  errorMessage?: string,
) {
  if (!isTursoConfigured()) {
    return false;
  }

  const deliveredAt = status === "sent" ? new Date().toISOString() : null;

  await getTursoClient().execute({
    sql: `
      update daily_delivery_log
      set status = ?,
          error_message = ?,
          delivered_at = ?
      where target_date = ?
        and channel = ?
    `,
    args: [
      status,
      errorMessage?.slice(0, 400) ?? null,
      deliveredAt,
      key.targetDate,
      key.channel,
    ],
  });

  return true;
}
