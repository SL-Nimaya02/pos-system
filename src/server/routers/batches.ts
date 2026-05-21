import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { stockBatches, products } from "../db/schema";
import { eq, gt, and, lte, asc, isNotNull, sql } from "drizzle-orm";

export const batchesRouter = createTRPCRouter({
  /** All active batches (remaining > 0) across all products, FEFO order */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.stockBatches.findMany({
      with: { product: { with: { category: true } } },
      orderBy: (b, { asc, sql }) => [
        // null expiry last, then nearest expiry first
        sql`CASE WHEN ${b.expiryDate} IS NULL THEN 1 ELSE 0 END`,
        asc(b.expiryDate),
        asc(b.receivedDate),
      ],
    });
  }),

  /** All batches (including depleted) for a single product */
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.stockBatches.findMany({
        where: eq(stockBatches.productId, input.productId),
        orderBy: (b, { asc, sql }) => [
          sql`CASE WHEN ${b.expiryDate} IS NULL THEN 1 ELSE 0 END`,
          asc(b.expiryDate),
          asc(b.receivedDate),
        ],
      });
    }),

  /** Batches with remaining stock that are expired or expiring within N days */
  listExpiring: protectedProcedure
    .input(z.object({ withinDays: z.number().int().default(30) }))
    .query(async ({ ctx, input }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + input.withinDays);
      return ctx.db.query.stockBatches.findMany({
        where: and(
          gt(stockBatches.quantityRemaining, 0),
          isNotNull(stockBatches.expiryDate),
          lte(stockBatches.expiryDate, cutoff),
        ),
        with: { product: true },
        orderBy: (b, { asc }) => [asc(b.expiryDate)],
      });
    }),

  /** Manually deplete remaining stock of a specific batch (e.g. disposal/write-off) */
  writeOff: protectedProcedure
    .input(z.object({ batchId: z.string().uuid(), quantity: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const batch = await tx.query.stockBatches.findFirst({
          where: eq(stockBatches.id, input.batchId),
        });
        if (!batch) throw new Error("Batch not found");
        const qty = Math.min(input.quantity, batch.quantityRemaining);
        await tx
          .update(stockBatches)
          .set({ quantityRemaining: batch.quantityRemaining - qty })
          .where(eq(stockBatches.id, input.batchId));
        // Also decrement the product stock total
        await tx
          .update(products)
          .set({ stock: sql`GREATEST(0, ${products.stock} - ${qty})` })
          .where(eq(products.id, batch.productId));
        return { writtenOff: qty };
      });
    }),
});
