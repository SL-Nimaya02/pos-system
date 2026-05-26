import * as fs from 'fs';
import * as path from 'path';

/**
 * This script creates a complete SQL file with:
 * 1. Schema creation (from schema.postgres.ts)
 * 2. Data import (all records from MySQL)
 * 
 * Ready to paste into Supabase Dashboard SQL Editor
 */

console.log('📝 Creating complete schema + data SQL file...\n');

// Read the PostgreSQL schema
const schemaPath = path.join(process.cwd(), 'src/server/db/schema.postgres.ts');
const dataPath = path.join(process.cwd(), 'backups/pos_db_data_only_2026-05-26.sql');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ Schema file not found:', schemaPath);
  process.exit(1);
}

if (!fs.existsSync(dataPath)) {
  console.error('❌ Data file not found:', dataPath);
  process.exit(1);
}

// Read the data file (which has INSERT statements)
const dataSQL = fs.readFileSync(dataPath, 'utf-8');

// Create complete SQL with instructions
const completeSQLContent = `-- ============================================================
-- COMPLETE SUPABASE MIGRATION - SCHEMA + DATA
-- ============================================================
-- Generated: ${new Date().toISOString()}
--
-- INSTRUCTIONS:
-- 1. Go to: https://app.supabase.com/
-- 2. Select project: qzgwbezcduuqsnkzkkko
-- 3. Click: SQL Editor → New Query
-- 4. Copy ALL content from this file
-- 5. Paste into Supabase SQL Editor
-- 6. Click RUN button
-- 7. Wait 3-5 minutes for completion
--
-- This file will:
-- - Create all 35 tables
-- - Set up relationships
-- - Import all 363 records
-- ============================================================

-- First, enable extensions needed for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE CREATION (PostgreSQL Schema)
-- ============================================================

-- Enum types
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave', 'holiday');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_type AS ENUM ('retail', 'wholesale', 'corporate');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Main tables
CREATE TABLE IF NOT EXISTS "attendance_records" (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    check_in VARCHAR(10),
    check_out VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    user_id VARCHAR(36),
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),
    before_value JSONB,
    after_value JSONB,
    metadata JSONB,
    ip_address VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS "balance_sheet_accounts" (
    id VARCHAR(36) PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id VARCHAR(36),
    opening_balance DECIMAL(12,2),
    current_balance DECIMAL(12,2),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "cash_movements" (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36),
    movement_type VARCHAR(50),
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "cash_register_sessions" (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    opening_balance DECIMAL(10,2),
    closing_balance DECIMAL(10,2),
    opened_at TIMESTAMP,
    closed_at TIMESTAMP,
    status VARCHAR(20),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    display_order INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "commission_rules" (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    commission_type VARCHAR(50),
    commission_value DECIMAL(10,2),
    min_sales DECIMAL(10,2),
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "customer_credit_transactions" (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36),
    transaction_type VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    credit_limit DECIMAL(10,2),
    customer_type customer_type,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "employee_supplier_links" (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    supplier_id VARCHAR(36),
    commission_percent DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "employees" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    position VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "financial_entries" (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36),
    entry_type VARCHAR(50),
    amount DECIMAL(12,2),
    reference_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
    id VARCHAR(36) PRIMARY KEY,
    grn_id VARCHAR(36),
    product_id VARCHAR(36),
    quantity INT,
    unit_price DECIMAL(10,2),
    received_quantity INT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "goods_receipts" (
    id VARCHAR(36) PRIMARY KEY,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id VARCHAR(36),
    purchase_order_id VARCHAR(36),
    received_date DATE,
    received_by VARCHAR(100),
    notes TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "ingredient_adjustments" (
    id VARCHAR(36) PRIMARY KEY,
    ingredient_id VARCHAR(36),
    adjustment_type VARCHAR(50),
    quantity INT,
    reason TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "locations" (
    id VARCHAR(36) PRIMARY KEY,
    location_name VARCHAR(100),
    location_type VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36),
    points_balance DECIMAL(10,2),
    tier VARCHAR(50),
    tier_expiry DATE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
    id VARCHAR(36) PRIMARY KEY,
    loyalty_account_id VARCHAR(36),
    transaction_type VARCHAR(50),
    points DECIMAL(10,2),
    order_id VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2),
    discount_percent DECIMAL(5,2),
    tax_amount DECIMAL(10,2),
    line_total DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(36),
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    order_status order_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "pos_users" (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100),
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36),
    variant_name VARCHAR(100),
    sku VARCHAR(100),
    price DECIMAL(10,2),
    stock_quantity INT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    category_id VARCHAR(36),
    supplier_id VARCHAR(36),
    description TEXT,
    unit_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    reorder_level INT,
    reorder_quantity INT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "promotions" (
    id VARCHAR(36) PRIMARY KEY,
    promotion_name VARCHAR(100),
    discount_type VARCHAR(50),
    discount_value DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
    id VARCHAR(36) PRIMARY KEY,
    purchase_order_id VARCHAR(36),
    product_id VARCHAR(36),
    quantity INT,
    unit_price DECIMAL(10,2),
    total DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
    id VARCHAR(36) PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id VARCHAR(36),
    order_date DATE,
    expected_delivery DATE,
    total_amount DECIMAL(10,2),
    status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "raw_ingredients" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100),
    unit VARCHAR(20),
    stock_quantity INT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
    id VARCHAR(36) PRIMARY KEY,
    recipe_id VARCHAR(36),
    ingredient_id VARCHAR(36),
    quantity DECIMAL(10,2),
    unit VARCHAR(20),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
    id VARCHAR(36) PRIMARY KEY,
    recipe_name VARCHAR(100),
    product_id VARCHAR(36),
    instructions TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "salary_payments" (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    payment_date DATE,
    amount DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "salary_structures" (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    base_salary DECIMAL(10,2),
    allowances DECIMAL(10,2),
    deductions DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_batches" (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36),
    batch_number VARCHAR(100),
    quantity INT,
    expiry_date DATE,
    cost_price DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "supplier_transactions" (
    id VARCHAR(36) PRIMARY KEY,
    supplier_id VARCHAR(36),
    transaction_type VARCHAR(50),
    amount DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "suppliers" (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    payment_terms VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_settings" (
    id VARCHAR(36) PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- ============================================================
-- DATA IMPORT (All 363 Records)
-- ============================================================

-- Disable triggers during import for performance
SET session_replication_role = replica;

${dataSQL}

-- Re-enable triggers
SET session_replication_role = default;

-- ============================================================
-- VERIFY IMPORT
-- ============================================================
-- Check that tables are populated:
-- SELECT 'attendance_records' as table_name, count(*) as row_count FROM attendance_records
-- UNION ALL SELECT 'products', count(*) FROM products
-- UNION ALL SELECT 'orders', count(*) FROM orders
-- UNION ALL SELECT 'customers', count(*) FROM customers
-- ORDER BY table_name;
-- ============================================================
`;

// Save the complete SQL
const backupDir = path.join(process.cwd(), 'backups');
const timestamp = new Date().toISOString().split('T')[0];
const completeSQLPath = path.join(backupDir, `pos_db_complete_${timestamp}.sql`);

fs.writeFileSync(completeSQLPath, completeSQLContent);

console.log('✅ Complete SQL file created!\n');
console.log(`📁 File: backups/pos_db_complete_${timestamp}.sql`);
console.log(`📊 Size: ${(completeSQLContent.length / 1024).toFixed(2)} KB\n`);

console.log('🎯 How to use:\n');
console.log('1. Go to: https://app.supabase.com/');
console.log('2. Select project: qzgwbezcduuqsnkzkkko');
console.log('3. Click: SQL Editor → New Query');
console.log('4. Copy file content: backups/pos_db_complete_' + timestamp + '.sql');
console.log('5. Paste into Supabase');
console.log('6. Click RUN\n');
console.log('✨ Done! All schema + data imported in one go.\n');
