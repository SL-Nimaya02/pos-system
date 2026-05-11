import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:    string;
      name:  string;
      email: string;
      role:  "admin" | "cashier";
    };
  }
  interface User {
    role: "admin" | "cashier";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "cashier";
  }
}
