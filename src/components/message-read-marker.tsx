"use client";

import { useEffect, useRef } from "react";

export function MessageReadMarker({ messageIds }: { messageIds: string[] }) {
  const ids = JSON.stringify(messageIds);
  const lastSentIds = useRef("");

  useEffect(() => {
    if (ids === "[]" || lastSentIds.current === ids) return;
    lastSentIds.current = ids;
    void fetch("/api/messages/read", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: JSON.parse(ids) }),
    }).then((response) => {
      if (response.ok) window.dispatchEvent(new Event("notifications-updated"));
    }).catch(() => undefined);
  }, [ids]);

  return null;
}
