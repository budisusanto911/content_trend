import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authStore";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}
