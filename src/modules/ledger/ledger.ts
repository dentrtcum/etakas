export type LedgerDirection = "DEBIT" | "CREDIT";

export type LedgerEntryDraft = {
  accountId: string;
  direction: LedgerDirection;
  amountKurus: number;
};

export function assertKurusAmount(amountKurus: number) {
  if (!Number.isInteger(amountKurus) || amountKurus <= 0) {
    throw new Error("Ledger amounts must be positive integer kuruş values.");
  }
}

export function assertBalancedLedger(entries: readonly LedgerEntryDraft[]) {
  const totalDebit = entries
    .filter((entry) => entry.direction === "DEBIT")
    .reduce((sum, entry) => {
      assertKurusAmount(entry.amountKurus);
      return sum + entry.amountKurus;
    }, 0);

  const totalCredit = entries
    .filter((entry) => entry.direction === "CREDIT")
    .reduce((sum, entry) => {
      assertKurusAmount(entry.amountKurus);
      return sum + entry.amountKurus;
    }, 0);

  if (totalDebit !== totalCredit) {
    throw new Error("Ledger transaction is not balanced.");
  }
}

export function calculateAccountBalance(accountId: string, entries: readonly LedgerEntryDraft[]) {
  return entries
    .filter((entry) => entry.accountId === accountId)
    .reduce((sum, entry) => {
      assertKurusAmount(entry.amountKurus);
      return entry.direction === "CREDIT" ? sum + entry.amountKurus : sum - entry.amountKurus;
    }, 0);
}
