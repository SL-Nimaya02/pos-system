import { createTRPCRouter } from "../trpc";
import { productsRouter, categoriesRouter } from "./products";
import { ordersRouter } from "./orders";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  categories: categoriesRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
