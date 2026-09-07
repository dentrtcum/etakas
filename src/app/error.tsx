"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-container">
      <section className="empty-state">
        <h1 className="text-2xl font-bold">Bu sayfa şu anda yüklenemedi.</h1>
        <p className="mt-4">
          Geçici bir bağlantı sorunu olabilir. Yeniden deneyebilir veya hesabınıza dönebilirsiniz.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="button button-primary">
            Yeniden dene
          </button>
          <Link href="/panel" className="button button-secondary">
            Hesabıma dön
          </Link>
        </div>
      </section>
    </main>
  );
}
