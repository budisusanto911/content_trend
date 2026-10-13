import { ReactNode } from "react";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
