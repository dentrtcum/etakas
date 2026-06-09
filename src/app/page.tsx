import { ShieldCheck, ClipboardCheck, LockKeyhole, Scale } from "lucide-react";

const cards = [
  {
    title: "Doğrulama Öncelikli",
    text: "Onaylanmamış işletmeler pazar yeri, ilan ve takas akışlarına erişemez.",
    icon: ClipboardCheck
  },
  {
    title: "Hukuki Güvenli Varsayılan",
    text: "Canlı takas modu hukuki onay olmadan kapalıdır; demo veriler sentetiktir.",
    icon: Scale
  },
  {
    title: "Ledger Kaynaklı Bakiye",
    text: "Takas bakiyesi değiştirilebilir bir kolon değil, denetlenebilir hareketlerden hesaplanır.",
    icon: ShieldCheck
  },
  {
    title: "Gizli Belge Yönetimi",
    text: "Ruhsat, fatura ve seri verileri public URL veya istemci tarafı sızıntılara kapalı tasarlanır.",
    icon: LockKeyhole
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto grid min-h-[72vh] max-w-6xl content-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
              Demo modu aktif
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              E-Takas
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Eczaneler ve veteriner klinikleri için hukuki inceleme, işletme doğrulama,
              stok uygunluğu, ledger bazlı takas bakiyesi ve admin denetimi etrafında kurulan
              güvenli B2B koordinasyon platformu.
            </p>
          </div>
          <div className="grid gap-3 self-center">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  className="rounded-md border border-[var(--line)] bg-white p-5 shadow-sm"
                  key={card.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="rounded-md bg-teal-50 p-2 text-[var(--primary)]">
                      <Icon aria-hidden="true" size={22} />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold">{card.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{card.text}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
