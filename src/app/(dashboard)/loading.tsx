export default function Loading() {
  return (
    <main className="page-container" role="status" aria-label="Yükleniyor">
      <div className="h-10 w-60 rounded-xl bg-gray-200 animate-pulse mb-8" />
      <div className="stat-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-card h-32 animate-pulse" />
        ))}
      </div>
      <p className="subtext">Çalışma alanınız hazırlanıyor…</p>
    </main>
  );
}
