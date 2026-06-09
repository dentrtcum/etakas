import { redirect } from "next/navigation";
import { clearAppSessionCookie } from "@/lib/auth/app-session";

export const runtime = "nodejs";

export async function POST() {
  await clearAppSessionCookie();
  redirect("/giris");
}
