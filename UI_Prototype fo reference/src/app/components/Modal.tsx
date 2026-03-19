import { ReactNode } from "react";
import { X } from "@phosphor-icons/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        animation: "ubsFade .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--col-background-ui-10)",
          borderRadius: "var(--radius)",
          width,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 32px 64px rgba(0,0,0,.12)",
          fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--col-border-illustrative)",
          }}
        >
          <span
            style={{
              fontSize: "1.0625rem",
              fontWeight: 300,
              color: "var(--col-text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--col-text-subtle)",
              padding: 4,
            }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}
