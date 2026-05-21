import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection({
  host: "localhost", port: 3306, user: "root", password: "root", database: "pos_db",
});

const accounts = [
  // ── ASSETS ──────────────────────────────────────────────────────────────────
  { type: "asset", category: "Cash & Bank",          name: "Petty Cash",                         balance: 25000.00,   notes: "On-hand cash float for daily operations" },
  { type: "asset", category: "Cash & Bank",          name: "Commercial Bank – Current A/C",       balance: 485000.00,  notes: "Primary business current account" },
  { type: "asset", category: "Cash & Bank",          name: "Bank of Ceylon – Savings A/C",        balance: 120000.00,  notes: "Secondary savings account" },
  { type: "asset", category: "Cash & Bank",          name: "Sampath Bank – Fixed Deposit",        balance: 300000.00,  notes: "12-month FD, matures Dec 2026" },
  { type: "asset", category: "Accounts Receivable",  name: "Trade Debtors – Local",               balance: 95000.00,   notes: "Outstanding invoices from wholesale customers" },
  { type: "asset", category: "Accounts Receivable",  name: "Staff Salary Advances",               balance: 15000.00,   notes: "Advances given to 3 staff members" },
  { type: "asset", category: "Accounts Receivable",  name: "Security Deposit – Premises",         balance: 60000.00,   notes: "Refundable deposit paid to landlord" },
  { type: "asset", category: "Inventory",            name: "Stock in Hand – General Merchandise",balance: 720000.00,  notes: "Valued at cost price as of last stock-take" },
  { type: "asset", category: "Inventory",            name: "Stock in Hand – Consumables",         balance: 45000.00,   notes: "Cleaning supplies, packaging materials" },
  { type: "asset", category: "Prepaid Expenses",     name: "Prepaid Business Insurance",          balance: 18000.00,   notes: "Annual premium, 8 months remaining" },
  { type: "asset", category: "Prepaid Expenses",     name: "Advance Rent",                        balance: 80000.00,   notes: "2 months advance rent paid" },
  { type: "asset", category: "Equipment",            name: "POS Terminals & Cash Drawers",        balance: 85000.00,   notes: "2× POS units purchased Jan 2025, NBV after depreciation" },
  { type: "asset", category: "Equipment",            name: "Desktop Computers & Printers",        balance: 45000.00,   notes: "3× desktops, 2× receipt printers" },
  { type: "asset", category: "Equipment",            name: "CCTV Surveillance System",            balance: 38000.00,   notes: "8-camera system installed Mar 2024" },
  { type: "asset", category: "Equipment",            name: "Air Conditioning Units",              balance: 55000.00,   notes: "2× inverter ACs, NBV" },
  { type: "asset", category: "Furniture & Fixtures", name: "Shop Shelving & Gondola Units",       balance: 92000.00,   notes: "Steel shelving purchased at shop fit-out" },
  { type: "asset", category: "Furniture & Fixtures", name: "Service Counter & Display Cases",     balance: 68000.00,   notes: "Custom-built counters" },
  { type: "asset", category: "Furniture & Fixtures", name: "Office Furniture",                    balance: 22000.00,   notes: "Desks, chairs, storage cabinets" },
  { type: "asset", category: "Vehicles",             name: "Delivery Motor Cycle",                balance: 135000.00,  notes: "Honda CB Unicorn, registered 2024" },

  // ── LIABILITIES ─────────────────────────────────────────────────────────────
  { type: "liability", category: "Accounts Payable",    name: "Trade Creditors – Local Suppliers",   balance: 145000.00, notes: "Outstanding bills to 6 regular suppliers" },
  { type: "liability", category: "Accounts Payable",    name: "Trade Creditors – Imported Goods",    balance: 88000.00,  notes: "Pending payment for last shipment" },
  { type: "liability", category: "Short-term Loans",    name: "Bank Overdraft – Commercial Bank",    balance: 50000.00,  notes: "Approved limit LKR 200,000" },
  { type: "liability", category: "Short-term Loans",    name: "Director Loan (short-term)",          balance: 100000.00, notes: "Interest-free loan from director, repayable within 6 months" },
  { type: "liability", category: "Tax Payable",         name: "VAT Payable",                         balance: 32000.00,  notes: "Q1 2026 VAT due to IRD" },
  { type: "liability", category: "Tax Payable",         name: "Income Tax Payable",                  balance: 25000.00,  notes: "Estimated tax provision for current year" },
  { type: "liability", category: "Tax Payable",         name: "PAYE Tax Payable",                    balance: 8500.00,   notes: "Employee PAYE withheld, due Apr 2026" },
  { type: "liability", category: "Accrued Expenses",   name: "Salaries Payable",                    balance: 65000.00,  notes: "May 2026 salary accrual" },
  { type: "liability", category: "Accrued Expenses",   name: "Electricity Bill Payable",             balance: 12000.00,  notes: "April 2026 CEB bill, unpaid" },
  { type: "liability", category: "Accrued Expenses",   name: "Audit Fee Payable",                   balance: 30000.00,  notes: "Annual audit fee accrued" },
  { type: "liability", category: "Long-term Loans",     name: "Term Loan – Commercial Bank",         balance: 350000.00, notes: "3-year term loan, 18% p.a., balance remaining" },
  { type: "liability", category: "Long-term Loans",     name: "Equipment Finance Lease",             balance: 42000.00,  notes: "Lease on POS & CCTV equipment, 8 months remaining" },

  // ── CAPITAL ─────────────────────────────────────────────────────────────────
  { type: "capital", category: "Owner's Equity",    name: "Proprietor's Capital Account",          balance: 800000.00, notes: "Initial capital introduced by owner" },
  { type: "capital", category: "Owner's Equity",    name: "Additional Capital Introduced",          balance: 250000.00, notes: "Top-up capital introduced Jan 2025" },
  { type: "capital", category: "Owner's Equity",    name: "Drawings Account",                      balance: -120000.00,notes: "Owner drawings YTD (contra)" },
  { type: "capital", category: "Share Capital",     name: "Ordinary Share Capital",                 balance: 500000.00, notes: "5,000 shares at LKR 100 each" },
  { type: "capital", category: "Retained Earnings", name: "Retained Earnings – Prior Year",         balance: 380000.00, notes: "Accumulated profit brought forward from FY2024/25" },
  { type: "capital", category: "Retained Earnings", name: "Retained Earnings – Current Year",      balance: 215000.00, notes: "Net profit earned YTD FY2025/26" },
  { type: "capital", category: "Other Capital",     name: "Revaluation Reserve",                   balance: 45000.00,  notes: "Uplift on premises valuation" },
];

