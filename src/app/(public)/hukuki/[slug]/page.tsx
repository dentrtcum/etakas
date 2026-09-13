import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalContent } from "@/components/legal-content";
import { PageHeading } from "@/components/ui";
import { legalDocuments, legalLinks } from "@/lib/legal/documents";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const document = Object.hasOwn(legalDocuments, slug) ? legalDocuments[slug] : undefined;
  return document
    ? { title: document.title, description: document.summary }
    : { title: "Sayfa bulunamadı" };
}
export default async function LegalDocumentPage({ params }: Props) {
  const { slug } = await params;
  if (!Object.hasOwn(legalDocuments, slug)) notFound();
  const document = legalDocuments[slug];
  return (
    <main className="page-container">
      <PageHeading
        eyebrow="KOŞULLAR VE GİZLİLİK"
        title={document.title}
        description={document.summary}
      />
      <div className="legal-layout">
        <article className="panel-card">
          <LegalContent document={document} />
        </article>
        <aside className="legal-sidebar">
          <nav aria-label="Diğer hukuki metinler">
            <h2>Tüm metinler</h2>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href === `/hukuki/${slug}` ? "page" : undefined}
              >
                {link.title}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </main>
  );
}
