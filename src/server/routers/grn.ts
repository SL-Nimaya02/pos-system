import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { goodsReceipts, goodsReceiptItems, products, stockBatches } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

function generateGRNNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `GRN-${ymd}-${rand}`;
}

export const grnRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.goodsReceipts.findMany({
      with: { supplier: true, items: true },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        supplierId:        z.string().uuid().optional(),
        supplierInvoiceNo: z.string().optional(),
        receivedDate:      z.string(),
        receivedBy:        z.string().optional(),
        notes:             z.string().optional(),
        // item
        productId:        z.string().uuid(),
        productName:      z.string(),
        quantityReceived: z.number().int().min(1),
        unitCost:         z.string().optional(),
        updateCost:       z.boolean().default(false),
        batchNumber:      z.string().optional(),
        expiryDate:       z.string().optional(),
        condition:        z.enum(["good", "damaged", "partial"]).default("good"),
        itemNotes:        z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const grnId = crypto.randomUUID();
        await tx
          .insert(goodsReceipts)
          .values({
            id: grnId,
            grnNumber:         generateGRNNumber(),
            supplierId:        input.supplierId ?? null,
            supplierInvoiceNo: input.supplierInvoiceNo ?? null,
            receivedDate:      new Date(input.receivedDate),
            receivedBy:        input.receivedBy ?? null,
            notes:             input.notes ?? null,
          });

        await tx.insert(goodsReceiptItems).values({
          grnId:            grnId,
          productId:        input.productId,
          productName:      input.productName,
          quantityReceived: input.quantityReceived,
          unitCost:         input.unitCost ?? null,
          batchNumber:      input.batchNumber ?? null,
          expiryDate:       input.expiryDate ? new Date(input.expiryDate) : null,
          condition:        input.condition,
          notes:            input.itemNotes ?? null,
        });

        // Increment stock; optionally update cost price
        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${input.quantityReceived}`,
            ...(input.updateCost && input.unitCost ? { cost: input.unitCost } : {}),
            updatedAt: new Date(),
          })
          .where(eq(products.id, input.productId));

        // Create FEFO batch record
        await tx.insert(stockBatches).values({
          productId:         input.productId,
          batchNumber:       input.batchNumber ?? null,
          expiryDate:        input.expiryDate ? new Date(input.expiryDate) : null,
          receivedDate:      new Date(input.receivedDate),
          quantityReceived:  input.quantityReceived,
          quantityRemaining: input.quantityReceived,
          unitCost:          input.unitCost ?? null,
          notes:             input.itemNotes ?? null,
        });

        return tx.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.id, grnId) });
      });
    }),
});
