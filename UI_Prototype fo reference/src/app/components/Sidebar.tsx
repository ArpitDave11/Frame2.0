import { ComponentType } from "react";
import { List } from "@phosphor-icons/react";
import ubsLogo from "figma:asset/00ac1239b9b421f7eee8b4e260132b1ac860676a.png";

interface SidebarItem {
  id: string;
  icon: ComponentType<{ size?: number; weight?: string; color?: string }>;
  label: string;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  activeNav: string;
  onNavigate: (id: string) => void;
  items: SidebarItem[];
  onLogoClick?: () => void;
}

export function Sidebar({ open, onToggle, activeNav, onNavigate, items, onLogoClick }: SidebarProps) {
  const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const sW = open ? 220 : 56;

  return (
    <nav
      style={{
        width: sW,
        background: "var(--col-background-ui-10)",
        borderRight: "1px solid var(--col-border-illustrative)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width .2s ease",
        fontFamily: F,
      }}
    >
      {/* UBS Logo */}
      <div
        onClick={onLogoClick}
        style={{
          padding: "16px 12px",
          borderBottom: "1px solid var(--col-border-illustrative)",
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          gap: open ? 6 : 0,
          marginRight: open ? 8 : 0,
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <img
          src={ubsLogo}
          alt="UBS"
          style={{
            width: open ? 83 : 40,
            minWidth: open ? 83 : 40,
            height: "auto",
            transition: "width 0.2s ease",
          }}
        />
        {open && (
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 300,
              color: "var(--col-text-subtle)",
              letterSpacing: "0.02em",
            }}
          >
            FRAME
          </span>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: "12px 8px", gap: 2, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Collapse Button */}
        <button
          onClick={onToggle}
          style={{
            width: "100%",
            height: 36,
            borderRadius: "0.375rem",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            padding: open ? "0 12px" : 0,
            gap: 10,
            color: "var(--col-text-subtle)",
            marginBottom: 8,
            fontFamily: F,
            fontSize: 12,
          }}
        >
          <List size={16} weight="regular" />
          {open && <span style={{ fontWeight: 300 }}>Collapse</span>}
        </button>

        {items.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: open ? "8px 12px" : "8px 0",
                justifyContent: open ? "flex-start" : "center",
                width: "100%",
                height: 38,
                border: "none",
                borderRadius: "0.375rem",
                background: activeNav === item.id ? "var(--input-background)" : "transparent",
                color:
                  activeNav === item.id
                    ? "var(--col-text-primary)"
                    : "var(--col-text-subtle)",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: F,
                fontWeight: activeNav === item.id ? 400 : 300,
                transition: "all .12s",
              }}
            >
              <IconComponent size={16} />
              {open && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}