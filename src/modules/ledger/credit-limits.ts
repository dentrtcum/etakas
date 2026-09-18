export function lowerLimitToOverdraftKurus(lowerLimitTl: number) {
  if (!Number.isFinite(lowerLimitTl) || lowerLimitTl > 0) {
    throw new Error("Lower credit limit must be zero or negative.");
  }
  return Math.abs(Math.round(lowerLimitTl * 100));
}

export function adjustOverdraftKurus(currentKurus: number, deltaTl: number) {
  if (!Number.isInteger(currentKurus) || currentKurus < 0 || !Number.isFinite(deltaTl)) {
    throw new Error("Invalid credit limit adjustment.");
  }
  return Math.max(0, Math.min(100_000_000, currentKurus + Math.round(deltaTl * 100)));
}

export function exceedsUpperCreditLimit(
  currentBalanceKurus: number,
  incomingKurus: number,
  upperLimitKurus: number | null
) {
  return upperLimitKurus !== null && currentBalanceKurus + incomingKurus > upperLimitKurus;
}
