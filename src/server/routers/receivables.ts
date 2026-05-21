import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  loyaltyAccounts,
  customerCreditTransactions,
  posUsers,
} from "../db/schema";
import { eq, desc, asc, gt, and, sql } from "drizzle-orm";

export const receivablesRouter = createTRPCRouter({
  // ── Return customer with full credit info + transaction history ───────────
  getCustomerCredit: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
        with: {
          creditTransactions: {
            orderBy: [desc(customerCreditTransactions.createdAt)],
          },
        },
      });
      if (!customer) throw new Error("Customer not found");
      return customer;
    }),

  // ── Manually charge credit (invoice not linked to a POS order) ────────────
  chargeCredit: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        orderId: z.string().optional(),
        amount: z.number().positive(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
      if (!account) throw new Error("Customer not found");
      const limit   = parseFloat(account.creditLimit  ?? "0");
      const balance = parseFloat(account.creditBalance ?? "0");
      if (limit <= 0) throw new Error("This account has no credit facility");
      if (balance + input.amount > limit)
        throw new Error(`Insufficient credit — available: Rs.${(limit - balance).toFixed(2)}`);

      // Atomic increment — never read-modify-write the balance
      await ctx.db
        .update(loyaltyAccounts)
        .set({ creditBalance: sql`credit_balance + ${input.amount}`, updatedAt: new Date() })
        .where(eq(loyaltyAccounts.id, input.customerId));

      const updated = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
      await ctx.db.insert(customerCreditTransactions).values({
        customerId:  input.customerId,
        orderId:     input.orderId ?? null,
        type:        "charge",
        amount:      input.amount.toFixed(2),
        balanceAfter: updated?.creditBalance ?? "0",
        note:        input.note ?? null,
        createdBy:   ctx.userId,
      });
      return updated;
    }),

  // ── Record a cash/bank payment against the outstanding balance ────────────
  recordPayment: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        amount: z.number().positive(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
      if (!account) throw new Error("Customer not found");
      const current = parseFloat(account.creditBalance ?? "0");
      if (current <= 0) throw new Error("No outstanding balance to pay");
      // Cap the deduction at the current balance — never go negative
      const deduction = Math.min(input.amount, current);

      // Atomic decrement, floored at 0
      await ctx.db
        .update(loyaltyAccounts)
        .set({
          creditBalance: sql`GREATEST(0, credit_balance - ${deduction})`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, input.customerId));

      const updated = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
      await ctx.db.insert(customerCreditTransactions).values({
        customerId:   input.customerId,
        type:         "payment",
        amount:       deduction.toFixed(2),
        balanceAfter: updated?.creditBalance ?? "0",
        note:         input.note ?? null,
        createdBy:    ctx.userId,
      });
      return updated;
    }),

  // ── Admin-only: manual balance adjustment ─────────────────────────────────
  adjustCredit: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        amount: z.number(), // positive = add charge, negative = credit
        note: z.string().min(1, "Note is required for adjustments"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.posUsers.findFirst({
        where: eq(posUsers.id, ctx.userId),
      });
      if (user?.role !== "admin") throw new Error("Admin access required");

      await ctx.db
        .update(loyaltyAccounts)
        .set({
          creditBalance: sql`GREATEST(0, credit_balance + ${input.amount})`,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, input.customerId));

      const updated = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
      await ctx.db.insert(customerCreditTransactions).values({
        customerId:   input.customerId,
        type:         "adjustment",
        amount:       input.amount.toFixed(2),
        balanceAfter: updated?.creditBalance ?? "0",
        note:         input.note,
        createdBy:    ctx.userId,
      });
      return updated;
    }),

  // ── Admin-only: update credit limit + terms ───────────────────────────────
  updateCreditLimit: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        creditLimit: z.number().min(0),
        creditTerms: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.posUsers.findFirst({
        where: eq(posUsers.id, ctx.userId),
      });
      if (user?.role !== "admin") throw new Error("Admin access required");

      await ctx.db
        .update(loyaltyAccounts)
        .set({
          creditLimit:  input.creditLimit.toFixed(2),
          creditTerms:  input.creditTerms ?? null,
          updatedAt:    new Date(),
        })
        .where(eq(loyaltyAccounts.id, input.customerId));

      return ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.customerId),
      });
    }),

  // ── Customers with overdue balance (last charge older than N days) ────────
  listOverdue: protectedProcedure
    .input(z.object({ daysOverdue: z.number().int().min(1).default(30) }))
    .query(async ({ ctx, input }) => {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - input.daysOverdue);

      const customers = await ctx.db.query.loyaltyAccounts.findMany({
        where: gt(loyaltyAccounts.creditBalance, "0"),
        with: {
          creditTransactions: {
            where: eq(customerCreditTransactions.type, "charge"),
            orderBy: [desc(customerCreditTransactions.createdAt)],
            limit: 1,
          },
        },
      });

      return customers.filter((c) => {
        const last = c.creditTransactions[0];
        if (!last) return true; // no charge on file → treat as overdue
        return new Date(last.createdAt) < threshold;
      });
    }),

  // ── FIFO aging report ─────────────────────────────────────────────────────
  // For each customer with an outstanding balance, bucket remaining charge
  // amounts by age (FIFO — oldest charges consumed first by payments).
  agingReport: protectedProcedure.query(async ({ ctx }) => {
    const customers = await ctx.db.query.loyaltyAccounts.findMany({
      where: gt(loyaltyAccounts.creditBalance, "0"),
      with: {
        creditTransactions: {
          orderBy: [asc(customerCreditTransactions.createdAt)],
        },
      },
    });

    const now = new Date();

    return customers.map((customer) => {
      // Build array of charges with remaining (unpaid) amounts
      const charges: { date: Date; remaining: number }[] = [];

      for (const tx of customer.creditTransactions) {
        if (tx.type === "charge") {
          charges.push({ date: new Date(tx.createdAt), remaining: parseFloat(tx.amount) });
        } else {
          // payment or adjustment — consume oldest charges first (FIFO)
          let payment = Math.abs(parseFloat(tx.amount));
          for (const charge of charges) {
            if (payment <= 0) break;
            const applied = Math.min(charge.remaining, payment);
            charge.remaining -= applied;
            payment -= applied;
          }
        }
      }

      let bucket0_30 = 0, bucket31_60 = 0, bucket61_90 = 0, bucket90plus = 0;
      for (const charge of charges) {
        if (charge.remaining < 0.005) continue;
        const days = Math.floor((now.getTime() - charge.date.getTime()) / 86_400_000);
        if      (days <= 30) bucket0_30    += charge.remaining;
        else if (days <= 60) bucket31_60   += charge.remaining;
        else if (days <= 90) bucket61_90   += charge.remaining;
        else                 bucket90plus  += charge.remaining;
      }

      return {
        customerId:    customer.id,
        name:          customer.name ?? customer.phone,
        phone:         customer.phone,
        creditBalance: parseFloat(customer.creditBalance ?? "0"),
        creditLimit:   parseFloat(customer.creditLimit   ?? "0"),
        creditTerms:   customer.creditTerms,
        bucket0_30,
        bucket31_60,
        bucket61_90,
        bucket90plus,
      };
    });
  }),

  // ── KPI summary for dashboard cards ──────────────────────────────────────
  summary: protectedProcedure.query(async ({ ctx }) => {
    const customers = await ctx.db.query.loyaltyAccounts.findMany({
      where: gt(loyaltyAccounts.creditBalance, "0"),
      with: {
        creditTransactions: {
          where: eq(customerCreditTransactions.type, "charge"),
          orderBy: [desc(customerCreditTransactions.createdAt)],
          limit: 1,
        },
      },
    });

    const now = new Date();
    const threshold30 = new Date(now.getTime() - 30 * 86_400_000);

    let totalOutstanding = 0;
    let overdueBalance   = 0;
    let totalDaysSum     = 0;
    let customersWithCharge = 0;

    for (const c of customers) {
      const balance = parseFloat(c.creditBalance ?? "0");
      totalOutstanding += balance;
      const lastCharge = c.creditTransactions[0];
      if (lastCharge) {
        const days = Math.floor(
          (now.getTime() - new Date(lastCharge.createdAt).getTime()) / 86_400_000
        );
        totalDaysSum += days;
        customersWithCharge++;
        if (new Date(lastCharge.createdAt) < threshold30) overdueBalance += balance;
      } else {
        overdueBalance += balance; // no charge record → count as overdue
      }
    }

    return {
      totalOutstanding,
      overdueBalance,
      customersWithBalance: customers.length,
      avgDaysOutstanding:
        customersWithCharge > 0
          ? Math.round(totalDaysSum / customersWithCharge)
          : 0,
    };
  }),

  // ── All credit customers (with optional search) ───────────────────────────
  listCustomers: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.loyaltyAccounts.findMany({
        where: gt(loyaltyAccounts.creditLimit, "0"),
        with: {
          creditTransactions: {
            orderBy: [desc(customerCreditTransactions.createdAt)],
            limit: 1,
          },
        },
        orderBy: (la, { desc }) => [desc(la.creditBalance)],
      });

      if (!input.search) return all;
      const s = input.search.toLowerCase();
      return all.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(s) ||
          c.phone.toLowerCase().includes(s)
      );
    }),
});
