import { getTursoClient, isTursoConfigured } from "@/lib/turso";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

export function isPushSubscriptionPayload(
  value: unknown,
): value is PushSubscriptionInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.endpoint === "string" &&
    candidate.endpoint.startsWith("https://") &&
    typeof candidate.p256dh === "string" &&
    candidate.p256dh.length > 0 &&
    typeof candidate.auth === "string" &&
    candidate.auth.length > 0 &&
    typeof candidate.userAgent === "string"
  );
}

export async function upsertPushSubscription(input: PushSubscriptionInput) {
  if (!isTursoConfigured()) {
    return null;
  }

  const now = new Date().toISOString();

  await getTursoClient().execute({
    sql: `
      insert into push_subscriptions (
        endpoint,
        p256dh,
        auth,
        user_agent,
        enabled,
        created_at,
        updated_at
      )
      values (?, ?, ?, ?, 1, ?, ?)
      on conflict (endpoint) do update set
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        enabled = 1,
        updated_at = excluded.updated_at
    `,
    args: [
      input.endpoint,
      input.p256dh,
      input.auth,
      input.userAgent.slice(0, 600),
      now,
      now,
    ],
  });

  return {
    endpoint: input.endpoint,
    enabled: true,
    updatedAt: now,
  };
}

export async function disablePushSubscription(endpoint: string) {
  if (!isTursoConfigured()) {
    return false;
  }

  await getTursoClient().execute({
    sql: `
      update push_subscriptions
      set enabled = 0,
          updated_at = ?
      where endpoint = ?
    `,
    args: [new Date().toISOString(), endpoint],
  });

  return true;
}
