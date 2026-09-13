"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/session/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15000)
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
      };
      if (!response.ok || !result.ok) throw new Error("LOGOUT_FAILED");

      router.replace("/giris");
      router.refresh();
    } catch {
      setError("Çıkış yapılamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="logout-control">
      <button className="button button-secondary" type="button" disabled={pending} onClick={logout}>
        {pending ? "Çıkış yapılıyor…" : "Çıkış yap"}
      </button>
      {error && (
        <span className="logout-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
