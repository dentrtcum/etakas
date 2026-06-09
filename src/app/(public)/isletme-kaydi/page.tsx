const fields = [
  ["legalName", "İşletme unvanı", "text"],
  ["taxNumber", "Vergi numarası", "text"],
  ["authorizedPersonName", "Yetkili kişi", "text"],
  ["email", "E-posta", "email"],
  ["phone", "Telefon", "tel"],
  ["province", "İl", "text"],
  ["district", "İlçe", "text"],
  ["licenseNumber", "Ruhsat veya izin numarası", "text"]
] as const;

export default function OrganizationRegistrationPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            İşletme kaydı
          </p>
          <h1 className="text-3xl font-bold">Doğrulama başvurusu</h1>
        </div>

        <form className="grid gap-6" action="/api/organization-applications" method="post">
          <label className="grid gap-2">
            <span className="text-sm font-medium">İşletme türü</span>
            <select
              className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
              name="type"
              required
            >
              <option value="PHARMACY">Eczane</option>
              <option value="VETERINARY_CLINIC">Veteriner kliniği</option>
              <option value="VETERINARY_POLYCLINIC">Veteriner polikliniği</option>
              <option value="ANIMAL_HOSPITAL">Hayvan hastanesi</option>
            </select>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            {fields.map(([name, label, type]) => (
              <label className="grid gap-2" key={label}>
                <span className="text-sm font-medium">{label}</span>
                <input
                  className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                  name={name}
                  required
                  type={type}
                />
              </label>
            ))}
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Açık adres</span>
            <textarea
              className="min-h-28 rounded-md border border-[var(--line)] bg-white p-3"
              name="address"
              required
            />
          </label>

          <div className="grid gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input name="kvkkAccepted" required type="checkbox" />
              KVKK aydınlatma metnini kabul ediyorum.
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input name="termsAccepted" required type="checkbox" />
              Kullanım koşullarını kabul ediyorum.
            </label>
          </div>

          <div>
            <button
              className="h-11 rounded-md bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-strong)]"
              type="submit"
            >
              Başvuruyu gönder
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
