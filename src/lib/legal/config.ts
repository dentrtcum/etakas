export const legalOperator = {
  name: "Sabot Yazılım",
  email: "ahmetnayki77@gmail.com",
  address: "Aydınlıkevler Mahallesi, Celal Aras Caddesi No: 16, Merkez / Kars"
} as const;

// This flag records the operator's review; it is not a regulatory authorization.
export function getLegalReadiness() {
  const missing = process.env.LEGAL_CONTENT_APPROVED === "true" ? [] : ["LEGAL_CONTENT_APPROVED"];
  return { isReady: missing.length === 0, missing };
}
