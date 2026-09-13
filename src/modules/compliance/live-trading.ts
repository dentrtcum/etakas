import { serverEnv } from "@/lib/env";
import { SecurityError } from "@/lib/security/request-guards";

export function isLiveTradingEnabled() {
  return (
    serverEnv.LIVE_TRADING_ENABLED &&
    serverEnv.TRADING_MODE === "production" &&
    serverEnv.LEGAL_APPROVAL_CONFIRMED &&
    serverEnv.LEGAL_CONTENT_APPROVED
  );
}

export function assertLiveTradingEnabled() {
  if (!isLiveTradingEnabled()) throw new SecurityError("TRADING_NOT_ENABLED", 403);
}
