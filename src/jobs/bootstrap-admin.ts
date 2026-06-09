import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { serverEnv } from "@/lib/env";
import { userRoles, users } from "@/lib/db/schema";

if (!serverEnv.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for db:bootstrap-admin.");
}

if (!serverEnv.INITIAL_ADMIN_EMAIL || !serverEnv.INITIAL_ADMIN_PASSWORD) {
  throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required.");
}

const db = getDb();
const email = serverEnv.INITIAL_ADMIN_EMAIL.toLowerCase();
const passwordHash = hashPassword(serverEnv.INITIAL_ADMIN_PASSWORD);

const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

const userId =
  existing?.id ??
  (
    await db
      .insert(users)
      .values({
        email,
        name: "Initial Super Admin",
        emailVerified: true,
        passwordHash,
        totpEnabled: true
      })
      .returning({ id: users.id })
  )[0]?.id;

if (!userId) {
  throw new Error("Initial admin could not be created.");
}

if (existing) {
  await db.update(users).set({ passwordHash, totpEnabled: true }).where(eq(users.id, userId));
}

await db.insert(userRoles).values({ userId, role: "SUPER_ADMIN" }).onConflictDoNothing();

console.log(`Bootstrapped SUPER_ADMIN user: ${email}`);
