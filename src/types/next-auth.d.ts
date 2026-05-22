import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:    string;
      name:  string;
      email: string;
      role:  "admin" | "cashier";
      permissions: string[];
    };
  }
  interface User {
    role: "admin" | "cashier";
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "cashier";
    permissions: string[];
  }
}
