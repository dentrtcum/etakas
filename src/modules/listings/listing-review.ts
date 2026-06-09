export type ListingReviewStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "ACTIVE"
  | "PAUSED"
  | "PARTIALLY_RESERVED"
  | "SOLD_OUT"
  | "EXPIRED"
  | "REJECTED"
  | "REMOVED";

export type ListingReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "REMOVE";

const transitions: Record<ListingReviewStatus, ListingReviewDecision[]> = {
  DRAFT: [],
  PENDING_REVIEW: ["APPROVE", "REQUEST_CHANGES", "REJECT"],
  CHANGES_REQUESTED: ["APPROVE", "REJECT"],
  APPROVED: ["REMOVE"],
  ACTIVE: ["REMOVE"],
  PAUSED: ["REMOVE"],
  PARTIALLY_RESERVED: ["REMOVE"],
  SOLD_OUT: [],
  EXPIRED: [],
  REJECTED: [],
  REMOVED: []
};

export function getAllowedListingReviewDecisions(status: ListingReviewStatus) {
  return transitions[status];
}

export function nextListingStatus(status: ListingReviewStatus, decision: ListingReviewDecision) {
  if (!transitions[status]?.includes(decision)) {
    throw new Error(`Invalid listing review transition: ${status} -> ${decision}`);
  }

  switch (decision) {
    case "APPROVE":
      return "ACTIVE";
    case "REQUEST_CHANGES":
      return "CHANGES_REQUESTED";
    case "REJECT":
      return "REJECTED";
    case "REMOVE":
      return "REMOVED";
  }
}

export function assertListingReviewReason(reason: string) {
  if (reason.trim().length < 10) {
    throw new Error("Listing review reason must be at least 10 characters.");
  }
}
