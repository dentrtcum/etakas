export const seedIds = {
  users: {
    admin: "00000000-0000-4000-8000-000000000101",
    superAdmin: "00000000-0000-4000-8000-000000000102",
    pharmacyOwner: "00000000-0000-4000-8000-000000000103",
    clinicOwner: "00000000-0000-4000-8000-000000000104"
  },
  organizations: {
    approvedPharmacy: "00000000-0000-4000-8000-000000000201",
    pendingPharmacy: "00000000-0000-4000-8000-000000000202",
    approvedClinic: "00000000-0000-4000-8000-000000000203",
    suspendedPharmacy: "00000000-0000-4000-8000-000000000204"
  },
  addresses: {
    approvedPharmacy: "00000000-0000-4000-8000-000000000211",
    pendingPharmacy: "00000000-0000-4000-8000-000000000212",
    approvedClinic: "00000000-0000-4000-8000-000000000213",
    suspendedPharmacy: "00000000-0000-4000-8000-000000000214"
  },
  products: {
    human: "00000000-0000-4000-8000-000000000301",
    veterinary: "00000000-0000-4000-8000-000000000302"
  },
  batches: {
    human: "00000000-0000-4000-8000-000000000401",
    veterinary: "00000000-0000-4000-8000-000000000402"
  },
  listings: {
    activeHuman: "00000000-0000-4000-8000-000000000501",
    pendingVeterinary: "00000000-0000-4000-8000-000000000502"
  }
} as const;

export const syntheticSeedData = {
  users: [
    {
      id: seedIds.users.admin,
      email: "admin@example.invalid",
      name: "Sentetik Admin",
      totpEnabled: true,
      role: "ADMIN_REVIEWER"
    },
    {
      id: seedIds.users.superAdmin,
      email: "superadmin@example.invalid",
      name: "Sentetik Super Admin",
      totpEnabled: true,
      role: "SUPER_ADMIN"
    },
    {
      id: seedIds.users.pharmacyOwner,
      email: "eczane@example.invalid",
      name: "Sentetik Eczane Yetkilisi",
      totpEnabled: false,
      role: "ORGANIZATION_OWNER"
    },
    {
      id: seedIds.users.clinicOwner,
      email: "klinik@example.invalid",
      name: "Sentetik Klinik Yetkilisi",
      totpEnabled: false,
      role: "ORGANIZATION_OWNER"
    }
  ],
  organizations: [
    {
      id: seedIds.organizations.approvedPharmacy,
      addressId: seedIds.addresses.approvedPharmacy,
      type: "PHARMACY",
      status: "APPROVED",
      publicAlias: "Doğrulanmış Eczane",
      province: "İstanbul",
      district: "Kadıköy",
      ownerUserId: seedIds.users.pharmacyOwner,
      legalName: "Sentetik Onaylı Eczane Ltd.",
      taxNumber: "1111111111",
      licenseNumber: "SYN-PH-001",
      address: "Sentetik Mahallesi Test Caddesi No: 1",
      phone: "+905551111111"
    },
    {
      id: seedIds.organizations.pendingPharmacy,
      addressId: seedIds.addresses.pendingPharmacy,
      type: "PHARMACY",
      status: "SUBMITTED",
      publicAlias: "Doğrulanmış Eczane",
      province: "Ankara",
      district: "Çankaya",
      ownerUserId: seedIds.users.pharmacyOwner,
      legalName: "Sentetik Onay Bekleyen Eczane Ltd.",
      taxNumber: "2222222222",
      licenseNumber: "SYN-PH-002",
      address: "Sentetik Cadde No: 2",
      phone: "+905552222222"
    },
    {
      id: seedIds.organizations.approvedClinic,
      addressId: seedIds.addresses.approvedClinic,
      type: "VETERINARY_CLINIC",
      status: "APPROVED",
      publicAlias: "Doğrulanmış Veteriner Kliniği",
      province: "İzmir",
      district: "Konak",
      ownerUserId: seedIds.users.clinicOwner,
      legalName: "Sentetik Veteriner Kliniği",
      taxNumber: "3333333333",
      licenseNumber: "SYN-VET-001",
      address: "Sentetik Sokak No: 3",
      phone: "+905553333333"
    },
    {
      id: seedIds.organizations.suspendedPharmacy,
      addressId: seedIds.addresses.suspendedPharmacy,
      type: "PHARMACY",
      status: "SUSPENDED",
      publicAlias: "Doğrulanmış Eczane",
      province: "Bursa",
      district: "Nilüfer",
      ownerUserId: seedIds.users.pharmacyOwner,
      legalName: "Sentetik Askıdaki Eczane Ltd.",
      taxNumber: "4444444444",
      licenseNumber: "SYN-PH-003",
      address: "Sentetik Bulvar No: 4",
      phone: "+905554444444"
    }
  ],
  products: [
    {
      id: seedIds.products.human,
      name: "Sentetik Beşeri Ürün",
      type: "HUMAN",
      gtin: "08690000000001",
      activeIngredient: "Sentetik etkin madde"
    },
    {
      id: seedIds.products.veterinary,
      name: "Sentetik Veteriner Ürünü",
      type: "VETERINARY",
      gtin: "08690000000002",
      activeIngredient: "Sentetik veteriner etkin madde"
    }
  ]
} as const;
