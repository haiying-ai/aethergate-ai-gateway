import { count, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { memberEntitlements, usageLedger } from "../../../db/schema";
import { authenticate } from "../../api/gateway";
import { entitlementSummary, strictestLimit } from "../../api/entitlement-quota";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: { message: "Invalid API key", type: "authentication_error" } }, { status: 401 });

  const db = getDb();
  const now = new Date().toISOString();
  let startsAt: string;
  let expiresAt: string | null = null;
  let requestLimit = auth.monthlyRequestLimit;
  let tokenLimit = auth.monthlyTokenLimit;
  let source = "calendar_month";
  let activeEntitlements = 0;

  if (auth.memberNote === "card-member") {
    const active = await db.select().from(memberEntitlements).where(sql`${memberEntitlements.memberId}=${auth.memberId} AND ${memberEntitlements.status}='active' AND unixepoch(${memberEntitlements.startsAt})<=unixepoch('now') AND unixepoch(${memberEntitlements.expiresAt})>unixepoch('now')`);
    if (active.length === 0) return Response.json({ error: { message: "Card quota has expired", type: "rate_limit_error", code: "ENTITLEMENT_EXPIRED" } }, { status: 429 });
    activeEntitlements = active.length;
    const summary = entitlementSummary(active);
    startsAt = summary.startsAt!;
    expiresAt = summary.expiresAt;
    requestLimit = strictestLimit(requestLimit, summary.requestLimit);
    tokenLimit = strictestLimit(tokenLimit, summary.tokenLimit);
    source = "card_entitlement";
  } else {
    const current = new Date();
    startsAt = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)).toISOString();
  }

  const [usage] = await db.select({ requests: count(), tokens: sql<number>`coalesce(sum(${usageLedger.inputTokens}+${usageLedger.outputTokens}),0)` }).from(usageLedger).where(sql`${usageLedger.memberId}=${auth.memberId} AND unixepoch(${usageLedger.createdAt})>=unixepoch(${startsAt})`);
  return Response.json({
    source,
    period: { startsAt, expiresAt },
    quota: { requests: requestLimit, tokens: tokenLimit },
    usage: { requests: usage?.requests || 0, tokens: usage?.tokens || 0 },
    remaining: {
      requests: requestLimit === null ? null : Math.max(0, requestLimit - (usage?.requests || 0)),
      tokens: tokenLimit === null ? null : Math.max(0, tokenLimit - (usage?.tokens || 0)),
    },
    activeEntitlements,
    measuredAt: now,
  });
}
