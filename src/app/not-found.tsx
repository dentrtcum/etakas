import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-container">
      <section className="empty-state">
        <p className="eyebrow">404</p>
        <h1 className="text-3xl font-bold">Aradığınız sayfa bulunamadı.</h1>
        <p className="mt-4">Bağlantı değişmiş veya sayfa kaldırılmış olabilir.</p>
        <Link href="/" className="button button-primary">
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  );
}
