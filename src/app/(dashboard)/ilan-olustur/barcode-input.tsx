"use client";

import { Camera, Keyboard, LoaderCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type CatalogResult = {
  name: string;
  source: "TITCK" | "MANUAL";
  activeIngredient: string | null;
  atcCode?: string | null;
  manufacturer: string | null;
  prescriptionType?: string | null;
  strength?: string | null;
  form?: string | null;
  publishedAt?: string;
};

type CatalogLookupResponse = CatalogResult | { found: false; manualEntryRequired: true };

type ProductFields = {
  name: string;
  activeIngredient: string;
  manufacturer: string;
  strength: string;
  form: string;
};

const emptyFields: ProductFields = {
  name: "",
  activeIngredient: "",
  manufacturer: "",
  strength: "",
  form: ""
};

export function BarcodeInput() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lookupControllerRef = useRef<AbortController | null>(null);
  const lastLookupValueRef = useRef("");
  const [barcode, setBarcode] = useState("");
  const [fields, setFields] = useState<ProductFields>(emptyFields);
  const [match, setMatch] = useState<CatalogResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(
    "Barkodu elle yazabilir, USB okuyucuyla girebilir veya kamerayla okutabilirsiniz."
  );

  const lookupBarcode = useCallback(async (value: string) => {
    if (!/^\d{8,14}$/.test(value)) return;
    lastLookupValueRef.current = value;
    lookupControllerRef.current?.abort();
    const controller = new AbortController();
    lookupControllerRef.current = controller;
    setLookingUp(true);
    setMessage("Barkod önce TİTCK/SKRS listesinde aranıyor…");
    try {
      const response = await fetch(`/api/catalog/barcodes/${value}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("LOOKUP_FAILED");
      const result = (await response.json()) as CatalogLookupResponse;
      if ("manualEntryRequired" in result) {
        setMatch(null);
        setMessage(
          "Bu barkod TİTCK/SKRS listesinde ve platform kataloğunda bulunamadı. Ürün bilgilerini manuel girin; barkod ilanla birlikte platform kataloğuna kaydedilecek."
        );
        return;
      }
      setMatch(result);
      setFields({
        name: result.name,
        activeIngredient: result.activeIngredient ?? "",
        manufacturer: result.manufacturer ?? "",
        strength: result.strength ?? "",
        form: result.form ?? ""
      });
      setMessage(
        result.source === "TITCK"
          ? "Barkod güncel TİTCK/SKRS listesiyle eşleşti; resmî ürün bilgileri otomatik dolduruldu."
          : "Barkod platformun manuel kataloğuyla eşleşti; ürün bilgileri otomatik dolduruldu."
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMatch(null);
        setMessage(
          "Barkod sorgusu şu anda tamamlanamadı. Ürün bilgilerini manuel girebilir ve ilanı incelemeye gönderebilirsiniz."
        );
      }
    } finally {
      if (lookupControllerRef.current === controller) setLookingUp(false);
    }
  }, []);

  useEffect(() => {
    if (!/^\d{8,14}$/.test(barcode)) return;
    const timer = window.setTimeout(() => {
      if (lastLookupValueRef.current !== barcode) void lookupBarcode(barcode);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [barcode, lookupBarcode]);

  useEffect(() => {
    return () => lookupControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    async function startScanner() {
      const detectorCtor = (
        window as typeof window & {
          BarcodeDetector?: BarcodeDetectorConstructor;
        }
      ).BarcodeDetector;
      if (!detectorCtor) {
        setMessage(
          "Bu tarayıcı kamera ile barkod okumayı desteklemiyor. USB okuyucu veya elle giriş kullanabilirsiniz."
        );
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
            lookupControllerRef.current?.abort();
            setMatch(null);
            setFields(emptyFields);
            setBarcode(value);
            setMessage("Barkod okundu; TİTCK/SKRS listesinde aranıyor…");
            setScanning(false);
            return;
          }
          window.setTimeout(tick, 350);
        };
        await tick();
      } catch {
        setMessage("Kamera açılamadı. USB okuyucu veya elle giriş kullanabilirsiniz.");
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

  const matched = match !== null;

  function updateField(field: keyof ProductFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium">İlaç barkodu</span>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            aria-describedby="barcode-status"
            autoComplete="off"
            autoFocus
            className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
            enterKeyHint="search"
            inputMode="numeric"
            maxLength={14}
            minLength={8}
            name="barcode"
            onChange={(event) => {
              lookupControllerRef.current?.abort();
              lastLookupValueRef.current = "";
              setBarcode(event.target.value.replace(/\D/g, ""));
              setMatch(null);
              setFields(emptyFields);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const value = event.currentTarget.value.replace(/\D/g, "");
              if (/^\d{8,14}$/.test(value)) void lookupBarcode(value);
            }}
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
            {scanning ? (
              <X aria-hidden="true" size={16} />
            ) : (
              <Camera aria-hidden="true" size={16} />
            )}
            {scanning ? "Kapat" : "Kamerayla okut"}
          </button>
        </div>
      </label>

      <div className="form-grid">
        <label className="md:col-span-2">
          İlaç adı
          <input
            name="productName"
            value={fields.name}
            onChange={(event) => updateField("name", event.target.value)}
            readOnly={matched}
            required
            minLength={3}
            maxLength={240}
            placeholder="Barkod eşleşmezse ilacın tam adını yazın"
          />
        </label>
        <label>
          Etken madde / ATC adı <span className="field-optional">İsteğe bağlı</span>
          <input
            name="activeIngredient"
            value={fields.activeIngredient}
            onChange={(event) => updateField("activeIngredient", event.target.value)}
            readOnly={matched}
            maxLength={240}
          />
        </label>
        <label>
          Üretici / ruhsat sahibi <span className="field-optional">İsteğe bağlı</span>
          <input
            name="manufacturer"
            value={fields.manufacturer}
            onChange={(event) => updateField("manufacturer", event.target.value)}
            readOnly={matched}
            maxLength={240}
          />
        </label>
        <label>
          Doz / güç <span className="field-optional">İsteğe bağlı</span>
          <input
            name="strength"
            value={fields.strength}
            onChange={(event) => updateField("strength", event.target.value)}
            readOnly={matched}
            maxLength={120}
          />
        </label>
        <label>
          Farmasötik form <span className="field-optional">İsteğe bağlı</span>
          <input
            name="form"
            value={fields.form}
            onChange={(event) => updateField("form", event.target.value)}
            readOnly={matched}
            maxLength={120}
          />
        </label>
      </div>

      {match?.source === "TITCK" ? (
        <dl className="review-grid rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4">
          <div>
            <dt>Kaynak</dt>
            <dd>TİTCK SKRS</dd>
          </div>
          <div>
            <dt>ATC kodu</dt>
            <dd>{match.atcCode || "Belirtilmemiş"}</dd>
          </div>
          <div>
            <dt>Reçete türü</dt>
            <dd>{match.prescriptionType || "Belirtilmemiş"}</dd>
          </div>
          <div>
            <dt>Liste tarihi</dt>
            <dd>{match.publishedAt || "Belirtilmemiş"}</dd>
          </div>
        </dl>
      ) : null}

      <div
        className="flex items-start gap-2 text-xs text-[var(--muted)]"
        id="barcode-status"
        role="status"
      >
        {lookingUp ? (
          <LoaderCircle aria-hidden="true" className="animate-spin shrink-0" size={14} />
        ) : matched ? (
          <Search aria-hidden="true" className="shrink-0" size={14} />
        ) : (
          <Keyboard aria-hidden="true" className="shrink-0" size={14} />
        )}
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
