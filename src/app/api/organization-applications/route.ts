import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { isProvidedFile } from "@/lib/storage/blob-storage";
import {
  toSafeApplicationAuditSummary,
  validateOrganizationApplication
} from "@/modules/organizations/organization-application";
import {
  PersistenceConfigurationError,
  submitOrganizationApplication
} from "@/modules/organizations/application-service";

export const runtime = "nodejs";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function collectDocuments(formData: FormData) {
  return [
    ["licenseDocument", "license_document"],
    ["taxPlateDocument", "tax_plate"],
    ["ownerIdentityDocument", "owner_identity"],
    ["diplomaDocument", "diploma"],
    ["chamberRegistrationDocument", "chamber_registration"],
    ["signatureCircularDocument", "signature_circular"]
  ].flatMap(([formKey, kind]) => {
    const file = formData.get(formKey);
    return isProvidedFile(file) ? [{ kind, file }] : [];
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const application = validateOrganizationApplication({
      type: getString(formData, "type"),
      taxNumber: getString(formData, "taxNumber"),
      authorizedPersonName: getString(formData, "authorizedPersonName"),
      ownerIdentityNumber: getString(formData, "ownerIdentityNumber"),
      email: getString(formData, "email"),
      password: getString(formData, "password"),
      phone: getString(formData, "phone"),
      province: getString(formData, "province"),
      district: getString(formData, "district"),
      address: getString(formData, "address"),
      kvkkAccepted: formData.get("kvkkAccepted") === "on",
      termsAccepted: formData.get("termsAccepted") === "on"
    });

    const result = await submitOrganizationApplication(application, collectDocuments(formData));

    if (request.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(
        new URL(`/isletme-kaydi/basarili?id=${result.id}`, request.url),
        {
          status: 303
        }
      );
    }

    return NextResponse.json(
      {
        id: result.id,
        status: result.status,
        auditSummary: toSafeApplicationAuditSummary(application)
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return NextResponse.json({ error: "EMAIL_ALREADY_REGISTERED" }, { status: 409 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_ORGANIZATION_APPLICATION" }, { status: 400 });
    }

    if (error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: "PERSISTENCE_NOT_CONFIGURED" }, { status: 503 });
    }

    throw error;
  }
}
