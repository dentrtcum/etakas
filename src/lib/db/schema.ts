import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_MANAGER",
  "INVENTORY_MANAGER",
  "ORDER_MANAGER",
  "VIEWER",
  "SUPER_ADMIN",
  "ADMIN_REVIEWER",
  "LISTING_REVIEWER",
  "SUPPORT_ADMIN",
  "LEDGER_ADMIN",
  "AUDITOR"
]);

export const organizationType = pgEnum("organization_type", [
  "PHARMACY",
  "VETERINARY_CLINIC",
  "VETERINARY_POLYCLINIC",
  "ANIMAL_HOSPITAL"
]);

export const organizationStatus = pgEnum("organization_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ADDITIONAL_DOCUMENT_REQUIRED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "CLOSED"
]);

export const productType = pgEnum("product_type", ["HUMAN", "VETERINARY"]);

export const listingStatus = pgEnum("listing_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "PARTIALLY_RESERVED",
  "SOLD_OUT",
  "EXPIRED",
  "REJECTED",
  "REMOVED"
]);

export const orderStatus = pgEnum("order_status", [
  "RESERVED",
  "CONTACT_DETAILS_REVEALED",
  "SELLER_PREPARING",
  "READY_FOR_PICKUP",
  "HANDOVER_DECLARED",
  "BUYER_CONFIRMATION_PENDING",
  "COMPLETED",
  "DISPUTED",
  "ADMIN_FROZEN",
  "CANCELLED",
  "EXPIRED"
]);

export const documentStatus = pgEnum("document_status", [
  "UPLOADED",
  "QUARANTINED",
  "SCANNING",
  "CLEAN",
  "INFECTED",
  "REJECTED",
  "DELETED"
]);

export const ledgerEntryDirection = pgEnum("ledger_entry_direction", ["DEBIT", "CREDIT"]);

export const ledgerTransactionType = pgEnum("ledger_transaction_type", [
  "BALANCE_HOLD",
  "HOLD_RELEASE",
  "ORDER_COMPLETION",
  "ADMIN_ADJUSTMENT",
  "REVERSAL",
  "CONSISTENCY_CORRECTION"
]);

export const disputeStatus = pgEnum("dispute_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_BUYER",
  "RESOLVED_SELLER",
  "CANCELLED"
]);

const id = uuid("id").primaryKey().defaultRandom();
const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id,
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    passwordHash: text("password_hash"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId)
  ]
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    createdAt
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    index("user_roles_role_idx").on(table.role)
  ]
);

export const organizations = pgTable(
  "organizations",
  {
    id,
    type: organizationType("type").notNull(),
    status: organizationStatus("status").notNull().default("DRAFT"),
    legalNameEncrypted: text("legal_name_encrypted").notNull(),
    publicAlias: varchar("public_alias", { length: 120 }).notNull(),
    taxNumberEncrypted: text("tax_number_encrypted"),
    licenseNumberEncrypted: text("license_number_encrypted"),
    province: varchar("province", { length: 80 }).notNull(),
    district: varchar("district", { length: 80 }).notNull(),
    creditLimitKurus: integer("credit_limit_kurus").notNull().default(0),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (table) => [
    index("organizations_status_idx").on(table.status),
    index("organizations_type_status_idx").on(table.type, table.status),
    check("organizations_credit_limit_non_negative", sql`${table.creditLimitKurus} >= 0`)
  ]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    createdAt
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId, table.role] }),
    index("organization_members_user_id_idx").on(table.userId)
  ]
);

export const organizationAddresses = pgTable("organization_addresses", {
  id,
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  addressEncrypted: text("address_encrypted").notNull(),
  phoneEncrypted: text("phone_encrypted"),
  createdAt,
  updatedAt
});

