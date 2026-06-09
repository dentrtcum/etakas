export type OrganizationReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_DOCUMENT_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "CLOSED";

export type OrganizationReviewDecision =
  | "START_REVIEW"
  | "REQUEST_ADDITIONAL_DOCUMENT"
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "REOPEN_REVIEW"
  | "CLOSE";

const transitions: Record<OrganizationReviewStatus, OrganizationReviewDecision[]> = {
  DRAFT: [],
  SUBMITTED: ["START_REVIEW", "REJECT"],
  UNDER_REVIEW: ["REQUEST_ADDITIONAL_DOCUMENT", "APPROVE", "REJECT", "SUSPEND"],
  ADDITIONAL_DOCUMENT_REQUIRED: ["REOPEN_REVIEW", "REJECT"],
  APPROVED: ["SUSPEND", "REOPEN_REVIEW"],
  REJECTED: ["REOPEN_REVIEW"],
  SUSPENDED: ["REOPEN_REVIEW", "REJECT", "CLOSE"],
  CLOSED: []
};

export function nextOrganizationStatus(
  currentStatus: OrganizationReviewStatus,
  decision: OrganizationReviewDecision
): OrganizationReviewStatus {
  if (!transitions[currentStatus]?.includes(decision)) {
    throw new Error(`Invalid organization review transition: ${currentStatus} -> ${decision}`);
  }

  switch (decision) {
    case "START_REVIEW":
    case "REOPEN_REVIEW":
      return "UNDER_REVIEW";
    case "REQUEST_ADDITIONAL_DOCUMENT":
      return "ADDITIONAL_DOCUMENT_REQUIRED";
    case "APPROVE":
      return "APPROVED";
    case "REJECT":
      return "REJECTED";
    case "SUSPEND":
      return "SUSPENDED";
    case "CLOSE":
      return "CLOSED";
  }
}

export function assertReviewReason(reason: string) {
  if (reason.trim().length < 10) {
    throw new Error("Admin review reason must be at least 10 characters.");
  }
}
