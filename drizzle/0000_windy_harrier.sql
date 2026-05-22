CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`user_id` varchar(36),
	`user_name` varchar(255),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(50),
	`entity_id` varchar(36),
	`before_value` json,
	`after_value` json,
	`metadata` json,
	`ip_address` varchar(45),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `balance_sheet_accounts` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('asset','liability','capital') NOT NULL,
	`category` varchar(100) NOT NULL,
	`balance` decimal(15,2) NOT NULL DEFAULT '0',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balance_sheet_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` varchar(36) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`type` varchar(10) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`performed_by` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_register_sessions` (
	`id` varchar(36) NOT NULL,
	`opened_by` varchar(100),
	`closed_by` varchar(100),
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`opening_float` decimal(10,2) NOT NULL DEFAULT '0',
	`closing_float` decimal(10,2),
	`actual_cash` decimal(10,2),
	`cash_sales` decimal(10,2) NOT NULL DEFAULT '0',
	`card_sales` decimal(10,2) NOT NULL DEFAULT '0',
	`cash_in` decimal(10,2) NOT NULL DEFAULT '0',
	`cash_out` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_register_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) DEFAULT '#6366f1',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_credit_transactions` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`order_id` varchar(36),
	`type` enum('charge','payment','adjustment') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balance_after` decimal(10,2) NOT NULL,
	`note` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` varchar(36),
	CONSTRAINT `customer_credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_entries` (
	`id` varchar(36) NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goods_receipt_items` (
	`id` varchar(36) NOT NULL,
	`grn_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`quantity_received` int NOT NULL,
	`unit_cost` decimal(10,2),
	`batch_number` varchar(100),
	`expiry_date` timestamp,
	`condition` varchar(50) NOT NULL DEFAULT 'good',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goods_receipt_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goods_receipts` (
	`id` varchar(36) NOT NULL,
	`grn_number` varchar(30) NOT NULL,
	`supplier_id` varchar(36),
	`supplier_invoice_no` varchar(100),
	`received_date` timestamp NOT NULL DEFAULT (now()),
	`received_by` varchar(100),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goods_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `goods_receipts_grn_number_unique` UNIQUE(`grn_number`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`phone` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`id` varchar(36) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`name` varchar(255),
	`points` int NOT NULL DEFAULT 0,
	`total_spend` decimal(10,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`credit_limit` decimal(10,2) NOT NULL DEFAULT '0',
	`credit_balance` decimal(10,2) NOT NULL DEFAULT '0',
	`credit_terms` varchar(50),
	CONSTRAINT `loyalty_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_accounts_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` varchar(36) NOT NULL,
	`loyalty_account_id` varchar(36) NOT NULL,
	`order_id` varchar(36),
	`type` enum('earn','redeem') NOT NULL,
	`points` int NOT NULL,
	`description` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`product_price` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(20) NOT NULL,
	`status` enum('pending','processing','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`subtotal` decimal(10,2) NOT NULL,
	`tax_amount` decimal(10,2) DEFAULT '0',
	`discount_amount` decimal(10,2) DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`payment_method` enum('cash','card','credit_card','debit_card','cheque','stripe_terminal','account_credit'),
	`credit_account_id` varchar(36),
	`payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripe_payment_intent_id` varchar(200),
	`cash_received` decimal(10,2),
	`change_due` decimal(10,2),
	`note` text,
	`promo_code` varchar(50),
	`promo_discount` decimal(10,2) DEFAULT '0',
	`loyalty_phone` varchar(50),
	`loyalty_points_earned` int DEFAULT 0,
	`loyalty_points_redeemed` int DEFAULT 0,
	`session_id` varchar(36),
	`register_id` varchar(50) DEFAULT 'REG-1',
	`clerk_user_id` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `pos_users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`role` enum('admin','cashier') NOT NULL DEFAULT 'cashier',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pos_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`value` varchar(100) NOT NULL,
	`price_diff` decimal(10,2) NOT NULL DEFAULT '0',
	`stock` int NOT NULL DEFAULT 0,
	`sku` varchar(100),
	`barcode` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`sku` varchar(100),
	`price` decimal(10,2) NOT NULL,
	`cost` decimal(10,2),
	`stock` int NOT NULL DEFAULT 0,
	`category_id` varchar(36),
	`image_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`tax_rate` decimal(5,2) DEFAULT '0',
	`warranty_info` varchar(255),
	`reorder_threshold` int NOT NULL DEFAULT 5,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
	`value` decimal(10,2) NOT NULL,
	`min_order_amount` decimal(10,2) DEFAULT '0',
	`max_uses` int,
	`used_count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` varchar(36) NOT NULL,
	`purchase_order_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` decimal(10,2) NOT NULL,
	`total_cost` decimal(10,2) NOT NULL,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` varchar(36) NOT NULL,
	`po_number` varchar(30) NOT NULL,
	`supplier_id` varchar(36),
	`status` enum('draft','ordered','received','cancelled') NOT NULL DEFAULT 'draft',
	`total_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`expected_date` timestamp,
	`notes` text,
	`clerk_user_id` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_po_number_unique` UNIQUE(`po_number`)
);
--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`batch_number` varchar(100),
	`expiry_date` timestamp,
	`received_date` timestamp NOT NULL DEFAULT (now()),
	`quantity_received` int NOT NULL,
	`quantity_remaining` int NOT NULL,
	`unit_cost` decimal(10,2),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_transactions` (
	`id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`type` enum('invoice','payment_cash','payment_cheque','credit_note','debit_note') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reference` varchar(100),
	`cheque_number` varchar(50),
	`cheque_date` timestamp,
	`cheque_bank` varchar(100),
	`cheque_status` enum('pending','cleared','bounced'),
	`notes` text,
	`created_by` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_name` varchar(255),
	`phone` varchar(50),
	`email` varchar(255),
	`address` text,
	`notes` text,
	`tier` enum('standard','silver','gold','platinum') NOT NULL DEFAULT 'standard',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_session_id_cash_register_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `cash_register_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_credit_transactions` ADD CONSTRAINT `customer_credit_transactions_customer_id_loyalty_accounts_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `loyalty_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_grn_id_goods_receipts_id_fk` FOREIGN KEY (`grn_id`) REFERENCES `goods_receipts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_loyalty_account_id_loyalty_accounts_id_fk` FOREIGN KEY (`loyalty_account_id`) REFERENCES `loyalty_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_session_id_cash_register_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `cash_register_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_transactions` ADD CONSTRAINT `supplier_transactions_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;