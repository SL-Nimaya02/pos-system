import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/server/db/index.js";
import { orders, orderItems } from "./src/server/db/schema.js";

async function run() {
  console.log("Seeding test orders for today...");
  
  // Find a product to add
  const product = await db.query.products.findFirst();
  if (!product) {
    console.log("No products found! Can't add orders.");
    return;
  }

  const today = new Date();
  
  // Order 1: Completed
  const order1Id = `ORD-${Date.now()}-1`;
  await db.insert(orders).values({
    id: order1Id,
    orderNumber: order1Id,
    clerkUserId: "demo-user",
    status: "completed",
    total: "1500.00",
    subtotal: "1500.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
    paymentMethod: "cash",
    createdAt: today,
    updatedAt: today,
  });
  await db.insert(orderItems).values({
    id: `ITEM-${Date.now()}-1`,
    orderId: order1Id,
    productId: product.id,
    productName: product.name,
    quantity: 1,
    productPrice: "1500.00",
    subtotal: "1500.00"
  });

  // Order 2: Completed
  const order2Id = `ORD-${Date.now()}-2`;
  await db.insert(orders).values({
    id: order2Id,
    orderNumber: order2Id,
    clerkUserId: "demo-user",
    status: "completed",
    total: "3500.00",
    subtotal: "3500.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
    paymentMethod: "card",
    createdAt: today,
    updatedAt: today,
  });
  await db.insert(orderItems).values({
    id: `ITEM-${Date.now()}-2`,
    orderId: order2Id,
    productId: product.id,
    productName: product.name,
    quantity: 2,
    productPrice: "1750.00",
    subtotal: "3500.00"
  });

  // Order 3: Pending
  const order3Id = `ORD-${Date.now()}-3`;
  await db.insert(orders).values({
    id: order3Id,
    orderNumber: order3Id,
    clerkUserId: "demo-user",
    status: "pending",
    total: "2200.00",
    subtotal: "2200.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
    paymentMethod: "cash",
    createdAt: today,
    updatedAt: today,
  });
  await db.insert(orderItems).values({
    id: `ITEM-${Date.now()}-3`,
    orderId: order3Id,
    productId: product.id,
    productName: product.name,
    quantity: 1,
    productPrice: "2200.00",
    subtotal: "2200.00"
  });

  console.log("Orders seeded successfully!");
  process.exit(0);
}

run().catch(console.error);
