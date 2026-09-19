"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MessageReadMarker({ hasUnreadMessages }: { hasUnreadMessages: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasUnreadMessages) return;
    const controller = new AbortController();
    void fetch("/api/messages/read", {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: controller.signal
    }).then((response) => {
      if (response.ok) router.refresh();
    }).catch(() => undefined);
    return () => controller.abort();
  }, [hasUnreadMessages, router]);

  return null;
}
