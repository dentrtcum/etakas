import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { organizationAddresses, organizationDocuments, organizations } from "@/lib/db/schema";
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
      taxNumberEncrypted: organizations.taxNumberEncrypted,
      licenseNumberEncrypted: organizations.licenseNumberEncrypted,
      authorizedPersonNameEncrypted: organizations.authorizedPersonNameEncrypted,
      authorizedPersonTitleEncrypted: organizations.authorizedPersonTitleEncrypted,
      ownerIdentityNumberEncrypted: organizations.ownerIdentityNumberEncrypted,
      professionalChamberEncrypted: organizations.professionalChamberEncrypted,
      contactEmailEncrypted: organizations.contactEmailEncrypted,
      province: organizations.province,
      district: organizations.district,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt
    })
    .from(organizations)
    .where(inArray(organizations.status, reviewQueueStatuses))
    .orderBy(desc(organizations.updatedAt), desc(organizations.createdAt))
    .limit(50);

  const organizationIds = rows.map((row) => row.id);
  const addresses =
    organizationIds.length > 0
      ? await db
          .select({
            organizationId: organizationAddresses.organizationId,
            addressEncrypted: organizationAddresses.addressEncrypted,
            phoneEncrypted: organizationAddresses.phoneEncrypted
          })
          .from(organizationAddresses)
          .where(inArray(organizationAddresses.organizationId, organizationIds))
      : [];
  const documents =
    organizationIds.length > 0
      ? await db
          .select({
            organizationId: organizationDocuments.organizationId,
            kind: organizationDocuments.kind,
            scanStatus: organizationDocuments.scanStatus,
            byteSize: organizationDocuments.byteSize
          })
          .from(organizationDocuments)
          .where(inArray(organizationDocuments.organizationId, organizationIds))
      : [];

  return rows.map((row) => {
    const address = addresses.find((item) => item.organizationId === row.id);
    const rowDocuments = documents.filter((item) => item.organizationId === row.id);

    return {
      ...row,
      legalName: decryptForAdmin(row.legalNameEncrypted) ?? row.publicAlias,
      taxNumber: row.taxNumberEncrypted ? decryptForAdmin(row.taxNumberEncrypted) : null,
      licenseNumber: row.licenseNumberEncrypted ? decryptForAdmin(row.licenseNumberEncrypted) : null,
      authorizedPersonName: row.authorizedPersonNameEncrypted
        ? decryptForAdmin(row.authorizedPersonNameEncrypted)
        : null,
      authorizedPersonTitle: row.authorizedPersonTitleEncrypted
        ? decryptForAdmin(row.authorizedPersonTitleEncrypted)
        : null,
      ownerIdentityNumber: row.ownerIdentityNumberEncrypted
        ? decryptForAdmin(row.ownerIdentityNumberEncrypted)
        : null,
      professionalChamber: row.professionalChamberEncrypted
        ? decryptForAdmin(row.professionalChamberEncrypted)
        : null,
      contactEmail: row.contactEmailEncrypted ? decryptForAdmin(row.contactEmailEncrypted) : null,
      address: address ? decryptForAdmin(address.addressEncrypted) : null,
      phone: address?.phoneEncrypted ? decryptForAdmin(address.phoneEncrypted) : null,
      documents: rowDocuments,
      status: row.status as OrganizationReviewStatus
    };
  });
}
