import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  categories,
  products,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  orders,
  orderItems,
  loyaltyAccounts,
} from "@/server/db/schema";

// Helper to build a Date for today at a given time
function today(h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
// Helper for a past date (days ago)
function daysAgo(n: number, h = 10, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
}

export async function GET() {
  try {
    // ── 1. Clear existing data (order matters due to FKs) ──────────────────
    await (db as any).delete(orderItems);
    await (db as any).delete(orders);
    await (db as any).delete(purchaseOrderItems);
    await (db as any).delete(purchaseOrders);
    await (db as any).delete(loyaltyAccounts);
    await (db as any).delete(products);
    await (db as any).delete(categories);
    await (db as any).delete(suppliers);

    // ── 2. Categories ──────────────────────────────────────────────────────
    const catIds = {
      beverages: crypto.randomUUID(),
      food:      crypto.randomUUID(),
      snacks:    crypto.randomUUID(),
      desserts:  crypto.randomUUID(),
      bakery:    crypto.randomUUID(),
      grocery:   crypto.randomUUID(),
    };

    await (db as any).insert(categories).values([
      { id: catIds.beverages, name: "Beverages", color: "#3b82f6" },
      { id: catIds.food,      name: "Food",      color: "#10b981" },
      { id: catIds.snacks,    name: "Snacks",    color: "#f59e0b" },
      { id: catIds.desserts,  name: "Desserts",  color: "#ec4899" },
      { id: catIds.bakery,    name: "Bakery",    color: "#8b5cf6" },
      { id: catIds.grocery,   name: "Grocery",   color: "#6b7280" },
    ]);

    // ── 3. Products ────────────────────────────────────────────────────────
    type ProductRow = {
      id: string; name: string; sku: string; price: string; cost: string;
      stock: number; categoryId: string; taxRate: string; description: string;
    };

    const prods: ProductRow[] = [
      // Beverages
      { id: crypto.randomUUID(), name: "Coca Cola 330ml",     sku: "BEV-001", price: "150.00",  cost: "90.00",  stock: 80,  categoryId: catIds.beverages, taxRate: "0",  description: "Chilled cola in a can" },
      { id: crypto.randomUUID(), name: "Sprite 330ml",        sku: "BEV-002", price: "150.00",  cost: "90.00",  stock: 60,  categoryId: catIds.beverages, taxRate: "0",  description: "Lemon-lime sparkling drink" },
      { id: crypto.randomUUID(), name: "Bottled Water 500ml", sku: "BEV-003", price: "60.00",   cost: "30.00",  stock: 120, categoryId: catIds.beverages, taxRate: "0",  description: "Pure mineral water" },
      { id: crypto.randomUUID(), name: "Orange Juice 200ml",  sku: "BEV-004", price: "180.00",  cost: "110.00", stock: 40,  categoryId: catIds.beverages, taxRate: "0",  description: "100% fresh orange juice" },
      { id: crypto.randomUUID(), name: "Iced Tea 500ml",      sku: "BEV-005", price: "200.00",  cost: "120.00", stock: 35,  categoryId: catIds.beverages, taxRate: "0",  description: "Refreshing peach iced tea" },
      // Food
      { id: crypto.randomUUID(), name: "Chicken Burger",      sku: "FD-001",  price: "850.00",  cost: "500.00", stock: 25,  categoryId: catIds.food,      taxRate: "10", description: "Crispy chicken fillet burger" },
      { id: crypto.randomUUID(), name: "Beef Burger",         sku: "FD-002",  price: "950.00",  cost: "580.00", stock: 20,  categoryId: catIds.food,      taxRate: "10", description: "Flame-grilled beef patty burger" },
      { id: crypto.randomUUID(), name: "Veggie Wrap",         sku: "FD-003",  price: "650.00",  cost: "380.00", stock: 15,  categoryId: catIds.food,      taxRate: "10", description: "Fresh garden veggie wrap" },
      { id: crypto.randomUUID(), name: "French Fries (Lg)",   sku: "FD-004",  price: "350.00",  cost: "150.00", stock: 50,  categoryId: catIds.food,      taxRate: "10", description: "Golden crispy large fries" },
      { id: crypto.randomUUID(), name: "Club Sandwich",       sku: "FD-005",  price: "780.00",  cost: "450.00", stock: 18,  categoryId: catIds.food,      taxRate: "10", description: "Triple-layer club sandwich" },
      // Snacks
      { id: crypto.randomUUID(), name: "Lays Classic 40g",    sku: "SN-001",  price: "120.00",  cost: "75.00",  stock: 90,  categoryId: catIds.snacks,    taxRate: "0",  description: "Classic salted potato chips" },
      { id: crypto.randomUUID(), name: "Pringles Original",   sku: "SN-002",  price: "450.00",  cost: "280.00", stock: 30,  categoryId: catIds.snacks,    taxRate: "0",  description: "Original flavour Pringles" },
      { id: crypto.randomUUID(), name: "KitKat 4-finger",     sku: "SN-003",  price: "220.00",  cost: "140.00", stock: 5,   categoryId: catIds.snacks,    taxRate: "0",  description: "Crispy wafer chocolate bar" },
      { id: crypto.randomUUID(), name: "Nips Chocolate",      sku: "SN-004",  price: "80.00",   cost: "50.00",  stock: 0,   categoryId: catIds.snacks,    taxRate: "0",  description: "Bite-size milk chocolates" },
      // Desserts
      { id: crypto.randomUUID(), name: "Chocolate Lava Cake", sku: "DS-001",  price: "550.00",  cost: "300.00", stock: 12,  categoryId: catIds.desserts,  taxRate: "10", description: "Warm molten chocolate cake" },
      { id: crypto.randomUUID(), name: "Vanilla Ice Cream",   sku: "DS-002",  price: "320.00",  cost: "180.00", stock: 22,  categoryId: catIds.desserts,  taxRate: "10", description: "Two scoops of creamy vanilla" },
      { id: crypto.randomUUID(), name: "Mango Sorbet",        sku: "DS-003",  price: "280.00",  cost: "160.00", stock: 3,   categoryId: catIds.desserts,  taxRate: "10", description: "Refreshing mango sorbet" },
      // Bakery
      { id: crypto.randomUUID(), name: "Butter Croissant",    sku: "BK-001",  price: "180.00",  cost: "90.00",  stock: 20,  categoryId: catIds.bakery,    taxRate: "0",  description: "Flaky golden butter croissant" },
      { id: crypto.randomUUID(), name: "Blueberry Muffin",    sku: "BK-002",  price: "220.00",  cost: "110.00", stock: 16,  categoryId: catIds.bakery,    taxRate: "0",  description: "Fresh-baked blueberry muffin" },
      { id: crypto.randomUUID(), name: "Sourdough Loaf",      sku: "BK-003",  price: "680.00",  cost: "350.00", stock: 8,   categoryId: catIds.bakery,    taxRate: "0",  description: "Artisan sourdough bread" },
      // Grocery
      { id: crypto.randomUUID(), name: "Whole Milk 1L",       sku: "GR-001",  price: "290.00",  cost: "200.00", stock: 40,  categoryId: catIds.grocery,   taxRate: "0",  description: "Fresh full-cream milk" },
      { id: crypto.randomUUID(), name: "Free Range Eggs x6",  sku: "GR-002",  price: "350.00",  cost: "240.00", stock: 28,  categoryId: catIds.grocery,   taxRate: "0",  description: "Farm fresh free-range eggs" },
    ];

    await (db as any).insert(products).values(prods);

    const bysku = (sku: string) => prods.find((p) => p.sku === sku)!;

    // ── 4. Suppliers ───────────────────────────────────────────────────────
    const supIds = {
      freshFarms:   crypto.randomUUID(),
      peakBev:      crypto.randomUUID(),
      snackWorld:   crypto.randomUUID(),
      bakerySupply: crypto.randomUUID(),
    };

    await (db as any).insert(suppliers).values([
      { id: supIds.freshFarms,   name: "Fresh Farms Lanka",          contactName: "Kamal Perera",    phone: "0771234567", email: "kamal@freshfarms.lk",    address: "123 Galle Road, Colombo 03",       notes: "Delivers every Monday and Thursday" },
      { id: supIds.peakBev,      name: "Peak Beverages Ltd",         contactName: "Nimal Silva",     phone: "0112345678", email: "orders@peakbev.lk",       address: "45 Industrial Zone, Katunayake",   notes: "Minimum order LKR 10,000" },
      { id: supIds.snackWorld,   name: "SnackWorld Distributors",    contactName: "Priya Fernando",  phone: "0779876543", email: "priya@snackworld.lk",     address: "78 Kandy Road, Kelaniya",          notes: "30-day payment terms available" },
      { id: supIds.bakerySupply, name: "Colombo Bakery Supplies",    contactName: "Ravi Jayawardena",phone: "0115556677", email: "ravi@cbsupplies.lk",      address: "22 Borella Junction, Colombo 08",  notes: "Organic flour specialist" },
    ]);

    // ── 5. Purchase Orders ─────────────────────────────────────────────────
    const poData = [
      {
        id: crypto.randomUUID(), poNumber: "PO-20260519-1001", supplierId: supIds.peakBev,
        status: "received" as const, expectedDate: daysAgo(8), notes: "Monthly beverage restock",
        items: [
          { product: bysku("BEV-001"), qty: 100, cost: "85.00"  },
          { product: bysku("BEV-002"), qty: 80,  cost: "85.00"  },
          { product: bysku("BEV-003"), qty: 150, cost: "28.00"  },
          { product: bysku("BEV-005"), qty: 50,  cost: "115.00" },
        ],
      },
      {
        id: crypto.randomUUID(), poNumber: "PO-20260519-1002", supplierId: supIds.snackWorld,
        status: "ordered" as const, expectedDate: daysAgo(-5), notes: "Snack replenishment",
        items: [
          { product: bysku("SN-001"), qty: 120, cost: "70.00"  },
          { product: bysku("SN-002"), qty: 40,  cost: "265.00" },
          { product: bysku("SN-003"), qty: 60,  cost: "130.00" },
        ],
      },
      {
        id: crypto.randomUUID(), poNumber: "PO-20260519-1003", supplierId: supIds.freshFarms,
        status: "draft" as const, expectedDate: daysAgo(-3), notes: "Weekly grocery restock",
        items: [
          { product: bysku("GR-001"), qty: 60, cost: "190.00" },
          { product: bysku("GR-002"), qty: 48, cost: "225.00" },
        ],
      },
      {
        id: crypto.randomUUID(), poNumber: "PO-20260519-1004", supplierId: supIds.bakerySupply,
        status: "ordered" as const, expectedDate: daysAgo(-6), notes: "Bakery ingredients for the week",
        items: [
          { product: bysku("BK-001"), qty: 40, cost: "85.00"  },
          { product: bysku("BK-002"), qty: 30, cost: "100.00" },
          { product: bysku("BK-003"), qty: 15, cost: "320.00" },
        ],
      },
    ];

    for (const po of poData) {
      const total = po.items.reduce((s, i) => s + parseFloat(i.cost) * i.qty, 0);
      await (db as any).insert(purchaseOrders).values({
        id: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        status: po.status,
        totalAmount: total.toFixed(2),
        expectedDate: po.expectedDate,
        notes: po.notes,
        clerkUserId: "system",
      });
      await (db as any).insert(purchaseOrderItems).values(
        po.items.map((i) => ({
          id: crypto.randomUUID(),
          purchaseOrderId: po.id,
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.qty,
          unitCost: i.cost,
          totalCost: (parseFloat(i.cost) * i.qty).toFixed(2),
        }))
      );
    }

    // ── 6. Orders ──────────────────────────────────────────────────────────
    // TODAY'S orders (show up in dashboard daily view)
    const todaysOrderData = [
      { orderNumber: "ORD-20260519-0001", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "4000.00", changeDue: "115.00",  createdAt: today(9,  15), items: [{ product: bysku("FD-001"), qty: 3 }, { product: bysku("BEV-001"), qty: 4 }, { product: bysku("FD-004"), qty: 2 }] },
      { orderNumber: "ORD-20260519-0002", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(10, 5),  items: [{ product: bysku("DS-001"), qty: 2 }, { product: bysku("DS-002"), qty: 3 }, { product: bysku("BEV-003"), qty: 4 }] },
      { orderNumber: "ORD-20260519-0003", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "5000.00", changeDue: "160.00",  createdAt: today(10, 45), items: [{ product: bysku("FD-002"), qty: 2 }, { product: bysku("FD-005"), qty: 1 }, { product: bysku("BEV-001"), qty: 3 }, { product: bysku("SN-001"), qty: 4 }] },
      { orderNumber: "ORD-20260519-0004", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(11, 30), items: [{ product: bysku("BK-001"), qty: 3 }, { product: bysku("BK-002"), qty: 2 }, { product: bysku("BEV-005"), qty: 2 }] },
      { orderNumber: "ORD-20260519-0005", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "2000.00", changeDue: "90.00",   createdAt: today(12, 10), items: [{ product: bysku("SN-002"), qty: 2 }, { product: bysku("SN-003"), qty: 2 }, { product: bysku("BEV-002"), qty: 3 }] },
      { orderNumber: "ORD-20260519-0006", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(13, 20), items: [{ product: bysku("FD-003"), qty: 2 }, { product: bysku("BEV-001"), qty: 2 }, { product: bysku("DS-003"), qty: 1 }] },
      { orderNumber: "ORD-20260519-0007", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "8000.00", changeDue: "305.00",  createdAt: today(14, 0),  items: [{ product: bysku("FD-001"), qty: 4 }, { product: bysku("FD-004"), qty: 4 }, { product: bysku("BEV-001"), qty: 4 }, { product: bysku("DS-001"), qty: 3 }] },
      { orderNumber: "ORD-20260519-0008", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(15, 30), items: [{ product: bysku("GR-001"), qty: 2 }, { product: bysku("GR-002"), qty: 2 }, { product: bysku("BK-003"), qty: 1 }] },
      { orderNumber: "ORD-20260519-0009", status: "cancelled" as const, paymentMethod: "cash"  as const, paymentStatus: "pending" as const, cashReceived: null,   changeDue: null,       createdAt: today(16, 0),  items: [{ product: bysku("FD-002"), qty: 1 }, { product: bysku("BEV-005"), qty: 1 }] },
      { orderNumber: "ORD-20260519-0010", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(17, 10), items: [{ product: bysku("DS-002"), qty: 3 }, { product: bysku("BK-002"), qty: 3 }, { product: bysku("BEV-003"), qty: 4 }] },
      // Pending / KDS active
      { orderNumber: "ORD-20260519-2001", status: "pending"    as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "2000.00", changeDue: "215.00",  createdAt: today(17, 45), items: [{ product: bysku("FD-001"), qty: 1 }, { product: bysku("FD-004"), qty: 1 }, { product: bysku("BEV-001"), qty: 1 }] },
      { orderNumber: "ORD-20260519-2002", status: "processing" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: today(18, 0),  items: [{ product: bysku("FD-002"), qty: 2 }, { product: bysku("DS-001"), qty: 1 }, { product: bysku("BEV-003"), qty: 2 }] },
      { orderNumber: "ORD-20260519-2003", status: "pending"    as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "1500.00", changeDue: "50.00",   createdAt: today(18, 15), items: [{ product: bysku("FD-005"), qty: 1 }, { product: bysku("SN-002"), qty: 1 }] },
    ];

    // HISTORICAL orders (last 7 days — for charts/weekly revenue)
    const histOrderData = [
      // 1 day ago
      { orderNumber: "ORD-H1-001", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "3500.00", changeDue: "30.00",   createdAt: daysAgo(1, 11, 0),  items: [{ product: bysku("FD-001"), qty: 3 }, { product: bysku("BEV-001"), qty: 3 }, { product: bysku("FD-004"), qty: 2 }] },
      { orderNumber: "ORD-H1-002", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(1, 14, 30), items: [{ product: bysku("DS-001"), qty: 2 }, { product: bysku("BK-002"), qty: 2 }, { product: bysku("BEV-003"), qty: 3 }] },
      { orderNumber: "ORD-H1-003", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "3000.00", changeDue: "60.00",   createdAt: daysAgo(1, 17, 0),  items: [{ product: bysku("FD-002"), qty: 2 }, { product: bysku("BEV-004"), qty: 2 }, { product: bysku("SN-001"), qty: 4 }] },
      // 2 days ago
      { orderNumber: "ORD-H2-001", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(2, 10, 15), items: [{ product: bysku("BK-001"), qty: 4 }, { product: bysku("BEV-005"), qty: 3 }, { product: bysku("BEV-003"), qty: 3 }] },
      { orderNumber: "ORD-H2-002", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "4000.00", changeDue: "180.00",  createdAt: daysAgo(2, 15, 30), items: [{ product: bysku("FD-001"), qty: 2 }, { product: bysku("FD-004"), qty: 3 }, { product: bysku("DS-002"), qty: 2 }, { product: bysku("BEV-001"), qty: 2 }] },
      // 3 days ago
      { orderNumber: "ORD-H3-001", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "5000.00", changeDue: "110.00",  createdAt: daysAgo(3, 9, 30),  items: [{ product: bysku("FD-002"), qty: 3 }, { product: bysku("FD-005"), qty: 2 }, { product: bysku("BEV-002"), qty: 4 }, { product: bysku("SN-001"), qty: 3 }] },
      { orderNumber: "ORD-H3-002", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(3, 13, 0),  items: [{ product: bysku("GR-001"), qty: 4 }, { product: bysku("GR-002"), qty: 3 }] },
      // 4 days ago
      { orderNumber: "ORD-H4-001", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(4, 11, 45), items: [{ product: bysku("SN-002"), qty: 3 }, { product: bysku("SN-003"), qty: 4 }, { product: bysku("BEV-001"), qty: 3 }] },
      { orderNumber: "ORD-H4-002", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "3000.00", changeDue: "170.00",  createdAt: daysAgo(4, 16, 15), items: [{ product: bysku("FD-001"), qty: 2 }, { product: bysku("DS-001"), qty: 3 }, { product: bysku("BEV-003"), qty: 2 }] },
      // 5 days ago
      { orderNumber: "ORD-H5-001", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "2000.00", changeDue: "140.00",  createdAt: daysAgo(5, 10, 0),  items: [{ product: bysku("BK-003"), qty: 2 }, { product: bysku("BEV-003"), qty: 4 }, { product: bysku("BEV-005"), qty: 2 }] },
      { orderNumber: "ORD-H5-002", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(5, 14, 0),  items: [{ product: bysku("FD-003"), qty: 4 }, { product: bysku("DS-003"), qty: 2 }, { product: bysku("SN-001"), qty: 3 }] },
      // 6 days ago
      { orderNumber: "ORD-H6-001", status: "completed" as const, paymentMethod: "cash"  as const, paymentStatus: "paid" as const, cashReceived: "7000.00", changeDue: "425.00",  createdAt: daysAgo(6, 12, 30), items: [{ product: bysku("FD-002"), qty: 3 }, { product: bysku("FD-004"), qty: 3 }, { product: bysku("BEV-005"), qty: 2 }, { product: bysku("DS-002"), qty: 3 }] },
      { orderNumber: "ORD-H6-002", status: "completed" as const, paymentMethod: "card"  as const, paymentStatus: "paid" as const, cashReceived: null,      changeDue: null,       createdAt: daysAgo(6, 17, 0),  items: [{ product: bysku("SN-001"), qty: 5 }, { product: bysku("BEV-004"), qty: 3 }, { product: bysku("BK-002"), qty: 2 }] },
    ];

    const allOrderData = [...todaysOrderData, ...histOrderData];
    let orderCount = 0;

    for (const o of allOrderData) {
      const orderId = crypto.randomUUID();
      const subtotal  = o.items.reduce((s, i) => s + parseFloat(i.product.price) * i.qty, 0);
      const taxAmount = o.items.reduce((s, i) => s + parseFloat(i.product.price) * i.qty * (parseFloat(i.product.taxRate ?? "0") / 100), 0);
      const total = subtotal + taxAmount;

      await (db as any).insert(orders).values({
        id: orderId,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: "0.00",
        total: total.toFixed(2),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        cashReceived: o.cashReceived ?? null,
        changeDue: o.changeDue ?? null,
        clerkUserId: "system",
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
      });

      await (db as any).insert(orderItems).values(
        o.items.map((i) => ({
          id: crypto.randomUUID(),
          orderId,
          productId: i.product.id,
          productName: i.product.name,
          productPrice: i.product.price,
          quantity: i.qty,
          subtotal: (parseFloat(i.product.price) * i.qty).toFixed(2),
        }))
      );
      orderCount++;
    }

    // ── 7. Loyalty Accounts ────────────────────────────────────────────────
    await (db as any).insert(loyaltyAccounts).values([
      { id: crypto.randomUUID(), phone: "0771234567", name: "Amal Perera",       points: 450,  totalSpend: "15200.00" },
      { id: crypto.randomUUID(), phone: "0712345678", name: "Sasha Fernando",    points: 1200, totalSpend: "42800.00" },
      { id: crypto.randomUUID(), phone: "0769876543", name: "Ravi Kumar",        points: 80,   totalSpend: "2650.00"  },
      { id: crypto.randomUUID(), phone: "0754321098", name: "Nadee Wijesinghe", points: 330,  totalSpend: "11400.00" },
    ]);

    return NextResponse.json({
      ok: true,
      categories: 6,
      products: prods.length,
      suppliers: 4,
      purchaseOrders: poData.length,
      orders: orderCount,
      loyaltyAccounts: 4,
    });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
