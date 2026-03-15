import { useState } from 'react';

interface PrivacyBannerProps {
  text?: string;
  disclaimerText?: string;
  privacyPolicyLink?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onSettings?: () => void;
  showSettings?: boolean;
}

export function PrivacyBanner({
  text = 'We use cookies and other technologies to enhance your experience and analyze site traffic. By clicking "Accept all", you consent to our use of cookies.',
  disclaimerText,
  privacyPolicyLink = '#',
  onAccept,
  onReject,
  onSettings,
  showSettings = true,
}: PrivacyBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleAccept = () => {
    setIsVisible(false);
    onAccept?.();
  };

  const handleReject = () => {
    setIsVisible(false);
    onReject?.();
  };

  const handleSettings = () => {
    onSettings?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 w-full"
      style={{
        backgroundColor: 'var(--col-background-primary)',
        zIndex: 99999,
      }}
    >
      <div
        className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between w-full max-w-[var(--grid-container-width)] mx-auto px-8"
        style={{
          paddingBlock: '1.25rem',
          gap: '1.25rem 40px',
        }}
      >
        {/* Banner Text */}
        <div
          style={{
            font: '300 0.875rem / 1.375rem Frutiger, Arial, Helvetica, sans-serif',
            color: 'var(--col-text-inverted)',
          }}
          className="xl:text-[1rem] xl:leading-[1.5rem]"
        >
          <p className="inline">{text}</p>
          {disclaimerText && (
            <>
              <span> </span>
              <span>{disclaimerText}</span>
            </>
          )}
          {' '}
          <a
            href={privacyPolicyLink}
            className="cursor-pointer underline"
            style={{
              color: 'var(--col-link-text-inverted)',
              textDecorationThickness: '0.0625rem',
              textUnderlineOffset: '0.125rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--col-link-text-inverted-hovered)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--col-link-text-inverted)';
            }}
          >
            Privacy Policy
          </a>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 md:flex-row flex-shrink-0">
          {showSettings && (
            <button
              onClick={handleSettings}
              className="px-4 w-full md:w-auto"
              style={{
                padding: '0.5rem 16px',
                height: 'unset',
                font: '500 0.75rem / 0.99rem Frutiger, Arial, Helvetica, sans-serif',
                textAlign: 'center',
                color: 'var(--col-text-inverted)',
                backgroundColor: 'transparent',
                border: '1px solid var(--col-border-inverted)',
                cursor: 'pointer',
              }}
            >
              Cookie Settings
            </button>
          )}

          <button
            onClick={handleReject}
            className="px-4 w-full md:w-auto"
            style={{
              padding: '0.5rem 16px',
              height: 'unset',
              font: '500 0.75rem / 0.99rem Frutiger, Arial, Helvetica, sans-serif',
              textAlign: 'center',
              color: 'var(--col-text-inverted)',
              backgroundColor: 'transparent',
              border: '1px solid var(--col-border-inverted)',
              cursor: 'pointer',
            }}
          >
            Reject all
          </button>

          <button
            onClick={handleAccept}
            className="px-4 w-full md:w-auto"
            style={{
              padding: '0.5rem 16px',
              height: 'unset',
              font: '500 0.75rem / 0.99rem Frutiger, Arial, Helvetica, sans-serif',
              textAlign: 'center',
              color: 'var(--col-background-primary)',
              backgroundColor: 'var(--col-text-inverted)',
              border: '1px solid var(--col-border-inverted)',
              cursor: 'pointer',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
