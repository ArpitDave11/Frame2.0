/**
 * SectionHints — Shows template guidance for a given section.
 *
 * Displays format badge, word target, and required/optional indicator
 * based on the category template configuration.
 */

import type { EpicCategory, ComplexityLevel } from '@/domain/types';
import { getScaledTemplate, findSectionConfig } from '@/services/templates/templateLoader';
import type { RichCategoryTemplate } from '@/services/templates/templateLoader';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export interface SectionHintsProps {
  sectionTitle: string;
  category: EpicCategory | undefined;
  complexity: ComplexityLevel;
}

function isRequired(sectionTitle: string, template: RichCategoryTemplate): boolean {
  const normalized = sectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const key of Object.keys(template.requiredSections)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) return true;
  }
  return false;
}

export function SectionHints({ sectionTitle, category, complexity }: SectionHintsProps) {
  if (!category) return null;

  const template = getScaledTemplate(category, complexity);
  const config = findSectionConfig(sectionTitle, template);

  if (!config) return null;

  const required = isRequired(sectionTitle, template);
  const format = config.format;
  const target = config.target ?? 200;

  return (
    <div
      data-testid="section-hints"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--input-background, #f5f5f5)',
        borderRadius: 6,
        padding: '6px 12px',
        fontFamily: F,
        fontSize: 11,
        fontWeight: 300,
        color: 'var(--col-text-subtle, #888)',
      }}
    >
      {/* Format badge */}
      {format && (
        <span
          data-testid="format-badge"
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            background: 'var(--col-background-brand, #6366f1)',
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: 999,
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {format}
        </span>
      )}

      {/* Word target */}
      <span data-testid="word-target">~{target} words</span>

      {/* Required/optional indicator */}
      <span
        data-testid="required-indicator"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: required ? '#ef4444' : '#9ca3af',
            display: 'inline-block',
          }}
        />
        {required ? 'required' : 'optional'}
      </span>
    </div>
  );
}
