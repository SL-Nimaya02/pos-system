import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { balanceSheetAccounts } from "@/server/db/schema";

const accounts = [
  // ASSETS
  { type: "asset" as const, category: "Cash & Bank",          name: "Petty Cash",                          balance: "25000.00",   notes: "On-hand cash float for daily operations" },
  { type: "asset" as const, category: "Cash & Bank",          name: "Commercial Bank – Current A/C",        balance: "485000.00",  notes: "Primary business current account" },
  { type: "asset" as const, category: "Cash & Bank",          name: "Bank of Ceylon – Savings A/C",         balance: "120000.00",  notes: "Secondary savings account" },
  { type: "asset" as const, category: "Cash & Bank",          name: "Sampath Bank – Fixed Deposit",         balance: "300000.00",  notes: "12-month FD, matures Dec 2026" },
  { type: "asset" as const, category: "Accounts Receivable",  name: "Trade Debtors – Local",                balance: "95000.00",   notes: "Outstanding invoices from wholesale customers" },
  { type: "asset" as const, category: "Accounts Receivable",  name: "Staff Salary Advances",                balance: "15000.00",   notes: "Advances given to 3 staff members" },
  { type: "asset" as const, category: "Accounts Receivable",  name: "Security Deposit – Premises",          balance: "60000.00",   notes: "Refundable deposit paid to landlord" },
  { type: "asset" as const, category: "Inventory",            name: "Stock in Hand – General Merchandise",  balance: "720000.00",  notes: "Valued at cost price as of last stock-take" },
  { type: "asset" as const, category: "Inventory",            name: "Stock in Hand – Consumables",          balance: "45000.00",   notes: "Cleaning supplies, packaging materials" },
  { type: "asset" as const, category: "Prepaid Expenses",     name: "Prepaid Business Insurance",           balance: "18000.00",   notes: "Annual premium, 8 months remaining" },
  { type: "asset" as const, category: "Prepaid Expenses",     name: "Advance Rent",                         balance: "80000.00",   notes: "2 months advance rent paid" },
  { type: "asset" as const, category: "Equipment",            name: "POS Terminals & Cash Drawers",         balance: "85000.00",   notes: "2× POS units, NBV after depreciation" },
  { type: "asset" as const, category: "Equipment",            name: "Desktop Computers & Printers",         balance: "45000.00",   notes: "3× desktops, 2× receipt printers" },
  { type: "asset" as const, category: "Equipment",            name: "CCTV Surveillance System",             balance: "38000.00",   notes: "8-camera system installed Mar 2024" },
  { type: "asset" as const, category: "Equipment",            name: "Air Conditioning Units",               balance: "55000.00",   notes: "2× inverter ACs, NBV" },
  { type: "asset" as const, category: "Furniture & Fixtures", name: "Shop Shelving & Gondola Units",        balance: "92000.00",   notes: "Steel shelving from shop fit-out" },
  { type: "asset" as const, category: "Furniture & Fixtures", name: "Service Counter & Display Cases",      balance: "68000.00",   notes: "Custom-built counters" },
  { type: "asset" as const, category: "Furniture & Fixtures", name: "Office Furniture",                     balance: "22000.00",   notes: "Desks, chairs, storage cabinets" },
  { type: "asset" as const, category: "Vehicles",             name: "Delivery Motor Cycle",                 balance: "135000.00",  notes: "Honda CB Unicorn, registered 2024" },
  // LIABILITIES
  { type: "liability" as const, category: "Accounts Payable",   name: "Trade Creditors – Local Suppliers",  balance: "145000.00", notes: "Outstanding bills to 6 regular suppliers" },
  { type: "liability" as const, category: "Accounts Payable",   name: "Trade Creditors – Imported Goods",   balance: "88000.00",  notes: "Pending payment for last shipment" },
  { type: "liability" as const, category: "Short-term Loans",   name: "Bank Overdraft – Commercial Bank",   balance: "50000.00",  notes: "Approved limit LKR 200,000" },
  { type: "liability" as const, category: "Short-term Loans",   name: "Director Loan (short-term)",         balance: "100000.00", notes: "Interest-free loan from director" },
  { type: "liability" as const, category: "Tax Payable",        name: "VAT Payable",                        balance: "32000.00",  notes: "Q1 2026 VAT due to IRD" },
  { type: "liability" as const, category: "Tax Payable",        name: "Income Tax Payable",                 balance: "25000.00",  notes: "Estimated tax provision for current year" },
  { type: "liability" as const, category: "Tax Payable",        name: "PAYE Tax Payable",                   balance: "8500.00",   notes: "Employee PAYE withheld, due Apr 2026" },
  { type: "liability" as const, category: "Accrued Expenses",  name: "Salaries Payable",                   balance: "65000.00",  notes: "May 2026 salary accrual" },
  { type: "liability" as const, category: "Accrued Expenses",  name: "Electricity Bill Payable",            balance: "12000.00",  notes: "April 2026 CEB bill, unpaid" },
  { type: "liability" as const, category: "Accrued Expenses",  name: "Audit Fee Payable",                  balance: "30000.00",  notes: "Annual audit fee accrued" },
  { type: "liability" as const, category: "Long-term Loans",    name: "Term Loan – Commercial Bank",        balance: "350000.00", notes: "3-year term loan, 18% p.a., balance remaining" },
  { type: "liability" as const, category: "Long-term Loans",    name: "Equipment Finance Lease",            balance: "42000.00",  notes: "Lease on POS & CCTV, 8 months remaining" },
  // CAPITAL
  { type: "capital" as const, category: "Owner's Equity",    name: "Proprietor's Capital Account",         balance: "800000.00", notes: "Initial capital introduced by owner" },
  { type: "capital" as const, category: "Owner's Equity",    name: "Additional Capital Introduced",         balance: "250000.00", notes: "Top-up capital introduced Jan 2025" },
  { type: "capital" as const, category: "Owner's Equity",    name: "Drawings Account",                     balance: "-120000.00",notes: "Owner drawings YTD (contra)" },
  { type: "capital" as const, category: "Share Capital",     name: "Ordinary Share Capital",                balance: "500000.00", notes: "5,000 shares at LKR 100 each" },
  { type: "capital" as const, category: "Retained Earnings", name: "Retained Earnings – Prior Year",        balance: "380000.00", notes: "Accumulated profit brought forward FY2024/25" },
  { type: "capital" as const, category: "Retained Earnings", name: "Retained Earnings – Current Year",     balance: "215000.00", notes: "Net profit earned YTD FY2025/26" },
  { type: "capital" as const, category: "Other Capital",     name: "Revaluation Reserve",                  balance: "45000.00",  notes: "Uplift on premises valuation" },
];

export async function GET() {
  try {
    // Clear existing seed data
    await db.delete(balanceSheetAccounts);

    // Insert all accounts
    for (const acc of accounts) {
      await db.insert(balanceSheetAccounts).values({
        id: crypto.randomUUID(),
        ...acc,
      });
    }

    return NextResponse.json({ ok: true, inserted: accounts.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
