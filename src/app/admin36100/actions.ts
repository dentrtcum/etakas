"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { parseOrganizationReviewFormData } from "@/modules/verification/review-input";
import { reviewOrganizationApplication } from "@/modules/verification/review-service";

export async function reviewOrganizationAction(formData: FormData) {
  const actor = await getCurrentAppUser();
  const authorization = requireAdmin(actor);

  if (!authorization.allowed || !actor) {
    redirect("/giris");
  }

  try {
    const input = parseOrganizationReviewFormData(formData);
    await reviewOrganizationApplication({
      actor,
      organizationId: input.organizationId,
      decision: input.decision,
      reason: input.reason
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("INVALID_ORGANIZATION_REVIEW");
    }

    throw error;
  }

  revalidatePath("/admin36100");
}