export const organizationDocuments = pgTable(
  "organization_documents",
  {
    id,
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 80 }).notNull(),
    storageKey: text("storage_key").notNull(),
    originalNameHash: text("original_name_hash").notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    scanStatus: documentStatus("scan_status").notNull().default("UPLOADED"),
    expiresAt: date("expires_at"),
    createdAt,
    updatedAt
  },
  (table) => [
    index("organization_documents_org_idx").on(table.organizationId),
    check("organization_documents_size_positive", sql`${table.byteSize} > 0`)
  ]
);

export const organizationReviews = pgTable("organization_reviews", {
  id,
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id")
    .notNull()
    .references(() => users.id),
  decision: organizationStatus("decision").notNull(),
  reason: text("reason").notNull(),
  createdAt
});

export const productCatalog = pgTable(
  "product_catalog",
  {
    id,
    name: varchar("name", { length: 240 }).notNull(),
    activeIngredient: varchar("active_ingredient", { length: 240 }),
    type: productType("type").notNull(),
    form: varchar("form", { length: 120 }),
    strength: varchar("strength", { length: 120 }),
    packageShape: varchar("package_shape", { length: 160 }),
    manufacturer: varchar("manufacturer", { length: 180 }),
    licenseHolder: varchar("license_holder", { length: 180 }),
    gtin: varchar("gtin", { length: 32 }).notNull(),
    classificationCode: varchar("classification_code", { length: 80 }),
    controlCategory: varchar("control_category", { length: 80 }).notNull().default("STANDARD"),
    requiresColdChain: boolean("requires_cold_chain").notNull().default(false),
    isBiological: boolean("is_biological").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt
  },
  (table) => [
    uniqueIndex("product_catalog_gtin_unique").on(table.gtin),
    index("product_catalog_search_idx").on(table.name, table.activeIngredient, table.gtin),
    index("product_catalog_type_idx").on(table.type)
  ]
);

export const productBatches = pgTable(
  "product_batches",
  {
    id,
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => productCatalog.id),
    lotNumberEncrypted: text("lot_number_encrypted").notNull(),
    expiryDate: date("expiry_date").notNull(),
    invoiceDate: date("invoice_date"),
    invoiceNumberEncrypted: text("invoice_number_encrypted"),
    unitReferenceValueKurus: integer("unit_reference_value_kurus").notNull(),
    totalQuantity: integer("total_quantity").notNull(),
    availableQuantity: integer("available_quantity").notNull(),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    transferredQuantity: integer("transferred_quantity").notNull().default(0),
    storageConditions: text("storage_conditions"),
    notes: text("notes"),
    createdAt,
    updatedAt
  },
  (table) => [
    index("product_batches_org_idx").on(table.organizationId),
    index("product_batches_product_expiry_idx").on(table.productId, table.expiryDate),
    check("product_batches_reference_non_negative", sql`${table.unitReferenceValueKurus} >= 0`),
    check("product_batches_total_non_negative", sql`${table.totalQuantity} >= 0`),
    check("product_batches_available_non_negative", sql`${table.availableQuantity} >= 0`),
    check("product_batches_reserved_non_negative", sql`${table.reservedQuantity} >= 0`),
    check("product_batches_transferred_non_negative", sql`${table.transferredQuantity} >= 0`),
    check(
      "product_batches_quantity_conservation",
      sql`${table.availableQuantity} + ${table.reservedQuantity} + ${table.transferredQuantity} <= ${table.totalQuantity}`
    )
  ]
);

export const packageSerials = pgTable(
  "package_serials",
  {
    id,
    batchId: uuid("batch_id")
      .notNull()
      .references(() => productBatches.id, { onDelete: "cascade" }),
    serialEncrypted: text("serial_encrypted").notNull(),
    serialHash: text("serial_hash").notNull(),
    status: varchar("status", { length: 40 }).notNull().default("ACTIVE"),
    createdAt
  },
  (table) => [
    uniqueIndex("package_serials_active_hash_unique")
      .on(table.serialHash)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("package_serials_batch_idx").on(table.batchId)
  ]
);

