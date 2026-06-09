import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/current-user";

const links = [
  { href: "/pazar-yeri", title: "Pazar yeri", text: "Aktif ve size görünür ilanları inceleyin." },
  { href: "/ilan-olustur", title: "İlan oluştur", text: "Stoktan admin onayına yeni ilan gönderin." },
  { href: "/admin36100", title: "Admin paneli", text: "Başvuru ve ilan incelemelerini yönetin." }
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
              Panel
            </p>
            <h1 className="mt-2 text-3xl font-bold">{actor.email}</h1>
          </div>
          <form action="/api/session/logout" method="post">
            <button className="h-10 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold" type="submit">
              Çıkış
            </button>
          </form>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link className="rounded-md border border-[var(--line)] bg-white p-5 hover:border-[var(--primary)]" href={link.href} key={link.href}>
              <h2 className="font-semibold">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{link.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
