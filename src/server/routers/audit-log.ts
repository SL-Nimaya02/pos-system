import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { auditLogs } from "../db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export const auditLogRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit:      z.number().default(25),
        offset:     z.number().default(0),
        action:     z.string().optional(),
        userId:     z.string().optional(),
        entityType: z.string().optional(),
        startDate:  z.string().optional(),
        endDate:    z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.action)     conditions.push(eq(auditLogs.action,     input.action));
      if (input.userId)     conditions.push(eq(auditLogs.userId,     input.userId));
      if (input.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input.startDate)  conditions.push(gte(auditLogs.timestamp, new Date(input.startDate)));
      if (input.endDate) {
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.timestamp, end));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        ctx.db.query.auditLogs.findMany({
          where,
          orderBy: (a, { desc }) => [desc(a.timestamp)],
          limit:  input.limit,
          offset: input.offset,
        }),
        ctx.db
          .select({ total: sql<number>`count(*)` })
          .from(auditLogs)
          .where(where),
      ]);

      return { logs: rows, total: Number(countRows[0]?.total ?? 0) };
    }),

  distinctActions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);
    return rows.map((r) => r.action);
  }),
});
