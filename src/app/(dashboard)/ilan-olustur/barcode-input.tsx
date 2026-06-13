"use client";

import { Camera, Keyboard, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

export function BarcodeInput() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("Barkodu elle yazabilir veya kamerayla okutabilirsiniz.");

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    async function startScanner() {
      const detectorCtor = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

      if (!detectorCtor) {
        setMessage("Bu tarayici barkod okumayi desteklemiyor. Barkodu elle girebilirsiniz.");
        setScanning(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new detectorCtor({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;

          const results = await detector.detect(videoRef.current);
          const value = results[0]?.rawValue?.replace(/\D/g, "");

          if (value) {
            setBarcode(value);
            setMessage("Barkod okundu.");
            setScanning(false);
            return;
          }

          window.setTimeout(tick, 350);
        };

        await tick();
      } catch {
        setMessage("Kamera acilamadi. Barkodu elle girebilirsiniz.");
        setScanning(false);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [scanning]);

  return (
    <div className="grid gap-3">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Ilac barkodu</span>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
            inputMode="numeric"
            maxLength={14}
            minLength={8}
            name="barcode"
            onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ""))}
            pattern="[0-9]{8,14}"
            required
            type="text"
            value={barcode}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
            onClick={() => setScanning((value) => !value)}
            type="button"
          >
            {scanning ? <X aria-hidden="true" size={16} /> : <Camera aria-hidden="true" size={16} />}
            {scanning ? "Kapat" : "Barkod okut"}
          </button>
        </div>
      </label>

      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Keyboard aria-hidden="true" size={14} />
        {message}
      </div>

      {scanning ? (
        <video
          className="aspect-video w-full rounded-md border border-[var(--line)] bg-slate-950 object-cover"
          muted
          playsInline
          ref={videoRef}
        />
      ) : null}
    </div>
  );
}
