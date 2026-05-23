import { createTRPCRouter } from "../trpc";
import { productsRouter, categoriesRouter, variantsRouter } from "./products";
import { ordersRouter } from "./orders";
import { suppliersRouter } from "./suppliers";
import { purchaseOrdersRouter } from "./purchase-orders";
import { usersRouter } from "./users";
import { financeRouter } from "./finance";
import { grnRouter } from "./grn";
import { cashRegisterRouter } from "./cash-register";
import { settingsRouter } from "./settings";
import { loyaltyRouter } from "./loyalty";
import { balanceSheetRouter } from "./balance-sheet";
import { batchesRouter } from "./batches";
import { auditLogRouter } from "./audit-log";
import { receivablesRouter } from "./receivables";
import { customersRouter } from "./customers";
import { kitchenRouter } from "./kitchen";
import { employeesRouter } from "./employees";

export const appRouter = createTRPCRouter({
  products:       productsRouter,
  categories:     categoriesRouter,
  variants:       variantsRouter,
  orders:         ordersRouter,
  suppliers:      suppliersRouter,
  purchaseOrders: purchaseOrdersRouter,
  users:          usersRouter,
  finance:        financeRouter,
  grn:            grnRouter,
  cashRegister:   cashRegisterRouter,
  settings:       settingsRouter,
  loyalty:        loyaltyRouter,
  balanceSheet:   balanceSheetRouter,
  batches:        batchesRouter,
  auditLog:       auditLogRouter,
  receivables:    receivablesRouter,
  customers:      customersRouter,
  kitchen:        kitchenRouter,
  employees:      employeesRouter,
});

export type AppRouter = typeof appRouter;
