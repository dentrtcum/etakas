import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Takas",
  description: "Doğrulanmış işletmeler için güvenli ilaç takas koordinasyon platformu",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
