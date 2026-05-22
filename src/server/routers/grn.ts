import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { goodsReceipts, goodsReceiptItems, products, stockBatches } from "../db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

function generateGRNNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `GRN-${ymd}-${rand}`;
}

const grnItemSchema = z.object({
  productId:        z.string().uuid(),
  productName:      z.string(),
  quantityReceived: z.number().int().min(1),
  unitCost:         z.string().optional(),
  updateCost:       z.boolean().default(false),
  batchNumber:      z.string().optional(),
  expiryDate:       z.string().optional(),
  condition:        z.enum(["good", "damaged", "partial"]).default("good"),
  itemNotes:        z.string().optional(),
});

export const grnRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.goodsReceipts.findMany({
      with: { supplier: true, items: true },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
    });
  }),

  /** Single-item GRN (legacy, kept for compatibility) */
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
        await tx.insert(goodsReceipts).values({
          id: grnId,
          grnNumber:         generateGRNNumber(),
          supplierId:        input.supplierId ?? null,
          supplierInvoiceNo: input.supplierInvoiceNo ?? null,
          receivedDate:      new Date(input.receivedDate),
          receivedBy:        input.receivedBy ?? null,
          notes:             input.notes ?? null,
        });

        await tx.insert(goodsReceiptItems).values({
          grnId,
          productId:        input.productId,
          productName:      input.productName,
          quantityReceived: input.quantityReceived,
          unitCost:         input.unitCost ?? null,
          batchNumber:      input.batchNumber ?? null,
          expiryDate:       input.expiryDate ? new Date(input.expiryDate) : null,
          condition:        input.condition,
          notes:            input.itemNotes ?? null,
        });

        await tx.update(products).set({
          stock: sql`${products.stock} + ${input.quantityReceived}`,
          ...(input.updateCost && input.unitCost ? { cost: input.unitCost } : {}),
          updatedAt: new Date(),
        }).where(eq(products.id, input.productId));

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

  /** Bulk GRN — multiple items in one receipt */
  createBulk: protectedProcedure
    .input(
      z.object({
        supplierId:        z.string().uuid().optional(),
        supplierInvoiceNo: z.string().optional(),
        receivedDate:      z.string(),
        receivedBy:        z.string().optional(),
        notes:             z.string().optional(),
        items:             z.array(grnItemSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const grnId = crypto.randomUUID();
        const grnNumber = generateGRNNumber();

        await tx.insert(goodsReceipts).values({
          id: grnId,
          grnNumber,
          supplierId:        input.supplierId ?? null,
          supplierInvoiceNo: input.supplierInvoiceNo ?? null,
          receivedDate:      new Date(input.receivedDate),
          receivedBy:        input.receivedBy ?? null,
          notes:             input.notes ?? null,
        });

        for (const item of input.items) {
          await tx.insert(goodsReceiptItems).values({
            grnId,
            productId:        item.productId,
            productName:      item.productName,
            quantityReceived: item.quantityReceived,
            unitCost:         item.unitCost ?? null,
            batchNumber:      item.batchNumber ?? null,
            expiryDate:       item.expiryDate ? new Date(item.expiryDate) : null,
            condition:        item.condition,
            notes:            item.itemNotes ?? null,
          });

          await tx.update(products).set({
            stock: sql`${products.stock} + ${item.quantityReceived}`,
            ...(item.updateCost && item.unitCost ? { cost: item.unitCost } : {}),
            updatedAt: new Date(),
          }).where(eq(products.id, item.productId));

          await tx.insert(stockBatches).values({
            productId:         item.productId,
            batchNumber:       item.batchNumber ?? null,
            expiryDate:        item.expiryDate ? new Date(item.expiryDate) : null,
            receivedDate:      new Date(input.receivedDate),
            quantityReceived:  item.quantityReceived,
            quantityRemaining: item.quantityReceived,
            unitCost:          item.unitCost ?? null,
            notes:             item.itemNotes ?? null,
          });
        }

        return tx.query.goodsReceipts.findFirst({
          where: eq(goodsReceipts.id, grnId),
          with: { supplier: true, items: true },
        });
      });
    }),

  /** Per-supplier GRN summary report */
  supplierSummary: protectedProcedure.query(async ({ ctx }) => {
    const allGRNs = await ctx.db.query.goodsReceipts.findMany({
      with: { supplier: true, items: true },
      orderBy: (g, { desc }) => [desc(g.createdAt)],
    });

    // Group by supplier
    const map: Record<string, {
      supplierId: string | null;
      supplierName: string;
      grnCount: number;
      totalItems: number;
      totalQty: number;
      totalValue: number;
      lastGRN: Date;
    }> = {};

    for (const grn of allGRNs) {
      const key = grn.supplierId ?? "__none__";
      const name = grn.supplier?.name ?? "No Supplier";
      if (!map[key]) {
        map[key] = { supplierId: grn.supplierId ?? null, supplierName: name, grnCount: 0, totalItems: 0, totalQty: 0, totalValue: 0, lastGRN: grn.createdAt };
      }
      map[key].grnCount += 1;
      map[key].totalItems += grn.items.length;
      for (const item of grn.items) {
        map[key].totalQty += item.quantityReceived;
        map[key].totalValue += item.quantityReceived * parseFloat(item.unitCost ?? "0");
      }
      if (grn.createdAt > map[key].lastGRN) map[key].lastGRN = grn.createdAt;
    }

    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue);
  }),
});
