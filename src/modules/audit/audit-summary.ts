import type { AppSessionUser } from "@/lib/auth/roles";

export type AuditEventDraft = {
  actor: AppSessionUser | null;
  organizationId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  safeBefore?: unknown;
  safeAfter?: unknown;
  reason?: string;
};

export function createAuditEventDraft(input: AuditEventDraft) {
  return {
    actorUserId: input.actor?.id ?? null,
    organizationId: input.organizationId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    safeBefore: input.safeBefore ?? null,
    safeAfter: input.safeAfter ?? null,
    reason: input.reason ?? null
  };
}
