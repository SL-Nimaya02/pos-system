import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { orders, orderItems, products, promotions, loyaltyAccounts, loyaltyTransactions, customerCreditTransactions, systemSettings } from "../db/schema";
import { eq, desc, sql, and, gte, lte, count, sum, avg, max, like, or } from "drizzle-orm";
import { logAudit } from "../middleware/audit";

function generateOrderNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${ymd}-${rand}`;
}

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productPrice: z.string(),
  warrantyInfo: z.string().optional(),
  quantity: z.number().int().min(1),
  subtotal: z.string(),
});

export const ordersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        search: z.string().optional(),
        paymentMethod: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(orders.status, input.status));
      if (input.paymentMethod) conditions.push(eq(orders.paymentMethod, input.paymentMethod as any));
      if (input.search) conditions.push(like(orders.orderNumber, `%${input.search}%`));
      if (input.startDate) conditions.push(gte(orders.createdAt, new Date(input.startDate)));
      if (input.endDate) {
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(orders.createdAt, end));
      }
      return ctx.db.query.orders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { items: true },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: { with: { product: true } } },
      });
    }),

  getByOrderNumber: protectedProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.orders.findFirst({
        where: eq(orders.orderNumber, input.orderNumber),
        with: { items: { with: { product: true } } },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        items: z.array(cartItemSchema).min(1),
        subtotal: z.string(),
        taxAmount: z.string().default("0"),
        discountAmount: z.string().default("0"),
        total: z.string(),
        paymentMethod: z.enum(["cash", "card", "credit_card", "debit_card", "cheque", "stripe_terminal", "account_credit"]),
        cashReceived: z.string().optional(),
        changeDue: z.string().optional(),
        note: z.string().optional(),
        promoCode: z.string().optional(),
        loyaltyPhone: z.string().optional(),
        loyaltyPointsRedeemed: z.number().int().default(0),
        sessionId: z.string().optional(),
        registerId: z.string().optional(),
        stripePaymentIntentId: z.string().optional(),
        creditAccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderNumber = generateOrderNumber();
      const orderId = crypto.randomUUID();

      // Validate and apply promo code server-side
      let promoDiscount = 0;
      if (input.promoCode) {
        const promo = await ctx.db.query.promotions.findFirst({
          where: and(eq(promotions.code, input.promoCode.toUpperCase()), eq(promotions.isActive, true)),
        });
        if (promo) {
          const notExpired = !promo.expiresAt || promo.expiresAt > new Date();
          const notMaxed = !promo.maxUses || promo.usedCount < promo.maxUses;
          const meetsMin = parseFloat(input.subtotal) >= parseFloat(promo.minOrderAmount ?? "0");
          if (notExpired && notMaxed && meetsMin) {
            promoDiscount =
              promo.type === "percentage"
                ? (parseFloat(input.subtotal) * parseFloat(promo.value)) / 100
                : parseFloat(promo.value);
            await ctx.db
              .update(promotions)
              .set({ usedCount: sql`used_count + 1` })
              .where(eq(promotions.id, promo.id));
          }
        }
      }

      // Loyalty: fetch configurable earning rate (default: 100 LKR per point)
      const rateRow = await ctx.db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, "loyaltyEarningRate"),
      });
      const loyaltyEarningRate = parseFloat(rateRow?.value ?? "100") || 100;
      const pointsEarned = Math.floor(parseFloat(input.total) / loyaltyEarningRate);
      const pointsRedeemed = input.loyaltyPointsRedeemed ?? 0;
      const totalDiscount = parseFloat(input.discountAmount) + promoDiscount;

      const now = new Date();
      await ctx.db.insert(orders).values({
        id: orderId,
        orderNumber,
        status: "completed",
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        discountAmount: totalDiscount.toFixed(2),
        total: input.total,
        paymentMethod: input.paymentMethod,
        paymentStatus: "paid",
        cashReceived: input.cashReceived ?? null,
        changeDue: input.changeDue ?? null,
        note: input.note ?? null,
        promoCode: input.promoCode ?? null,
        promoDiscount: promoDiscount.toFixed(2),
        loyaltyPhone: input.loyaltyPhone ?? null,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsRedeemed: pointsRedeemed,
        sessionId: input.sessionId ?? null,
        registerId: input.registerId ?? "REG-1",
        clerkUserId: ctx.userId,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        creditAccountId: input.creditAccountId ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert(orderItems).values(
        input.items.map((item) => ({
          orderId,
          productId: item.productId,
          productName: item.productName,
          productPrice: item.productPrice,
          warrantyInfo: item.warrantyInfo ?? null,
          quantity: item.quantity,
          subtotal: item.subtotal,
          createdAt: now,
        }))
      );

      // Decrement stock for each item
      for (const item of input.items) {
        await ctx.db
          .update(products)
          .set({ stock: sql`stock - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      // Handle loyalty points (upsert account + log transactions)
      if (input.loyaltyPhone) {
        await ctx.db
          .insert(loyaltyAccounts)
          .values({
            phone: input.loyaltyPhone,
            points: pointsEarned - pointsRedeemed,
            totalSpend: input.total,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: loyaltyAccounts.phone,
            set: {
              points: sql`loyalty_accounts.points + ${pointsEarned - pointsRedeemed}`,
              totalSpend: sql`loyalty_accounts.total_spend + ${input.total}`,
              updatedAt: now,
            },
          });

        const account = await ctx.db.query.loyaltyAccounts.findFirst({
          where: eq(loyaltyAccounts.phone, input.loyaltyPhone),
        });
        if (account) {
          if (pointsEarned > 0) {
            await ctx.db.insert(loyaltyTransactions).values({
              loyaltyAccountId: account.id,
              orderId,
              type: "earn",
              points: pointsEarned,
              description: `Earned from order ${orderNumber}`,
              createdAt: now,
            });
          }
          if (pointsRedeemed > 0) {
            await ctx.db.insert(loyaltyTransactions).values({
              loyaltyAccountId: account.id,
              orderId,
              type: "redeem",
              points: pointsRedeemed,
              description: `Redeemed in order ${orderNumber}`,
              createdAt: now,
            });
          }
        }
      }

      const order = await ctx.db.query.orders.findFirst({ where: eq(orders.id, orderId) });

      // ── Account credit: atomic charge ─────────────────────────────────────
      if (input.paymentMethod === "account_credit" && input.creditAccountId) {
        const creditAcct = await ctx.db.query.loyaltyAccounts.findFirst({
          where: eq(loyaltyAccounts.id, input.creditAccountId),
        });
        if (!creditAcct) throw new Error("Credit account not found");
        const limit   = parseFloat(creditAcct.creditLimit  ?? "0");
        const current = parseFloat(creditAcct.creditBalance ?? "0");
        if (limit <= 0)
          throw new Error("This account has no credit facility");
        if (current + parseFloat(input.total) > limit)
          throw new Error(
            `Insufficient credit — available: Rs.${(limit - current).toFixed(2)}`
          );
        // Atomic increment — never read-modify-write the running balance
        await ctx.db
          .update(loyaltyAccounts)
          .set({ creditBalance: sql`credit_balance + ${input.total}`, updatedAt: new Date() })
          .where(eq(loyaltyAccounts.id, input.creditAccountId));
        const afterAcct = await ctx.db.query.loyaltyAccounts.findFirst({
          where: eq(loyaltyAccounts.id, input.creditAccountId),
        });
        await ctx.db.insert(customerCreditTransactions).values({
          customerId:   input.creditAccountId,
          orderId,
          type:         "charge",
          amount:       input.total,
          balanceAfter: afterAcct?.creditBalance ?? "0",
          note:         `Order ${orderNumber}`,
          createdBy:    ctx.userId,
        });
      }

      void logAudit({
        db: ctx.db,
        userId: ctx.userId,
        action: "ORDER_CREATED",
        entityType: "order",
        entityId: orderId,
        after: {
          orderId,
          orderNumber,
          total: input.total,
          paymentMethod: input.paymentMethod,
          itemCount: input.items.length,
        },
        metadata: promoDiscount > 0 ? { promoCode: input.promoCode, promoDiscount } : undefined,
      });
      return order!;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(orders.id, input.id));
      return ctx.db.query.orders.findFirst({ where: eq(orders.id, input.id) });
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await ctx.db
      .select({
        total_orders: count(),
        total_revenue: sum(orders.total),
        avg_order_value: avg(orders.total),
        net_sales: sql<string>`SUM(${orders.total} - COALESCE(${orders.taxAmount}, 0))`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, today), eq(orders.status, "completed")));

    const [latest] = await ctx.db
      .select({ last: max(orders.updatedAt) })
      .from(orders);

    const [pendingResult] = await ctx.db
      .select({
        pending_orders: count(),
        pending_payments: sum(orders.total),
      })
      .from(orders)
      .where(and(gte(orders.createdAt, today), eq(orders.status, "pending")));

    return {
      total_orders: String(result?.total_orders ?? 0),
      total_revenue: result?.total_revenue ?? "0",
      avg_order_value: result?.avg_order_value ?? "0",
      net_sales: result?.net_sales ?? "0",
      pending_orders: String(pendingResult?.pending_orders ?? 0),
      pending_payments: pendingResult?.pending_payments ?? "0",
      last_activity: latest?.last?.toISOString() ?? new Date().toISOString(),
    };
  }),

  refund: protectedProcedure
    .input(z.object({
      id: z.string(),
      restoreStock: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const order = await tx.query.orders.findFirst({
          where: eq(orders.id, input.id),
          with: { items: true },
        });
        if (!order) throw new Error("Order not found");
        if (order.status === "refunded") throw new Error("Order already refunded");

        if (input.restoreStock) {
          for (const item of order.items) {
            await tx
              .update(products)
              .set({ stock: sql`stock + ${item.quantity}` })
              .where(eq(products.id, item.productId));
          }
        }

        await tx
          .update(orders)
          .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, input.id));

        void logAudit({
          db: ctx.db,
          userId: ctx.userId,
          action: "REFUND_PROCESSED",
          entityType: "order",
          entityId: input.id,
          after: { orderId: input.id, restoreStock: input.restoreStock },
          metadata: { fullRefund: true },
        });

        return tx.query.orders.findFirst({ where: eq(orders.id, input.id) });
      });
    }),

  weeklyRevenue: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const isMonthly = input.period === "monthly";
      const result = await ctx.db.execute(
        isMonthly
          ? sql`SELECT
              DATE_FORMAT(created_at, '%b %Y') as day,
              COALESCE(SUM(total), 0) as revenue,
              COUNT(*) as orders
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
              AND status = 'completed'
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
            ORDER BY MIN(created_at) ASC`
          : sql`SELECT
              DATE(created_at) as day,
              COALESCE(SUM(total), 0) as revenue,
              COUNT(*) as orders
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY day ASC`
      );
      return (result[0] as unknown) as { day: string; revenue: string; orders: string }[];
    }),

  topProducts: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const interval = input.period === "monthly" ? sql`INTERVAL 12 MONTH` : sql`INTERVAL 7 DAY`;
      const result = await ctx.db.execute(
        sql`SELECT
          oi.product_name as name,
          SUM(oi.quantity) as units_sold,
          COALESCE(SUM(oi.subtotal), 0) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'completed'
          AND o.created_at >= DATE_SUB(NOW(), ${interval})
        GROUP BY oi.product_name
        ORDER BY revenue DESC
        LIMIT 5`
      );
      return (result[0] as unknown) as { name: string; units_sold: string; revenue: string }[];
    }),

  paymentBreakdown: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const interval = input.period === "monthly" ? sql`INTERVAL 12 MONTH` : sql`INTERVAL 7 DAY`;
      const result = await ctx.db.execute(
        sql`SELECT
          payment_method,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(NOW(), ${interval})
        GROUP BY payment_method
        ORDER BY revenue DESC`
      );
      return (result[0] as unknown) as { payment_method: string; count: string; revenue: string }[];
    }),

  hourlyOrders: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const interval = input.period === "monthly" ? sql`INTERVAL 30 DAY` : sql`INTERVAL 7 DAY`;
      const result = await ctx.db.execute(
        sql`SELECT
          HOUR(created_at) as hour,
          COUNT(*) as orders,
          COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= DATE_SUB(NOW(), ${interval})
        GROUP BY HOUR(created_at)
        ORDER BY hour ASC`
      );
      return (result[0] as unknown) as { hour: number; orders: string; revenue: string }[];
    }),

  categoryRevenue: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const interval = input.period === "monthly" ? sql`INTERVAL 12 MONTH` : sql`INTERVAL 7 DAY`;
      const result = await ctx.db.execute(
        sql`SELECT
          COALESCE(c.name, 'Uncategorised') as category,
          COALESCE(c.color, '#6366f1') as color,
          SUM(oi.quantity) as units,
          COALESCE(SUM(oi.subtotal), 0) as revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE o.status = 'completed'
          AND o.created_at >= DATE_SUB(NOW(), ${interval})
        GROUP BY c.name, c.color
        ORDER BY revenue DESC
        LIMIT 6`
      );
      return (result[0] as unknown) as { category: string; color: string; units: string; revenue: string }[];
    }),

  orderStatusBreakdown: protectedProcedure
    .input(z.object({ period: z.enum(["daily", "monthly"]).default("daily") }))
    .query(async ({ ctx, input }) => {
      const interval = input.period === "monthly" ? sql`INTERVAL 12 MONTH` : sql`INTERVAL 7 DAY`;
      const result = await ctx.db.execute(
        sql`SELECT
          status,
          COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), ${interval})
        GROUP BY status`
      );
      return (result[0] as unknown) as { status: string; count: string }[];
    }),

  pnl: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate ? new Date(input.startDate) : new Date(0);
      const end = input.endDate
        ? (() => { const d = new Date(input.endDate!); d.setHours(23, 59, 59, 999); return d; })()
        : new Date();

      const result = await ctx.db.execute(
        sql`WITH order_totals AS (
          SELECT
            COALESCE(SUM(subtotal), 0)          AS net_sales,
            COALESCE(SUM(tax_amount), 0)        AS tax_collected,
            COALESCE(SUM(discount_amount), 0)   AS discounts_given,
            COALESCE(SUM(total), 0)             AS gross_revenue,
            COUNT(*)                            AS order_count
          FROM orders
          WHERE status = 'completed'
            AND created_at >= ${start}
            AND created_at <= ${end}
        ),
        cogs_calc AS (
          SELECT
            COALESCE(SUM(oi.quantity * COALESCE(p.cost, 0)), 0)       AS cogs,
            SUM(CASE WHEN p.cost IS NULL THEN 1 ELSE 0 END)           AS items_missing_cost
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          WHERE o.status = 'completed'
            AND o.created_at >= ${start}
            AND o.created_at <= ${end}
        ),
        finance_totals AS (
          SELECT
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
            COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_other_income
          FROM financial_entries
          WHERE date >= ${start}
            AND date <= ${end}
        )
        SELECT
          ot.net_sales,
          ot.tax_collected,
          ot.discounts_given,
          ot.gross_revenue,
          ot.order_count,
          cc.cogs,
          cc.items_missing_cost,
          ft.total_expenses,
          ft.total_other_income
        FROM order_totals ot, cogs_calc cc, finance_totals ft`
      );

      const rows = result[0] as unknown as any[];
      return rows[0] as {
        net_sales:          string;
        tax_collected:      string;
        discounts_given:    string;
        gross_revenue:      string;
        order_count:        number;
        cogs:               string;
        items_missing_cost: number;
        total_expenses:     string;
        total_other_income: string;
      };
    }),

  partialRefund: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) })).min(1),
      restoreStock: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const order = await tx.query.orders.findFirst({
          where: eq(orders.id, input.orderId),
          with: { items: true },
        });
        if (!order) throw new Error("Order not found");
        if (order.status === "refunded") throw new Error("Order already refunded");

        for (const refundItem of input.items) {
          const orderItem = order.items.find((i) => i.id === refundItem.itemId);
          if (!orderItem) throw new Error(`Item ${refundItem.itemId} not found in order`);
          if (refundItem.quantity > orderItem.quantity) throw new Error(`Refund quantity exceeds ordered quantity for ${orderItem.productName}`);

          if (input.restoreStock) {
            await tx
              .update(products)
              .set({ stock: sql`stock + ${refundItem.quantity}` })
              .where(eq(products.id, orderItem.productId));
          }
        }

        await tx
          .update(orders)
          .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
          .where(eq(orders.id, input.orderId));

        void logAudit({
          db: ctx.db,
          userId: ctx.userId,
          action: "REFUND_PROCESSED",
          entityType: "order",
          entityId: input.orderId,
          after: {
            orderId: input.orderId,
            itemCount: input.items.length,
            restoreStock: input.restoreStock,
          },
          metadata: { partialRefund: true, items: input.items },
        });

        return tx.query.orders.findFirst({ where: eq(orders.id, input.orderId), with: { items: true } });
      });
    }),

  validatePromo: protectedProcedure
    .input(z.object({ code: z.string(), orderAmount: z.string() }))
    .query(async ({ ctx, input }) => {
      const promo = await ctx.db.query.promotions.findFirst({
        where: and(eq(promotions.code, input.code.toUpperCase()), eq(promotions.isActive, true)),
      });
      if (!promo) return { valid: false as const, reason: "Invalid promo code" };
      if (promo.expiresAt && promo.expiresAt < new Date()) return { valid: false as const, reason: "Promo code expired" };
      if (promo.maxUses && promo.usedCount >= promo.maxUses) return { valid: false as const, reason: "Promo code usage limit reached" };
      const minAmount = parseFloat(promo.minOrderAmount ?? "0");
      if (parseFloat(input.orderAmount) < minAmount)
        return { valid: false as const, reason: `Minimum order amount is ${minAmount.toFixed(2)}` };

      const subtotal = parseFloat(input.orderAmount);
      const discount =
        promo.type === "percentage"
          ? (subtotal * parseFloat(promo.value)) / 100
          : parseFloat(promo.value);

      return { valid: true as const, promo, discount: discount.toFixed(2) };
    }),
});
