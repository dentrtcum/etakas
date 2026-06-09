import { describe, expect, it } from "vitest";
import { evaluateTradingPolicy, type PolicyInput } from "@/modules/compliance/trading-policy";

const basePolicyInput: PolicyInput = {
  sellerType: "PHARMACY",
  buyerType: "PHARMACY",
  productType: "HUMAN",
  sellerApproved: true,
  buyerApproved: true,
  isExpired: false,
  isRecalled: false,
  isOpenedPackage: false,
  hasVerifiedSerial: true,
  hasAcquisitionDocument: true,
  isNarcotic: false,
  isPsychotropic: false,
  isControlledPrescription: false,
  requiresColdChain: false,
  isBiological: false,
  minimumRemainingDays: 180,
  remainingShelfLifeDays: 240
};

describe("trading policy", () => {
  it("allows a low-risk pharmacy to pharmacy human medicine scenario", () => {
    expect(evaluateTradingPolicy(basePolicyInput)).toEqual({ allowed: true, reasons: [] });
  });

  it("hides human medicines from veterinary buyers on the server side", () => {
    const decision = evaluateTradingPolicy({
      ...basePolicyInput,
      buyerType: "VETERINARY_CLINIC"
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("HUMAN_MEDICINE_HIDDEN_FROM_VETERINARY_BUYER");
  });

  it("blocks high-risk categories by default", () => {
    const decision = evaluateTradingPolicy({
      ...basePolicyInput,
      requiresColdChain: true,
      isControlledPrescription: true
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining(["COLD_CHAIN_BLOCKED_BY_DEFAULT", "CONTROLLED_PRESCRIPTION_BLOCKED"])
    );
  });
});
