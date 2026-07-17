import Link from "next/link";
import { Fragment } from "react";

export type LinkableEntity = { id: string; name: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type EntityReference =
  { kind: "text"; value: string } | { kind: "entity"; value: string; entity: LinkableEntity };

export function findEntityReferences(text: string, entities: LinkableEntity[]): EntityReference[] {
  const namedEntities = entities
    .filter((entity) => entity.name.length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  if (!namedEntities.length) return [{ kind: "text", value: text }];

  const entityByName = new Map(namedEntities.map((entity) => [entity.name, entity]));
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${namedEntities.map((entity) => escapeRegExp(entity.name)).join("|")})(?![\\p{L}\\p{N}_])`,
    "gu",
  );
  const references: EntityReference[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const entity = entityByName.get(match[0]);
    if (!entity) continue;
    if (match.index > cursor) {
      references.push({ kind: "text", value: text.slice(cursor, match.index) });
    }
    references.push({ kind: "entity", value: match[0], entity });
    cursor = match.index + match[0].length;
  }

  if (!references.length) return [{ kind: "text", value: text }];
  if (cursor < text.length) references.push({ kind: "text", value: text.slice(cursor) });
  return references;
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
  return findEntityReferences(text, entities).map((reference, index) => (
    <Fragment key={index}>
      {reference.kind === "entity" ? (
        <Link
          className="entity-reference-link"
          href={`/data/campaign-lore?campaign=${encodeURIComponent(campaignId)}&entity=${encodeURIComponent(reference.entity.id)}`}
        >
          {reference.value}
        </Link>
      ) : (
        reference.value
      )}
    </Fragment>
  ));
}
