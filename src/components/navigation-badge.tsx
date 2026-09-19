"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationBadges({ initial, children }: {
  initial: { notifications: number; messages: number };
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (document.visibilityState === "hidden" || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/notifications/counts", { cache: "no-store", signal: controller.signal });
        if (response.ok) setCounts(await response.json());
      } catch { /* Keep the last known counts during a temporary connection loss. */ }
      finally { busy = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 20_000);
    window.addEventListener("notifications-updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort(); clearInterval(timer);
      window.removeEventListener("notifications-updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname]);
  return <BadgeContext value={counts}>{children}</BadgeContext>;
}

const BadgeContext = createContext({ messages: 0, notifications: 0 });
export function NavigationBadge({ kind, label }: { kind: "messages" | "notifications"; label: string }) {
  const count = useContext(BadgeContext)[kind];
  return <span aria-live="polite" aria-atomic="true">{count > 0 && <span className="nav-badge" aria-label={`${count} okunmamış ${label}`}>{count > 99 ? "99+" : count}</span>}</span>;
}
