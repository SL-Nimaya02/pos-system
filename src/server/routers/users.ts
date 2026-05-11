import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { posUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const usersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.query.posUsers.findMany({
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    });
    // Strip password hashes before returning
    return users.map(({ passwordHash: _, ...u }) => u);
  }),

  create: protectedProcedure
    .input(z.object({
      name:     z.string().min(2),
      email:    z.string().email(),
      password: z.string().min(6),
      role:     z.enum(["admin", "cashier"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const hash = await bcrypt.hash(input.password, 10);
      const [user] = await ctx.db.insert(posUsers).values({
        name:         input.name,
        email:        input.email.toLowerCase(),
        passwordHash: hash,
        role:         input.role,
      }).returning();
      const { passwordHash: _, ...safe } = user;
      return safe;
    }),

  updateRole: protectedProcedure
    .input(z.object({
      id:   z.string().uuid(),
      role: z.enum(["admin", "cashier"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.update(posUsers)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(posUsers.id, input.id))
        .returning();
      const { passwordHash: _, ...safe } = user;
      return safe;
    }),

  resetPassword: protectedProcedure
    .input(z.object({
      id:          z.string().uuid(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const hash = await bcrypt.hash(input.newPassword, 10);
      await ctx.db.update(posUsers)
        .set({ passwordHash: hash, updatedAt: new Date() })
        .where(eq(posUsers.id, input.id));
      return { success: true };
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.update(posUsers)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(posUsers.id, input.id))
        .returning();
      const { passwordHash: _, ...safe } = user;
      return safe;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(posUsers).where(eq(posUsers.id, input.id));
      return { success: true };
    }),
});
