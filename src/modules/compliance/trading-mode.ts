export type TradingMode = "demo" | "pilot" | "production";

export function assertTradingModeAllowed({
  mode,
  legalApprovalConfirmed
}: {
  mode: TradingMode;
  legalApprovalConfirmed: boolean;
}) {
  if (mode === "production" && !legalApprovalConfirmed) {
    throw new Error("Production trading requires confirmed legal approval.");
  }
}
