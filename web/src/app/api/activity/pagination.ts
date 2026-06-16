interface ActivityPageItem {
  activityId: string;
  createdAtMs: number;
}

export interface ActivityPage<T extends ActivityPageItem> {
  items: T[];
  nextCursor?: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(searchParams: URLSearchParams): number {
  const raw = searchParams.get("limit");
  if (raw === null) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function encodeCursor(item: ActivityPageItem): string {
  return `${item.createdAtMs}:${item.activityId}`;
}

function isAfterCursor(item: ActivityPageItem, cursor: string | null): boolean {
  if (cursor === null || cursor.trim().length === 0) {
    return true;
  }
  const separator = cursor.indexOf(":");
  if (separator <= 0) {
    return true;
  }
  const createdAtMs = Number(cursor.slice(0, separator));
  const activityId = cursor.slice(separator + 1);
  if (!Number.isFinite(createdAtMs) || activityId.length === 0) {
    return true;
  }

  return (
    item.createdAtMs < createdAtMs ||
    (item.createdAtMs === createdAtMs && item.activityId < activityId)
  );
}

export function paginateActivity<T extends ActivityPageItem>(
  items: readonly T[],
  requestUrl: string,
): ActivityPage<T> {
  const url = new URL(requestUrl);
  const limit = parseLimit(url.searchParams);
  const cursor = url.searchParams.get("cursor");
  const sorted = [...items].sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) {
      return b.createdAtMs - a.createdAtMs;
    }
    return b.activityId.localeCompare(a.activityId);
  });
  const filtered = sorted.filter((item) => isAfterCursor(item, cursor));
  const pageItems = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  return {
    items: pageItems,
    ...(hasMore && pageItems.length > 0
      ? { nextCursor: encodeCursor(pageItems[pageItems.length - 1]!) }
      : {}),
  };
}
