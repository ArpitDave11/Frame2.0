import { ReactNode, useRef, useEffect, useState } from 'react';

interface DoormatColumn {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
}

interface DoormatProps {
  columns?: DoormatColumn[];
  children?: ReactNode;
}

export function Doormat({ columns, children }: DoormatProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    // Check if content is empty
    if (contentRef.current) {
      const hasContent = contentRef.current.innerHTML.trim() !== '';
      const hasColumns = columns && columns.length > 0;
      setIsEmpty(!hasContent && !hasColumns);
    }
  }, [columns, children]);

  // Hide doormat if empty
  if (isEmpty) {
    return null;
  }

  return (
    <footer
      className="bg-[var(--col-background-ui-10)] border-t border-[var(--col-border-illustrative)] py-12 lg:py-16"
      style={{ fontFamily: 'Frutiger, Arial, Helvetica, sans-serif' }}
    >
      <div className="max-w-[1920px] mx-auto px-8">
        <div ref={contentRef}>
          {columns && columns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {columns.map((column, index) => (
                <div key={index}>
                  <h3
                    className="py-1"
                    style={{
                      font: '500 0.875rem / 1.25rem Frutiger, Arial, Helvetica, sans-serif',
                      color: 'var(--col-text-subtle)',
                    }}
                  >
                    {column.title}
                  </h3>
                  <ul className="mt-2">
                    {column.links.map((link, linkIndex) => (
                      <li
                        key={linkIndex}
                        className="py-1"
                        style={{
                          marginTop: linkIndex === 0 ? '0rem' : '0.25rem',
                        }}
                      >
                        <a
                          href={link.href}
                          className="doormat-link cursor-pointer pb-[2px] break-words"
                          style={{
                            font: '300 0.875rem / 1.25rem Frutiger, Arial, Helvetica, sans-serif',
                            color: 'var(--col-text-subtle)',
                            textDecoration: 'none',
                            backgroundImage:
                              'linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)), linear-gradient(var(--col-background-brand), var(--col-background-brand))',
                            backgroundSize: '100% 1px, 0 1px',
                            backgroundPosition: '100% 100%, 0 100%',
                            backgroundRepeat: 'no-repeat',
                            transition: 'background-size 0.2s cubic-bezier(1, 0, 0.3, 1)',
                          }}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </footer>
  );
}