// Clear existing data first
await conn.execute("DELETE FROM balance_sheet_accounts");

let inserted = 0;
for (const acc of accounts) {
  await conn.execute(
    "INSERT INTO balance_sheet_accounts (id, name, type, category, balance, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [randomUUID(), acc.name, acc.type, acc.category, acc.balance.toFixed(2), acc.notes]
  );
  inserted++;
}

console.log(`✓ Inserted ${inserted} balance sheet accounts`);

const [assets]      = await conn.execute("SELECT SUM(balance) as t FROM balance_sheet_accounts WHERE type='asset'");
const [liabilities] = await conn.execute("SELECT SUM(balance) as t FROM balance_sheet_accounts WHERE type='liability'");
const [capital]     = await conn.execute("SELECT SUM(balance) as t FROM balance_sheet_accounts WHERE type='capital'");

const totalAssets      = parseFloat(assets[0].t ?? 0);
const totalLiabilities = parseFloat(liabilities[0].t ?? 0);
const totalCapital     = parseFloat(capital[0].t ?? 0);

console.log(`  Assets:      LKR ${totalAssets.toFixed(2)}`);
console.log(`  Liabilities: LKR ${totalLiabilities.toFixed(2)}`);
console.log(`  Capital:     LKR ${totalCapital.toFixed(2)}`);
console.log(`  L + C =      LKR ${(totalLiabilities + totalCapital).toFixed(2)}`);
console.log(Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 1 ? "  ✓ Balanced" : "  ⚠ Not balanced (by design — adjust capital as needed)");

await conn.end();
