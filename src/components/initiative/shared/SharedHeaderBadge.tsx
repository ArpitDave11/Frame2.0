import { ArrowsLeftRight } from '@phosphor-icons/react';

interface SharedHeaderBadgeProps {
  count: number;
}

export function SharedHeaderBadge({ count }: SharedHeaderBadgeProps) {
  if (count < 2) return null;
  return (
    <span
      aria-label={`Shared with ${count} crews`}
      style={{ color: '#8E8D83', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}
    >
      <ArrowsLeftRight size={14} />
    </span>
  );
}
