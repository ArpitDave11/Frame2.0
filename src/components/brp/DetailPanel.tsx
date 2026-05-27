/**
 * DetailPanel — right-rail inspector for one selected Epic (B-22).
 *
 * Renders four sections in order:
 *   1. FRAME rationale (free-text explanation)
 *   2. High-level breakdown (BreakdownItem[] — title + points)
 *   3. Historical comparisons (ReferenceEpic[] — title + similarity + actualSp)
 *   4. Generated stories (GeneratedStory[] — only when FRAME had to invent them)
 *
 * When the FRAME result is null (raw / analyzing / errored), shows an
 * empty-state explaining how to populate it. A "Send to detailed
 * grooming" CTA appears at the bottom whenever the variance is 're-groom'
 * or 'flagged' — the caller plumbs `onSendToGrooming(epic)` to whatever
 * downstream action that should fire (Phase 6/7 wiring).
 *
 * Pure presentational. No store reads inside.
 */

import { X } from '@phosphor-icons/react';
import { computeVariance } from '@/domain/brp';
import type { Epic } from '@/domain/brp';
import { color, font, fontSize, fontWeight, radius } from '@/theme/tokens';

/**
 * B-32 I4: only http(s) URLs are safe targets for the GitLab link.
 * Anything else (javascript:, data:, vbscript:, …) gets neutered to '#'.
 */
function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export interface DetailPanelProps {
  epic: Epic | null;
  onClose: () => void;
  onSendToGrooming?: (epic: Epic) => void;
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: fontWeight.semibold,
  color: color.grayV,
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
  margin: '0 0 14px 0',
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: color.neutral50,
  borderRadius: radius.sm,
  fontSize: fontSize.sm,
  border: `1px solid ${color.neutral200}`,
};

export function DetailPanel({ epic, onClose, onSendToGrooming }: DetailPanelProps) {
  if (!epic) return null;

  const variance = computeVariance(epic);
  const showGroomingCta =
    (variance === 're-groom' || variance === 'flagged') && onSendToGrooming !== undefined;

  return (
    <aside
      data-testid="detail-panel"
      data-variance={variance}
      aria-label={`Details for ${epic.title}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        background: color.white,
        fontFamily: font.sans,
        borderLeft: `1px solid ${color.neutral200}`,
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 28px',
          borderBottom: `1px solid ${color.neutral200}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: color.neutral50,
        }}
      >
        <div>
          <h2
            data-testid="detail-panel-title"
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: color.black,
              margin: '0 0 6px 0',
              letterSpacing: '-0.2px',
            }}
          >
            {epic.title}
          </h2>
          <div
            data-testid="detail-panel-id"
            style={{
              fontSize: fontSize.xs,
              color: color.grayIII,
              fontFamily: font.mono,
            }}
          >
            !{epic.iid}{' '}
            <a
              // B-32 I4: guard against javascript: / data: URLs that a
              // malicious or buggy GitLab response could plant in the
              // epic body. Only http(s) gets through; everything else
              // renders as a noop link.
              href={isSafeHttpUrl(epic.gitlabWebUrl) ? epic.gitlabWebUrl : '#'}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="detail-panel-gitlab-link"
              style={{ color: color.red, textDecoration: 'none', marginLeft: 6 }}
            >
              Open in GitLab ↗
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          data-testid="detail-panel-close"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: color.grayIII,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {epic.frameResult ? (
          <>
            <Section
              title="FRAME rationale"
              testid="detail-section-rationale"
            >
              <p
                data-testid="detail-rationale"
                style={{
                  fontSize: fontSize.sm,
                  lineHeight: 1.65,
                  color: color.grayV,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {epic.frameResult.rationale}
              </p>
            </Section>

            {epic.frameResult.breakdown.length > 0 && (
              <Section
                title={`High-level breakdown (FRAME estimate: ${epic.frameResult.frameEstimate} SP)`}
                testid="detail-section-breakdown"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {epic.frameResult.breakdown.map((item, idx) => (
                    <div
                      key={`${item.title}-${idx}`}
                      data-testid={`detail-breakdown-item-${idx}`}
                      style={itemRowStyle}
                    >
                      <span style={{ color: color.black }}>{item.title}</span>
                      <span
                        style={{
                          fontFamily: font.mono,
                          fontWeight: fontWeight.medium,
                          color: color.black,
                        }}
                      >
                        {item.points} SP
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {epic.frameResult.references.length > 0 && (
              <Section
                title="Historical comparisons"
                testid="detail-section-references"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {epic.frameResult.references.map((ref, idx) => (
                    <div
                      key={ref.epicId}
                      data-testid={`detail-reference-${idx}`}
                      style={itemRowStyle}
                    >
                      <span style={{ color: color.black }}>
                        {ref.title}{' '}
                        <span style={{ color: color.grayIII }}>
                          ({Math.round(ref.similarity * 100)}% sim.)
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: font.mono,
                          fontWeight: fontWeight.medium,
                          color: color.black,
                        }}
                      >
                        {ref.actualSp} SP
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {epic.frameResult.generatedStories &&
              epic.frameResult.generatedStories.length > 0 && (
                <Section
                  title="Generated stories (FRAME invented these — no decomposition existed)"
                  testid="detail-section-generated"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {epic.frameResult.generatedStories.map((story, idx) => (
                      <div
                        key={`${story.title}-${idx}`}
                        data-testid={`detail-generated-story-${idx}`}
                        style={{
                          ...itemRowStyle,
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: color.black }}>{story.title}</span>
                          <span
                            style={{
                              fontFamily: font.mono,
                              fontWeight: fontWeight.medium,
                              color: color.black,
                            }}
                          >
                            {story.points} SP
                          </span>
                        </div>
                        {story.acceptanceCriteria.length > 0 && (
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: 18,
                              color: color.grayV,
                              fontSize: '0.8125rem',
                            }}
                          >
                            {story.acceptanceCriteria.map((ac, i) => (
                              <li key={i}>{ac}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
          </>
        ) : (
          <div
            data-testid="detail-empty-state"
            style={{ textAlign: 'center', padding: '50px 20px' }}
          >
            <p style={{ fontSize: fontSize.sm, color: color.grayV, margin: 0 }}>
              No FRAME analysis yet
            </p>
            <p
              style={{
                fontSize: fontSize.xs,
                color: color.grayIII,
                marginTop: 10,
              }}
            >
              Run analysis to see FRAME's estimate, rationale, and breakdown.
            </p>
          </div>
        )}

        {showGroomingCta && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 28,
              borderTop: `1px solid ${color.neutral200}`,
            }}
          >
            <button
              type="button"
              onClick={() => onSendToGrooming!(epic)}
              data-testid="detail-send-to-grooming"
              style={{
                width: '100%',
                background: color.red,
                color: color.white,
                border: 'none',
                padding: '12px 20px',
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Send to detailed grooming
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
  testid,
}: {
  title: string;
  children: React.ReactNode;
  testid: string;
}) {
  return (
    <section data-testid={testid} style={{ marginBottom: 36 }}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {children}
    </section>
  );
}
