"use client";

import { useState } from "react";
import {
  HelpCircle, Store, Package, Box, FileText,
  BarChart3, Users, Settings, LayoutDashboard,
  ShoppingCart, Plus, Minus, CreditCard, Banknote,
  ChevronDown, ChevronRight, CheckCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const sections = [
  {
    id: "overview",
    icon: LayoutDashboard,
    title: "System Overview",
    color: "text-brand-600",
    bg: "bg-brand-50",
    content: `This POS (Point of Sale) system is designed for retail stores and food outlets. 
It handles everything from selling products at the counter to managing your stock and viewing daily reports.

The system has 8 modules:
• POS Screen — where you ring up sales
• Products — manage your product catalogue
• Inventory — monitor stock levels
• GRN (Stock In) — record incoming stock from suppliers
• Reports — view today's sales summary
• Customers — full order history
• Settings — configure your store
• Dashboard — a bird's eye view of your business`,
  },
  {
    id: "pos",
    icon: Store,
    title: "How to Make a Sale (POS Screen)",
    color: "text-blue-600",
    bg: "bg-blue-50",
    steps: [
      "Go to POS Screen from the sidebar",
      "Browse products in the grid on the left. Use the Search bar or Category tabs to filter",
      "Click the green + button on any product card to add it to the cart",
      "In the cart (right panel), adjust quantities using the – and + buttons",
      "Apply a discount (in LKR) in the totals section if needed",
      "Select payment method: Cash or Card",
      "If Cash — enter the amount received; the system will calculate change automatically",
      "Click 'Proceed Payment' to complete the order",
      "Stock is automatically decremented for each item sold",
    ],
    tips: [
      "Out-of-stock products are greyed out and cannot be added",
      "Clear All resets the entire cart",
      "Tax is applied per product based on its individual tax rate",
    ],
  },
  {
    id: "products",
    icon: Package,
    title: "Managing Products",
    color: "text-purple-600",
    bg: "bg-purple-50",
    steps: [
      "Go to Products from the sidebar",
      "Click 'Add Product' to create a new product — fill in Name, Price, SKU, Stock, Tax Rate, and Category",
      "Click the Pencil (✏️) icon on any product row to edit it",
      "Toggle the Active/Inactive switch to hide products from the POS screen without deleting them",
      "Stock levels are colour-coded: Green = In Stock, Amber = Low (≤5), Red = Out of Stock",
    ],
    tips: [
      "SKU (Stock Keeping Unit) is optional but helps identify products quickly",
      "Tax Rate is per-product — set to 0 for tax-exempt items",
      "Deactivated products still appear here but won't show on the POS screen",
      "Use GRN (Stock In) to add stock — don't manually increase it here unless correcting a count",
    ],
  },
  {
    id: "inventory",
    icon: Box,
    title: "Inventory Management",
    color: "text-amber-600",
    bg: "bg-amber-50",
    steps: [
      "Go to Inventory from the sidebar",
      "View all products with their current stock levels and status badges",
      "Use the + button to add 1 unit or – to remove 1 unit directly from this screen",
      "Use the Search bar to quickly find a specific product",
    ],
    tips: [
      "Use this page for quick stock corrections (e.g. damaged goods)",
      "For bulk stock arrivals from suppliers, use GRN instead",
      "Products with stock ≤ 5 show as 'Low Stock' and appear in the Dashboard alert",
    ],
  },
  {
    id: "grn",
    icon: FileText,
    title: "GRN — Recording Stock In",
    color: "text-green-600",
    bg: "bg-green-50",
    steps: [
      "Go to GRN (Stock In) from the sidebar",
      "Select the product you received stock for from the dropdown",
      "The preview shows current stock → new stock after adding",
      "Enter the quantity received",
      "Optionally add a note (e.g. 'Supplier delivery from ABC Ltd')",
      "Click 'Record Stock In' — stock is immediately updated in the database",
      "Session history on the right tracks everything you've recorded this session",
    ],
    tips: [
      "GRN stands for Goods Received Note — a standard supply chain document",
      "The session history resets when you navigate away (it's not saved to the DB yet)",
      "Always use GRN for supplier deliveries to maintain a proper audit trail",
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    title: "Reports",
    color: "text-red-600",
    bg: "bg-red-50",
    steps: [
      "Go to Reports from the sidebar",
      "View today's key metrics: Total Revenue, Total Orders, and Average Order Value",
      "Scroll down to see the list of all completed orders for today",
      "Each order shows the order number, time, items count, payment method, and total",
    ],
    tips: [
      "Only 'Completed' orders count towards today's revenue",
      "Cancelled orders are excluded from totals",
      "For full order history (all dates), use the Customers page",
    ],
  },
  {
    id: "customers",
    icon: Users,
    title: "Customers & Order History",
    color: "text-pink-600",
    bg: "bg-pink-50",
    steps: [
      "Go to Customers from the sidebar",
      "View summary cards at the top: Total Orders, Revenue, Avg Order Value, Cash/Card split",
      "The full order table shows every order ever placed with date, items, payment and status",
    ],
    tips: [
      "Orders with status 'Cancelled' are shown in red",
      "Use this page to look up a specific past order",
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    color: "text-surface-600",
    bg: "bg-surface-100",
    steps: [
      "Go to Settings from the sidebar",
      "Store Details tab — set your store name, currency, address, phone, and default tax rate",
      "Receipt tab — customise the footer message shown on receipts; preview updates in real time",
      "Payment tab — toggle Cash and Card payment methods on or off",
      "Click 'Save Settings' — settings are stored in your browser's local storage",
    ],
    tips: [
      "Settings are browser-local for now — they won't sync across devices",
      "The receipt preview shows how your receipt header will look",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    color: "text-brand-600",
    bg: "bg-brand-50",
    steps: [
      "Go to Dashboard from the sidebar",
      "Top row shows today's key stats pulled live from the database",
      "Recent Orders shows the last 5 completed orders",
      "Low Stock Alert highlights any product with 5 or fewer units remaining",
    ],
    tips: [
      "Stats reset at midnight — they only count orders from today",
      "Click on individual pages to manage the flagged items",
    ],
  },
];

export default function HelpPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState<string | null>("pos");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <HelpCircle size={24} className="text-brand-600" /> {t.help.title}
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          A complete walkthrough of every module in the POS system
        </p>
      </div>

      {/* Quick start banner */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
          <ShoppingCart size={20} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-brand-900">Quick Start</p>
          <ol className="text-sm text-brand-800 mt-1 space-y-1">
            <li className="flex items-center gap-2"><CheckCircle size={13} className="shrink-0" /> Add your products via the <strong>Products</strong> page</li>
            <li className="flex items-center gap-2"><CheckCircle size={13} className="shrink-0" /> Go to <strong>POS Screen</strong> to start selling</li>
            <li className="flex items-center gap-2"><CheckCircle size={13} className="shrink-0" /> Check <strong>Dashboard</strong> and <strong>Reports</strong> for daily performance</li>
            <li className="flex items-center gap-2"><CheckCircle size={13} className="shrink-0" /> Use <strong>GRN</strong> when stock arrives from suppliers</li>
          </ol>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-3">
        {sections.map((s) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className={`card overflow-hidden transition-all ${isOpen ? "ring-1 ring-brand-200" : ""}`}>
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon size={18} className={s.color} />
                  </div>
                  <span className="font-semibold text-surface-800">{s.title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-surface-400" /> : <ChevronRight size={16} className="text-surface-400" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-surface-100">
                  {/* Overview text */}
                  {"content" in s && s.content && (
                    <p className="text-sm text-surface-600 mt-4 whitespace-pre-line leading-relaxed">{s.content}</p>
                  )}

                  {/* Steps */}
                  {"steps" in s && s.steps && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Step by Step</p>
                      <ol className="space-y-2">
                        {s.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-surface-700">
                            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Tips */}
                  {"tips" in s && s.tips && (
                    <div className="mt-4 bg-amber-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">💡 Tips</p>
                      <ul className="space-y-1.5">
                        {s.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="mt-1 shrink-0">•</span>{tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
