export type EntitlementQuota = {
  startsAt: string;
  expiresAt: string;
  status: string;
  requestLimit: number | null;
  tokenLimit: number | null;
};

export function activeEntitlements<T extends EntitlementQuota>(items: T[], now: string): T[] {
  return items.filter(item => item.status === "active" && item.startsAt <= now && item.expiresAt > now);
}

export function entitlementSummary(items: EntitlementQuota[]) {
  return {
    startsAt: items.map(item => item.startsAt).sort().at(0) || null,
    expiresAt: items.map(item => item.expiresAt).sort().at(-1) || null,
    requestLimit: items.length === 0 || items.some(item => item.requestLimit === null) ? null : items.reduce((sum, item) => sum + (item.requestLimit || 0), 0),
    tokenLimit: items.length === 0 || items.some(item => item.tokenLimit === null) ? null : items.reduce((sum, item) => sum + (item.tokenLimit || 0), 0),
  };
}

export function strictestLimit(first: number | null, second: number | null) {
  if (first === null) return second;
  if (second === null) return first;
  return Math.min(first, second);
}
