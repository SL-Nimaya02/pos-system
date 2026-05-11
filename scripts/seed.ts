import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/server/db/schema";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve } from "path";

// Manually parse .env.local
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Clear existing data ──────────────────────────────────────────────────
  console.log("🗑  Clearing old data...");
  await db.execute(sql`
    TRUNCATE
      purchase_order_items, purchase_orders, suppliers,
      order_items, orders,
      loyalty_accounts,
      products, categories
    RESTART IDENTITY CASCADE
  `);

  // ── Categories ───────────────────────────────────────────────────────────
  console.log("📁 Inserting categories...");
  const [beverages, food, snacks, desserts, bakery, grocery] = await db
    .insert(schema.categories)
    .values([
      { name: "Beverages",  color: "#3b82f6" },
      { name: "Food",       color: "#10b981" },
      { name: "Snacks",     color: "#f59e0b" },
      { name: "Desserts",   color: "#ec4899" },
      { name: "Bakery",     color: "#8b5cf6" },
      { name: "Grocery",    color: "#6b7280" },
    ])
    .returning();

  // ── Products ─────────────────────────────────────────────────────────────
  console.log("📦 Inserting products...");
  const insertedProducts = await db
    .insert(schema.products)
    .values([
      // Beverages
      { name: "Coca Cola 330ml",     sku: "BEV-001", price: "150.00",  cost: "90.00",  stock: 80,  categoryId: beverages.id,  taxRate: "0",  description: "Chilled cola in a can"          },
      { name: "Sprite 330ml",        sku: "BEV-002", price: "150.00",  cost: "90.00",  stock: 60,  categoryId: beverages.id,  taxRate: "0",  description: "Lemon-lime sparkling drink"      },
      { name: "Bottled Water 500ml", sku: "BEV-003", price: "60.00",   cost: "30.00",  stock: 120, categoryId: beverages.id,  taxRate: "0",  description: "Pure mineral water"             },
      { name: "Orange Juice 200ml",  sku: "BEV-004", price: "180.00",  cost: "110.00", stock: 40,  categoryId: beverages.id,  taxRate: "0",  description: "100% fresh orange juice"        },
      { name: "Iced Tea 500ml",      sku: "BEV-005", price: "200.00",  cost: "120.00", stock: 35,  categoryId: beverages.id,  taxRate: "0",  description: "Refreshing peach iced tea"      },
      // Food
      { name: "Chicken Burger",      sku: "FD-001",  price: "850.00",  cost: "500.00", stock: 25,  categoryId: food.id,       taxRate: "10", description: "Crispy chicken fillet burger"    },
      { name: "Beef Burger",         sku: "FD-002",  price: "950.00",  cost: "580.00", stock: 20,  categoryId: food.id,       taxRate: "10", description: "Flame-grilled beef patty burger" },
      { name: "Veggie Wrap",         sku: "FD-003",  price: "650.00",  cost: "380.00", stock: 15,  categoryId: food.id,       taxRate: "10", description: "Fresh garden veggie wrap"        },
      { name: "French Fries (Lg)",   sku: "FD-004",  price: "350.00",  cost: "150.00", stock: 50,  categoryId: food.id,       taxRate: "10", description: "Golden crispy large fries"       },
      { name: "Club Sandwich",       sku: "FD-005",  price: "780.00",  cost: "450.00", stock: 18,  categoryId: food.id,       taxRate: "10", description: "Triple-layer club sandwich"      },
      // Snacks
      { name: "Lays Classic 40g",    sku: "SN-001",  price: "120.00",  cost: "75.00",  stock: 90,  categoryId: snacks.id,     taxRate: "0",  description: "Classic salted potato chips"     },
      { name: "Pringles Original",   sku: "SN-002",  price: "450.00",  cost: "280.00", stock: 30,  categoryId: snacks.id,     taxRate: "0",  description: "Original flavour Pringles"       },
      { name: "KitKat 4-finger",     sku: "SN-003",  price: "220.00",  cost: "140.00", stock: 5,   categoryId: snacks.id,     taxRate: "0",  description: "Crispy wafer chocolate bar"      },
      { name: "Nips Chocolate",      sku: "SN-004",  price: "80.00",   cost: "50.00",  stock: 0,   categoryId: snacks.id,     taxRate: "0",  description: "Bite-size milk chocolates"       },
      // Desserts
      { name: "Chocolate Lava Cake", sku: "DS-001",  price: "550.00",  cost: "300.00", stock: 12,  categoryId: desserts.id,   taxRate: "10", description: "Warm molten chocolate cake"      },
      { name: "Vanilla Ice Cream",   sku: "DS-002",  price: "320.00",  cost: "180.00", stock: 22,  categoryId: desserts.id,   taxRate: "10", description: "Two scoops of creamy vanilla"    },
      { name: "Mango Sorbet",        sku: "DS-003",  price: "280.00",  cost: "160.00", stock: 3,   categoryId: desserts.id,   taxRate: "10", description: "Refreshing mango sorbet"         },
      // Bakery
      { name: "Butter Croissant",    sku: "BK-001",  price: "180.00",  cost: "90.00",  stock: 20,  categoryId: bakery.id,     taxRate: "0",  description: "Flaky golden butter croissant"   },
      { name: "Blueberry Muffin",    sku: "BK-002",  price: "220.00",  cost: "110.00", stock: 16,  categoryId: bakery.id,     taxRate: "0",  description: "Fresh-baked blueberry muffin"    },
      { name: "Sourdough Loaf",      sku: "BK-003",  price: "680.00",  cost: "350.00", stock: 8,   categoryId: bakery.id,     taxRate: "0",  description: "Artisan sourdough bread"         },
      // Grocery
      { name: "Whole Milk 1L",       sku: "GR-001",  price: "290.00",  cost: "200.00", stock: 40,  categoryId: grocery.id,    taxRate: "0",  description: "Fresh full-cream milk"           },
      { name: "Free Range Eggs x6",  sku: "GR-002",  price: "350.00",  cost: "240.00", stock: 28,  categoryId: grocery.id,    taxRate: "0",  description: "Farm fresh free-range eggs"      },
    ])
    .returning();

  const bysku = (sku: string) => insertedProducts.find((p) => p.sku === sku)!;

  // ── Suppliers ─────────────────────────────────────────────────────────────
  console.log("🚛 Inserting suppliers...");
  const [freshFarms, peakBeverages, snackWorld, bakerySupply] = await db
    .insert(schema.suppliers)
    .values([
      {
        name: "Fresh Farms Lanka",
        contactName: "Kamal Perera",
        phone: "0771234567",
        email: "kamal@freshfarms.lk",
        address: "123 Galle Road, Colombo 03",
        notes: "Delivers every Monday and Thursday",
      },
      {
        name: "Peak Beverages Ltd",
        contactName: "Nimal Silva",
        phone: "0112345678",
        email: "orders@peakbev.lk",
        address: "45 Industrial Zone, Katunayake",
        notes: "Minimum order LKR 10,000",
      },
      {
        name: "SnackWorld Distributors",
        contactName: "Priya Fernando",
        phone: "0779876543",
        email: "priya@snackworld.lk",
        address: "78 Kandy Road, Kelaniya",
        notes: "30-day payment terms available",
      },
      {
        name: "Colombo Bakery Supplies",
        contactName: "Ravi Jayawardena",
        phone: "0115556677",
        email: "ravi@cbsupplies.lk",
        address: "22 Borella Junction, Colombo 08",
        notes: "Organic flour specialist",
      },
    ])
    .returning();
  console.log(`  ✓ ${4} suppliers`);

  // ── Purchase Orders ───────────────────────────────────────────────────────
  console.log("📋 Inserting purchase orders...");

  const poData = [
    {
      poNumber: "PO-20260511-1001",
      supplierId: peakBeverages.id,
      status: "received" as const,
      expectedDate: new Date("2026-05-08"),
      notes: "Monthly beverage restock",
      items: [
        { product: bysku("BEV-001"), qty: 100, cost: "85.00"  },
        { product: bysku("BEV-002"), qty: 80,  cost: "85.00"  },
        { product: bysku("BEV-003"), qty: 150, cost: "28.00"  },
        { product: bysku("BEV-005"), qty: 50,  cost: "115.00" },
      ],
    },
    {
      poNumber: "PO-20260511-1002",
      supplierId: snackWorld.id,
      status: "ordered" as const,
      expectedDate: new Date("2026-05-14"),
      notes: "Snack replenishment",
      items: [
        { product: bysku("SN-001"), qty: 120, cost: "70.00"  },
        { product: bysku("SN-002"), qty: 40,  cost: "265.00" },
        { product: bysku("SN-003"), qty: 60,  cost: "130.00" },
      ],
    },
    {
      poNumber: "PO-20260511-1003",
      supplierId: freshFarms.id,
      status: "draft" as const,
      expectedDate: new Date("2026-05-16"),
      notes: "Weekly grocery restock",
      items: [
        { product: bysku("GR-001"), qty: 60, cost: "190.00" },
        { product: bysku("GR-002"), qty: 48, cost: "225.00" },
      ],
    },
    {
      poNumber: "PO-20260511-1004",
      supplierId: bakerySupply.id,
      status: "ordered" as const,
      expectedDate: new Date("2026-05-13"),
      notes: "Bakery ingredients for the week",
      items: [
        { product: bysku("BK-001"), qty: 40, cost: "85.00"  },
        { product: bysku("BK-002"), qty: 30, cost: "100.00" },
        { product: bysku("BK-003"), qty: 15, cost: "320.00" },
      ],
    },
  ];

  for (const po of poData) {
    const total = po.items.reduce((s, i) => s + parseFloat(i.cost) * i.qty, 0);
    const [inserted] = await db.insert(schema.purchaseOrders).values({
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      status: po.status,
      totalAmount: total.toFixed(2),
      expectedDate: po.expectedDate,
      notes: po.notes,
      clerkUserId: "system",
    }).returning();

    await db.insert(schema.purchaseOrderItems).values(
      po.items.map((i) => ({
        purchaseOrderId: inserted.id,
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.qty,
        unitCost: i.cost,
        totalCost: (parseFloat(i.cost) * i.qty).toFixed(2),
      }))
    );
    console.log(`  ✓ ${inserted.poNumber} [${inserted.status}]  LKR ${total.toFixed(2)}`);
  }

  // ── Orders (completed + KDS) ──────────────────────────────────────────────
  console.log("🧾 Inserting orders...");

  const orderData = [
    // Completed orders
    { orderNumber: "ORD-20260511-1001", status: "completed" as const, paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "2000.00", changeDue: "50.00",   items: [{ product: bysku("FD-001"), qty: 2 }, { product: bysku("BEV-001"), qty: 2 }, { product: bysku("FD-004"), qty: 1 }] },
    { orderNumber: "ORD-20260511-1002", status: "completed" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                                items: [{ product: bysku("DS-001"), qty: 1 }, { product: bysku("DS-002"), qty: 2 }, { product: bysku("BEV-003"), qty: 2 }] },
    { orderNumber: "ORD-20260511-1003", status: "completed" as const, paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "3000.00", changeDue: "270.00", items: [{ product: bysku("FD-002"), qty: 1 }, { product: bysku("FD-005"), qty: 1 }, { product: bysku("BEV-004"), qty: 2 }, { product: bysku("SN-001"), qty: 2 }] },
    { orderNumber: "ORD-20260511-1004", status: "completed" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                                items: [{ product: bysku("BK-001"), qty: 3 }, { product: bysku("BK-002"), qty: 2 }, { product: bysku("BEV-005"), qty: 2 }] },
    { orderNumber: "ORD-20260511-1005", status: "completed" as const, paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "1000.00", changeDue: "120.00", items: [{ product: bysku("SN-002"), qty: 1 }, { product: bysku("SN-003"), qty: 2 }, { product: bysku("BEV-002"), qty: 2 }] },
    { orderNumber: "ORD-20260511-1006", status: "completed" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                                items: [{ product: bysku("FD-003"), qty: 2 }, { product: bysku("BEV-001"), qty: 1 }, { product: bysku("DS-003"), qty: 1 }] },
    { orderNumber: "ORD-20260511-1007", status: "completed" as const, paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "5000.00", changeDue: "680.00", items: [{ product: bysku("FD-001"), qty: 3 }, { product: bysku("FD-004"), qty: 3 }, { product: bysku("BEV-001"), qty: 3 }, { product: bysku("DS-001"), qty: 2 }] },
    { orderNumber: "ORD-20260511-1008", status: "completed" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                                items: [{ product: bysku("GR-001"), qty: 2 }, { product: bysku("GR-002"), qty: 1 }, { product: bysku("BK-003"), qty: 1 }] },
    { orderNumber: "ORD-20260511-1009", status: "cancelled" as const, paymentMethod: "cash" as const,  paymentStatus: "pending" as const,                                             items: [{ product: bysku("FD-002"), qty: 1 }, { product: bysku("BEV-005"), qty: 1 }] },
    { orderNumber: "ORD-20260511-1010", status: "completed" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                                items: [{ product: bysku("DS-002"), qty: 3 }, { product: bysku("BK-002"), qty: 2 }, { product: bysku("BEV-003"), qty: 3 }] },
    // KDS demo orders — pending & processing (visible on Kitchen Display)
    { orderNumber: "ORD-20260511-2001", status: "pending" as const,    paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "2000.00", changeDue: "215.00", items: [{ product: bysku("FD-001"), qty: 1 }, { product: bysku("FD-004"), qty: 1 }, { product: bysku("BEV-001"), qty: 1 }] },
    { orderNumber: "ORD-20260511-2002", status: "processing" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                               items: [{ product: bysku("FD-002"), qty: 2 }, { product: bysku("DS-001"), qty: 1 }, { product: bysku("BEV-003"), qty: 2 }] },
    { orderNumber: "ORD-20260511-2003", status: "pending" as const,    paymentMethod: "cash" as const,  paymentStatus: "paid" as const, cashReceived: "1500.00", changeDue: "50.00",  items: [{ product: bysku("FD-005"), qty: 1 }, { product: bysku("SN-002"), qty: 1 }] },
    { orderNumber: "ORD-20260511-2004", status: "processing" as const, paymentMethod: "card" as const,  paymentStatus: "paid" as const,                                               items: [{ product: bysku("FD-003"), qty: 2 }, { product: bysku("BEV-005"), qty: 1 }] },
  ];

  for (const o of orderData) {
    const subtotal  = o.items.reduce((s, i) => s + parseFloat(i.product.price) * i.qty, 0);
    const taxAmount = o.items.reduce((s, i) => s + parseFloat(i.product.price) * i.qty * (parseFloat(i.product.taxRate ?? "0") / 100), 0);
    const total     = subtotal + taxAmount;

    const [order] = await db.insert(schema.orders).values({
      orderNumber: o.orderNumber,
      status: o.status,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: "0.00",
      total: total.toFixed(2),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      cashReceived: (o as { cashReceived?: string }).cashReceived ?? null,
      changeDue: (o as { changeDue?: string }).changeDue ?? null,
      clerkUserId: "test_user_123",
    }).returning();

    await db.insert(schema.orderItems).values(
      o.items.map((i) => ({
        orderId: order.id,
        productId: i.product.id,
        productName: i.product.name,
        productPrice: i.product.price,
        quantity: i.qty,
        subtotal: (parseFloat(i.product.price) * i.qty).toFixed(2),
      }))
    );
    console.log(`  ✓ ${order.orderNumber} [${order.status}]  LKR ${total.toFixed(2)}`);
  }

  // ── Loyalty Accounts ─────────────────────────────────────────────────────
  console.log("⭐ Inserting loyalty accounts...");
  await db.insert(schema.loyaltyAccounts).values([
    { phone: "0771234567", name: "Amal Perera",    points: 450,  totalSpend: "15200.00" },
    { phone: "0712345678", name: "Sasha Fernando", points: 1200, totalSpend: "42800.00" },
    { phone: "0769876543", name: "Ravi Kumar",     points: 80,   totalSpend: "2650.00"  },
    { phone: "0754321098", name: "Nadee Wijesinghe", points: 330, totalSpend: "11400.00" },
  ]);
  console.log("  ✓ 4 loyalty accounts");

  console.log("\n✅ Seed complete!");
  console.log(`   ${insertedProducts.length} products · 6 categories`);
  console.log(`   ${4} suppliers · ${poData.length} purchase orders`);
  console.log(`   ${orderData.length} orders (${orderData.filter(o => o.status === "pending" || o.status === "processing").length} KDS active)`);
  console.log(`   4 loyalty accounts`);
  process.exit(0);
}

seed().catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); });