export const listings = pgTable(
  "listings",
  {
    id,
    sellerOrganizationId: uuid("seller_organization_id")
      .notNull()
      .references(() => organizations.id),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => productBatches.id),
    status: listingStatus("status").notNull().default("DRAFT"),
    unitReferenceValueKurus: integer("unit_reference_value_kurus").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    quantityReserved: integer("quantity_reserved").notNull().default(0),
    minExpiryDate: date("min_expiry_date").notNull(),
    adminReviewNote: text("admin_review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (table) => [
    index("listings_marketplace_idx").on(table.status, table.minExpiryDate, table.unitReferenceValueKurus),
    index("listings_seller_idx").on(table.sellerOrganizationId),
    check("listings_value_non_negative", sql`${table.unitReferenceValueKurus} >= 0`),
    check("listings_quantity_available_non_negative", sql`${table.quantityAvailable} >= 0`),
    check("listings_quantity_reserved_non_negative", sql`${table.quantityReserved} >= 0`)
  ]
);

export const listingImages = pgTable("listing_images", {
  id,
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  scanStatus: documentStatus("scan_status").notNull().default("UPLOADED"),
  createdAt
});

export const listingDocuments = pgTable("listing_documents", {
  id,
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 80 }).notNull(),
  storageKey: text("storage_key").notNull(),
  scanStatus: documentStatus("scan_status").notNull().default("UPLOADED"),
  createdAt
});

export const listingReviews = pgTable("listing_reviews", {
  id,
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id")
    .notNull()
    .references(() => users.id),
  decision: listingStatus("decision").notNull(),
  reason: text("reason").notNull(),
  createdAt
});

export const orders = pgTable(
  "orders",
  {
    id,
    buyerOrganizationId: uuid("buyer_organization_id")
      .notNull()
      .references(() => organizations.id),
    sellerOrganizationId: uuid("seller_organization_id")
      .notNull()
      .references(() => organizations.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    status: orderStatus("status").notNull().default("RESERVED"),
    totalReferenceValueKurus: integer("total_reference_value_kurus").notNull(),
    quantity: integer("quantity").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    handoverDeclaredAt: timestamp("handover_declared_at", { withTimezone: true }),
    autoCompleteAfter: timestamp("auto_complete_after", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (table) => [
    uniqueIndex("orders_idempotency_key_unique").on(table.idempotencyKey),
    index("orders_buyer_idx").on(table.buyerOrganizationId),
    index("orders_seller_idx").on(table.sellerOrganizationId),
    index("orders_status_auto_complete_idx").on(table.status, table.autoCompleteAfter),
    check("orders_distinct_parties", sql`${table.buyerOrganizationId} <> ${table.sellerOrganizationId}`),
    check("orders_total_non_negative", sql`${table.totalReferenceValueKurus} >= 0`),
    check("orders_quantity_positive", sql`${table.quantity} > 0`)
  ]
);

export const orderItems = pgTable("order_items", {
  id,
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => productBatches.id),
  quantity: integer("quantity").notNull(),
  unitReferenceValueKurus: integer("unit_reference_value_kurus").notNull(),
  createdAt
});

export const inventoryReservations = pgTable("inventory_reservations", {
  id,
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => productBatches.id),
  quantity: integer("quantity").notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt
});

export const ledgerAccounts = pgTable(
  "ledger_accounts",
  {
    id,
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 16 }).notNull().default("TAKAS_KREDISI"),
    createdAt
  },
  (table) => [uniqueIndex("ledger_accounts_organization_unique").on(table.organizationId)]
);

