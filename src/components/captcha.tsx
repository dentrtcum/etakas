"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export function Captcha({ action, nonce }: { action: string; nonce?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [error, setError] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widget.current !== null || !key) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: key,
      action,
      language: "tr",
      theme: "light",
      size: "flexible",
      callback: () => setError(false),
      "error-callback": () => setError(true),
      "expired-callback": () => {
        if (widget.current) window.turnstile?.reset(widget.current);
      }
    });
  }, [action, key]);
  useEffect(() => {
    render();
    const element = container.current;
    const reset = () => {
      if (widget.current) window.turnstile?.reset(widget.current);
    };
    element?.closest("form")?.addEventListener("reset", reset);
    // Enhanced forms can signal failure after a used token by dispatching this event.
    element?.closest("form")?.addEventListener("captcha-reset", reset);
    return () => {
      element?.closest("form")?.removeEventListener("reset", reset);
      element?.closest("form")?.removeEventListener("captcha-reset", reset);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [render]);
  if (!key)
    return (
      <p className="notice notice-error" role="status">
        Güvenlik doğrulaması şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.
      </p>
    );
  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={render}
        onError={() => setError(true)}
      />
      <div ref={container} />
      {error && (
        <p className="notice notice-error" role="alert">
          Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin.
        </p>
      )}
      <noscript>Güvenlik doğrulaması için JavaScript etkin olmalıdır.</noscript>
    </div>
  );
}
