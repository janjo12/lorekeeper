type Player = { id: string; username: string };

export function describeRevealAudience(
  players: Player[],
  revealedProfileIds: string[],
  revealedToAll: boolean,
) {
  if (revealedToAll) return "all players";
  const revealedIds = new Set(revealedProfileIds);
  const usernames = players
    .filter((player) => revealedIds.has(player.id))
    .map((player) => player.username);
  if (!usernames.length) return "no players";
  const visible = usernames.slice(0, 3).map((username) => `@${username}`).join(", ");
  const remaining = usernames.length - 3;
  return remaining > 0 ? `${visible}, plus ${remaining} more` : visible;
}