export const ledgerTransactions = pgTable(
  "ledger_transactions",
  {
    id,
    type: ledgerTransactionType("type").notNull(),
    description: text("description").notNull(),
    adminReason: text("admin_reason"),
    orderId: uuid("order_id").references(() => orders.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    reversalOfTransactionId: uuid("reversal_of_transaction_id"),
    createdAt
  },
  (table) => [index("ledger_transactions_order_idx").on(table.orderId)]
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id,
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => ledgerTransactions.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: "restrict" }),
    direction: ledgerEntryDirection("direction").notNull(),
    amountKurus: integer("amount_kurus").notNull(),
    createdAt
  },
  (table) => [
    index("ledger_entries_account_idx").on(table.accountId),
    index("ledger_entries_transaction_idx").on(table.transactionId),
    check("ledger_entries_amount_positive", sql`${table.amountKurus} > 0`)
  ]
);

export const balanceHolds = pgTable(
  "balance_holds",
  {
    id,
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => ledgerAccounts.id),
    amountKurus: integer("amount_kurus").notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt
  },
  (table) => [check("balance_holds_amount_positive", sql`${table.amountKurus} > 0`)]
);

export const deliveryConfirmations = pgTable("delivery_confirmations", {
  id,
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id")
    .notNull()
    .references(() => users.id),
  kind: varchar("kind", { length: 80 }).notNull(),
  note: text("note"),
  createdAt
});

export const disputes = pgTable("disputes", {
  id,
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  openedByUserId: uuid("opened_by_user_id")
    .notNull()
    .references(() => users.id),
  status: disputeStatus("status").notNull().default("OPEN"),
  reason: text("reason").notNull(),
  resolution: text("resolution"),
  createdAt,
  updatedAt
});

export const disputeEvidence = pgTable("dispute_evidence", {
  id,
  disputeId: uuid("dispute_id")
    .notNull()
    .references(() => disputes.id, { onDelete: "cascade" }),
  uploadedByUserId: uuid("uploaded_by_user_id")
    .notNull()
    .references(() => users.id),
  storageKey: text("storage_key").notNull(),
  scanStatus: documentStatus("scan_status").notNull().default("UPLOADED"),
  createdAt
});

export const notifications = pgTable("notifications", {
  id,
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 120 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  retryAfter: timestamp("retry_after", { withTimezone: true }),
  createdAt
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id,
    actorUserId: uuid("actor_user_id").references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    action: varchar("action", { length: 160 }).notNull(),
    targetType: varchar("target_type", { length: 120 }).notNull(),
    targetId: uuid("target_id"),
    safeBefore: jsonb("safe_before"),
    safeAfter: jsonb("safe_after"),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    correlationId: uuid("correlation_id").notNull(),
    reason: text("reason"),
    createdAt
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_target_idx").on(table.targetType, table.targetId),
    index("audit_logs_created_at_idx").on(table.createdAt)
  ]
);

export const policyRules = pgTable("policy_rules", {
  id,
  key: varchar("key", { length: 160 }).notNull(),
  value: jsonb("value").notNull(),
  requiresSuperAdmin: boolean("requires_super_admin").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt,
  updatedAt
});

export const systemSettings = pgTable("system_settings", {
  id,
  key: varchar("key", { length: 160 }).notNull(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  createdAt,
  updatedAt
});

export const legalDocumentVersions = pgTable("legal_document_versions", {
  id,
  kind: varchar("kind", { length: 80 }).notNull(),
  version: varchar("version", { length: 40 }).notNull(),
  contentHash: text("content_hash").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
  createdAt
});

export const legalAcceptances = pgTable(
  "legal_acceptances",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    legalDocumentVersionId: uuid("legal_document_version_id")
      .notNull()
      .references(() => legalDocumentVersions.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.userId, table.legalDocumentVersionId] })]
);

export const loginEvents = pgTable("login_events", {
  id,
  userId: uuid("user_id").references(() => users.id),
  email: varchar("email", { length: 320 }).notNull(),
  successful: boolean("successful").notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  reason: text("reason"),
  createdAt
});

export const adminApprovals = pgTable("admin_approvals", {
  id,
  requestedByUserId: uuid("requested_by_user_id")
    .notNull()
    .references(() => users.id),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  action: varchar("action", { length: 160 }).notNull(),
  targetType: varchar("target_type", { length: 120 }).notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt
});
