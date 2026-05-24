import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const adminOnly = [
  "/dashboard", "/products", "/inventory", "/grn",
  "/reports", "/suppliers", "/purchase-orders", "/customers",
  "/users", "/audit-log", "/receivables", "/receivables",
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (adminOnly.some((p) => pathname.startsWith(p)) && role !== "admin") {
      return NextResponse.redirect(new URL("/pos", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/seed-balance-sheet|api/seed|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|images|login).*)",
  ],
};
