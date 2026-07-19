/**
 * Bangumi collection sync helpers (E1).
 * Collection types: 1 wish / 2 collect / 3 do / 4 on_hold / 5 dropped
 */
import type { LibraryItemRow } from "./app-store";

const API_BASE = "https://api.bgm.tv";

const TYPE_MAP: Record<number, string> = {
  1: "wish",
  2: "collect",
  3: "do",
  4: "on_hold",
  5: "dropped",
};

export interface BangumiCollectionItem {
  subject_id: number;
  subject?: { id: number; name?: string; name_cn?: string };
  type: number;
  rate?: number;
  updated_at?: string;
}

function cleanTitle(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Map a Bangumi collection row into a persisted library item (including titles). */
export function collectionToLibraryItem(
  userId: string,
  item: BangumiCollectionItem,
  fallbackUpdatedAt: string,
): LibraryItemRow {
  return {
    userId,
    subjectId: item.subject_id,
    collectionType: collectionTypeLabel(item.type),
    score: item.rate ?? null,
    title: cleanTitle(item.subject?.name),
    titleCn: cleanTitle(item.subject?.name_cn),
    updatedAt: item.updated_at ?? fallbackUpdatedAt,
  };
}

export async function fetchUserCollections(
  username: string,
  accessToken: string,
): Promise<BangumiCollectionItem[]> {
  const ua =
    process.env.BANGUMI_USER_AGENT ??
    "antiable/trip (0.1.0) (https://github.com/antiable/trip)";
  const items: BangumiCollectionItem[] = [];
  let offset = 0;
  const limit = 50;

  // Anime subjects only (subject_type=2)
  for (;;) {
    const url = new URL(`${API_BASE}/v0/users/${encodeURIComponent(username)}/collections`);
    url.searchParams.set("subject_type", "2");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": ua,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`collections fetch failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const payload = (await res.json()) as {
      data?: BangumiCollectionItem[];
      total?: number;
    };
    const batch = payload.data ?? [];
    items.push(...batch);
    offset += batch.length;
    if (batch.length < limit) break;
    if (payload.total != null && offset >= payload.total) break;
  }

  return items;
}

export function collectionTypeLabel(type: number): string {
  return TYPE_MAP[type] ?? String(type);
}
