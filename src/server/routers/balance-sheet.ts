import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "../db";
import { balanceSheetAccounts } from "../db/schema";
import { eq, asc } from "drizzle-orm";

const ACCOUNT_TYPE = ["asset", "liability", "capital"] as const;

export const ASSET_CATEGORIES     = ["Cash & Bank", "Accounts Receivable", "Inventory", "Prepaid Expenses", "Equipment", "Furniture & Fixtures", "Vehicles", "Land & Buildings", "Other Assets"] as const;
export const LIABILITY_CATEGORIES = ["Accounts Payable", "Short-term Loans", "Tax Payable", "Accrued Expenses", "Long-term Loans", "Mortgage", "Other Liabilities"] as const;
export const CAPITAL_CATEGORIES   = ["Owner's Equity", "Share Capital", "Retained Earnings", "Other Capital"] as const;

export const balanceSheetRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db
      .select()
      .from(balanceSheetAccounts)
      .orderBy(asc(balanceSheetAccounts.type), asc(balanceSheetAccounts.category), asc(balanceSheetAccounts.name));
  }),

  create: protectedProcedure
    .input(z.object({
      name:     z.string().min(1).max(200),
      type:     z.enum(ACCOUNT_TYPE),
      category: z.string().min(1).max(100),
      balance:  z.number().default(0),
      notes:    z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      await db.insert(balanceSheetAccounts).values({
        id,
        name:     input.name,
        type:     input.type,
        category: input.category,
        balance:  input.balance.toFixed(2),
        notes:    input.notes ?? null,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id:       z.string(),
      name:     z.string().min(1).max(200).optional(),
      category: z.string().min(1).max(100).optional(),
      balance:  z.number().optional(),
      notes:    z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, balance, ...rest } = input;
      await db.update(balanceSheetAccounts)
        .set({
          ...rest,
          ...(balance !== undefined ? { balance: balance.toFixed(2) } : {}),
          updatedAt: new Date(),
        })
        .where(eq(balanceSheetAccounts.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(balanceSheetAccounts).where(eq(balanceSheetAccounts.id, input.id));
    }),
});
