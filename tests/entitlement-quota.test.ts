import assert from "node:assert/strict";
import test from "node:test";
import { activeEntitlements, entitlementSummary, strictestLimit } from "../app/api/entitlement-quota.ts";

const base = { status: "active", startsAt: "2026-08-01T00:00:00.000Z", expiresAt: "2026-09-01T00:00:00.000Z" };

test("active entitlements honor both start and expiry", () => {
  const active = activeEntitlements([
    { ...base, requestLimit: 100, tokenLimit: 1_000 },
    { ...base, startsAt: "2026-08-22T00:00:00.000Z", requestLimit: 200, tokenLimit: 2_000 },
    { ...base, expiresAt: "2026-08-20T00:00:00.000Z", requestLimit: 300, tokenLimit: 3_000 },
  ], "2026-08-21T00:00:00.000Z");
  assert.equal(active.length, 1);
});

test("finite card quotas add together", () => {
  const summary = entitlementSummary([
    { ...base, requestLimit: 100, tokenLimit: 1_000 },
    { ...base, requestLimit: 200, tokenLimit: 2_000 },
  ]);
  assert.equal(summary.requestLimit, 300);
  assert.equal(summary.tokenLimit, 3_000);
});

test("one unlimited card makes the stacked card dimension unlimited", () => {
  const summary = entitlementSummary([
    { ...base, requestLimit: 100, tokenLimit: 1_000 },
    { ...base, requestLimit: null, tokenLimit: null },
  ]);
  assert.equal(summary.requestLimit, null);
  assert.equal(summary.tokenLimit, null);
});

test("administrator cap remains the strictest limit", () => {
  assert.equal(strictestLimit(80, 100), 80);
  assert.equal(strictestLimit(null, 100), 100);
  assert.equal(strictestLimit(80, null), 80);
});
