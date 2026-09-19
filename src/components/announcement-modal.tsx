"use client";

import { BellRing, Megaphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnnouncementModal({
  announcement
}: {
  announcement?: { id: string; title: string; body: string; type: string; isAnnouncement: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!announcement) return null;
  const activeAnnouncement = announcement;
  const isOrderUpdate = activeAnnouncement.type.startsWith("ORDER_");
  async function dismiss(destination?: string) {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ notificationId: activeAnnouncement.id })
      });
      if (response.ok) {
        window.dispatchEvent(new Event("notifications-updated"));
        if (destination) {
          router.push(destination);
        } else {
          router.refresh();
        }
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="announcement-backdrop" role="presentation">
      <section
        className="announcement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
      >
        <div className="announcement-icon">
          {isOrderUpdate ? <BellRing size={28} /> : <Megaphone size={28} />}
        </div>
        <button
          className="icon-button announcement-close"
          type="button"
          onClick={() => dismiss()}
          disabled={pending}
          aria-label="Duyuruyu kapat"
        >
          <X size={18} />
        </button>
        <p className="eyebrow">{isOrderUpdate ? "SİPARİŞ BİLDİRİMİ" : "PLATFORM DUYURUSU"}</p>
        <h2 id="announcement-title">{activeAnnouncement.title}</h2>
        <p>{activeAnnouncement.body}</p>
        <div className="flex flex-wrap gap-3">
          {isOrderUpdate && (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => dismiss("/siparisler")}
              disabled={pending}
            >
              Siparişleri görüntüle
            </button>
          )}
          <button
            className="button button-primary"
            type="button"
            onClick={() => dismiss()}
            disabled={pending}
          >
            {pending ? "Kapatılıyor…" : "Okudum"}
          </button>
        </div>
      </section>
    </div>
  );
}
