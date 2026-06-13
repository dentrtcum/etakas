import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import {
  ledgerAccounts,
  organizationMembers,
  organizations,
  users
} from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";

const email = "1234a@gmail.com";
const password = "123456789";
const pharmacyName = "Nayki Eczanesi";

if (!serverEnv.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for db:create-test-pharmacy.");
}

if (!serverEnv.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is required for db:create-test-pharmacy.");
}

const db = getDb();
const encrypted = (value: string) => encryptField(value, serverEnv.ENCRYPTION_KEY as string);
const passwordHash = hashPassword(password);

const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({
      email,
      name: pharmacyName,
      emailVerified: true,
      passwordHash,
      totpEnabled: false
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: pharmacyName,
        emailVerified: true,
        passwordHash,
        updatedAt: new Date()
      }
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error("Test pharmacy user could not be created.");
  }

  const [existingOrganization] = await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.publicAlias, pharmacyName))
    .limit(1);

  const organization =
    existingOrganization ??
    (
      await tx
        .insert(organizations)
        .values({
          type: "PHARMACY",
          status: "APPROVED",
          legalNameEncrypted: encrypted(pharmacyName),
          publicAlias: pharmacyName,
          taxNumberEncrypted: encrypted("1111111111"),
          licenseNumberEncrypted: encrypted("NAYKI-TEST-001"),
          authorizedPersonNameEncrypted: encrypted("Nayki Test Yetkilisi"),
          authorizedPersonTitleEncrypted: encrypted("Eczaci"),
          ownerIdentityNumberEncrypted: encrypted("11111111111"),
          professionalChamberEncrypted: encrypted("Test Eczaci Odasi"),
          contactEmailEncrypted: encrypted(email),
          province: "Istanbul",
          district: "Kadikoy",
          creditLimitKurus: 100000000,
          approvedAt: new Date()
        })
        .returning({ id: organizations.id })
    )[0];

  if (!organization) {
    throw new Error("Test pharmacy organization could not be created.");
  }

  await tx
    .update(organizations)
    .set({
      status: "APPROVED",
      publicAlias: pharmacyName,
      approvedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(organizations.id, organization.id));

  await tx
    .insert(organizationMembers)
    .values({
      organizationId: organization.id,
      userId: user.id,
      role: "ORGANIZATION_OWNER"
    })
    .onConflictDoNothing();

  await tx.insert(ledgerAccounts).values({ organizationId: organization.id }).onConflictDoNothing();

  return { userId: user.id, organizationId: organization.id };
});

console.log(`Created test pharmacy: ${pharmacyName}`);
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);
console.log(`Organization ID: ${result.organizationId}`);
