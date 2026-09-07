export type AdminOrderDecision = "FREEZE" | "CANCEL" | "FORCE_COMPLETE" | "REFUND_COMPLETED";
const reservableStates = [
  "RESERVED",
  "CONTACT_DETAILS_REVEALED",
  "SELLER_PREPARING",
  "READY_FOR_PICKUP",
  "HANDOVER_DECLARED",
  "BUYER_CONFIRMATION_PENDING",
  "DISPUTED",
  "ADMIN_FROZEN"
];
export function getAllowedAdminOrderDecisions(status: string): AdminOrderDecision[] {
  if (status === "COMPLETED") return ["REFUND_COMPLETED"];
  if (!reservableStates.includes(status)) return [];
  const decisions: AdminOrderDecision[] = ["CANCEL"];
  if (status !== "ADMIN_FROZEN") decisions.unshift("FREEZE");
  if (
    ["BUYER_CONFIRMATION_PENDING", "HANDOVER_DECLARED", "DISPUTED", "ADMIN_FROZEN"].includes(status)
  )
    decisions.push("FORCE_COMPLETE");
  return decisions;
}
export function assertAdminOrderDecision(status: string, decision: AdminOrderDecision) {
  if (!getAllowedAdminOrderDecisions(status).includes(decision))
    throw new Error("Order action is not allowed from current status.");
}
