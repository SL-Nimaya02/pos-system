import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  rawIngredients, recipes, recipeIngredients,
  ingredientAdjustments, orderItems, orders,
} from "../db/schema";
import { eq, and, gte, lte, inArray, sql, desc } from "drizzle-orm";

// ─── Ingredients ─────────────────────────────────────────────────────────────

const ingredientInput = z.object({
  name:         z.string().min(1),
  unit:         z.string().min(1),
  currentStock: z.string().default("0"),
  minStock:     z.string().optional(),
  costPerUnit:  z.string().optional(),
  notes:        z.string().optional(),
});

// ─── Recipes ─────────────────────────────────────────────────────────────────

const recipeIngredientLine = z.object({
  ingredientId: z.string().uuid(),
  quantity:     z.string(), // decimal string
});

const recipeInput = z.object({
  name:         z.string().min(1),
  productId:    z.string().uuid().optional(),
  portionYield: z.number().int().min(1).default(1),
  notes:        z.string().optional(),
  ingredients:  z.array(recipeIngredientLine),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sign of adjustment: received/opening_count = +1, waste/other = depends on raw quantity */
const adjustmentSign = (type: string) =>
  type === "received" || type === "opening_count" || type === "manual_count" ? 1 : -1;

// ─── Router ──────────────────────────────────────────────────────────────────

export const kitchenRouter = createTRPCRouter({

  // ── Raw Ingredients ──────────────────────────────────────────────────────

  listIngredients: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.rawIngredients.findMany({
      where: eq(rawIngredients.isActive, true),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  }),

  createIngredient: protectedProcedure
    .input(ingredientInput)
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(rawIngredients).values({
        id,
        name:         input.name,
        unit:         input.unit,
        currentStock: input.currentStock,
        minStock:     input.minStock ?? "0",
        costPerUnit:  input.costPerUnit ?? "0",
        notes:        input.notes ?? null,
      });
      return { id };
    }),

  updateIngredient: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(ingredientInput))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(rawIngredients).set({
        name:         input.name,
        unit:         input.unit,
        currentStock: input.currentStock,
        minStock:     input.minStock ?? "0",
        costPerUnit:  input.costPerUnit ?? "0",
        notes:        input.notes ?? null,
        updatedAt:    new Date(),
      }).where(eq(rawIngredients.id, input.id));
    }),

  deleteIngredient: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // soft-delete
      await ctx.db.update(rawIngredients)
        .set({ isActive: false })
        .where(eq(rawIngredients.id, input.id));
    }),

  // ── Recipes ──────────────────────────────────────────────────────────────

  listRecipes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.recipes.findMany({
      where: eq(recipes.isActive, true),
      with: {
        product: { columns: { id: true, name: true } },
        ingredients: {
          with: { ingredient: { columns: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: (r, { asc }) => [asc(r.name)],
    });
  }),

  upsertRecipe: protectedProcedure
    .input(z.object({ id: z.string().uuid().optional() }).merge(recipeInput))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const id = input.id ?? crypto.randomUUID();

        if (input.id) {
          await tx.update(recipes).set({
            name:         input.name,
            productId:    input.productId ?? null,
            portionYield: input.portionYield,
            notes:        input.notes ?? null,
          }).where(eq(recipes.id, id));
          // Replace all ingredients
          await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
        } else {
          await tx.insert(recipes).values({
            id,
            name:         input.name,
            productId:    input.productId ?? null,
            portionYield: input.portionYield,
            notes:        input.notes ?? null,
          });
        }

        if (input.ingredients.length > 0) {
          await tx.insert(recipeIngredients).values(
            input.ingredients.map((ing) => ({
              id:           crypto.randomUUID(),
              recipeId:     id,
              ingredientId: ing.ingredientId,
              quantity:     ing.quantity,
            }))
          );
        }

        return { id };
      });
    }),

  deleteRecipe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(recipes).set({ isActive: false }).where(eq(recipes.id, input.id));
    }),

  // ── Adjustments ──────────────────────────────────────────────────────────

  listAdjustments: protectedProcedure
    .input(z.object({
      ingredientId: z.string().uuid().optional(),
      startDate:    z.string().optional(),
      endDate:      z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.ingredientId) conditions.push(eq(ingredientAdjustments.ingredientId, input.ingredientId));
      if (input.startDate)    conditions.push(gte(ingredientAdjustments.date, input.startDate as any));
      if (input.endDate)      conditions.push(lte(ingredientAdjustments.date, input.endDate as any));

      return ctx.db.query.ingredientAdjustments.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { ingredient: { columns: { id: true, name: true, unit: true } } },
        orderBy: [desc(ingredientAdjustments.createdAt)],
      });
    }),

  createAdjustment: protectedProcedure
    .input(z.object({
      ingredientId: z.string().uuid(),
      date:         z.string(),
      type:         z.enum(["received", "waste", "manual_count", "opening_count", "other"]),
      quantity:     z.string(), // always positive — sign applied by type
      reason:       z.string().optional(),
      createdBy:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sign = input.type === "waste" || input.type === "other" ? -1 : 1;
      const qty  = parseFloat(input.quantity) * sign;

      await ctx.db.transaction(async (tx) => {
        await tx.insert(ingredientAdjustments).values({
          id:           crypto.randomUUID(),
          ingredientId: input.ingredientId,
          date:         input.date as any,
          type:         input.type,
          quantity:     String(qty),
          reason:       input.reason ?? null,
          createdBy:    input.createdBy ?? null,
        });

        // Update live stock
        await tx.update(rawIngredients).set({
          currentStock: sql`${rawIngredients.currentStock} + ${qty}`,
          updatedAt:    new Date(),
        }).where(eq(rawIngredients.id, input.ingredientId));
      });
    }),

  // ── Usage Report ─────────────────────────────────────────────────────────
  //
  // For each raw ingredient, calculate:
  //   theoretical_usage  = sum(order_item.qty × recipe_ingredient.qty / recipe.portionYield) in range
  //   received           = sum of "received"/"opening_count" adjustments
  //   waste              = sum of "waste"/"other" adjustments
  //   variance           = theoretical_usage − (received − waste) [positive = over-used / possible theft]
  //   current_stock      = live value from rawIngredients.currentStock

  usageReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate:   z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate + "T00:00:00");
      const end   = new Date(input.endDate   + "T23:59:59");

      // 1. All completed order items in range
      const soldItems = await ctx.db
        .select({
          productId: orderItems.productId,
          qty:       orderItems.quantity,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.status, "completed"),
            gte(orders.createdAt, start),
            lte(orders.createdAt, end),
          )
        );

      // 2. All active recipes with their ingredients
      const allRecipes = await ctx.db.query.recipes.findMany({
        where: eq(recipes.isActive, true),
        with: { ingredients: true },
      });

      // Build map: productId → array of { ingredientId, qty_per_portion, portionYield }
      const productRecipeMap = new Map<string, { ingredientId: string; qtyPerPortion: number; yield: number }[]>();
      for (const recipe of allRecipes) {
        if (!recipe.productId) continue;
        const lines = recipe.ingredients.map((ri) => ({
          ingredientId:   ri.ingredientId,
          qtyPerPortion:  parseFloat(ri.quantity),
          yield:          recipe.portionYield,
        }));
        const existing = productRecipeMap.get(recipe.productId) ?? [];
        productRecipeMap.set(recipe.productId, [...existing, ...lines]);
      }

      // 3. Sum theoretical usage per ingredient
      const theoreticalMap = new Map<string, number>();
      for (const { productId, qty } of soldItems) {
        if (!productId) continue;
        const lines = productRecipeMap.get(productId);
        if (!lines) continue;
        for (const line of lines) {
          const used = (qty * line.qtyPerPortion) / line.yield;
          theoreticalMap.set(line.ingredientId, (theoreticalMap.get(line.ingredientId) ?? 0) + used);
        }
      }

      // 4. Adjustments in range
      const adjRows = await ctx.db.query.ingredientAdjustments.findMany({
        where: and(
          gte(ingredientAdjustments.date, input.startDate as any),
          lte(ingredientAdjustments.date, input.endDate   as any),
        ),
      });

      const adjMap = new Map<string, { received: number; waste: number; other: number }>();
      for (const adj of adjRows) {
        const cur = adjMap.get(adj.ingredientId) ?? { received: 0, waste: 0, other: 0 };
        const q   = parseFloat(adj.quantity);
        if (adj.type === "received" || adj.type === "opening_count" || adj.type === "manual_count") {
          cur.received += q;
        } else {
          cur.waste += Math.abs(q);
        }
        adjMap.set(adj.ingredientId, cur);
      }

      // 5. Gather all relevant ingredient IDs
      const relevantIds = new Set([
        ...theoreticalMap.keys(),
        ...adjMap.keys(),
      ]);

      // 6. Fetch all ingredients
      const allIngredients = await ctx.db.query.rawIngredients.findMany({
        where: eq(rawIngredients.isActive, true),
      });

      // 7. Build report rows
      const rows = allIngredients
        .filter((ing) => relevantIds.has(ing.id) || parseFloat(ing.currentStock) > 0)
        .map((ing) => {
          const theoretical = theoreticalMap.get(ing.id) ?? 0;
          const adj         = adjMap.get(ing.id) ?? { received: 0, waste: 0, other: 0 };
          // Variance: if we received 5kg and should have used 3kg, we expect 2kg remaining.
          // But compare with theoretical: positive variance = used more than expected.
          const variance    = theoretical - adj.received + adj.waste;
          return {
            ingredientId:     ing.id,
            name:             ing.name,
            unit:             ing.unit,
            currentStock:     parseFloat(ing.currentStock),
            minStock:         parseFloat(ing.minStock ?? "0"),
            theoreticalUsage: parseFloat(theoretical.toFixed(3)),
            received:         parseFloat(adj.received.toFixed(3)),
            waste:            parseFloat(adj.waste.toFixed(3)),
            variance:         parseFloat(variance.toFixed(3)),
          };
        });

      return rows;
    }),
});
