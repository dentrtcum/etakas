import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

let client: postgres.Sql | undefined;

export function getDb() {
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  client ??= postgres(serverEnv.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return drizzle(client, { schema });
}
