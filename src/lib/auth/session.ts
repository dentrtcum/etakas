import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function getCurrentAuthSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}
