/**
 * SectionFeedbackCard — T-9.3.
 *
 * Per-section quality card with 5 horizontal dimension bars
 * and an optional suggestions list.
 */

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface SectionFeedbackCardProps {
  sectionTitle: string;
  scores: {
    completeness: number;
    clarity: number;
    specificity: number;
    actionability: number;
    technicalDepth: number;
  };
  suggestions: string[];
}

const DIMENSIONS: { key: keyof SectionFeedbackCardProps['scores']; label: string }[] = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'specificity', label: 'Specificity' },
  { key: 'actionability', label: 'Actionability' },
  { key: 'technicalDepth', label: 'Technical Depth' },
];

function scoreColor(score: number): string {
  if (score >= 0.7) return '#22c55e';
  if (score >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export function SectionFeedbackCard({ sectionTitle, scores, suggestions }: SectionFeedbackCardProps) {
  return (
    <div
      data-testid="section-feedback-card"
      style={{
        background: '#ffffff',
        border: '1px solid var(--col-border-illustrative, #e5e5e5)',
        borderRadius: 10,
        padding: 16,
        fontFamily: F,
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--col-text-primary, #1a1a1a)',
          marginBottom: 12,
        }}
      >
        {sectionTitle}
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIMENSIONS.map(({ key, label }) => {
          const score = scores[key];
          const color = scoreColor(score);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 300,
                  color: 'var(--col-text-subtle, #666)',
                  width: 100,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: '#f0f0f0',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  data-testid={`bar-${key}`}
                  style={{
                    height: '100%',
                    width: `${score * 100}%`,
                    background: color,
                    borderRadius: 2,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color,
                  width: 32,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {score.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: 'var(--col-text-subtle, #666)',
              marginBottom: 6,
            }}
          >
            Suggestions
          </div>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 16px',
              listStyleType: 'disc',
            }}
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 300,
                  color: 'var(--col-text-primary, #1a1a1a)',
                  lineHeight: 1.5,
                  marginBottom: 2,
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
