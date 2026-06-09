import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { decryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import type { OrganizationReviewStatus } from "@/modules/verification/organization-review";

const reviewQueueStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ADDITIONAL_DOCUMENT_REQUIRED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED"
] as const satisfies OrganizationReviewStatus[];

function decryptForAdmin(encryptedValue: string) {
  if (!serverEnv.ENCRYPTION_KEY) {
    return null;
  }

  try {
    return decryptField(encryptedValue, serverEnv.ENCRYPTION_KEY);
  } catch {
    return null;
  }
}

export async function listOrganizationReviewQueue() {
  const db = getDb();
  const rows = await db
    .select({
      id: organizations.id,
      type: organizations.type,
      status: organizations.status,
      publicAlias: organizations.publicAlias,
      legalNameEncrypted: organizations.legalNameEncrypted,
      province: organizations.province,
      district: organizations.district,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt
    })
    .from(organizations)
    .where(inArray(organizations.status, reviewQueueStatuses))
    .orderBy(desc(organizations.updatedAt), desc(organizations.createdAt))
    .limit(50);

  return rows.map((row) => ({
    ...row,
    legalName: decryptForAdmin(row.legalNameEncrypted) ?? row.publicAlias,
    status: row.status as OrganizationReviewStatus
  }));
}
