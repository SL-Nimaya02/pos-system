import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { products, categories, productVariants } from "../db/schema";
import { eq, like, and, sql } from "drizzle-orm";
import { logAudit } from "../middleware/audit";

type VelocityRow = {
  id: string; name: string; sku: string | null; stock: number;
  price: string; category_name: string | null; units_sold_30d: number;
};

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
      if (input.search) conditions.push(like(products.name, `%${input.search}%`));

      return ctx.db.query.products.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        with: { category: true, variants: { where: (v, { eq }) => eq(v.isActive, true) } },
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
        imageUrl: z.string().url().optional().or(z.literal("")),
        taxRate: z.string().default("0"),
        warrantyInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(products).values({ ...input, id });
      const product = await ctx.db.query.products.findFirst({ where: eq(products.id, id) });
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "PRODUCT_CREATED",
        entityType: "product",
        entityId: id,
        after: { id, name: input.name, sku: input.sku ?? null, price: input.price },
      });
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
        imageUrl: z.string().url().optional().nullable().or(z.literal("")),
        warrantyInfo: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const before = await ctx.db.query.products.findFirst({ where: eq(products.id, id) });
      await ctx.db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
      const after = await ctx.db.query.products.findFirst({ where: eq(products.id, id) });
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "PRODUCT_UPDATED",
        entityType: "product",
        entityId: id,
        before: before ? { name: before.name, price: before.price, stock: before.stock, isActive: before.isActive } : undefined,
        after:  after  ? { name: after.name,  price: after.price,  stock: after.stock,  isActive: after.isActive  } : undefined,
      });
      return after;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, input.id));
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "PRODUCT_DELETED",
        entityType: "product",
        entityId: input.id,
      });
      return { success: true };
    }),

  adjustStock: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      quantityAdded: z.number().int().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const before = await ctx.db.query.products.findFirst({ where: eq(products.id, input.id) });
      await ctx.db
        .update(products)
        .set({ stock: sql`${products.stock} + ${input.quantityAdded}`, updatedAt: new Date() })
        .where(eq(products.id, input.id));
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "STOCK_ADJUSTED",
        entityType: "product",
        entityId: input.id,
        before: { stock: before?.stock ?? 0 },
        after:  { stock: (before?.stock ?? 0) + input.quantityAdded },
        metadata: { quantityAdded: input.quantityAdded },
      });
      return ctx.db.query.products.findFirst({ where: eq(products.id, input.id) });
    }),

  lowStock: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.products.findMany({
      where: (p, { eq, and, lte }) =>
        and(eq(p.isActive, true), lte(p.stock, p.reorderThreshold)),
      with: { category: true },
      orderBy: (p, { asc }) => [asc(p.stock)],
    });
  }),

  /** Stock Value Report — each product with cost × stock */
  stockValueReport: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.stock,
        p.price,
        p.cost,
        c.name   AS category_name,
        c.color  AS category_color,
        COALESCE(p.stock * CAST(p.cost AS DECIMAL(12,2)), 0) AS stock_value,
        COALESCE(p.stock * CAST(p.price AS DECIMAL(12,2)), 0) AS retail_value
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY stock_value DESC
    `);
    type Row = { id: string; name: string; sku: string | null; stock: number; price: string; cost: string | null; category_name: string | null; category_color: string | null; stock_value: number; retail_value: number };
    const data = (rows[0] as Row[]).map(r => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      stock: Number(r.stock),
      price: r.price,
      cost: r.cost,
      categoryName: r.category_name,
      categoryColor: r.category_color,
      stockValue: Number(r.stock_value),
      retailValue: Number(r.retail_value),
    }));
    const totalStockValue  = data.reduce((s, r) => s + r.stockValue,  0);
    const totalRetailValue = data.reduce((s, r) => s + r.retailValue, 0);
    const missingCost      = data.filter(r => !r.cost || r.cost === "0").length;
    return { products: data, totalStockValue, totalRetailValue, missingCost };
  }),

  /** Sales Stock Summary Report — products sold vs remaining in a given period */
  salesStockSummary: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT
          p.id,
          p.name,
          p.sku,
          p.stock AS current_stock,
          c.name AS category_name,
          COALESCE(SUM(
            CASE WHEN o.status = 'completed'
                 AND DATE(o.created_at) >= ${input.startDate}
                 AND DATE(o.created_at) <= ${input.endDate}
            THEN oi.quantity ELSE 0 END
          ), 0) AS units_sold,
          COALESCE(SUM(
            CASE WHEN o.status = 'completed'
                 AND DATE(o.created_at) >= ${input.startDate}
                 AND DATE(o.created_at) <= ${input.endDate}
            THEN oi.quantity * CAST(oi.product_price AS DECIMAL(12,2)) ELSE 0 END
          ), 0) AS revenue_generated
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN \`orders\` o ON o.id = oi.order_id
        WHERE p.is_active = 1
        GROUP BY p.id, p.name, p.sku, p.stock, c.name
        ORDER BY units_sold DESC
      `);
      type Row = { id: string; name: string; sku: string | null; current_stock: number; category_name: string | null; units_sold: number; revenue_generated: number };
      return (rows[0] as Row[]).map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        currentStock: Number(r.current_stock),
        categoryName: r.category_name,
        unitsSold: Number(r.units_sold),
        revenueGenerated: Number(r.revenue_generated),
      }));
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
      const id = crypto.randomUUID();
      await ctx.db.insert(categories).values({ ...input, id });
      return ctx.db.query.categories.findFirst({ where: eq(categories.id, id) });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1), color: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(categories).set({ name: input.name, color: input.color }).where(eq(categories.id, input.id));
      return ctx.db.query.categories.findFirst({ where: eq(categories.id, input.id) });
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

  /** Sales velocity — units sold per product in the last 30 days */
  stockVelocity: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.stock,
        p.price,
        c.name AS category_name,
        COALESCE(SUM(
          CASE WHEN o.status = 'completed'
               AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          THEN oi.quantity ELSE 0 END
        ), 0) AS units_sold_30d
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN \`orders\` o ON o.id = oi.order_id
      WHERE p.is_active = 1
      GROUP BY p.id, p.name, p.sku, p.stock, p.price, c.name
      ORDER BY units_sold_30d DESC
    `);

    return (rows[0] as VelocityRow[]).map((r) => {
      const sold = Number(r.units_sold_30d);
      const velocity: "fast" | "slow" | "dead" =
        sold >= 10 ? "fast" : sold > 0 ? "slow" : "dead";
      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        stock: Number(r.stock),
        price: r.price,
        categoryName: r.category_name,
        unitsSold30d: sold,
        velocity,
      };
    });
  }),
});

