import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  auditLogs,
  organizationDocuments,
  organizationMembers,
  organizationAddresses,
  organizations,
  users,
  policyAcceptances,
  type organizationStatus,
  type organizationType
} from "@/lib/db/schema";
import { hashPasswordAsync } from "@/lib/auth/password";
import { encryptField } from "@/lib/encryption/field-crypto";
import { serverEnv } from "@/lib/env";
import {
  cleanupUploads,
  uploadPrivateFiles,
  type UploadableFile
} from "@/lib/storage/blob-storage";
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
    throw new PersistenceConfigurationError(
      "ENCRYPTION_KEY is required to persist organization data."
    );
  }

  return serverEnv.ENCRYPTION_KEY;
}

export function buildOrganizationInsert(
  application: OrganizationApplication,
  encryptionSecret: string
) {
  return {
    type: application.type as OrganizationType,
    status: "SUBMITTED" as OrganizationStatus,
    legalNameEncrypted: encryptField(createPublicAlias(application.type), encryptionSecret),
    publicAlias: createPublicAlias(application.type),
    taxNumberEncrypted: encryptField(application.taxNumber, encryptionSecret),
    authorizedPersonNameEncrypted: encryptField(application.authorizedPersonName, encryptionSecret),
    ownerIdentityNumberEncrypted: encryptField(application.ownerIdentityNumber, encryptionSecret),
    contactEmailEncrypted: encryptField(application.email.toLowerCase(), encryptionSecret),
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

export async function submitOrganizationApplication(
  application: OrganizationApplication,
  documents: { kind: string; file: UploadableFile }[] = [],
  ipHash?: string
) {
  if (!serverEnv.DATABASE_URL) {
    throw new PersistenceConfigurationError();
  }

  const encryptionSecret = getEncryptionSecret();
  const db = getDb();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, application.email.toLowerCase()))
    .limit(1);
  if (existingUser) throw new Error("EMAIL_ALREADY_REGISTERED");

  const passwordHash = await hashPasswordAsync(application.password);
  const uploadedDocuments = await uploadPrivateFiles(documents, "organization-applications");

  return db
    .transaction(async (tx) => {
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

      const [user] = await tx
        .insert(users)
        .values({
          email: application.email.toLowerCase(),
          name: application.authorizedPersonName,
          emailVerified: false,
          passwordHash,
          totpEnabled: false
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error("Organization application user could not be created.");
      }

      await tx.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: user.id,
        role: "ORGANIZATION_OWNER"
      });

      await tx.insert(policyAcceptances).values([
        {
          userId: user.id,
          organizationId: organization.id,
          documentKey: "terms",
          documentVersion: application.legalVersion,
          ipHash
        },
        {
          userId: user.id,
          organizationId: organization.id,
          documentKey: "privacy_notice_acknowledgement",
          documentVersion: application.legalVersion,
          ipHash
        }
      ]);

      if (uploadedDocuments.length > 0) {
        await tx.insert(organizationDocuments).values(
          uploadedDocuments.map((document) => ({
            organizationId: organization.id,
            kind: document.kind,
            storageKey: document.storageKey,
            originalNameHash: document.originalNameHash,
            mimeType: document.mimeType,
            byteSize: document.byteSize,
            scanStatus: "UPLOADED" as const
          }))
        );
      }

      await tx.insert(auditLogs).values({
        actorUserId: null,
        organizationId: organization.id,
        action: "ORGANIZATION_APPLICATION_SUBMITTED",
        targetType: "organization",
        targetId: organization.id,
        safeBefore: null,
        safeAfter: toSafeApplicationAuditSummary(application),
        correlationId: randomUUID(),
        reason: `Public organization application submitted with ${uploadedDocuments.length} document(s).`
      });

      return organization;
    })
    .catch(async (error: unknown) => {
      await cleanupUploads(uploadedDocuments);
      // A concurrent duplicate application is still a controlled error.
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }
      throw error;
    });
}
