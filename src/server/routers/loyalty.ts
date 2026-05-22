import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { loyaltyAccounts, loyaltyTransactions } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const loyaltyRouter = createTRPCRouter({
  lookup: protectedProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.phone, input.phone),
        with: {
          transactions: {
            limit: 10,
            orderBy: [desc(loyaltyTransactions.createdAt)],
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name:  z.string().min(1),
        phone: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.phone, input.phone),
      });
      if (existing) throw new Error("A loyalty account with this phone already exists");

      const id = crypto.randomUUID();
      await ctx.db.insert(loyaltyAccounts).values({
        id,
        name:  input.name,
        phone: input.phone,
      });
      return ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, id),
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.loyaltyAccounts.findMany({
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });
  }),

  adjustPoints: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        type: z.enum(["earn", "redeem"]),
        points: z.number().int().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.loyaltyAccounts.findFirst({
        where: eq(loyaltyAccounts.id, input.id),
      });
      if (!account) throw new Error("Loyalty account not found");
      if (input.type === "redeem" && account.points < input.points) {
        throw new Error(`Insufficient points — account has ${account.points} pts`);
      }
      const delta = input.type === "earn" ? input.points : -input.points;
      await ctx.db
        .update(loyaltyAccounts)
        .set({ points: sql`points + ${delta}`, updatedAt: new Date() })
        .where(eq(loyaltyAccounts.id, input.id));
      await ctx.db.insert(loyaltyTransactions).values({
        loyaltyAccountId: input.id,
        type: input.type,
        points: input.points,
        description: input.description ?? "Manual adjustment",
      });
      return { success: true };
    }),
});
