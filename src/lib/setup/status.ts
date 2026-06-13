import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import { userRoles, users } from "@/lib/db/schema";

export type SetupStatus = {
  env: {
    databaseUrl: boolean;
    authSecret: boolean;
    appUrl: boolean;
    encryptionKey: boolean;
    tradingMode: string;
    legalApprovalConfirmed: boolean;
  };
  database: {
    connected: boolean;
    migrationsApplied: boolean;
    error: string | null;
  };
  data: {
    superAdminExists: boolean;
  };
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const status: SetupStatus = {
    env: {
      databaseUrl: Boolean(serverEnv.DATABASE_URL),
      authSecret: Boolean(serverEnv.AUTH_SECRET),
      appUrl: Boolean(serverEnv.APP_URL),
      encryptionKey: Boolean(serverEnv.ENCRYPTION_KEY),
      tradingMode: serverEnv.TRADING_MODE,
      legalApprovalConfirmed: serverEnv.LEGAL_APPROVAL_CONFIRMED
    },
    database: {
      connected: false,
      migrationsApplied: false,
      error: null
    },
    data: {
      superAdminExists: false
    }
  };

  if (!serverEnv.DATABASE_URL) {
    status.database.error = "DATABASE_URL is missing.";
    return status;
  }

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    status.database.connected = true;

    const tableCheck = await db.execute(sql`
      select
        to_regclass('public.users') is not null
        and to_regclass('public.organizations') is not null
        and to_regclass('public.listings') is not null
        and to_regclass('public.orders') is not null
        and to_regclass('public.ledger_entries') is not null
        as ok
    `);

    status.database.migrationsApplied = Boolean((tableCheck as unknown as { ok: boolean }[])[0]?.ok);

    if (status.database.migrationsApplied) {
      const [superAdmin] = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .where(eq(userRoles.role, "SUPER_ADMIN"))
        .limit(1);

      status.data.superAdminExists = Boolean(superAdmin);
    }
  } catch (error) {
    status.database.error = error instanceof Error ? error.message : "Unknown database error.";
  }

  return status;
}