// ── Variants Router ────────────────────────────────────────────────────────────
export const variantsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.productVariants.findMany({
        where: and(eq(productVariants.productId, input.productId), eq(productVariants.isActive, true)),
        orderBy: (v, { asc }) => [asc(v.name), asc(v.value)],
      });
    }),

  create: protectedProcedure
    .input(z.object({
      productId: z.string().uuid(),
      name: z.string().min(1).max(100),
      value: z.string().min(1).max(100),
      priceDiff: z.string().default("0"),
      stock: z.number().int().default(0),
      sku: z.string().max(100).optional(),
      barcode: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(productVariants).values({ ...input, id });
      return ctx.db.query.productVariants.findFirst({ where: eq(productVariants.id, id) });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      value: z.string().min(1).max(100).optional(),
      priceDiff: z.string().optional(),
      stock: z.number().int().optional(),
      sku: z.string().max(100).optional().nullable(),
      barcode: z.string().max(100).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await ctx.db.update(productVariants).set(data).where(eq(productVariants.id, id));
      return ctx.db.query.productVariants.findFirst({ where: eq(productVariants.id, id) });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(productVariants).set({ isActive: false }).where(eq(productVariants.id, input.id));
      return { success: true };
    }),

  adjustStock: protectedProcedure
    .input(z.object({ id: z.string().uuid(), quantityAdded: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${input.quantityAdded}` })
        .where(eq(productVariants.id, input.id));
      return ctx.db.query.productVariants.findFirst({ where: eq(productVariants.id, input.id) });
    }),
});

