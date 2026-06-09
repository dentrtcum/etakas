"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { parseListingReviewFormData } from "@/modules/listings/listing-review-input";
import { reviewListing } from "@/modules/listings/listing-review-service";

export async function reviewListingAction(formData: FormData) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed || !actor) {
    redirect("/giris");
  }

  try {
    const input = parseListingReviewFormData(formData);
    await reviewListing({
      actor,
      listingId: input.listingId,
      decision: input.decision,
      reason: input.reason
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("INVALID_LISTING_REVIEW");
    }

    throw error;
  }

  revalidatePath("/admin36100");
}
