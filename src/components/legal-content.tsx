import { type LegalDocument } from "@/lib/legal/documents";
import { LEGAL_UPDATED_AT, LEGAL_VERSION } from "@/lib/legal/version";

export function LegalContent({ document }: { document: LegalDocument }) {
  return (
    <div className="legal-prose">
      <p className="document-version">
        Güncelleme: {LEGAL_UPDATED_AT} · Sürüm: {LEGAL_VERSION}
      </p>
      {document.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section className="document-sources">
        <h2>İlgili resmî kaynaklar</h2>
        <ul>
          {document.sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer">
                {source.title} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
