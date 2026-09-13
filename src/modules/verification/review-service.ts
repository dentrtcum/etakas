import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLogs, ledgerAccounts, organizationReviews, organizations } from "@/lib/db/schema";
import { type AppSessionUser } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/authorization";
import { SecurityError } from "@/lib/security/request-guards";
import { lockAccounting } from "@/modules/ledger/accounting-lock";
import { z } from "zod";
import {
  assertReviewReason,
  nextOrganizationStatus,
  type OrganizationReviewDecision,
  type OrganizationReviewStatus
} from "@/modules/verification/organization-review";

export async function reviewOrganizationApplication({
  actor,
  organizationId,
  decision,
  reason
}: {
  actor: AppSessionUser;
  organizationId: string;
  decision: OrganizationReviewDecision;
  reason: string;
}) {
  if (!requireAdmin(actor).allowed) throw new SecurityError("FORBIDDEN", 403);
  organizationId = z.string().uuid().parse(organizationId);
  reason = z.string().trim().max(2000).parse(reason);
  assertReviewReason(reason);

  const db = getDb();

  return db.transaction(async (tx) => {
    await lockAccounting(tx);
    const [organization] = await tx
      .select({ id: organizations.id, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .for("update")
      .limit(1);

    if (!organization) {
      throw new Error("Organization not found.");
    }

    const nextStatus = nextOrganizationStatus(
      organization.status as OrganizationReviewStatus,
      decision
    );

    const [updated] = await tx
      .update(organizations)
      .set({
        status: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
        suspendedAt: nextStatus === "SUSPENDED" ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId))
      .returning({ id: organizations.id, status: organizations.status });

    if (!updated) {
      throw new Error("Organization review could not be saved.");
    }

    await tx.insert(organizationReviews).values({
      organizationId,
      reviewerUserId: actor.id,
      decision: nextStatus,
      reason
    });

    if (nextStatus === "APPROVED") {
      await tx.insert(ledgerAccounts).values({ organizationId }).onConflictDoNothing();
    }

    await tx.insert(auditLogs).values({
      actorUserId: actor.id,
      organizationId,
      action: `ORGANIZATION_REVIEW_${decision}`,
      targetType: "organization",
      targetId: organizationId,
      safeBefore: { status: organization.status },
      safeAfter: { status: nextStatus },
      correlationId: randomUUID(),
      reason
    });

    return updated;
  });
}
