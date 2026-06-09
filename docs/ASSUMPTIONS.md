# Assumptions

- The repository starts as an empty GitHub repository cloned into `c:\e-takas`.
- The application is built as a greenfield Next.js App Router project.
- All monetary-like values are integer kuruş reference values and are labeled as Takas Kredisi or Referans Değer.
- Real businesses, licenses, invoices, serials, API keys and admin passwords are never committed or seeded.
- Drizzle ORM is used because explicit SQL constraints and transaction control are critical for ledger and inventory integrity.
- Missing production security settings fail closed.
