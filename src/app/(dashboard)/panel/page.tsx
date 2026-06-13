import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";

const links = [
  { href: "/pazar-yeri", title: "Pazar yeri", text: "Onayli isletmelerin aktif ilanlarini inceleyin." },
  { href: "/ilan-olustur", title: "Ilan olustur", text: "Stok ve belge bilgileriyle admin onayina yeni ilan gonderin." }
];

export default async function DashboardPage() {
  const actor = await getCurrentAppUser();

  if (!actor) {
    redirect("/giris?next=/panel");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
              Hesabim
            </p>
            <h1 className="mt-2 text-3xl font-bold">{actor.email}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Alisveris ve ilan islemleri yalnizca admin tarafindan onaylanan isletmeler icin acilir.
            </p>
          </div>
          <form action="/api/session/logout" method="post">
            <button className="h-10 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold" type="submit">
              Cikis
            </button>
          </form>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <Link
              className="rounded-md border border-[var(--line)] bg-white p-5 hover:border-[var(--primary)]"
              href={link.href}
              key={link.href}
            >
              <h2 className="font-semibold">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{link.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
