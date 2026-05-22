import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { posUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logAudit } from "../middleware/audit";

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
      name:        z.string().min(2),
      email:       z.string().email(),
      password:    z.string().min(6),
      role:        z.enum(["admin", "cashier"]),
      permissions: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const hash = await bcrypt.hash(input.password, 10);
      const id = crypto.randomUUID();
      await ctx.db.insert(posUsers).values({
        id,
        name:         input.name,
        email:        input.email.toLowerCase(),
        passwordHash: hash,
        role:         input.role,
        permissions:  input.permissions,
      });
      const user = await ctx.db.query.posUsers.findFirst({ where: eq(posUsers.id, id) });
      const { passwordHash: _, ...safe } = user!;
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "USER_CREATED",
        entityType: "user",
        entityId: id,
        after: { id, name: input.name, email: input.email, role: input.role },
        // password hash is intentionally never logged
      });
      return safe;
    }),

  update: protectedProcedure
    .input(z.object({
      id:          z.string().uuid(),
      name:        z.string().min(2).optional(),
      email:       z.string().email().optional(),
      role:        z.enum(["admin", "cashier"]).optional(),
      permissions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.query.posUsers.findFirst({ where: eq(posUsers.id, input.id) });
      const updateData: any = { updatedAt: new Date() };
      if (input.name) updateData.name = input.name;
      if (input.email) updateData.email = input.email.toLowerCase();
      if (input.role) updateData.role = input.role;
      if (input.permissions) updateData.permissions = input.permissions;

      await ctx.db.update(posUsers)
        .set(updateData)
        .where(eq(posUsers.id, input.id));
        
      const user = await ctx.db.query.posUsers.findFirst({ where: eq(posUsers.id, input.id) });
      const { passwordHash: _, ...safe } = user!;
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "USER_UPDATED",
        entityType: "user",
        entityId: input.id,
        before: { role: before?.role, permissions: before?.permissions },
        after:  { role: input.role, permissions: input.permissions },
      });
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
      await ctx.db.update(posUsers)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(posUsers.id, input.id));
      const user = await ctx.db.query.posUsers.findFirst({ where: eq(posUsers.id, input.id) });
      const { passwordHash: _, ...safe } = user!;
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: input.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "user",
        entityId: input.id,
        after: { isActive: input.isActive },
      });
      return safe;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(posUsers).where(eq(posUsers.id, input.id));
      return { success: true };
    }),
});
