import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type LinkableEntity = { id: string; name: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function EntityLinks({
  text,
  campaignId,
  entities,
}: {
  text: string;
  campaignId: string;
  entities: LinkableEntity[];
}) {
  const namedEntities = entities
    .filter((entity) => entity.name.length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  if (!namedEntities.length) return text;

  const entityByName = new Map(namedEntities.map((entity) => [entity.name, entity]));
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${namedEntities.map((entity) => escapeRegExp(entity.name)).join("|")})(?![\\p{L}\\p{N}_])`,
    "gu",
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    const name = match[0];
    const entity = entityByName.get(name);
    if (!entity) continue;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <Link
        className="entity-reference-link"
        href={`/data/campaign-lore?campaign=${encodeURIComponent(campaignId)}&entity=${encodeURIComponent(entity.id)}`}
        key={`${entity.id}-${index}`}
      >
        {name}
      </Link>,
    );
    cursor = index + name.length;
  }

  if (!nodes.length) return text;
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
