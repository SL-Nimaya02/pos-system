import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { posUsers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        let user;

        try {
          user = await (db as any).query.posUsers.findFirst({
            where: eq(posUsers.email, email),
          });
        } catch (error) {
          console.error("[auth] Failed to query pos_users", error);
          throw error;
        }

        if (!user) {
          console.warn("[auth] Login failed: user not found", { email });
          return null;
        }

        if (!user.isActive) {
          console.warn("[auth] Login failed: inactive user", { email });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          console.warn("[auth] Login failed: bad password", { email });
          return null;
        }

        return { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          permissions: (user.permissions as string[]) || []
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id   = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions || [];
      }
      return session;
    },
  },
};
