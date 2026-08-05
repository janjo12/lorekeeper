"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Entity = { id: string; name: string; category_id?: string | null };
type Category = { id: string; name: string; parent_category_id?: string | null };
type Manifest = { textbox_ids: string[]; image_ids: string[]; tag_keys?: string[] };
type Corpus = {
  textboxes: Array<{ id: string; entity_id: string; name?: string; text: string }>;
  images: Array<{ id: string; entity_id: string; name?: string; storage_path: string; signed_url?: string }>;
  tags: Array<{ id: string; entity_id: string; name: string }>;
};
type Result = {
  key: string;
  kind: "Entity" | "Category" | "Tag" | "Textbox" | "Image";
  title: string;
  detail?: string;
  href: string;
  score: number;
  imageUrl?: string;
};

const EMPTY_CORPUS: Corpus = { textboxes: [], images: [], tags: [] };

function withoutSignedUrl(image: Corpus["images"][number]) {
  return { id: image.id, entity_id: image.entity_id, name: image.name, storage_path: image.storage_path };
}

function relevance(query: string, title: string, body = "") {
  const q = query.toLocaleLowerCase();
  const name = title.toLocaleLowerCase();
  const text = body.toLocaleLowerCase();
  if (name === q) return 500;
  if (name.startsWith(q)) return 400;
  if (name.split(/\s+/).some((word) => word.startsWith(q))) return 325;
  if (name.includes(q)) return 250;
  if (text.includes(q)) return 100;
  return 0;
}

function safeCachedCorpus(raw: string | null, manifest: Manifest): Corpus {
  if (!raw) return EMPTY_CORPUS;
  try {
    const parsed = JSON.parse(raw) as Corpus;
    const textboxIds = new Set(manifest.textbox_ids);
    const imageIds = new Set(manifest.image_ids);
    const tagKeys = new Set(manifest.tag_keys ?? []);
    return {
      textboxes: (parsed.textboxes ?? []).filter((item) => textboxIds.has(item.id)),
      images: (parsed.images ?? []).filter((item) => imageIds.has(item.id)).map(withoutSignedUrl),
      tags: (parsed.tags ?? []).filter((item) => tagKeys.has(`${item.id}:${item.entity_id}`)),
    };
  } catch {
    return EMPTY_CORPUS;
  }
}

function makeResults(query: string, campaignId: string, entities: Entity[], categories: Category[], corpus: Corpus) {
  if (!query.trim()) return [];
  const q = query.trim();
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const results: Result[] = [];
  const add = (result: Result) => { if (result.score) results.push(result); };
  for (const category of categories) add({ key: `category:${category.id}`, kind: "Category", title: category.name, href: `/data/campaign-lore?campaign=${campaignId}&category=${category.id}`, score: relevance(q, category.name) });
  for (const entity of entities) add({ key: `entity:${entity.id}`, kind: "Entity", title: entity.name, detail: categories.find((category) => category.id === entity.category_id)?.name ?? "Uncategorized", href: `/data/campaign-lore?campaign=${campaignId}&entity=${entity.id}`, score: relevance(q, entity.name) });
  for (const tag of corpus.tags) {
    const entity = entityById.get(tag.entity_id); if (!entity) continue;
    add({ key: `tag:${tag.id}:${tag.entity_id}`, kind: "Tag", title: tag.name, detail: entity.name, href: `/data/campaign-lore?campaign=${campaignId}&entity=${entity.id}`, score: relevance(q, tag.name) });
  }
  for (const box of corpus.textboxes) {
    const entity = entityById.get(box.entity_id); if (!entity) continue;
    const score = relevance(q, box.name || "Notes", box.text);
    add({ key: `textbox:${box.id}`, kind: "Textbox", title: box.name || "Notes", detail: `${entity.name} · ${box.text.slice(0, 140)}`, href: `/data/campaign-lore?campaign=${campaignId}&entity=${entity.id}#textbox-${box.id}`, score });
  }
  for (const item of corpus.images) {
    const entity = entityById.get(item.entity_id); if (!entity) continue;
    add({ key: `image:${item.id}`, kind: "Image", title: item.name || "Image", detail: entity.name, href: `/data/campaign-lore?campaign=${campaignId}&entity=${entity.id}#image-${item.id}`, score: relevance(q, item.name || "Image"), imageUrl: item.signed_url });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export default function LoreSearch({ campaignId, userId, entities, categories, manifest }: { campaignId: string; userId: string; entities: Entity[]; categories: Category[]; manifest: Manifest }) {
  const cacheKey = `lore-search:${userId}:${campaignId}`;
  const [query, setQuery] = useState("");
  const [corpus, setCorpus] = useState<Corpus>(EMPTY_CORPUS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const previousQuery = useRef("");
  const ranked = useMemo(() => makeResults(query, campaignId, entities, categories, corpus), [query, campaignId, entities, categories, corpus]);

  useEffect(() => {
    queueMicrotask(() => setCorpus(safeCachedCorpus(localStorage.getItem(cacheKey), manifest)));
    const controller = new AbortController();
    fetch(`/api/campaign-search?campaign=${encodeURIComponent(campaignId)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Search hydration failed"); return response.json(); })
      .then((fresh: Corpus) => {
        setCorpus(fresh);
        localStorage.setItem(cacheKey, JSON.stringify({ ...fresh, images: fresh.images.map(withoutSignedUrl) }));
      })
      .catch((error) => { if (error.name !== "AbortError") setLoadFailed(true); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [cacheKey, campaignId, manifest]);

  useEffect(() => {
    if (query !== previousQuery.current) {
      previousQuery.current = query;
      setResults(ranked);
      return;
    }
    // Background arrivals append without moving results the reader has begun scanning.
    setResults((current) => {
      const byKey = new Map(ranked.map((item) => [item.key, item]));
      const kept = current.filter((item) => byKey.has(item.key)).map((item) => ({ ...item, imageUrl: byKey.get(item.key)?.imageUrl ?? item.imageUrl }));
      const seen = new Set(kept.map((item) => item.key));
      return [...kept, ...ranked.filter((item) => !seen.has(item.key))];
    });
  }, [query, ranked]);

  return (
    <div className="lore-search">
      <label htmlFor="campaign-lore-search">Search campaign lore</label>
      <input id="campaign-lore-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entities, categories, tags, notes, and images" autoComplete="off" />
      {query.trim() && (
        <div className="lore-search-results" role="list" aria-live="polite">
          {results.map((result) => (
            <Link href={result.href} className="lore-search-result" role="listitem" key={result.key}>
              {result.kind === "Image" && <span className="search-image-placeholder">{result.imageUrl && (
                // Private signed URLs are short-lived and intentionally bypass the persistent optimizer cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.imageUrl} alt="" loading="lazy" />
              )}</span>}
              <span><small>{result.kind}</small><strong>{result.title}</strong>{result.detail && <span>{result.detail}</span>}</span>
            </Link>
          ))}
          {!results.length && !loading && <p className="search-empty">No visible lore matches “{query.trim()}”.</p>}
          {loading && <div className="search-loading"><span>Searching the rest of this campaign…</span><i aria-hidden="true" /></div>}
          {loadFailed && <p className="search-empty">Background search data could not be refreshed. Showing locally available results.</p>}
        </div>
      )}
    </div>
  );
}
