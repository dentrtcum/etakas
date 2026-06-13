const organizationFields = [
  ["legalName", "Isletme unvani", "text"],
  ["taxNumber", "Vergi numarasi", "text"],
  ["licenseNumber", "Ruhsat veya izin numarasi", "text"],
  ["professionalChamber", "Bagli olunan meslek odasi", "text"],
  ["authorizedPersonName", "Yetkili kisi ad soyad", "text"],
  ["authorizedPersonTitle", "Yetkili gorevi/unvani", "text"],
  ["ownerIdentityNumber", "Isletme sahibi T.C. kimlik no", "text"],
  ["email", "Giris e-postasi", "email"],
  ["phone", "Telefon", "tel"],
  ["province", "Il", "text"],
  ["district", "Ilce", "text"]
] as const;

const documentFields = [
  ["licenseDocument", "Ruhsat / faaliyet izin belgesi"],
  ["taxPlateDocument", "Vergi levhasi"],
  ["ownerIdentityDocument", "Isletme sahibi kimlik gorseli"],
  ["diplomaDocument", "Diploma / mesleki yeterlilik belgesi"],
  ["chamberRegistrationDocument", "Oda kayit belgesi"],
  ["signatureCircularDocument", "Imza sirkuleri veya yetki belgesi"]
] as const;

export default function OrganizationRegistrationPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <section className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="mb-8 border-b border-[var(--line)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            Isletme kaydi
          </p>
          <h1 className="mt-2 text-3xl font-bold">Dogrulama basvurusu</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Basvurunuz admin tarafindan belge ve kimlik bilgileriyle incelenir. Onay verilmeden pazar yeri,
            ilan olusturma ve alisveris ozellikleri acilmaz.
          </p>
        </div>

        <form
          className="grid gap-6"
          action="/api/organization-applications"
          encType="multipart/form-data"
          method="post"
        >
          <section className="rounded-md border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-semibold">Isletme bilgileri</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Isletme turu</span>
                <select className="h-11 rounded-md border border-[var(--line)] bg-white px-3" name="type" required>
                  <option value="PHARMACY">Eczane</option>
                  <option value="VETERINARY_CLINIC">Veteriner klinigi</option>
                  <option value="VETERINARY_POLYCLINIC">Veteriner poliklinigi</option>
                  <option value="ANIMAL_HOSPITAL">Hayvan hastanesi</option>
                </select>
              </label>

              {organizationFields.map(([name, label, type]) => (
                <label className="grid gap-2" key={name}>
                  <span className="text-sm font-medium">{label}</span>
                  <input
                    className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                    maxLength={name === "ownerIdentityNumber" ? 11 : undefined}
                    minLength={name === "ownerIdentityNumber" ? 11 : undefined}
                    name={name}
                    required
                    type={type}
                  />
                </label>
              ))}

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-medium">Giris parolasi</span>
                <input
                  className="h-11 rounded-md border border-[var(--line)] bg-white px-3"
                  minLength={12}
                  name="password"
                  required
                  type="password"
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-semibold">Adres ve belgeler</h2>
            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium">Acik adres</span>
              <textarea
                className="min-h-28 rounded-md border border-[var(--line)] bg-white p-3"
                name="address"
                required
              />
            </label>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {documentFields.map(([name, label]) => (
                <label className="grid gap-2" key={name}>
                  <span className="text-sm font-medium">{label}</span>
                  <input
                    accept="image/*,.pdf"
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
                    name={name}
                    required={name !== "signatureCircularDocument"}
                    type="file"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[var(--line)] bg-white p-5">
            <div className="grid gap-3">
              <label className="flex items-start gap-3 text-sm">
                <input className="mt-1" name="kvkkAccepted" required type="checkbox" />
                <span>KVKK aydinlatma metnini ve belge isleme sartlarini kabul ediyorum.</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input className="mt-1" name="termsAccepted" required type="checkbox" />
                <span>Kullanim kosullarini kabul ediyorum.</span>
              </label>
            </div>

            <button
              className="mt-5 h-11 rounded-md bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-strong)]"
              type="submit"
            >
              Basvuruyu gonder
            </button>
          </section>
        </form>
      </section>
    </main>
  );
}
