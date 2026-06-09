export const syntheticSeedData = {
  organizations: [
    { type: "PHARMACY", status: "APPROVED", publicAlias: "Doğrulanmış Eczane A" },
    { type: "PHARMACY", status: "SUBMITTED", publicAlias: "Onay Bekleyen Eczane" },
    { type: "VETERINARY_CLINIC", status: "APPROVED", publicAlias: "Doğrulanmış Klinik A" },
    { type: "PHARMACY", status: "SUSPENDED", publicAlias: "Askıdaki Eczane" }
  ],
  products: [
    { name: "Sentetik Beşeri Ürün", type: "HUMAN", gtin: "08690000000001" },
    { name: "Sentetik Veteriner Ürünü", type: "VETERINARY", gtin: "08690000000002" }
  ],
  users: [
    { email: "admin@example.invalid", role: "ADMIN_REVIEWER" },
    { email: "superadmin@example.invalid", role: "SUPER_ADMIN" }
  ]
} as const;
