import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { isProvidedFile } from "@/lib/storage/blob-storage";
import { parseListingSubmission, parseListingSubmissionFormData } from "@/modules/listings/listing-input";
import { ListingSubmissionError, submitListingForReview } from "@/modules/listings/listing-service";

export const runtime = "nodejs";

function collectEvidence(formData: FormData) {
  return [
    ["medicineImage", "image"],
    ["packageImage", "package"],
    ["invoiceDocument", "invoice"],
    ["otherDocument", "other"]
  ].flatMap(([formKey, kind]) => {
    const file = formData.get(formKey);
    return isProvidedFile(file) ? [{ kind: kind as "image" | "invoice" | "package" | "other", file }] : [];
  });
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const formData = contentType.includes("multipart/form-data") ? await request.formData() : null;
    const input = formData ? parseListingSubmissionFormData(formData) : parseListingSubmission(await request.json());
    const result = await submitListingForReview(actor, input, formData ? collectEvidence(formData) : []);

    if (formData && request.headers.get("accept")?.includes("text/html")) {
      return NextResponse.redirect(new URL(`/ilan-olustur?submitted=${result.id}`, request.url), { status: 303 });
    }

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_LISTING_SUBMISSION" }, { status: 400 });
    }

    if (error instanceof ListingSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    throw error;
  }
}
