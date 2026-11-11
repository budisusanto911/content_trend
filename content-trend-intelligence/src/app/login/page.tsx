import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authStore";
import { LoginFormClient } from "./LoginFormClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return <LoginFormClient />;
}

