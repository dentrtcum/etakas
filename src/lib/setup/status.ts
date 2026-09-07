import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import { userRoles, users } from "@/lib/db/schema";
import { list } from "@vercel/blob";

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
    provider: string;
    connected: boolean;
    migrationsApplied: boolean;
    error: string | null;
  };
  data: {
    superAdminExists: boolean;
  };
  storage: { configured: boolean; connected: boolean; provider: string };
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
      provider:
        serverEnv.DATABASE_URL && new URL(serverEnv.DATABASE_URL).hostname.endsWith(".neon.tech")
          ? "Neon"
          : "PostgreSQL",
      connected: false,
      migrationsApplied: false,
      error: null
    },
    data: {
      superAdminExists: false
    },
    storage: {
      configured: Boolean(serverEnv.BLOB_READ_WRITE_TOKEN),
      connected: false,
      provider: "Vercel Blob"
    }
  };

  if (serverEnv.BLOB_READ_WRITE_TOKEN) {
    try {
      await list({ token: serverEnv.BLOB_READ_WRITE_TOKEN, limit: 1 });
      status.storage.connected = true;
    } catch {
      status.storage.connected = false;
    }
  }

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

    status.database.migrationsApplied = Boolean(
      (tableCheck as unknown as { ok: boolean }[])[0]?.ok
    );

    if (status.database.migrationsApplied) {
      const [superAdmin] = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .where(eq(userRoles.role, "SUPER_ADMIN"))
        .limit(1);

      status.data.superAdminExists = Boolean(superAdmin);
    }
  } catch {
    status.database.error = "Veritabanı bağlantısı veya şema kontrolü tamamlanamadı.";
  }

  return status;
}
