import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  organizationAddresses,
  organizations,
  type organizationStatus,
  type organizationType
} from "@/lib/db/schema";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import {
  createPublicAlias,
  toSafeApplicationAuditSummary,
  type OrganizationApplication
} from "@/modules/organizations/organization-application";

type OrganizationType = (typeof organizationType.enumValues)[number];
type OrganizationStatus = (typeof organizationStatus.enumValues)[number];

export class PersistenceConfigurationError extends Error {
  constructor(message = "Database persistence is not configured.") {
    super(message);
    this.name = "PersistenceConfigurationError";
  }
}

function getEncryptionSecret() {
  if (!serverEnv.ENCRYPTION_KEY) {
    throw new PersistenceConfigurationError("ENCRYPTION_KEY is required to persist organization data.");
  }

  return serverEnv.ENCRYPTION_KEY;
}

export function buildOrganizationInsert(application: OrganizationApplication, encryptionSecret: string) {
  return {
    type: application.type as OrganizationType,
    status: "SUBMITTED" as OrganizationStatus,
    legalNameEncrypted: encryptField(application.legalName, encryptionSecret),
    publicAlias: createPublicAlias(application.type),
    taxNumberEncrypted: encryptField(application.taxNumber, encryptionSecret),
    licenseNumberEncrypted: encryptField(application.licenseNumber, encryptionSecret),
    province: application.province,
    district: application.district
  };
}

export function buildOrganizationAddressInsert(
  organizationId: string,
  application: OrganizationApplication,
  encryptionSecret: string
) {
  return {
    organizationId,
    addressEncrypted: encryptField(application.address, encryptionSecret),
    phoneEncrypted: encryptField(application.phone, encryptionSecret)
  };
}

export async function submitOrganizationApplication(application: OrganizationApplication) {
  if (!serverEnv.DATABASE_URL) {
    throw new PersistenceConfigurationError();
  }

  const encryptionSecret = getEncryptionSecret();
  const db = getDb();

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values(buildOrganizationInsert(application, encryptionSecret))
      .returning({ id: organizations.id, status: organizations.status });

    if (!organization) {
      throw new Error("Organization application could not be created.");
    }

    await tx
      .insert(organizationAddresses)
      .values(buildOrganizationAddressInsert(organization.id, application, encryptionSecret));

    await tx.insert(auditLogs).values({
      actorUserId: null,
      organizationId: organization.id,
      action: "ORGANIZATION_APPLICATION_SUBMITTED",
      targetType: "organization",
      targetId: organization.id,
      safeBefore: null,
      safeAfter: toSafeApplicationAuditSummary(application),
      correlationId: randomUUID(),
      reason: "Public organization application submitted."
    });

    return organization;
  });
}
