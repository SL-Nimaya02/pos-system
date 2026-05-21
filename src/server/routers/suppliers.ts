import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { suppliers, supplierTransactions } from "../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

// Balance contribution: invoices/debit_notes increase what we owe; payments/credit_notes decrease it
function txSign(type: string) {
  return type === "invoice" || type === "debit_note" ? 1 : -1;
}

export const suppliersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.suppliers.findMany({
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      address: z.string().optional(),
      notes: z.string().optional(),
      tier: z.enum(["standard", "silver", "gold", "platinum"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(suppliers).values({
        id,
        name: input.name,
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        tier: input.tier ?? "standard",
      });
      return ctx.db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      contactName: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      tier: z.enum(["standard", "silver", "gold", "platinum"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await ctx.db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(eq(suppliers.id, id));
      return ctx.db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(suppliers).where(eq(suppliers.id, input.id));
      return { success: true };
    }),

  // ── Ledger ────────────────────────────────────────────────────────────────
  listTransactions: protectedProcedure
    .input(z.object({ supplierId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.supplierTransactions.findMany({
        where: eq(supplierTransactions.supplierId, input.supplierId),
        orderBy: [desc(supplierTransactions.createdAt)],
      });
      // Running balance (newest first, so compute ascending then reverse display)
      const ascending = [...rows].reverse();
      let running = 0;
      const withBalance = ascending.map((tx) => {
        running += txSign(tx.type) * parseFloat(tx.amount);
        return { ...tx, runningBalance: running };
      });
      return withBalance.reverse(); // back to newest-first
    }),

  addTransaction: protectedProcedure
    .input(z.object({
      supplierId: z.string().uuid(),
      type: z.enum(["invoice", "payment_cash", "payment_cheque", "credit_note", "debit_note"]),
      amount: z.string(),
      reference: z.string().optional(),
      chequeNumber: z.string().optional(),
      chequeDate: z.string().optional(), // ISO date string
      chequeBank: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(supplierTransactions).values({
        id,
        supplierId: input.supplierId,
        type: input.type,
        amount: parseFloat(input.amount).toFixed(2),
        reference: input.reference || null,
        chequeNumber: input.chequeNumber || null,
        chequeDate: input.chequeDate ? new Date(input.chequeDate) : null,
        chequeBank: input.chequeBank || null,
        chequeStatus: input.type === "payment_cheque" ? "pending" : null,
        notes: input.notes || null,
        createdBy: ctx.session.user?.name ?? null,
      });
      return { id };
    }),

  updateChequeStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      chequeStatus: z.enum(["pending", "cleared", "bounced"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(supplierTransactions)
        .set({ chequeStatus: input.chequeStatus })
        .where(eq(supplierTransactions.id, input.id));
      return { success: true };
    }),

  // Pending cheques across all suppliers
  pendingCheques: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.supplierTransactions.findMany({
      where: and(
        eq(supplierTransactions.type, "payment_cheque"),
        eq(supplierTransactions.chequeStatus, "pending"),
      ),
      with: { supplier: { columns: { id: true, name: true } } },
      orderBy: [desc(supplierTransactions.chequeDate)],
    });
  }),
});
