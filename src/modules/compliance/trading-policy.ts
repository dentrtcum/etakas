export type OrganizationKind = "PHARMACY" | "VETERINARY_CLINIC" | "VETERINARY_POLYCLINIC" | "ANIMAL_HOSPITAL";
export type ProductKind = "HUMAN" | "VETERINARY";

export type PolicyInput = {
  sellerType: OrganizationKind;
  buyerType: OrganizationKind;
  productType: ProductKind;
  sellerApproved: boolean;
  buyerApproved: boolean;
  isExpired: boolean;
  isRecalled: boolean;
  isOpenedPackage: boolean;
  hasVerifiedSerial: boolean;
  hasAcquisitionDocument: boolean;
  isNarcotic: boolean;
  isPsychotropic: boolean;
  isControlledPrescription: boolean;
  requiresColdChain: boolean;
  isBiological: boolean;
  minimumRemainingDays: number;
  remainingShelfLifeDays: number;
};

export type PolicyDecision = {
  allowed: boolean;
  reasons: string[];
};

const veterinaryOrganizationTypes = new Set<OrganizationKind>([
  "VETERINARY_CLINIC",
  "VETERINARY_POLYCLINIC",
  "ANIMAL_HOSPITAL"
]);

export function evaluateTradingPolicy(input: PolicyInput): PolicyDecision {
  const reasons: string[] = [];

  if (!input.sellerApproved) reasons.push("SELLER_NOT_APPROVED");
  if (!input.buyerApproved) reasons.push("BUYER_NOT_APPROVED");
  if (input.productType === "HUMAN" && veterinaryOrganizationTypes.has(input.buyerType)) {
    reasons.push("HUMAN_MEDICINE_HIDDEN_FROM_VETERINARY_BUYER");
  }
  if (input.productType === "HUMAN" && veterinaryOrganizationTypes.has(input.sellerType)) {
    reasons.push("VETERINARY_SELLER_CANNOT_TRANSFER_HUMAN_MEDICINE");
  }
  if (input.isExpired) reasons.push("EXPIRED_PRODUCT");
  if (input.isRecalled) reasons.push("RECALLED_PRODUCT");
  if (input.isOpenedPackage) reasons.push("OPENED_PACKAGE");
  if (!input.hasVerifiedSerial) reasons.push("SERIAL_NOT_VERIFIED");
  if (!input.hasAcquisitionDocument) reasons.push("MISSING_ACQUISITION_DOCUMENT");
  if (input.isNarcotic) reasons.push("NARCOTIC_BLOCKED");
  if (input.isPsychotropic) reasons.push("PSYCHOTROPIC_BLOCKED");
  if (input.isControlledPrescription) reasons.push("CONTROLLED_PRESCRIPTION_BLOCKED");
  if (input.requiresColdChain) reasons.push("COLD_CHAIN_BLOCKED_BY_DEFAULT");
  if (input.isBiological) reasons.push("BIOLOGICAL_PRODUCT_BLOCKED_BY_DEFAULT");
  if (input.remainingShelfLifeDays < input.minimumRemainingDays) {
    reasons.push("MINIMUM_SHELF_LIFE_NOT_MET");
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}
