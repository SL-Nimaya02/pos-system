import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { orders, orderItems, products } from "../db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

function generateOrderNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${ymd}-${rand}`;
}

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productPrice: z.string(),
  quantity: z.number().int().min(1),
  subtotal: z.string(),
});

export const ordersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]).optional(),
        startDate: z.string().optional(), // ISO date string e.g. "2025-05-01"
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(orders.status, input.status));
      if (input.startDate) conditions.push(gte(orders.createdAt, new Date(input.startDate)));
      if (input.endDate) {
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(orders.createdAt, end));
      }
      return ctx.db.query.orders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { items: true },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: { with: { product: true } } },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        items: z.array(cartItemSchema).min(1),
        subtotal: z.string(),
        taxAmount: z.string().default("0"),
        discountAmount: z.string().default("0"),
        total: z.string(),
        paymentMethod: z.enum(["cash", "card", "stripe_terminal"]),
        cashReceived: z.string().optional(),
        changeDue: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderNumber = generateOrderNumber();

      // Wrap everything in a transaction — if stock update fails, order is rolled back
      return await ctx.db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            status: "completed",
            subtotal: input.subtotal,
            taxAmount: input.taxAmount,
            discountAmount: input.discountAmount,
            total: input.total,
            paymentMethod: input.paymentMethod,
            paymentStatus: "paid",
            cashReceived: input.cashReceived,
            changeDue: input.changeDue,
            note: input.note,
            clerkUserId: ctx.userId,
          })
          .returning();

        await tx.insert(orderItems).values(
          input.items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }))
        );

        // Decrement stock for each item
        for (const item of input.items) {
          await tx
            .update(products)
            .set({ stock: sql`stock - ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }

        return order;
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(orders.id, input.id))
        .returning();
      return order;
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await ctx.db.execute(
      sql`SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total::numeric), 0) as total_revenue,
        COALESCE(AVG(total::numeric), 0) as avg_order_value
      FROM orders 
      WHERE created_at >= ${today.toISOString()} AND status = 'completed'`
    );

    return result.rows[0] as {
      total_orders: string;
      total_revenue: string;
      avg_order_value: string;
    };
  }),

  refund: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      restoreStock: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // Get order + items
        const order = await tx.query.orders.findFirst({
          where: eq(orders.id, input.id),
          with: { items: true },
        });
        if (!order) throw new Error("Order not found");
        if (order.status === "refunded") throw new Error("Order already refunded");

        // Restore stock
        if (input.restoreStock) {
          for (const item of order.items) {
            await tx
              .update(products)
              .set({ stock: sql`stock + ${item.quantity}` })
              .where(eq(products.id, item.productId));
          }
        }

        // Mark as refunded
        const [updated] = await tx
          .update(orders)
          .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, input.id))
          .returning();

        return updated;
      });
    }),
});
