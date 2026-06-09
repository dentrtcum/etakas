import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { parseListingSubmission, parseListingSubmissionFormData } from "@/modules/listings/listing-input";
import { ListingSubmissionError, submitListingForReview } from "@/modules/listings/listing-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const actor = await getCurrentAppUser();

  if (!actor) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const input = contentType.includes("multipart/form-data")
      ? parseListingSubmissionFormData(await request.formData())
      : parseListingSubmission(await request.json());
    const result = await submitListingForReview(actor, input);

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
