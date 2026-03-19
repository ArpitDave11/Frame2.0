import { Modal } from "./Modal";
import { Check } from "@phosphor-icons/react";

interface Stage {
  id: number;
  name: string;
  sub: string;
}

interface PipelineModalProps {
  open: boolean;
  onClose: () => void;
  stages: Stage[];
  currentStage: number;
  isRunning: boolean;
}

export function PipelineModal({
  open,
  onClose,
  stages,
  currentStage,
  isRunning,
}: PipelineModalProps) {
  const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  return (
    <Modal open={open} onClose={() => !isRunning && onClose()} title="Refining your epic">
      {stages.map((s) => {
        const done = currentStage > s.id;
        const active = currentStage === s.id;
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 0",
              fontFamily: F,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
                background: done
                  ? "#dcfce7"
                  : active
                  ? "var(--col-background-brand)"
                  : "var(--input-background)",
                color: done
                  ? "#166534"
                  : active
                  ? "var(--col-text-inverted)"
                  : "var(--muted-foreground)",
                transition: "all .3s",
                ...(active ? { animation: "ubsPulse 1.5s ease infinite" } : {}),
              }}
            >
              {done ? <Check size={13} weight="bold" color="#166534" /> : s.id}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: active || done ? 400 : 300,
                  color:
                    active || done
                      ? "var(--col-text-primary)"
                      : "var(--muted-foreground)",
                }}
              >
                {s.name}
              </div>
              {active && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--col-text-subtle)",
                    fontWeight: 300,
                    marginTop: 2,
                  }}
                >
                  {s.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      <div
        style={{
          marginTop: 16,
          height: 3,
          background: "var(--muted)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(currentStage / stages.length) * 100}%`,
            height: "100%",
            background: "var(--col-background-brand)",
            transition: "width .5s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 10,
          color: "var(--col-text-subtle)",
          fontWeight: 300,
          fontFamily: F,
        }}
      >
        <span>Iteration 1/5</span>
        <span>{isRunning ? "Processing..." : "Complete"}</span>
      </div>
    </Modal>
  );
}
