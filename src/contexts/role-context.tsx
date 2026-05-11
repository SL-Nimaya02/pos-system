"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";

interface RoleContextValue {
  isAdmin:  boolean;
  role:     "admin" | "cashier";
  userName: string;
  userEmail:string;
}

const RoleContext = createContext<RoleContextValue>({
  isAdmin: false, role: "cashier", userName: "", userEmail: "",
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role      = (session?.user as { role?: string })?.role as "admin" | "cashier" ?? "cashier";
  const userName  = session?.user?.name  ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <RoleContext.Provider value={{ isAdmin: role === "admin", role, userName, userEmail }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
