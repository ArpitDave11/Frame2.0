/**
 * TemplateSectionOutline — Section navigator showing expected sections
 * with completion status based on the current category template.
 *
 * Shows green check for present sections, gray circle for missing ones.
 * Click on a missing section to insert its scaffold into the markdown.
 */

import type { EpicCategory } from '@/domain/types';
import { useEpicStore } from '@/stores/epicStore';
import { getScaledTemplate } from '@/services/templates/templateLoader';
import type { RichCategoryTemplate } from '@/services/templates/templateLoader';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface TemplateSectionOutlineProps {
  onInsertSection?: (sectionTitle: string) => void;
}

function getSectionNames(template: RichCategoryTemplate): {
  required: string[];
  optional: string[];
} {
  return {
    required: Object.keys(template.requiredSections),
    optional: Object.keys(template.optionalSections),
  };
}

function sectionExistsInMarkdown(markdown: string, sectionTitle: string): boolean {
  const pattern = new RegExp(`^##\\s+${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  return pattern.test(markdown);
}

export function TemplateSectionOutline({ onInsertSection }: TemplateSectionOutlineProps) {
  const markdown = useEpicStore((s) => s.markdown);
  const category = useEpicStore((s) => s.document?.category) as EpicCategory | undefined;
  const complexity = useEpicStore((s) => s.complexity);

  if (!category) return null;

  const template = getScaledTemplate(category, complexity);
  const { required, optional } = getSectionNames(template);
  const allSections = [
    ...required.map((name) => ({ name, isRequired: true })),
    ...optional.map((name) => ({ name, isRequired: false })),
  ];

  const handleClick = (sectionTitle: string) => {
    if (onInsertSection) {
      onInsertSection(sectionTitle);
    }
  };

  return (
    <div
      data-testid="template-section-outline"
      style={{
        fontFamily: F,
        fontSize: 13,
        overflowY: 'auto',
        maxHeight: 400,
      }}
    >
      {allSections.map(({ name, isRequired }) => {
        const present = sectionExistsInMarkdown(markdown, name);
        return (
          <div
            key={name}
            data-testid={`section-item-${name.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={!present ? () => handleClick(name) : undefined}
            role={!present ? 'button' : undefined}
            tabIndex={!present ? 0 : undefined}
            onKeyDown={
              !present
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleClick(name);
                  }
                : undefined
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: present ? 'default' : 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!present) e.currentTarget.style.background = 'var(--col-border-illustrative, #e5e5e5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Status indicator */}
            {present ? (
              <span
                data-testid="section-present"
                style={{ color: '#22c55e', fontWeight: 600, fontSize: 14, width: 18, textAlign: 'center' }}
              >
                ✓
              </span>
            ) : (
              <span
                data-testid="section-missing"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '2px solid #9ca3af',
                  display: 'inline-block',
                  marginLeft: 4,
                  marginRight: 4,
                  flexShrink: 0,
                }}
              />
            )}

            {/* Section name */}
            <span
              style={{
                fontWeight: present ? 400 : 300,
                color: present ? 'var(--col-text-primary, #222)' : 'var(--col-text-subtle, #888)',
              }}
            >
              {name}
            </span>

            {/* Required label */}
            {isRequired && (
              <span
                data-testid="required-label"
                style={{
                  fontSize: 10,
                  color: 'var(--col-text-subtle, #888)',
                  fontWeight: 300,
                  marginLeft: 'auto',
                }}
              >
                required
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
