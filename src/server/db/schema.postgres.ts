import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  pgEnum,
  json,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── System Settings ──────────────────────────────────────────────────────────
export const systemSettings = pgTable("system_settings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cash Register Sessions (defined before orders due to FK) ─────────────────
export const cashRegisterSessions = pgTable("cash_register_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  openedBy: varchar("opened_by", { length: 100 }),
  closedBy: varchar("closed_by", { length: 100 }),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  openingFloat: numeric("opening_float", { precision: 10, scale: 2 }).notNull().default("0"),
  closingFloat: numeric("closing_float", { precision: 10, scale: 2 }),
  actualCash: numeric("actual_cash", { precision: 10, scale: 2 }),
  cashSales: numeric("cash_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  cardSales: numeric("card_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  cashIn: numeric("cash_in", { precision: 10, scale: 2 }).notNull().default("0"),
  cashOut: numeric("cash_out", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  status: pgEnum("cash_register_sessions_status_enum", ["open", "closed"])("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashMovements = pgTable("cash_movements", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar("session_id", { length: 36 })
    .references(() => cashRegisterSessions.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  performedBy: varchar("performed_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0).notNull(),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  warrantyInfo: varchar("warranty_info", { length: 255 }),
  reorderThreshold: integer("reorder_threshold").default(5).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Product Variants ─────────────────────────────────────────────────────────
export const productVariants = pgTable("product_variants", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("product_id", { length: 36 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  priceDiff: numeric("price_diff", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Loyalty Accounts ─────────────────────────────────────────────────────────
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  points: integer("points").notNull().default(0),
  totalSpend: numeric("total_spend", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  creditLimit: numeric("credit_limit", { precision: 10, scale: 2 }).notNull().default("0"),
  creditBalance: numeric("credit_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  creditTerms: varchar("credit_terms", { length: 50 }),
});

export const customers = pgTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  birthday: date("birthday"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Loyalty Transactions ─────────────────────────────────────────────────────
export const loyaltyTransactionsEnum = pgEnum("loyalty_transactions_type_enum", ["earn", "redeem"]);
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  loyaltyAccountId: varchar("loyalty_account_id", { length: 36 })
    .references(() => loyaltyAccounts.id)
    .notNull(),
  orderId: varchar("order_id", { length: 36 }),
  type: loyaltyTransactionsEnum("type").notNull(),
  points: integer("points").notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Customer Credit Transactions ────────────────────────────────────────────
// Append-only ledger for account receivable activity per customer.
// orderId and createdBy are soft refs (no FK) for cloud DB compat.
export const customerCreditTransactionsEnum = pgEnum("customer_credit_transactions_type_enum", ["charge", "payment", "adjustment"]);
export const customerCreditTransactions = pgTable("customer_credit_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: varchar("customer_id", { length: 36 }).references(() => loyaltyAccounts.id).notNull(),
  orderId: varchar("order_id", { length: 36 }),          // soft ref to orders.id
  type: customerCreditTransactionsEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 10, scale: 2 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 36 }),           // soft ref to pos_users.id
});

// ─── Promotions / Coupons ─────────────────────────────────────────────────────
export const promotionsEnum = pgEnum("promotions_type_enum", ["percentage", "fixed"]);
export const promotions = pgTable("promotions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: promotionsEnum("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }).default("0"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersStatusEnum = pgEnum("orders_status_enum", ["pending", "processing", "completed", "cancelled", "refunded"]);
export const ordersPaymentMethodEnum = pgEnum("orders_payment_method_enum", ["cash", "card", "credit_card", "debit_card", "cheque", "stripe_terminal", "account_credit"]);
export const ordersPaymentStatusEnum = pgEnum("orders_payment_status_enum", ["pending", "paid", "failed", "refunded"]);

export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  status: ordersStatusEnum("status").default("pending").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: ordersPaymentMethodEnum("payment_method"),
  creditAccountId: varchar("credit_account_id", { length: 36 }), // soft ref to loyalty_accounts.id
  paymentStatus: ordersPaymentStatusEnum("payment_status").default("pending").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 200 }),
  cashReceived: numeric("cash_received", { precision: 10, scale: 2 }),
  changeDue: numeric("change_due", { precision: 10, scale: 2 }),
  note: text("note"),
  promoCode: varchar("promo_code", { length: 50 }),
  promoDiscount: numeric("promo_discount", { precision: 10, scale: 2 }).default("0"),
  loyaltyPhone: varchar("loyalty_phone", { length: 50 }),
  loyaltyPointsEarned: integer("loyalty_points_earned").default(0),
  loyaltyPointsRedeemed: integer("loyalty_points_redeemed").default(0),
  sessionId: varchar("session_id", { length: 36 }).references(() => cashRegisterSessions.id),
  registerId: varchar("register_id", { length: 50 }).default("REG-1"),
  clerkUserId: varchar("clerk_user_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: varchar("order_id", { length: 36 })
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id", { length: 36 }).references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productPrice: numeric("product_price", { precision: 10, scale: 2 }).notNull(),
  warrantyInfo: varchar("warranty_info", { length: 255 }),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersTierEnum = pgEnum("suppliers_tier_enum", ["standard", "silver", "gold", "platinum"]);
export const suppliers = pgTable("suppliers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  tier: suppliersTierEnum("tier").notNull().default("standard"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrdersStatusEnum = pgEnum("purchase_orders_status_enum", ["draft", "ordered", "received", "cancelled"]);
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  poNumber: varchar("po_number", { length: 30 }).notNull().unique(),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id),
  status: purchaseOrdersStatusEnum("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  expectedDate: timestamp("expected_date"),
  notes: text("notes"),
  clerkUserId: varchar("clerk_user_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  purchaseOrderId: varchar("purchase_order_id", { length: 36 })
    .references(() => purchaseOrders.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id", { length: 36 }).references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
});

// ─── Locations / Branches ─────────────────────────────────────────────────────
export const locations = pgTable("locations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Local Auth Users ──────────────────────────────────────────────────────────
export const posUsersRoleEnum = pgEnum("pos_users_role_enum", ["admin", "cashier"]);
export const posUsers = pgTable("pos_users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: posUsersRoleEnum("role").notNull().default("cashier"),
  permissions: json("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Financial Entries ────────────────────────────────────────────────────────
export const financialEntriesTypeEnum = pgEnum("financial_entries_type_enum", ["income", "expense"]);
export const financialEntries = pgTable("financial_entries", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: financialEntriesTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Goods Receipts (GRN) ──────────────────────────────────────────────────────
export const goodsReceipts = pgTable("goods_receipts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  grnNumber: varchar("grn_number", { length: 30 }).notNull().unique(),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id),
  supplierInvoiceNo: varchar("supplier_invoice_no", { length: 100 }),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  receivedBy: varchar("received_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  grnId: varchar("grn_id", { length: 36 })
    .references(() => goodsReceipts.id, { onDelete: "cascade" })
    .notNull(),
  productId: varchar("product_id", { length: 36 }).references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  quantityReceived: integer("quantity_received").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  condition: varchar("condition", { length: 50 }).notNull().default("good"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Supplier Transactions (Ledger) ──────────────────────────────────────────
export const supplierTransactionsTypeEnum = pgEnum("supplier_transactions_type_enum", ["invoice", "payment_cash", "payment_cheque", "credit_note", "debit_note"]);
export const supplierTransactionsChequeStatusEnum = pgEnum("supplier_transactions_cheque_status_enum", ["pending", "cleared", "bounced"]);
export const supplierTransactions = pgTable("supplier_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplierId: varchar("supplier_id", { length: 36 })
    .references(() => suppliers.id, { onDelete: "cascade" })
    .notNull(),
  type: supplierTransactionsTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 100 }),
  chequeNumber: varchar("cheque_number", { length: 50 }),
  chequeDate: timestamp("cheque_date"),
  chequeBank: varchar("cheque_bank", { length: 100 }),
  chequeStatus: supplierTransactionsChequeStatusEnum("cheque_status"),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  orderItems: many(orderItems),
  variants: many(productVariants),
  stockBatches: many(stockBatches),
  recipes: many(recipes),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  session: one(cashRegisterSessions, {
    fields: [orders.sessionId],
    references: [cashRegisterSessions.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  goodsReceipts: many(goodsReceipts),
  transactions: many(supplierTransactions),
}));

export const supplierTransactionsRelations = relations(supplierTransactions, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierTransactions.supplierId],
    references: [suppliers.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
}));

export const cashRegisterSessionsRelations = relations(cashRegisterSessions, ({ many }) => ({
  movements: many(cashMovements),
  orders: many(orders),
}));

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  session: one(cashRegisterSessions, {
    fields: [cashMovements.sessionId],
    references: [cashRegisterSessions.id],
  }),
}));

export const financialEntriesRelations = relations(financialEntries, () => ({}));

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [goodsReceipts.supplierId], references: [suppliers.id] }),
  items: many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  grn: one(goodsReceipts, { fields: [goodsReceiptItems.grnId], references: [goodsReceipts.id] }),
  product: one(products, { fields: [goodsReceiptItems.productId], references: [products.id] }),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ many }) => ({
  transactions: many(loyaltyTransactions),
  creditTransactions: many(customerCreditTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  account: one(loyaltyAccounts, {
    fields: [loyaltyTransactions.loyaltyAccountId],
    references: [loyaltyAccounts.id],
  }),
}));

export const customerCreditTransactionsRelations = relations(customerCreditTransactions, ({ one }) => ({
  customer: one(loyaltyAccounts, {
    fields: [customerCreditTransactions.customerId],
    references: [loyaltyAccounts.id],
  }),
}));

// ─── Stock Batches (FEFO tracking) ───────────────────────────────────────────
export const stockBatches = pgTable("stock_batches", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("product_id", { length: 36 })
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  quantityReceived: integer("quantity_received").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockBatchesRelations = relations(stockBatches, ({ one }) => ({
  product: one(products, { fields: [stockBatches.productId], references: [products.id] }),
}));

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// NOTE: userId is a soft reference (no FK constraint) for PlanetScale /
// AWS RDS Aurora Serverless compatibility. Do NOT add a foreign key here.
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: varchar("user_id", { length: 36 }),     // soft ref — no FK
  userName: varchar("user_name", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 36 }),
  beforeValue: json("before_value"),
  afterValue: json("after_value"),
  metadata: json("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
});

// ─── Balance Sheet Accounts ───────────────────────────────────────────────────
export const balanceSheetAccountsTypeEnum = pgEnum("balance_sheet_accounts_type_enum", ["asset", "liability", "capital"]);
export const balanceSheetAccounts = pgTable("balance_sheet_accounts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  type: balanceSheetAccountsTypeEnum("type").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Kitchen / Recipe Management ─────────────────────────────────────────────

export const rawIngredients = pgTable("raw_ingredients", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull().default("g"), // g, kg, ml, l, pcs …
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 12, scale: 3 }).default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }).default("0"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("product_id", { length: 36 }).references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  portionYield: integer("portion_yield").notNull().default(1), // portions this recipe makes
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: varchar("recipe_id", { length: 36 }).references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  ingredientId: varchar("ingredient_id", { length: 36 }).references(() => rawIngredients.id, { onDelete: "cascade" }).notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(), // per portion
});

export const ingredientAdjustmentsTypeEnum = pgEnum("ingredient_adjustments_type_enum", ["received", "waste", "manual_count", "opening_count", "other"]);
export const ingredientAdjustments = pgTable("ingredient_adjustments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  ingredientId: varchar("ingredient_id", { length: 36 }).references(() => rawIngredients.id).notNull(),
  date: date("date").notNull(),
  type: ingredientAdjustmentsTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(), // +ve = add, -ve = deduct
  reason: text("reason"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const rawIngredientsRelations = relations(rawIngredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
  adjustments: many(ingredientAdjustments),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  product: one(products, { fields: [recipes.productId], references: [products.id] }),
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  ingredient: one(rawIngredients, { fields: [recipeIngredients.ingredientId], references: [rawIngredients.id] }),
}));

export const ingredientAdjustmentsRelations = relations(ingredientAdjustments, ({ one }) => ({
  ingredient: one(rawIngredients, { fields: [ingredientAdjustments.ingredientId], references: [rawIngredients.id] }),
}));

// ─── HR / Payroll ─────────────────────────────────────────────────────────────

export const employeesStatusEnum = pgEnum("employees_status_enum", ["active", "inactive", "terminated"]);
export const employeesEmploymentTypeEnum = pgEnum("employees_employment_type_enum", ["full_time", "part_time", "contract"]);

export const employees = pgTable("employees", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeCode: varchar("employee_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  department: varchar("department", { length: 100 }),
  designation: varchar("designation", { length: 100 }),
  employmentType: employeesEmploymentTypeEnum("employment_type").notNull().default("full_time"),
  joinDate: date("join_date").notNull(),
  status: employeesStatusEnum("status").notNull().default("active"),
  userId: varchar("user_id", { length: 36 }), // soft ref → posUsers.id
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaryStructures = pgTable("salary_structures", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id", { length: 36 }).references(() => employees.id, { onDelete: "cascade" }).notNull(),
  basicSalary: numeric("basic_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 10, scale: 2 }).notNull().default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 10, scale: 2 }).notNull().default("0"),
  otherAllowances: numeric("other_allowances", { precision: 10, scale: 2 }).notNull().default("0"),
  epfDeduction: numeric("epf_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  etfDeduction: numeric("etf_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  effectiveFrom: date("effective_from").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceRecordsStatusEnum = pgEnum("attendance_records_status_enum", ["present", "absent", "half_day", "leave", "holiday"]);
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id", { length: 36 }).references(() => employees.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  status: attendanceRecordsStatusEnum("status").notNull().default("present"),
  checkIn: varchar("check_in", { length: 10 }),
  checkOut: varchar("check_out", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionRulesTypeEnum = pgEnum("commission_rules_type_enum", ["percentage", "fixed_per_order"]);
export const commissionRules = pgTable("commission_rules", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  employeeId: varchar("employee_id", { length: 36 }).references(() => employees.id, { onDelete: "cascade" }),
  type: commissionRulesTypeEnum("type").notNull().default("percentage"),
  rate: numeric("rate", { precision: 8, scale: 4 }).notNull().default("0"),
  minSalesThreshold: numeric("min_sales_threshold", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salaryPaymentsStatusEnum = pgEnum("salary_payments_status_enum", ["draft", "approved", "paid"]);
export const salaryPayments = pgTable("salary_payments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id", { length: 36 }).references(() => employees.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  workingDays: integer("working_days").notNull().default(0),
  presentDays: numeric("present_days", { precision: 4, scale: 1 }).notNull().default("0"),
  basicSalary: numeric("basic_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  allowances: numeric("allowances", { precision: 10, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  attendanceDeduction: numeric("attendance_deduction", { precision: 10, scale: 2 }).notNull().default("0"),
  commission: numeric("commission", { precision: 10, scale: 2 }).notNull().default("0"),
  bonus: numeric("bonus", { precision: 10, scale: 2 }).notNull().default("0"),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).notNull().default("0"),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull().default("0"),
  status: salaryPaymentsStatusEnum("status").notNull().default("draft"),
  paidAt: timestamp("paid_at"),
  financeEntryId: varchar("finance_entry_id", { length: 36 }), // soft ref → financialEntries.id
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSupplierLinksQuotaPeriodEnum = pgEnum("employee_supplier_links_quota_period_enum", ["monthly", "weekly", "daily"]);
export const employeeSupplierLinks = pgTable("employee_supplier_links", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id", { length: 36 }).references(() => employees.id, { onDelete: "cascade" }).notNull(),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  quotaAmount: numeric("quota_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  quotaPeriod: employeeSupplierLinksQuotaPeriodEnum("quota_period").notNull().default("monthly"),
  currentUsed: numeric("current_used", { precision: 10, scale: 2 }).notNull().default("0"),
  periodStart: date("period_start"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HR Relations
export const employeesRelations = relations(employees, ({ many }) => ({
  salaryStructures: many(salaryStructures),
  attendanceRecords: many(attendanceRecords),
  commissionRules: many(commissionRules),
  salaryPayments: many(salaryPayments),
  supplierLinks: many(employeeSupplierLinks),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one }) => ({
  employee: one(employees, { fields: [salaryStructures.employeeId], references: [employees.id] }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, { fields: [attendanceRecords.employeeId], references: [employees.id] }),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one }) => ({
  employee: one(employees, { fields: [commissionRules.employeeId], references: [employees.id] }),
}));

export const salaryPaymentsRelations = relations(salaryPayments, ({ one }) => ({
  employee: one(employees, { fields: [salaryPayments.employeeId], references: [employees.id] }),
}));

export const employeeSupplierLinksRelations = relations(employeeSupplierLinks, ({ one }) => ({
  employee: one(employees, { fields: [employeeSupplierLinks.employeeId], references: [employees.id] }),
  supplier: one(suppliers, { fields: [employeeSupplierLinks.supplierId], references: [suppliers.id] }),
}));
