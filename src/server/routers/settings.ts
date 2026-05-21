import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { systemSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../middleware/audit";

export const settingsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(systemSettings);
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }),

  upsertMany: protectedProcedure
    .input(z.record(z.string(), z.string()))
    .mutation(async ({ ctx, input }) => {
      const entries = Object.entries(input);
      if (entries.length === 0) return;
      const existing = await ctx.db.select().from(systemSettings);
      const beforeMap = existing.reduce<Record<string, string>>((acc, r) => { acc[r.key] = r.value; return acc; }, {});
      await Promise.all(
        entries.map(([key, value]) =>
          ctx.db
            .insert(systemSettings)
            .values({ key, value })
            .onDuplicateKeyUpdate({ set: { value } })
        )
      );
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "SETTING_CHANGED",
        entityType: "setting",
        before: Object.fromEntries(entries.map(([k]) => [k, beforeMap[k] ?? null])),
        after:  Object.fromEntries(entries),
      });
    }),

  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, input.key),
      });
      return row?.value ?? null;
    }),
});
