import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { cashRegisterSessions, cashMovements, orders } from "../db/schema";
import { eq, and, gte, sum, sql, desc } from "drizzle-orm";
import { logAudit } from "../middleware/audit";

export const cashRegisterRouter = createTRPCRouter({
  /** Get the currently open session (with its movements). */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const session = await ctx.db.query.cashRegisterSessions.findFirst({
      where: (s, { eq }) => eq(s.status, "open"),
      with: { movements: { orderBy: (m, { desc }) => [desc(m.createdAt)] } },
      orderBy: (s, { desc }) => [desc(s.openedAt)],
    });
    return session ?? null;
  }),

  /** List the last 30 sessions (open or closed). */
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.cashRegisterSessions.findMany({
      with: { movements: true },
      orderBy: (s, { desc }) => [desc(s.openedAt)],
      limit: 30,
    });
  }),

  /** Open a new register session. Throws if one is already open. */
  openSession: protectedProcedure
    .input(
      z.object({
        openingFloat: z.number().min(0).default(0),
        openedBy: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.cashRegisterSessions.findFirst({
        where: (s, { eq }) => eq(s.status, "open"),
      });
      if (existing) throw new Error("A register session is already open");

      const id = crypto.randomUUID();
      await ctx.db.insert(cashRegisterSessions).values({
        id,
        openingFloat: String(input.openingFloat),
        openedBy: input.openedBy ?? null,
        notes: input.notes ?? null,
        status: "open",
      });
      const session = await ctx.db.query.cashRegisterSessions.findFirst({ where: (s, { eq }) => eq(s.id, id) });
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "SESSION_OPENED",
        entityType: "session",
        entityId: id,
        after: { openingFloat: input.openingFloat, openedBy: input.openedBy ?? null },
      });
      return session;
    }),

  /** Add a cash-in or cash-out movement to an open session. */
  addMovement: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        type: z.enum(["in", "out"]),
        amount: z.number().positive(),
        reason: z.string().min(1),
        performedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const movId = crypto.randomUUID();
        await tx.insert(cashMovements).values({
          id: movId,
          sessionId: input.sessionId,
          type: input.type,
          amount: String(input.amount),
          reason: input.reason,
          performedBy: input.performedBy ?? null,
        });

        if (input.type === "in") {
          await tx
            .update(cashRegisterSessions)
            .set({ cashIn: sql`cash_in + ${String(input.amount)}` })
            .where(eq(cashRegisterSessions.id, input.sessionId));
        } else {
          await tx
            .update(cashRegisterSessions)
            .set({ cashOut: sql`cash_out + ${String(input.amount)}` })
            .where(eq(cashRegisterSessions.id, input.sessionId));
        }

        const movement = await tx.query.cashMovements.findFirst({ where: (m, { eq }) => eq(m.id, movId) });
        void logAudit({
          db: ctx.db,
          userId: ctx.userId,
          action: "CASH_MOVEMENT",
          entityType: "session",
          entityId: input.sessionId,
          metadata: { type: input.type, amount: input.amount, reason: input.reason },
        });
        return movement;
      });
    }),

  /** Close an open session, computing cash/card sales from orders for this period. */
  closeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        actualCash: z.number().min(0),
        closedBy: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.cashRegisterSessions.findFirst({
        where: (s, { eq }) => eq(s.id, input.sessionId),
      });
      if (!session) throw new Error("Session not found");
      if (session.status !== "open") throw new Error("Session is already closed");

      // Tally cash & card sales from paid orders created during this session
      const [cashRow] = await ctx.db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.paymentMethod, "cash"),
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, session.openedAt),
          )
        );
      const cashSales = parseFloat(cashRow?.total ?? "0") || 0;

      const [cardRow] = await ctx.db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.paymentMethod, "card"),
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, session.openedAt),
          )
        );
      const cardSales = parseFloat(cardRow?.total ?? "0") || 0;

      const expectedClosing =
        parseFloat(session.openingFloat ?? "0") +
        cashSales +
        parseFloat(session.cashIn ?? "0") -
        parseFloat(session.cashOut ?? "0");

      await ctx.db
        .update(cashRegisterSessions)
        .set({
          status: "closed",
          closedAt: new Date(),
          closedBy: input.closedBy ?? null,
          closingFloat: String(expectedClosing),
          actualCash: String(input.actualCash),
          cashSales: String(cashSales),
          cardSales: String(cardSales),
          notes: input.notes ?? null,
        })
        .where(eq(cashRegisterSessions.id, input.sessionId));

      const result = {
        expectedClosing,
        actualCash: input.actualCash,
        variance: input.actualCash - expectedClosing,
      };
      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "SESSION_CLOSED",
        entityType: "session",
        entityId: input.sessionId,
        metadata: {
          variance: result.variance,
          actualCash: input.actualCash,
          expectedClosing,
        },
      });
      return result;
    }),

  /** Orders placed during a specific session */
  sessionOrders: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.orders.findMany({
        where: eq(orders.sessionId, input.sessionId),
        with: { items: true },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
      });
    }),

  /** All sessions opened today (for the monitor view) */
  todayLog: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ctx.db.query.cashRegisterSessions.findMany({
      where: gte(cashRegisterSessions.openedAt, today),
      with: { movements: { orderBy: (m, { asc }) => [asc(m.createdAt)] } },
      orderBy: (s, { desc }) => [desc(s.openedAt)],
    });
  }),
});
