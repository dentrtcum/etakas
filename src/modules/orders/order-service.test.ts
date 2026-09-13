import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { AppSessionUser } from "@/lib/auth/roles";

const state = vi.hoisted(() => ({ rows: [] as unknown[][], mutations: [] as string[], locks: 0 }));
vi.mock("@/modules/compliance/live-trading", () => ({ assertLiveTradingEnabled: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb: () => db }));

function select() {
  const chain = {
    from: () => chain,
    where: () => chain,
    for: () => chain,
    innerJoin: () => chain,
    limit: async () => {
      if (!state.rows.length) throw new Error("Unexpected read in regression test.");
      return state.rows.shift();
    }
  };
  return chain;
}
const tx = {
  execute: async () => {
    state.locks += 1;
  },
  select,
  update: (table: Parameters<typeof getTableName>[0]) => {
    state.mutations.push(`update:${getTableName(table)}`);
    return {
      set: () => ({
        where: () => ({ returning: async () => [{ id: orderId, status: "CANCELLED" }] })
      })
    };
  },
  insert: (table: Parameters<typeof getTableName>[0]) => {
    state.mutations.push(`insert:${getTableName(table)}`);
    return { values: async () => undefined };
  }
};
const db = {
  select,
  transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)
};

import {
  adminResolveOrder,
  cancelOrderReservation,
  confirmBuyerDelivery,
  openOrderDispute
} from "./order-service";

const orderId = "00000000-0000-4000-8000-000000000001";
const buyerId = "00000000-0000-4000-8000-000000000002";
const sellerId = "00000000-0000-4000-8000-000000000003";
const listingId = "00000000-0000-4000-8000-000000000004";
const actor: AppSessionUser = {
  id: "00000000-0000-4000-8000-000000000005",
  email: "buyer@example.test",
  roles: ["ORGANIZATION_OWNER"],
  organizationIds: [buyerId],
  organizationRoles: { [buyerId]: ["ORGANIZATION_OWNER"] },
  totpEnabled: false
};
const order = {
  id: orderId,
  buyerOrganizationId: buyerId,
  sellerOrganizationId: sellerId,
  listingId,
  quantity: 2,
  totalReferenceValueKurus: 200,
  status: "RESERVED"
};
const reservation = { id: "reservation", batchId: "batch", listingId, quantity: 2 };
const hold = { id: "hold", amountKurus: 200, organizationId: buyerId };

beforeEach(() => {
  state.rows = [];
  state.mutations = [];
  state.locks = 0;
});

describe("order accounting regression guards", () => {
  it("does not manufacture listing stock when cancellation has no active reservation", async () => {
    state.rows = [[order], []];
    await expect(cancelOrderReservation(actor, orderId)).rejects.toThrow(
      "Inventory reservation is missing or inconsistent."
    );
    expect(state.mutations).toEqual([]);
    expect(state.locks).toBe(1);
  });

  it("rejects duplicate reservations before releasing balance or inventory", async () => {
    state.rows = [[order], [reservation, { ...reservation, id: "second" }]];
    await expect(cancelOrderReservation(actor, orderId)).rejects.toThrow(
      "Inventory reservation is missing or inconsistent."
    );
    expect(state.mutations).toEqual([]);
  });

  it("rejects a balance hold belonging to another organization", async () => {
    state.rows = [[order], [reservation], [{ ...hold, organizationId: sellerId }]];
    await expect(cancelOrderReservation(actor, orderId)).rejects.toThrow(
      "Balance hold is missing or inconsistent."
    );
    expect(state.mutations).toEqual([]);
  });

  it("cannot debit the buyer when the matching balance hold is absent", async () => {
    const pending = { ...order, status: "BUYER_CONFIRMATION_PENDING" };
    state.rows = [
      [pending],
      [pending],
      [{ status: "APPROVED" }],
      [{ status: "APPROVED" }],
      [reservation],
      []
    ];
    await expect(confirmBuyerDelivery(actor, orderId)).rejects.toThrow(
      "Balance hold is missing or inconsistent."
    );
    expect(state.mutations).toEqual([]);
  });

  it("rechecks suspension inside the accounting transaction before delivery completion", async () => {
    const pending = { ...order, status: "BUYER_CONFIRMATION_PENDING" };
    state.rows = [[pending], [pending], [{ status: "SUSPENDED" }]];
    await expect(confirmBuyerDelivery(actor, orderId)).rejects.toThrow(
      "Both order parties must remain approved."
    );
    expect(state.mutations).toEqual([]);
  });

  it("does not refund money without the original consumed inventory reservation", async () => {
    state.rows = [
      [{ ...order, status: "COMPLETED" }],
      [{ id: "buyer-account" }],
      [{ id: "seller-account" }],
      []
    ];
    await expect(
      adminResolveOrder({
        actor: { ...actor, roles: ["SUPER_ADMIN"] },
        orderId,
        decision: "REFUND_COMPLETED",
        reason: "Verified return received."
      })
    ).rejects.toThrow("Consumed inventory reservation is missing or inconsistent.");
    expect(state.mutations).not.toContain("insert:ledger_entries");
    expect(state.mutations).not.toContain("insert:ledger_transactions");
    expect(state.mutations).not.toContain("update:product_batches");
  });

  it("bounds dispute reasons before any database access", async () => {
    await expect(openOrderDispute(actor, orderId, "x".repeat(2001))).rejects.toThrow("10 to 2000");
    expect(state.locks).toBe(0);
  });
});
