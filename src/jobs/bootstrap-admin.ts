import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { hashPasswordAsync } from "@/lib/auth/password";
import { serverEnv } from "@/lib/env";
import { userRoles, users } from "@/lib/db/schema";

if (!serverEnv.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for db:bootstrap-admin.");
}

if (!serverEnv.INITIAL_ADMIN_EMAIL) {
  throw new Error("INITIAL_ADMIN_EMAIL is required.");
}

const db = getDb();
const email = serverEnv.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
const result = await db.transaction(async (tx) => {
  // Serialize bootstrap attempts. This job never changes an existing password.
  await tx.execute(sql`select pg_advisory_xact_lock(28492, 2)`);
  const admins = await tx
    .select({ id: users.id, email: users.email })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(eq(userRoles.role, "SUPER_ADMIN"));
  if (admins.length) {
    if (admins.length === 1 && admins[0].email.toLowerCase() === email) return "already-present";
    throw new Error(
      "A super administrator already exists. Bootstrap cannot add another administrator."
    );
  }
  const [existing] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .for("update");
  let userId = existing?.id;
  if (!userId) {
    if (!serverEnv.INITIAL_ADMIN_PASSWORD)
      throw new Error("INITIAL_ADMIN_PASSWORD is required for a new administrator.");
    const passwordHash = await hashPasswordAsync(serverEnv.INITIAL_ADMIN_PASSWORD);
    const [created] = await tx
      .insert(users)
      .values({
        email,
        name: "Super Admin",
        emailVerified: false,
        passwordHash,
        totpEnabled: false
      })
      .returning({ id: users.id });
    userId = created?.id;
  }
  if (!userId) throw new Error("Initial admin could not be created.");
  await tx.insert(userRoles).values({ userId, role: "SUPER_ADMIN" });
  return "created";
});
console.log(`Super administrator bootstrap: ${result}. Email verification is required at login.`);
