import { ClipboardCheck, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";

const cards = [
  {
    title: "Onayli isletme agi",
    text: "Alisveris ve ilan akislari sadece admin tarafindan dogrulanmis isletmeler icin acilir.",
    icon: ClipboardCheck
  },
  {
    title: "Belge kontrollu ilan",
    text: "Ilac gorselleri, barkod, stok ve istege bagli fatura belgeleri admin incelemesine gider.",
    icon: Scale
  },
  {
    title: "Denetlenebilir takas",
    text: "Siparis, teslimat, itiraz ve iade surecleri kayit altinda ve admin kontrolundedir.",
    icon: ShieldCheck
  },
  {
    title: "Gizli veri korumasi",
    text: "Ruhsat, kimlik, fatura ve iletisim verileri sifreli kaydedilir; dosyalar guvenli depolanir.",
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
              Guvenli ilac takas platformu
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              E-Takas
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Eczaneler ve veteriner klinikleri icin isletme dogrulama, stok uygunlugu, belge
              inceleme, teslimat onayi ve admin kontrollu itiraz/iade sureclerini bir araya getirir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white" href="/giris">
                Giris
              </Link>
              <Link className="rounded-md border border-[var(--line)] px-5 py-3 text-sm font-semibold" href="/isletme-kaydi">
                Isletme kaydi
              </Link>
            </div>
          </div>
          <div className="grid gap-3 self-center">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="rounded-md border border-[var(--line)] bg-white p-5 shadow-sm" key={card.title}>
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
