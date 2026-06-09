export type StockSnapshot = {
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  transferredQuantity: number;
};

export function assertStockSnapshot(snapshot: StockSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${key} must be a non-negative integer.`);
    }
  }

  const used =
    snapshot.availableQuantity + snapshot.reservedQuantity + snapshot.transferredQuantity;

  if (used > snapshot.totalQuantity) {
    throw new Error("Stock quantities exceed total quantity.");
  }
}

export function reserveStock(snapshot: StockSnapshot, quantity: number): StockSnapshot {
  assertStockSnapshot(snapshot);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Reservation quantity must be a positive integer.");
  }

  if (snapshot.availableQuantity < quantity) {
    throw new Error("Insufficient available stock.");
  }

  return {
    ...snapshot,
    availableQuantity: snapshot.availableQuantity - quantity,
    reservedQuantity: snapshot.reservedQuantity + quantity
  };
}

export function releaseReservedStock(snapshot: StockSnapshot, quantity: number): StockSnapshot {
  assertStockSnapshot(snapshot);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Release quantity must be a positive integer.");
  }

  if (snapshot.reservedQuantity < quantity) {
    throw new Error("Insufficient reserved stock.");
  }

  return {
    ...snapshot,
    availableQuantity: snapshot.availableQuantity + quantity,
    reservedQuantity: snapshot.reservedQuantity - quantity
  };
}
