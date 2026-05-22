import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { customers } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export const customersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.customers.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  }),

  // Returns customers whose birthday month+day matches today
  birthdayToday: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day   = today.getDate();
    // Filter by matching month and day (ignore year so it's annual)
    const all = await ctx.db.query.customers.findMany();
    return all.filter((c) => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      return bday.getMonth() + 1 === month && bday.getDate() === day;
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name:     z.string().min(1),
        phone:    z.string().min(1),
        email:    z.string().email().optional().or(z.literal("")),
        address:  z.string().optional(),
        birthday: z.string().optional(), // "YYYY-MM-DD"
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customers.findFirst({
        where: eq(customers.phone, input.phone),
      });
      if (existing) throw new Error("A customer with this phone number already exists");

      const id = crypto.randomUUID();
      await ctx.db.insert(customers).values({
        id,
        name:     input.name,
        phone:    input.phone,
        email:    input.email || null,
        address:  input.address || null,
        birthday: input.birthday ? new Date(input.birthday) : null,
      });

      return ctx.db.query.customers.findFirst({
        where: eq(customers.id, id),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id:       z.string().uuid(),
        name:     z.string().min(1).optional(),
        phone:    z.string().min(1).optional(),
        email:    z.string().email().optional().nullable().or(z.literal("")),
        address:  z.string().optional().nullable(),
        birthday: z.string().optional().nullable(), // "YYYY-MM-DD"
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (data.phone) {
        const existing = await ctx.db.query.customers.findFirst({
          where: eq(customers.phone, data.phone),
        });
        if (existing && existing.id !== id) {
          throw new Error("A customer with this phone number already exists");
        }
      }

      await ctx.db
        .update(customers)
        .set({
          ...data,
          email:    data.email    || null,
          birthday: data.birthday ? new Date(data.birthday) : null,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id));

      return ctx.db.query.customers.findFirst({
        where: eq(customers.id, id),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(customers).where(eq(customers.id, input.id));
      return { success: true };
    }),
});
