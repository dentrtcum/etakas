import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  toSafeApplicationAuditSummary,
  validateOrganizationApplication
} from "@/modules/organizations/organization-application";

export const runtime = "nodejs";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  try {
    const application = validateOrganizationApplication({
      type: getString(formData, "type"),
      legalName: getString(formData, "legalName"),
      taxNumber: getString(formData, "taxNumber"),
      authorizedPersonName: getString(formData, "authorizedPersonName"),
      authorizedPersonTitle: "Yetkili",
      email: getString(formData, "email"),
      phone: getString(formData, "phone"),
      province: getString(formData, "province"),
      district: getString(formData, "district"),
      address: getString(formData, "address"),
      licenseNumber: getString(formData, "licenseNumber"),
      professionalChamber: "Başvuru sırasında beyan edildi",
      invoiceTitle: getString(formData, "legalName"),
      kvkkAccepted: formData.get("kvkkAccepted") === "on",
      termsAccepted: formData.get("termsAccepted") === "on"
    });

    return NextResponse.json(
      {
        status: "SUBMITTED",
        auditSummary: toSafeApplicationAuditSummary(application)
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_ORGANIZATION_APPLICATION" }, { status: 400 });
    }

    throw error;
  }
}
