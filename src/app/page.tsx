import Link from "next/link";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import {
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  Package,
  Check,
  Building2
} from "lucide-react";
export default async function HomePage() {
  const user = await getCurrentAppUser();
  return (
    <main className="page-container">
      <section className="hero">
        <div>
          <p className="eyebrow">ECZANE & VETERİNER İŞLETMELERİ İÇİN</p>
          <h1>
            Stoklarınız
            <br />
            <span>değerini korusun.</span>
          </h1>
          <p className="hero-copy">
            İhtiyaç fazlası stoklarınızı değerlendirin, aradığınız ürünlere ulaşın. İşletmenizin
            takas süreçlerini tek bir yerden yönetin.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link href={user ? "/panel" : "/isletme-kaydi"} className="button button-primary">
              {user ? "Çalışma alanını aç" : "İşletmenizi kaydedin"} <ArrowUpRight size={17} />
            </Link>
            <Link href="/#nasil-calisir" className="button button-secondary">
              Nasıl çalışır?
            </Link>
          </div>
          <p className="hero-caption">
            <Check size={15} />
            İşletme onayı · İlan incelemesi · Karşılıklı teslim teyidi
          </p>
          <p className="hero-disclosure">
            İşletmeler için geliştirilir. Gerçek işlemler, mesleki yetki ve platformun kullanım
            şartlarına bağlıdır. <Link href="/hukuki/platform-kurallari">Kapsamı inceleyin</Link>
          </p>
        </div>
        <div className="hero-visual" aria-label="Takas sürecinin üç adımı">
          <div className="flex items-center justify-between mb-5">
            <p className="eyebrow">BİRLİKTE DAHA VERİMLİ</p>
            <ArrowLeftRight size={23} />
          </div>
          <div className="panel-card">
            <div className="flex items-center gap-3">
              <span className="empty-icon">
                <Building2 size={28} />
              </span>
              <div>
                <p className="panel-title">İşletmeniz için yeni bir alan</p>
                <p className="subtext">Stoktan ilana, ilandan takasa.</p>
              </div>
            </div>
            <div className="mt-7 grid gap-5">
              {[
                ["01", "İşletmenizi tanıtın", "Bilgilerinizi girin, başvurunuzu gönderin."],
                ["02", "Stoklarınızı paylaşın", "Barkod ve stok bilgileriyle ilan oluşturun."],
                ["03", "Takasınızı yönetin", "Teslim sürecini karşılıklı onayla tamamlayın."]
              ].map(([number, title, text]) => (
                <div key={number} className="flex items-start gap-3">
                  <span className="step-number">{number}</span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="subtext">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="hero-caption">
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            İşletmeler arası paylaşım, kontrollü bir süreç.
          </p>
        </div>
      </section>
      <section id="nasil-calisir" className="pt-8">
        <div className="page-heading">
          <div>
            <p className="eyebrow">NASIL ÇALIŞIR?</p>
            <h2 className="mt-3 text-2xl font-bold">Her adımda kontrol sizde.</h2>
          </div>
          <p className="subtext max-w-sm">
            Başvurunuzdan teslim onayına kadar tüm adımlar tek bir çalışma alanında.
          </p>
        </div>
        <div className="card-grid">
          {[
            {
              icon: ClipboardCheck,
              title: "İşletme başvurusu",
              text: "Temel işletme ve iletişim bilgilerinizi paylaşın. Belgelerinizi ekleyerek incelemeyi destekleyin."
            },
            {
              icon: Package,
              title: "Kolay ilan yönetimi",
              text: "Barkod, son kullanma tarihi ve miktar bilgileriyle stoklarınızı incelemeye gönderin."
            },
            {
              icon: ArrowLeftRight,
              title: "Takip edilebilir takas",
              text: "Rezervasyon, teslim bildirimi ve alıcı onayını siparişleriniz üzerinden takip edin."
            }
          ].map(({ icon: Icon, title, text }) => (
            <article className="home-feature" key={title}>
              <Icon className="text-[var(--primary)]" size={25} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel-card flex flex-wrap justify-between items-center gap-5 mt-7 bg-[#edf3e5]">
        <div>
          <h2 className="text-xl font-bold">İşletmenizi E-Takas ile buluşturun.</h2>
          <p className="subtext mt-2">
            Başvurunuzu tamamlayın, onay sonrasında ilan vermeye başlayın.
          </p>
        </div>
        <Link href={user ? "/panel" : "/isletme-kaydi"} className="button button-primary">
          {user ? "Çalışma alanını aç" : "Başvuruya başlayın"} <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="home-help">
        <div>
          <p className="eyebrow">BİLMENİZ GEREKENLER</p>
          <h2>Açık bilgiler, anlaşılır süreçler.</h2>
          <p>
            Başvurunuzu göndermeden önce kullanım şartlarını ve verilerinizin nasıl işlendiğini
            inceleyin.
          </p>
        </div>
        <div className="home-help-links">
          <Link href="/sss">
            Sıkça sorulan sorular <ArrowUpRight size={17} />
          </Link>
          <Link href="/hukuki">
            Koşullar ve gizlilik <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
