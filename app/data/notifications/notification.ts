export type RealtimeNotification = {
  id: string;
  kind: "campaign_invite" | "lore_reveal";
  title: string;
  body: string;
  href: string;
};

export function parseRealtimeNotification(payload: unknown): RealtimeNotification | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (value.kind !== "campaign_invite" && value.kind !== "lore_reveal") return null;
  if (
    typeof value.title !== "string" ||
    typeof value.body !== "string" ||
    typeof value.href !== "string" ||
    !value.href.startsWith("/data/")
  ) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    kind: value.kind,
    title: value.title,
    body: value.body,
    href: value.href,
  };
}
