"use client";

import { useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function LegalDialog({
  title,
  href,
  children
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className="text-link" onClick={() => dialog.current?.showModal()}>
        {title}
      </button>
      <dialog
        ref={dialog}
        className="legal-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Metni kapat"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-content">{children}</div>
        <div className="dialog-footer">
          <Link href={href} target="_blank" rel="noopener noreferrer" className="text-link">
            Ayrı sayfada aç ↗
          </Link>
          <button
            type="button"
            className="button button-primary"
            onClick={() => dialog.current?.close()}
          >
            Forma dön
          </button>
        </div>
      </dialog>
    </>
  );
}
