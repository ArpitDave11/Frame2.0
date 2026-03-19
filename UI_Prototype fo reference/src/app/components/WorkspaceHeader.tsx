import {
  FolderSimple,
  FloppyDisk,
  Lightning,
  ListBullets,
  UploadSimple,
  Star,
  GearSix,
} from "@phosphor-icons/react";

interface Category {
  id: string;
  label: string;
}

interface WorkspaceHeaderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  onLoad: () => void;
  onRefine: () => void;
  onPublish: () => void;
  onSettings: () => void;
  canRefine: boolean;
  canPublish: boolean;
  diagramReady: boolean;
  score: number | null;
}

export function WorkspaceHeader({
  categories,
  selectedCategory,
  onSelectCategory,
  onLoad,
  onRefine,
  onPublish,
  onSettings,
  canRefine,
  canPublish,
  diagramReady,
  score,
}: WorkspaceHeaderProps) {
  const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        background: "var(--col-background-ui-10)",
        borderBottom: "1px solid var(--col-border-illustrative)",
        flexShrink: 0,
        zIndex: 10,
        fontFamily: F,
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={onLoad}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            border: "1px solid var(--col-border-illustrative)",
            borderRadius: "0.375rem",
            background: "var(--col-background-ui-10)",
            color: "var(--col-text-primary)",
            fontSize: 13,
            fontWeight: 400,
            cursor: "pointer",
            fontFamily: F,
          }}
        >
          <FolderSimple size={14} weight="regular" /> Load
        </button>

        <select
          value={selectedCategory}
          onChange={(e) => onSelectCategory(e.target.value)}
          style={{
            padding: "6px 28px 6px 12px",
            border: "1px solid var(--col-border-illustrative)",
            borderRadius: "0.375rem",
            background: "var(--col-background-ui-10)",
            color: selectedCategory ? "var(--col-text-primary)" : "var(--col-text-subtle)",
            fontSize: 13,
            fontFamily: F,
            fontWeight: 300,
            cursor: "pointer",
            minWidth: 170,
            appearance: "none" as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="">Select category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            border: "1px solid var(--col-border-illustrative)",
            borderRadius: "0.375rem",
            background: "var(--col-background-ui-10)",
            color: "var(--col-text-primary)",
            fontSize: 13,
            fontWeight: 400,
            cursor: "pointer",
            fontFamily: F,
          }}
        >
          <FloppyDisk size={14} weight="regular" /> Save
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onRefine}
          disabled={!canRefine}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 20px",
            border: "none",
            borderRadius: "0.375rem",
            background: !canRefine ? "var(--muted)" : "var(--col-background-brand)",
            color: !canRefine ? "var(--muted-foreground)" : "var(--col-text-inverted)",
            fontSize: 13,
            fontWeight: 500,
            cursor: !canRefine ? "not-allowed" : "pointer",
            fontFamily: F,
            transition: "background .15s",
          }}
        >
          <Lightning
            size={14}
            weight="fill"
            color={!canRefine ? "#717182" : "var(--col-text-inverted)"}
          />
          Refine
        </button>

        <div style={{ width: 1, height: 24, background: "var(--col-border-illustrative)" }} />

        <button
          disabled={!diagramReady}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            border: "1px solid var(--col-border-illustrative)",
            borderRadius: "0.375rem",
            background: "var(--col-background-ui-10)",
            color: diagramReady ? "var(--col-text-primary)" : "var(--muted-foreground)",
            fontSize: 13,
            fontWeight: 400,
            cursor: diagramReady ? "pointer" : "not-allowed",
            fontFamily: F,
            opacity: diagramReady ? 1 : 0.4,
          }}
        >
          <ListBullets size={14} weight="regular" /> Issues
        </button>

        <button
          onClick={onPublish}
          disabled={!canPublish}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            border: `1px solid ${canPublish ? "var(--col-background-brand)" : "var(--col-border-illustrative)"}`,
            borderRadius: "0.375rem",
            background: "var(--col-background-ui-10)",
            color: canPublish ? "var(--col-background-brand)" : "var(--muted-foreground)",
            fontSize: 13,
            fontWeight: 500,
            cursor: canPublish ? "pointer" : "not-allowed",
            fontFamily: F,
            opacity: canPublish ? 1 : 0.4,
          }}
        >
          <UploadSimple
            size={14}
            weight="regular"
            color={canPublish ? "var(--col-background-brand)" : "#717182"}
          />
          Publish
        </button>

        <div style={{ width: 1, height: 24, background: "var(--col-border-illustrative)" }} />

        {score !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 400,
              color: "var(--col-text-subtle)",
            }}
          >
            <Star size={12} weight="fill" color="var(--col-background-brand)" />
            <span style={{ color: "var(--col-text-primary)", fontWeight: 500 }}>
              {score.toFixed(1)}
            </span>
          </div>
        )}

        <button
          onClick={onSettings}
          style={{
            width: 34,
            height: 34,
            borderRadius: "0.375rem",
            border: "1px solid var(--col-border-illustrative)",
            background: "var(--col-background-ui-10)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--col-text-subtle)",
          }}
        >
          <GearSix size={15} weight="regular" />
        </button>
      </div>
    </header>
  );
}