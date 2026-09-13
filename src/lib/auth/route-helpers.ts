import { NextResponse } from "next/server";
import { z } from "zod";
import { readSecurityForm, requireSameOrigin, SecurityError } from "@/lib/security/request-guards";

export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export async function authForm(request: Request) {
  requireSameOrigin(request);
  return readSecurityForm(request);
}
export function field(form: FormData, name: string, max = 1024) {
  const value = form.get(name);
  if (typeof value !== "string" || value.length > max)
    throw new SecurityError("INVALID_REQUEST", 400);
  return value;
}
export function emailField(form: FormData) {
  const result = emailSchema.safeParse(form.get("email"));
  if (!result.success) throw new SecurityError("INVALID_REQUEST", 400);
  return result.data;
}
export function authSuccess(redirectTo: string) {
  return NextResponse.json({ ok: true, redirectTo }, { headers: { "Cache-Control": "no-store" } });
}
