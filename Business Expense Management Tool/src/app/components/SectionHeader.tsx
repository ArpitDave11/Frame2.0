import { ReactNode } from 'react';

interface SectionHeaderProps {
  headline: string;
  infoLine?: string;
  keyline?: 'default' | 'large';
  spacingBelow?: 'none' | 'medium' | 'large';
  children?: ReactNode;
}

export function SectionHeader({
  headline,
  infoLine,
  keyline = 'default',
  spacingBelow = 'none',
  children,
}: SectionHeaderProps) {
  const headlineStyles = {
    default: 'text-[1.75rem] leading-[2.0625rem] md:text-[2.5rem] md:leading-[3rem]',
    large: 'text-[1.5rem] leading-[2.25rem] xl:text-[2rem] xl:leading-[3rem]',
  };

  const spacingBottomStyles = {
    none: '',
    medium: 'mb-6 xl:mb-9',
    large: 'mb-8 lg:mb-10 xl:mb-12',
  };

  const showUnderline = keyline === 'default';

  return (
    <div
      className={`${spacingBottomStyles[spacingBelow]}`}
      style={{ fontFamily: 'Frutiger, Arial, Helvetica, sans-serif' }}
    >
      <h2
        className={`block font-light ${headlineStyles[keyline]}`}
        style={{ color: 'var(--col-text-primary)' }}
      >
        {headline}
      </h2>

      {showUnderline && (
        <span
          className="block h-1 w-[60px] md:w-[80px] mt-2 md:mt-3 bg-[var(--col-background-brand)]"
          aria-hidden="true"
        />
      )}

      {infoLine && (
        <p
          className={`block text-[1.25rem] leading-[1.75rem] xl:text-[1.5rem] xl:leading-[2.25rem] font-light ${
            keyline === 'default' ? 'mt-4 md:mt-6' : 'mt-3 md:mt-4'
          }`}
          style={{ color: 'var(--col-text-primary)' }}
        >
          {infoLine}
        </p>
      )}

      {children}
    </div>
  );
}
