export function lowerLimitToOverdraftKurus(lowerLimitTl: number) {
  if (!Number.isFinite(lowerLimitTl) || lowerLimitTl > 0) {
    throw new Error("Lower credit limit must be zero or negative.");
  }
  return Math.abs(Math.round(lowerLimitTl * 100));
}

export function exceedsUpperCreditLimit(
  currentBalanceKurus: number,
  incomingKurus: number,
  upperLimitKurus: number | null
) {
  return upperLimitKurus !== null && currentBalanceKurus + incomingKurus > upperLimitKurus;
}

export function isBalanceWithinCreditLimits(
  balanceKurus: number,
  lowerLimitCapacityKurus: number,
  upperLimitKurus: number | null
) {
  return (
    balanceKurus >= -lowerLimitCapacityKurus &&
    (upperLimitKurus === null || balanceKurus <= upperLimitKurus)
  );
}

export function calculateCreditCapacity({
  balanceKurus,
  heldKurus,
  pendingIncomingKurus = 0,
  lowerLimitCapacityKurus,
  upperLimitKurus
}: {
  balanceKurus: number;
  heldKurus: number;
  pendingIncomingKurus?: number;
  lowerLimitCapacityKurus: number;
  upperLimitKurus: number | null;
}) {
  return {
    buyingCapacityKurus: Math.max(0, balanceKurus - heldKurus + lowerLimitCapacityKurus),
    sellingCapacityKurus:
      upperLimitKurus === null ? null : Math.max(0, upperLimitKurus - balanceKurus - pendingIncomingKurus)
  };
}
