"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

export function CookiePreferences({ noticeSeen }: { noticeSeen: boolean }) {
  const [visible, setVisible] = useState(!noticeSeen);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  function acknowledge() {
    document.cookie = `e_takas_cookie_notice=2026-09-08; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setVisible(false);
    dialog.current?.close();
  }
  return (
    <>
      <button type="button" className="text-link" onClick={() => dialog.current?.showModal()}>
        Çerez ayarları
      </button>
      {visible && (
        <aside className="cookie-notice" aria-label="Çerez bilgilendirmesi">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <h2>Yalnızca gerekli çerezler</h2>
            <p>
              Oturum ve güvenlik için gerekli kayıtları kullanıyoruz. Reklam veya analiz çerezi
              kullanmıyoruz.{" "}
              <Link className="text-link" href="/hukuki/cerez-politikasi">
                Çerez Politikası
              </Link>
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => dialog.current?.showModal()}
          >
            Ayrıntılar
          </button>
          <button type="button" className="button button-primary" onClick={acknowledge}>
            Anladım
          </button>
        </aside>
      )}
      <dialog
        ref={dialog}
        className="legal-dialog cookie-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-header">
          <h2 id={titleId}>Çerez ayarları</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Çerez ayarlarını kapat"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-content legal-prose">
          <h3>Gerekli teknolojiler</h3>
          <p>
            Oturum açma, bot kontrolü ve bu bilgilendirmenin gösterim tercihi için kullanılır.
            Hizmetin bu işlevleri için gereklidir. Tarayıcınızdan engelleyebilirsiniz; giriş ve form
            gönderimi etkilenebilir.
          </p>
          <h3>Reklam ve isteğe bağlı analiz</h3>
          <p>Bu sürümde kullanılmıyor. Pazarlama veya izleme onayı toplanmıyor.</p>
          <p>
            Bu pencereyi kapatmak reklam rızası vermez. Sağlayıcılar, süreler ve haklarınız için{" "}
            <Link className="text-link" href="/hukuki/cerez-politikasi">
              Çerez Politikası
            </Link>{" "}
            ve{" "}
            <Link className="text-link" href="/hukuki/kvkk-aydinlatma">
              KVKK Aydınlatma Metni
            </Link>{" "}
            sayfalarını inceleyebilirsiniz.
          </p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button button-primary" onClick={acknowledge}>
            Bilgilendirme tercihini kaydet
          </button>
        </div>
      </dialog>
    </>
  );
}
