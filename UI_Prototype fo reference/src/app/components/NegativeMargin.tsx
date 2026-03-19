import { ReactNode } from 'react';

interface NegativeMarginProps {
  children: ReactNode;
  spacing?: 'standard' | 'small' | 'medium' | 'large';
  context?: 'middle' | 'generous';
  className?: string;
}

export function NegativeMargin({
  children,
  spacing = 'standard',
  context,
  className = '',
}: NegativeMarginProps) {
  // Determine the container class based on spacing
  const containerClass = spacing
    ? `gridcontrol2__gridContainer--vertical-spacing-${spacing}`
    : '';

  // Determine the context class if specified
  const contextClass = context
    ? `verticaltabteaser__base verticaltabteaser__context--${context}`
    : '';

  return (
    <div className={`${containerClass} ${contextClass} ${className}`.trim()}>
      <div className="gridcontrol2__negativeMargin">{children}</div>
    </div>
  );
}
