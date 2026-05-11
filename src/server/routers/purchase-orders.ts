import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { purchaseOrders, purchaseOrderItems, products } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

function generatePONumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${ymd}-${rand}`;
}

const lineItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().int().min(1),
  unitCost: z.string(),
});

export const purchaseOrdersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.purchaseOrders.findMany({
      with: { supplier: true, items: true },
      orderBy: (po, { desc }) => [desc(po.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.string().uuid().optional(),
      notes: z.string().optional(),
      expectedDate: z.string().optional(),
      items: z.array(lineItemSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const totalAmount = input.items.reduce(
          (sum, i) => sum + parseFloat(i.unitCost) * i.quantity, 0
        ).toFixed(2);

        const [po] = await tx.insert(purchaseOrders).values({
          poNumber: generatePONumber(),
          supplierId: input.supplierId ?? null,
          totalAmount,
          notes: input.notes ?? null,
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
          clerkUserId: "system",
        }).returning();

        await tx.insert(purchaseOrderItems).values(
          input.items.map((i) => ({
            purchaseOrderId: po.id,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: (parseFloat(i.unitCost) * i.quantity).toFixed(2),
          }))
        );

        return po;
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "ordered", "received", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // If receiving, increment stock for each line item
        if (input.status === "received") {
          const po = await tx.query.purchaseOrders.findFirst({
            where: eq(purchaseOrders.id, input.id),
            with: { items: true },
          });
          if (po) {
            for (const item of po.items) {
              await tx.update(products)
                .set({ stock: sql`stock + ${item.quantity}` })
                .where(eq(products.id, item.productId));
            }
          }
        }

        const [updated] = await tx.update(purchaseOrders)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(purchaseOrders.id, input.id))
          .returning();
        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),
});
