import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { products, categories } from "../db/schema";
import { eq, ilike, and, sql } from "drizzle-orm";

export const productsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        activeOnly: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.activeOnly) conditions.push(eq(products.isActive, true));
      if (input.categoryId) conditions.push(eq(products.categoryId, input.categoryId));
      if (input.search) conditions.push(ilike(products.name, `%${input.search}%`));

      return ctx.db.query.products.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        with: { category: true },
        orderBy: (p, { asc }) => [asc(p.name)],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sku: z.string().optional(),
        price: z.string(),
        cost: z.string().optional(),
        stock: z.number().int().default(0),
        categoryId: z.string().uuid().optional(),
        imageUrl: z.string().url().optional(),
        taxRate: z.string().default("0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db.insert(products).values(input).returning();
      return product;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        sku: z.string().optional().nullable(),
        price: z.string().optional(),
        cost: z.string().optional().nullable(),
        stock: z.number().int().optional(),
        isActive: z.boolean().optional(),
        categoryId: z.string().uuid().optional().nullable(),
        taxRate: z.string().optional(),
        imageUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [product] = await ctx.db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return product;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, input.id));
      return { success: true };
    }),

  adjustStock: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      quantityAdded: z.number().int().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .update(products)
        .set({ stock: sql`${products.stock} + ${input.quantityAdded}`, updatedAt: new Date() })
        .where(eq(products.id, input.id))
        .returning();
      return product;
    }),
});

export const categoriesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().default("#6366f1") }))
    .mutation(async ({ ctx, input }) => {
      const [cat] = await ctx.db.insert(categories).values(input).returning();
      return cat;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1), color: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [cat] = await ctx.db
        .update(categories)
        .set({ name: input.name, color: input.color })
        .where(eq(categories.id, input.id))
        .returning();
      return cat;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Unlink products from this category first
      await ctx.db
        .update(products)
        .set({ categoryId: null })
        .where(eq(products.categoryId, input.id));
      await ctx.db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),
});
