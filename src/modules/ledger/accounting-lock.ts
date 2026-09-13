import { sql } from "drizzle-orm";
import type { getDb } from "@/lib/db/client";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
// This platform starts with low transaction volume. Serialize inventory/ledger mutations
// across serverless instances; any future finer-grained locks must preserve this ordering.
export async function lockAccounting(tx: Transaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(28492, 1)`);
}
