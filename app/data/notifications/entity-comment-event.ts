export const ENTITY_COMMENT_EVENT = "lorekeeper:entity-comment";

export type RealtimeEntityComment = {
  id: string;
  entityId: string;
  username: string;
  content: string;
  createdAt: string;
};

export function parseRealtimeEntityComment(payload: unknown): RealtimeEntityComment | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.entityId !== "string" ||
    typeof value.username !== "string" ||
    typeof value.content !== "string" ||
    typeof value.createdAt !== "string"
  ) return null;
  return {
    id: value.id,
    entityId: value.entityId,
    username: value.username,
    content: value.content,
    createdAt: value.createdAt,
  };
}
