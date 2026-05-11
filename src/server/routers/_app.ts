import { createTRPCRouter } from "../trpc";
import { productsRouter, categoriesRouter } from "./products";
import { ordersRouter } from "./orders";
import { suppliersRouter } from "./suppliers";
import { purchaseOrdersRouter } from "./purchase-orders";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  products:       productsRouter,
  categories:     categoriesRouter,
  orders:         ordersRouter,
  suppliers:      suppliersRouter,
  purchaseOrders: purchaseOrdersRouter,
  users:          usersRouter,
});

export type AppRouter = typeof appRouter;
