/**
 * IssueTimeline — Activity timeline for a selected issue.
 * Matches prototype lines 400-500.
 */

import { Sparkle, ChatText, ArrowRight } from '@phosphor-icons/react';
import { F } from './types';
import type { TimelineEntry } from './types';

interface IssueTimelineProps {
  entries: TimelineEntry[];
}

export function IssueTimeline({ entries }: IssueTimelineProps) {
  if (entries.length === 0) return null;

  return (
    <div>
      {/* Section divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--col-text-subtle)',
            fontFamily: F,
            whiteSpace: 'nowrap',
          }}
        >
          Activity
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: 'var(--col-text-subtle)',
            whiteSpace: 'nowrap',
          }}
        >
          {entries.length} events
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: 'var(--col-border-illustrative)',
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          paddingLeft: 32,
        }}
      >
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: 9,
            top: 12,
            bottom: 12,
            width: 2,
            background: 'var(--col-border-illustrative)',
            borderRadius: 1,
          }}
        />

        {entries.map((event, idx) => {
          const isAI = event.type === 'ai';
          const dotColor = isAI
            ? 'var(--col-background-brand)'
            : 'var(--col-text-subtle)';

          return (
            <div
              key={idx}
              data-testid={`timeline-entry-${idx}`}
              style={{
                position: 'relative',
                marginBottom: 16,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -23,
                  top: 16,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: dotColor,
                  border: '2px solid #ffffff',
                  boxShadow: isAI
                    ? '0 0 0 3px rgba(230,0,0,0.1)'
                    : '0 0 0 2px rgba(0,0,0,0.04)',
                }}
              />

              <div
                style={{
                  padding: '16px 20px',
                  background: '#ffffff',
                  borderRadius: 8,
                  border: `1px solid ${isAI ? '#ffe5e0' : 'var(--col-border-illustrative)'}`,
                  borderLeft: isAI
                    ? '4px solid var(--col-background-brand)'
                    : undefined,
                  transition: 'all 0.25s ease',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: event.content ? 10 : 0,
                  }}
                >
                  {event.type === 'ai' && (
                    <Sparkle size={14} color={dotColor} weight="fill" />
                  )}
                  {event.type === 'comment' && (
                    <ChatText size={14} color={dotColor} />
                  )}
                  {event.type === 'status' && (
                    <ArrowRight size={14} color={dotColor} />
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: 'var(--col-text-primary)',
                      fontFamily: F,
                    }}
                  >
                    {event.author}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                      fontFamily: F,
                    }}
                  >
                    {event.action}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                      marginLeft: 'auto',
                      fontFamily: F,
                    }}
                  >
                    {event.time}
                  </span>
                </div>
                {event.content && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                      fontFamily: F,
                    }}
                  >
                    {event.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
