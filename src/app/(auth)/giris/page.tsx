export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6">
      <section className="w-full max-w-md rounded-md border border-[var(--line)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Giriş</h1>
        {params.error === "invalid" ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            E-posta veya parola hatalı.
          </p>
        ) : null}
        <form className="mt-6 grid gap-4" action="/api/session/login" method="post">
          <input name="next" type="hidden" value={params.next ?? "/"} />
          <label className="grid gap-2">
            <span className="text-sm font-medium">E-posta</span>
            <input
              className="h-11 rounded-md border border-[var(--line)] px-3"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Parola</span>
            <input
              className="h-11 rounded-md border border-[var(--line)] px-3"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="h-11 rounded-md bg-[var(--primary)] font-semibold text-white hover:bg-[var(--primary-strong)]"
            type="submit"
          >
            Giriş yap
          </button>
        </form>
      </section>
    </main>
  );
}
