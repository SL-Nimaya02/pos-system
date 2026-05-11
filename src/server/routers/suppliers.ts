import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { suppliers } from "../db/schema";
import { eq } from "drizzle-orm";

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
    }))
    .mutation(async ({ ctx, input }) => {
      const [supplier] = await ctx.db.insert(suppliers).values({
        name: input.name,
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
      }).returning();
      return supplier;
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [supplier] = await ctx.db
        .update(suppliers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning();
      return supplier;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(suppliers).where(eq(suppliers.id, input.id));
      return { success: true };
    }),
});
