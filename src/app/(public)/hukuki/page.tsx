import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeading } from "@/components/ui";
import { legalDocuments } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Hukuki metinler",
  description: "Etakas kullanım koşulları, kişisel veri ve çerez bilgilendirmeleri."
};
export default function LegalIndexPage() {
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="AÇIK VE ERİŞİLEBİLİR BİLGİ"
        title="Koşullar ve gizlilik"
        description="Hesabınızı kullanırken bilmeniz gerekenler, verileriniz üzerindeki haklarınız ve platformun sorumluluk sınırları."
      />
      <div className="card-grid">
        {Object.entries(legalDocuments).map(([slug, document]) => (
          <Link key={slug} className="panel-card resource-card" href={`/hukuki/${slug}`}>
            <ArrowUpRight size={20} aria-hidden="true" />
            <h2>{document.title}</h2>
            <p>{document.summary}</p>
            <span>Metni inceleyin</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
