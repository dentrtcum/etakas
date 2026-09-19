import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { AppSessionUser } from "@/lib/auth/roles";
import * as schema from "@/lib/db/schema";

// Never run financial fixtures against a remote or production database.
const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (url.hostname !== "127.0.0.1" || url.port !== "55439" || url.pathname !== "/acceptance_test") {
  throw new Error("Integration tests require the dedicated local acceptance_test database.");
}
const current = vi.hoisted(() => ({ actor: null as AppSessionUser | null }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAppUser: async () => current.actor }));
const { getDb } = await import("@/lib/db/client");
const { createOrderReservation, markSellerHandover, confirmBuyerDelivery, cancelOrderReservation } =
  await import("@/modules/orders/order-service");
const { POST } = await import("@/app/api/admin/credit-limits/route");
const { NextRequest } = await import("next/server");
const db = getDb();
let admin: AppSessionUser;

async function party(lower = 100_000, upper: number | null = 100_000) {
  const [user] = await db.insert(schema.users).values({ name: "Acceptance fixture", email: `${randomUUID()}@example.invalid`, emailVerified: true }).returning();
  const [org] = await db.insert(schema.organizations).values({ type: "PHARMACY", status: "APPROVED",
    legalNameEncrypted: "test-only", publicAlias: "Test Pharmacy", province: "Kars", district: "Merkez",
    creditLimitKurus: lower, creditUpperLimitKurus: upper }).returning();
  await db.insert(schema.organizationMembers).values({ userId: user.id, organizationId: org.id, role: "ORGANIZATION_OWNER" });
  const [account] = await db.insert(schema.ledgerAccounts).values({ organizationId: org.id }).returning();
  const actor: AppSessionUser = { id: user.id, email: user.email, roles: ["ORGANIZATION_OWNER"],
    organizationIds: [org.id], organizationRoles: { [org.id]: ["ORGANIZATION_OWNER"] }, totpEnabled: false };
  return { org, account, actor };
}
async function fixture(lower = 100_000, upper: number | null = 100_000) {
  const buyer = await party(lower);
  const seller = await party(100_000, upper);
  const [product] = await db.insert(schema.productCatalog).values({ name: "Fixture medicine", type: "HUMAN", gtin: randomUUID().replaceAll("-", "") }).returning();
  const [batch] = await db.insert(schema.productBatches).values({ organizationId: seller.org.id,
    productId: product.id, lotNumberEncrypted: "fixture", expiryDate: "2030-01-01", unitReferenceValueKurus: 1000,
    totalQuantity: 100, availableQuantity: 100 }).returning();
  const [listing] = await db.insert(schema.listings).values({ sellerOrganizationId: seller.org.id,
    batchId: batch.id, status: "ACTIVE", unitReferenceValueKurus: 1000, quantityAvailable: 100, minExpiryDate: "2030-01-01" }).returning();
  return { buyer, seller, listing, batch };
}
async function balance(accountId: string) {
  const [row] = await db.select({ value: sql<number>`coalesce(sum(case when direction='CREDIT' then amount_kurus else -amount_kurus end),0)::bigint` })
    .from(schema.ledgerEntries).where(eq(schema.ledgerEntries.accountId, accountId));
  return Number(row.value);
}
function credit(payload: Record<string, unknown>) {
  return POST(new NextRequest("http://localhost:3000/api/admin/credit-limits", { method: "POST",
    headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(payload) }), undefined);
}
beforeAll(async () => {
  const [user] = await db.insert(schema.users).values({ name: "Test admin", email: `${randomUUID()}@example.invalid` }).returning();
  admin = { id: user.id, email: user.email, roles: ["SUPER_ADMIN"], organizationIds: [], totpEnabled: false };
});
describe("real PostgreSQL accounting", () => {
  it("isolates private conversations and only marks explicitly displayed messages read", async () => {
    const { sendOrganizationMessage, listConversationMessages, listOwnSupportTickets } = await import("@/modules/communications/service");
    const { markMessageNotificationsRead, getNavigationBadgeCounts } = await import("@/modules/notifications/service");
    const a = await party(); const b = await party(); const outsider = await party();
    const first = await sendOrganizationMessage({ actor: a.actor, organizationId: a.org.id, recipientOrganizationId: b.org.id, body: "Private fixture first" });
    const second = await sendOrganizationMessage({ actor: a.actor, organizationId: a.org.id, conversationId: first.conversationId, body: "Private fixture second" });
    await expect(listConversationMessages(outsider.actor, outsider.org.id, first.conversationId)).rejects.toThrow("FORBIDDEN");
    await expect(listOwnSupportTickets(outsider.actor, b.org.id)).rejects.toThrow("FORBIDDEN");
    await markMessageNotificationsRead(outsider.actor.id, [first.id, second.id]);
    expect((await getNavigationBadgeCounts(b.actor.id)).messages).toBe(2);
    await markMessageNotificationsRead(b.actor.id, [first.id]);
    expect((await getNavigationBadgeCounts(b.actor.id)).messages).toBe(1);
    expect((await listConversationMessages(b.actor, b.org.id, first.conversationId)).map(m => m.body)).toEqual(["Private fixture first", "Private fixture second"]);
  });
  it("allows debt, settles once, preserves stock and opposite ledger entries", async () => {
    const f = await fixture();
    const input = { buyerOrganizationId: f.buyer.org.id, listingId: f.listing.id, quantity: 20, idempotencyKey: randomUUID() };
    const reserved = await Promise.all([createOrderReservation(f.buyer.actor, input), createOrderReservation(f.buyer.actor, input)]);
    expect(reserved[0].id).toBe(reserved[1].id);
    expect(await balance(f.buyer.account.id)).toBe(0);
    await markSellerHandover(f.seller.actor, reserved[0].id);
    await Promise.allSettled([confirmBuyerDelivery(f.buyer.actor, reserved[0].id), confirmBuyerDelivery(f.buyer.actor, reserved[0].id)]);
    expect(await balance(f.buyer.account.id)).toBe(-20_000);
    expect(await balance(f.seller.account.id)).toBe(20_000);
    const [batch] = await db.select().from(schema.productBatches).where(eq(schema.productBatches.id, f.batch.id));
    expect([batch.availableQuantity, batch.reservedQuantity, batch.transferredQuantity]).toEqual([80, 0, 20]);
  });
  it("serializes concurrent seller limit reservations", async () => {
    const f = await fixture(100_000, 30_000);
    const results = await Promise.allSettled([1, 2].map(() => createOrderReservation(f.buyer.actor,
      { buyerOrganizationId: f.buyer.org.id, listingId: f.listing.id, quantity: 20, idempotencyKey: randomUUID() })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason.message).toContain("upper credit limit");
  });
  it("enforces lower limits and releases cancellation holds only once", async () => {
    const f = await fixture(10_000);
    await expect(createOrderReservation(f.buyer.actor, { buyerOrganizationId: f.buyer.org.id,
      listingId: f.listing.id, quantity: 11, idempotencyKey: randomUUID() })).rejects.toThrow("Insufficient takas balance");
    const order = await createOrderReservation(f.buyer.actor, { buyerOrganizationId: f.buyer.org.id,
      listingId: f.listing.id, quantity: 10, idempotencyKey: randomUUID() });
    await Promise.allSettled([cancelOrderReservation(f.buyer.actor, order.id), cancelOrderReservation(f.buyer.actor, order.id)]);
    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, f.listing.id));
    expect([listing.quantityAvailable, listing.quantityReserved]).toEqual([100, 0]);
    expect(await balance(f.buyer.account.id)).toBe(0);
  });
  it("changes limits without money, deduplicates adjustment and rejects unauthorized admin writes", async () => {
    const p = await party();
    current.actor = admin;
    expect((await credit({ organizationId: p.org.id, lowerLimit: -2000, upperLimit: "", reason: "Acceptance limits test" })).status).toBe(200);
    expect(await balance(p.account.id)).toBe(0);
    const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, p.org.id));
    expect(org.creditUpperLimitKurus).toBeNull();
    const input = { organizationId: p.org.id, operation: "ADJUST_BALANCE", balanceDelta: 100,
      reason: "Acceptance adjustment test", idempotencyKey: randomUUID() };
    const results = await Promise.all([credit(input), credit(input)]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(await balance(p.account.id)).toBe(10_000);
    expect((await credit({ ...input, balanceDelta: 200 })).status).toBe(409);
    current.actor = p.actor;
    expect((await credit({ ...input, idempotencyKey: randomUUID() })).status).toBe(403);
    expect(await balance(p.account.id)).toBe(10_000);
  });
});
