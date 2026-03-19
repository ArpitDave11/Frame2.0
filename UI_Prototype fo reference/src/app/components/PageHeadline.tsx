import { ReactNode } from 'react';

interface PageHeadlineProps {
  caption?: string;
  headline: string;
  size?: 'small' | 'medium' | 'large' | 'leadtext';
  info?: string;
  leadtext?: string;
  showImpulseLine?: boolean;
  children?: ReactNode;
}

export function PageHeadline({
  caption,
  headline,
  size = 'medium',
  info,
  leadtext,
  showImpulseLine = true,
  children,
}: PageHeadlineProps) {
  const headlineSizeStyles = {
    small: 'text-[1.75rem] leading-[2.0625rem] md:text-[2.5rem] md:leading-[3rem]',
    medium: 'text-[2rem] leading-[2.5rem] xl:text-[3rem] xl:leading-[3.5625rem]',
    large: 'text-[1.6875rem] leading-[1.9375rem] md:text-[2.375rem] md:leading-[2.8125rem] lg:text-[3.125rem] lg:leading-[3.75rem] xl:text-[3.75rem] xl:leading-[4.5rem]',
    leadtext: 'text-[1.625rem] leading-[1.875rem] md:text-[2.5rem] md:leading-[2.625rem] xl:text-[3.125rem] xl:leading-[3.375rem]',
  };

  const wrapperClasses = showImpulseLine
    ? 'relative pl-5 xl:pl-6 before:content-[""] before:absolute before:left-0 before:top-[0.9375rem] before:bottom-[0.9375rem] before:w-1 before:bg-[var(--col-background-brand)]'
    : '';

  return (
    <div 
      className="my-6 md:my-8 lg:my-12 xl:my-[3.75rem]"
      style={{ fontFamily: 'Frutiger, Arial, Helvetica, sans-serif' }}
    >
      <div className={wrapperClasses}>
        {caption && (
          <span
            className="block text-[1rem] leading-[1.625rem] lg:text-[0.875rem] lg:leading-[1.375rem] xl:text-[1rem] xl:leading-[1.625rem] 2xl:text-[1.0625rem] 2xl:leading-[1.6875rem] font-light"
            style={{ color: 'var(--col-text-subtle)' }}
          >
            {caption}
          </span>
        )}

        <h1
          className={`block break-words font-light ${headlineSizeStyles[size]} ${caption ? 'mt-1 xl:mt-2' : ''}`}
          style={{ color: 'var(--col-text-primary)' }}
        >
          {headline}
        </h1>

        {info && (
          <p
            className="break-words text-[1.25rem] leading-[1.75rem] xl:text-[1.5rem] xl:leading-[2.25rem] font-light mt-2 xl:mt-3"
            style={{ color: 'var(--col-text-primary)' }}
          >
            {info}
          </p>
        )}

        {leadtext && (
          <p
            className="break-words text-[1.25rem] leading-[1.5rem] md:text-[1.375rem] md:leading-[1.625rem] lg:text-[1.25rem] lg:leading-[1.5rem] xl:text-[1.375rem] xl:leading-[1.625rem] font-light mt-[1.4375rem]"
            style={{ color: 'var(--col-text-primary)' }}
          >
            {leadtext}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
