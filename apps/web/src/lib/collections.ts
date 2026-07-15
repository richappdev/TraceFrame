/**
 * Bangumi collection sync helpers (E1).
 * Collection types: 1 wish / 2 collect / 3 do / 4 on_hold / 5 dropped
 */
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
