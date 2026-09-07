import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="E-Takas ana sayfa">
      <span className="brand-icon">
        <ArrowLeftRight size={22} />
      </span>
      <span>
        E<span className="text-[var(--primary)]">Takas</span>
        <small>İŞLETMELER ARASI TAKAS</small>
      </span>
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  href,
  label
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <PackageOpen size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && (
        <Link className="button button-primary" href={href}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
const labels: Record<string, string> = {
  DRAFT: "Taslak",
  SUBMITTED: "Başvuru alındı",
  UNDER_REVIEW: "İnceleniyor",
  ADDITIONAL_DOCUMENT_REQUIRED: "Ek belge bekleniyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  SUSPENDED: "Askıya alındı",
  CLOSED: "Kapalı",
  PENDING_REVIEW: "Onay bekliyor",
  CHANGES_REQUESTED: "Düzenleme istendi",
  ACTIVE: "Yayında",
  PAUSED: "Duraklatıldı",
  PARTIALLY_RESERVED: "Rezerve",
  SOLD_OUT: "Tükendi",
  EXPIRED: "Süresi doldu",
  REMOVED: "Kaldırıldı",
  RESERVED: "Rezerve edildi",
  CONTACT_DETAILS_REVEALED: "İletişim paylaşıldı",
  SELLER_PREPARING: "Hazırlanıyor",
  READY_FOR_PICKUP: "Teslime hazır",
  HANDOVER_DECLARED: "Teslim bildirildi",
  BUYER_CONFIRMATION_PENDING: "Alıcı onayı bekleniyor",
  COMPLETED: "Tamamlandı",
  DISPUTED: "İtiraz açık",
  ADMIN_FROZEN: "Donduruldu",
  CANCELLED: "İptal edildi",
  UPLOADED: "Yüklendi",
  CLEAN: "Kontrol edildi",
  SCANNING: "Taranıyor",
  QUARANTINED: "Karantinada",
  INFECTED: "Engellendi"
};
export function statusLabel(status: string) {
  return labels[status] ?? status;
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-badge ${["ACTIVE", "APPROVED", "COMPLETED", "CLEAN"].includes(status) ? "status-success" : ["REJECTED", "SUSPENDED", "CANCELLED", "DISPUTED", "REMOVED"].includes(status) ? "status-danger" : "status-pending"}`}
    >
      {statusLabel(status)}
    </span>
  );
}
export function formatValue(kurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(kurus / 100);
}
export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul"
  }).format(new Date(value));
}
export const organizationTypeLabels: Record<string, string> = {
  PHARMACY: "Eczane",
  VETERINARY_CLINIC: "Veteriner kliniği",
  VETERINARY_POLYCLINIC: "Veteriner polikliniği",
  ANIMAL_HOSPITAL: "Hayvan hastanesi"
};
