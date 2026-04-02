interface DoubleImageProps {
  leftImage: string;
  rightImage: string;
  leftImageAlt?: string;
  rightImageAlt?: string;
  align?: 'left' | 'right' | 'none';
}

export function DoubleImage({
  leftImage,
  rightImage,
  leftImageAlt = 'Left image',
  rightImageAlt = 'Right image',
  align = 'none',
}: DoubleImageProps) {
  const leftImagePadding = align === 'right' ? 'pt-[3.75em] lg:pt-[5em]' : '';
  const rightImagePadding = align === 'left' ? 'pt-[3.75em] lg:pt-[5em]' : '';

  return (
    <div className="flex">
      <div 
        className={`${leftImagePadding}`}
        style={{
          width: 'calc((100% - var(--grid-absolute-gutter)) / 2)',
          marginRight: 'var(--grid-absolute-gutter)',
        }}
      >
        <img
          src={leftImage}
          alt={leftImageAlt}
          className="w-full h-auto object-cover"
        />
      </div>

      <div 
        className={`${rightImagePadding}`}
        style={{
          width: 'calc((100% - var(--grid-absolute-gutter)) / 2)',
        }}
      >
        <img
          src={rightImage}
          alt={rightImageAlt}
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  );
}
