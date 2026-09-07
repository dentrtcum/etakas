import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
export default function SuccessPage() {
  return (
    <main className="page-container max-w-xl">
      <section className="panel-card text-center py-14">
        <CheckCircle2 className="mx-auto text-[var(--primary)]" size={52} />
        <p className="eyebrow mt-7">BAŞVURUNUZ ALINDI</p>
        <h1 className="text-3xl font-bold mt-3">Tanıştığımıza memnun olduk.</h1>
        <p className="subtext mt-4">
          İşletme başvurunuz inceleme sırasına eklendi. Hesabınıza giriş yaparak durumunu takip
          edebilir, eksik belgelerinizi tamamlayabilirsiniz.
        </p>
        <Link className="button button-primary mt-7" href="/giris">
          Hesabınıza giriş yapın <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
