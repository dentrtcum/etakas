"use client";

import { Megaphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnnouncementModal({ announcement }: { announcement?: { id: string; title: string; body: string } }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!announcement) return null;
  const activeAnnouncement = announcement;
  async function dismiss() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ notificationId: activeAnnouncement.id })
      });
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="announcement-backdrop" role="presentation">
      <section className="announcement-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
        <div className="announcement-icon"><Megaphone size={28} /></div>
        <button className="icon-button announcement-close" type="button" onClick={dismiss} disabled={pending} aria-label="Duyuruyu kapat"><X size={18} /></button>
        <p className="eyebrow">PLATFORM DUYURUSU</p>
        <h2 id="announcement-title">{activeAnnouncement.title}</h2>
        <p>{activeAnnouncement.body}</p>
        <button className="button button-primary" type="button" onClick={dismiss} disabled={pending}>{pending ? "Kapatılıyor…" : "Okudum"}</button>
      </section>
    </div>
  );
}
