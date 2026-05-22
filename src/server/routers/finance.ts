import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { financialEntries, orders, cashMovements, supplierTransactions } from "../db/schema";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import { logAudit } from "../middleware/audit";
const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Supplies",
  "Marketing",
  "Maintenance",
  "Insurance",
  "Transport",
  "Other",
] as const;

const INCOME_CATEGORIES = [
  "Investment",
  "Grant",
  "Rental Income",
  "Interest",
  "Other",
] as const;

export const financeRouter = createTRPCRouter({
  // ── List entries ────────────────────────────────────────────────────────────
  listExpenses: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(financialEntries.type, "expense")];
      if (input.startDate) conditions.push(gte(financialEntries.date, new Date(input.startDate)));
      if (input.endDate) {
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(financialEntries.date, end));
      }
      return ctx.db.query.financialEntries.findMany({
        where: and(...conditions),
        orderBy: (e, { desc }) => [desc(e.date)],
      });
    }),

  listIncome: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(financialEntries.type, "income")];
      if (input.startDate) conditions.push(gte(financialEntries.date, new Date(input.startDate)));
      if (input.endDate) {
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(financialEntries.date, end));
      }
      return ctx.db.query.financialEntries.findMany({
        where: and(...conditions),
        orderBy: (e, { desc }) => [desc(e.date)],
      });
    }),

  // ── Totals for P&L (used by reports page) ──────────────────────────────────
  totals: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? new Date(input.startDate) : new Date(0);
      const end   = input.endDate
        ? (() => { const d = new Date(input.endDate!); d.setHours(23, 59, 59, 999); return d; })()
        : new Date();

      const result = await ctx.db.execute(
        sql`SELECT
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_other_income
        FROM financial_entries
        WHERE date >= ${start}
          AND date <= ${end}`
      );

      const rows = result as unknown as Array<{
        total_expenses:     string;
        total_other_income: string;
      }>;
      return rows[0] ?? { total_expenses: "0", total_other_income: "0" };
    }),

  // ── Create ──────────────────────────────────────────────────────────────────
  addExpense: protectedProcedure
    .input(z.object({
      category:    z.enum(EXPENSE_CATEGORIES),
      description: z.string().optional(),
      amount:      z.string(),
      date:        z.string(), // ISO date "YYYY-MM-DD"
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(financialEntries).values({
        id,
        type:        "expense",
        category:    input.category,
        description: input.description,
        amount:      input.amount,
        date:        new Date(input.date),
      });
      const entry = await ctx.db.query.financialEntries.findFirst({ where: eq(financialEntries.id, id) });
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "EXPENSE_ADDED",
        entityType: "finance",
        entityId: id,
        after: { category: input.category, amount: input.amount, date: input.date },
      });
      return entry;
    }),

  addIncome: protectedProcedure
    .input(z.object({
      category:    z.enum(INCOME_CATEGORIES),
      description: z.string().optional(),
      amount:      z.string(),
      date:        z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(financialEntries).values({
        id,
        type:        "income",
        category:    input.category,
        description: input.description,
        amount:      input.amount,
        date:        new Date(input.date),
      });
      return ctx.db.query.financialEntries.findFirst({ where: eq(financialEntries.id, id) });
    }),

  // ── Delete ──────────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(financialEntries).where(eq(financialEntries.id, input.id));
      return { success: true };
    }),

  // ── Meta ────────────────────────────────────────────────────────────────────
  expenseCategories: protectedProcedure.query(() => [...EXPENSE_CATEGORIES]),
  incomeCategories:  protectedProcedure.query(() => [...INCOME_CATEGORIES]),

  // ── Cash Flow ────────────────────────────────────────────────────────────────
  cashFlow: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate:   z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 29 * 86400000);
      const end   = input.endDate
        ? (() => { const d = new Date(input.endDate!); d.setHours(23, 59, 59, 999); return d; })()
        : new Date();

      // All four data sources in parallel
      const [salesRows, entriesRows, movementsRows, supplierPayRows] = await Promise.all([
        ctx.db.query.orders.findMany({
          where: and(gte(orders.createdAt, start), lte(orders.createdAt, end), eq(orders.paymentStatus, "paid")),
          columns: { total: true, paymentMethod: true, createdAt: true },
        }),
        ctx.db.query.financialEntries.findMany({
          where: and(gte(financialEntries.date, start), lte(financialEntries.date, end)),
          columns: { type: true, amount: true, category: true, date: true },
        }),
        ctx.db.query.cashMovements.findMany({
          where: and(gte(cashMovements.createdAt, start), lte(cashMovements.createdAt, end)),
          columns: { type: true, amount: true, reason: true, createdAt: true },
        }),
        ctx.db.query.supplierTransactions.findMany({
          where: and(
            inArray(supplierTransactions.type, ["payment_cash", "payment_cheque"]),
            gte(supplierTransactions.createdAt, start),
            lte(supplierTransactions.createdAt, end),
          ),
          columns: { type: true, amount: true, supplierId: true, createdAt: true },
          with: { supplier: { columns: { name: true } } },
        }),
      ]);

      // Helper: ISO date key "YYYY-MM-DD" from a Date
      const dk = (d: Date) => d.toISOString().slice(0, 10);

      // Build daily map
      type DayData = {
        salesCash: number; salesCard: number; salesOther: number;
        income: number; cashIn: number;
        expenses: number; cashOut: number; supplierPayments: number;
      };
      const days = new Map<string, DayData>();
      const ensure = (key: string) => {
        if (!days.has(key)) days.set(key, { salesCash: 0, salesCard: 0, salesOther: 0, income: 0, cashIn: 0, expenses: 0, cashOut: 0, supplierPayments: 0 });
        return days.get(key)!;
      };

      for (const o of salesRows) {
        const d = ensure(dk(o.createdAt));
        const amt = parseFloat(o.total);
        if (o.paymentMethod === "cash") d.salesCash += amt;
        else if (o.paymentMethod === "card" || o.paymentMethod === "credit_card" || o.paymentMethod === "debit_card") d.salesCard += amt;
        else d.salesOther += amt;
      }
      for (const e of entriesRows) {
        const d = ensure(dk(e.date));
        if (e.type === "income") d.income += parseFloat(e.amount);
        else d.expenses += parseFloat(e.amount);
      }
      for (const m of movementsRows) {
        const d = ensure(dk(m.createdAt));
        if (m.type === "in") d.cashIn += parseFloat(m.amount);
        else d.cashOut += parseFloat(m.amount);
      }
      for (const sp of supplierPayRows) {
        const d = ensure(dk(sp.createdAt));
        d.supplierPayments += parseFloat(sp.amount);
      }

      // Sort days ascending
      const sorted = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));

      const daily = sorted.map(([date, d]) => ({
        date,
        salesCash:        d.salesCash,
        salesCard:        d.salesCard,
        salesOther:       d.salesOther,
        income:           d.income,
        cashIn:           d.cashIn,
        totalIn:          d.salesCash + d.salesCard + d.salesOther + d.income + d.cashIn,
        expenses:         d.expenses,
        cashOut:          d.cashOut,
        supplierPayments: d.supplierPayments,
        totalOut:         d.expenses + d.cashOut + d.supplierPayments,
        net:              d.salesCash + d.salesCard + d.salesOther + d.income + d.cashIn - d.expenses - d.cashOut - d.supplierPayments,
      }));

      const totals = daily.reduce(
        (acc, d) => ({
          salesCash:        acc.salesCash + d.salesCash,
          salesCard:        acc.salesCard + d.salesCard,
          salesOther:       acc.salesOther + d.salesOther,
          income:           acc.income + d.income,
          cashIn:           acc.cashIn + d.cashIn,
          totalIn:          acc.totalIn + d.totalIn,
          expenses:         acc.expenses + d.expenses,
          cashOut:          acc.cashOut + d.cashOut,
          supplierPayments: acc.supplierPayments + d.supplierPayments,
          totalOut:         acc.totalOut + d.totalOut,
          net:              acc.net + d.net,
        }),
        { salesCash: 0, salesCard: 0, salesOther: 0, income: 0, cashIn: 0, totalIn: 0, expenses: 0, cashOut: 0, supplierPayments: 0, totalOut: 0, net: 0 }
      );

      return { daily, totals };
    }),
});
