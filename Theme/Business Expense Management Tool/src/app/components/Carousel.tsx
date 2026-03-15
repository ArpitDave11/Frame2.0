import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

export interface CarouselSlide {
  image: string;
  imageAlt?: string;
  caption?: string;
  headline?: string;
  description?: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  autoplay?: boolean;
  autoplayDelay?: number;
  infiniteLoop?: boolean;
  showIndicators?: boolean;
  showArrows?: boolean;
  showAutoplayControls?: boolean;
  showGradients?: boolean;
  showCounter?: boolean;
  variant?: 'default' | 'hero' | 'card';
}

export function Carousel({
  slides,
  autoplay = false,
  autoplayDelay = 5000,
  infiniteLoop = false,
  showIndicators = true,
  showArrows = true,
  showAutoplayControls = false,
  showGradients = false,
  showCounter = false,
  variant = 'default',
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef(0);

  const totalSlides = slides.length;
  const lastIndex = totalSlides - 1;

  const isStart = activeIndex === 0;
  const isEnd = activeIndex === lastIndex;

  // Autoplay logic
  const clearAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const resetAutoplay = useCallback(() => {
    clearAutoplay();
    if (!autoplay || isPaused) return;
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= lastIndex) {
          if (infiniteLoop) return 0;
          clearAutoplay();
          return prev;
        }
        return prev + 1;
      });
    }, autoplayDelay);
  }, [autoplay, autoplayDelay, infiniteLoop, isPaused, lastIndex, clearAutoplay]);

  useEffect(() => {
    resetAutoplay();
    return clearAutoplay;
  }, [resetAutoplay, clearAutoplay]);

  // Navigation
  const navigate = useCallback(
    (index: number) => {
      if (index < 0 || index > lastIndex || isTransitioning) return;
      setIsTransitioning(true);
      setActiveIndex(index);
      resetAutoplay();
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [lastIndex, isTransitioning, resetAutoplay]
  );

  const goNext = useCallback(() => {
    if (isEnd) {
      if (infiniteLoop) navigate(0);
    } else {
      navigate(activeIndex + 1);
    }
  }, [activeIndex, isEnd, infiniteLoop, navigate]);

  const goPrevious = useCallback(() => {
    if (isStart) {
      if (infiniteLoop) navigate(lastIndex);
    } else {
      navigate(activeIndex - 1);
    }
  }, [activeIndex, isStart, infiniteLoop, lastIndex, navigate]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    },
    [goNext, goPrevious]
  );

  // Swipe/drag handling (mouse + touch)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    touchDeltaRef.current = 0;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchStartRef.current) return;
    touchDeltaRef.current = e.clientX - touchStartRef.current.x;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!touchStartRef.current) return;
    const delta = touchDeltaRef.current;
    const minSwipeDistance = 35;

    if (Math.abs(delta) >= minSwipeDistance) {
      if (delta < 0) {
        goNext();
      } else {
        goPrevious();
      }
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
  }, [goNext, goPrevious]);

  // Pause on hover
  const handleMouseEnter = useCallback(() => {
    if (autoplay && !isPaused) clearAutoplay();
  }, [autoplay, isPaused, clearAutoplay]);

  const handleMouseLeave = useCallback(() => {
    if (autoplay && !isPaused) resetAutoplay();
  }, [autoplay, isPaused, resetAutoplay]);

  // Autoplay toggle
  const toggleAutoplay = useCallback(() => {
    setIsPaused((prev) => {
      const newPaused = !prev;
      if (newPaused) {
        clearAutoplay();
      }
      return newPaused;
    });
  }, [clearAutoplay]);

  // Effect to restart autoplay when unpaused
  useEffect(() => {
    if (!isPaused && autoplay) {
      resetAutoplay();
    }
  }, [isPaused, autoplay, resetAutoplay]);

  // Variant-specific styles
  const variantStyles = {
    default: {
      container: 'bg-white',
      slideHeight: 'h-[400px] xl:h-[500px]',
      captionArea: 'bg-white',
    },
    hero: {
      container: 'bg-black',
      slideHeight: 'h-[500px] xl:h-[640px]',
      captionArea: 'bg-black/60',
    },
    card: {
      container: 'bg-[var(--col-background-ui-10)]',
      slideHeight: 'h-[320px] xl:h-[400px]',
      captionArea: 'bg-white',
    },
  };

  const styles = variantStyles[variant];

  const canGoPrev = infiniteLoop || !isStart;
  const canGoNext = infiniteLoop || !isEnd;

  return (
    <div
      className={`relative w-full select-none ${styles.container}`}
      style={{ fontFamily: 'Frutiger, Arial, Helvetica, sans-serif' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Carousel"
      aria-roledescription="carousel"
      tabIndex={0}
    >
      {/* Slides container */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${styles.slideHeight}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-[400ms] ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${totalSlides}`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.image}
                alt={slide.imageAlt || `Slide ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Caption overlay */}
              {(slide.headline || slide.description || slide.caption) && (
                <div
                  className={`absolute bottom-0 left-0 right-0 px-8 py-6 xl:px-12 xl:py-8 ${
                    variant === 'hero'
                      ? 'bg-gradient-to-t from-black/70 to-transparent'
                      : ''
                  }`}
                >
                  {slide.caption && (
                    <span
                      className="block text-[0.875rem] leading-[1.375rem] font-light mb-1"
                      style={{
                        color:
                          variant === 'hero'
                            ? 'var(--col-text-inverted)'
                            : 'var(--col-text-subtle)',
                      }}
                    >
                      {slide.caption}
                    </span>
                  )}
                  {slide.headline && (
                    <h3
                      className="text-[1.5rem] leading-[1.875rem] xl:text-[2rem] xl:leading-[2.5rem] font-light"
                      style={{
                        color:
                          variant === 'hero'
                            ? 'var(--col-text-inverted)'
                            : 'var(--col-text-primary)',
                      }}
                    >
                      {slide.headline}
                    </h3>
                  )}
                  {slide.description && (
                    <p
                      className="text-[1rem] leading-[1.625rem] font-light mt-1 max-w-[600px]"
                      style={{
                        color:
                          variant === 'hero'
                            ? 'rgba(255,255,255,0.85)'
                            : 'var(--col-text-subtle)',
                      }}
                    >
                      {slide.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Gradient overlays */}
        {showGradients && (
          <>
            <div
              className={`absolute left-0 top-0 bottom-0 w-16 xl:w-24 z-20 pointer-events-none bg-gradient-to-r transition-opacity duration-300 ${
                variant === 'hero'
                  ? 'from-black/30 to-transparent'
                  : 'from-white/40 to-transparent'
              } ${canGoPrev ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
              className={`absolute right-0 top-0 bottom-0 w-16 xl:w-24 z-20 pointer-events-none bg-gradient-to-l transition-opacity duration-300 ${
                variant === 'hero'
                  ? 'from-black/30 to-transparent'
                  : 'from-white/40 to-transparent'
              } ${canGoNext ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        )}

        {/* Arrow navigation */}
        {showArrows && (
          <>
            <button
              onClick={goPrevious}
              disabled={!canGoPrev}
              className={`absolute left-3 xl:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                canGoPrev
                  ? 'opacity-100 cursor-pointer'
                  : 'opacity-0 pointer-events-none'
              } ${
                variant === 'hero'
                  ? 'bg-white/20 hover:bg-white/40 text-white'
                  : 'bg-white/80 hover:bg-white text-[var(--col-text-primary)] shadow-md'
              }`}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 xl:w-6 xl:h-6" />
            </button>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`absolute right-3 xl:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                canGoNext
                  ? 'opacity-100 cursor-pointer'
                  : 'opacity-0 pointer-events-none'
              } ${
                variant === 'hero'
                  ? 'bg-white/20 hover:bg-white/40 text-white'
                  : 'bg-white/80 hover:bg-white text-[var(--col-text-primary)] shadow-md'
              }`}
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 xl:w-6 xl:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Controls bar */}
      {(showIndicators || showAutoplayControls || showCounter) && (
        <div className="flex items-center justify-center gap-4 py-4 px-4 xl:py-5">
          {/* Autoplay controls */}
          {showAutoplayControls && autoplay && (
            <button
              onClick={toggleAutoplay}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-gray-100"
              aria-label={isPaused ? 'Start autoplay' : 'Pause autoplay'}
            >
              {isPaused ? (
                <Play className="w-4 h-4" style={{ color: 'var(--col-text-primary)' }} />
              ) : (
                <Pause className="w-4 h-4" style={{ color: 'var(--col-text-primary)' }} />
              )}
            </button>
          )}

          {/* Indicator dots */}
          {showIndicators && (
            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label="Slide indicators"
            >
              {slides.map((_, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(index)}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${index + 1}`}
                    tabIndex={isActive ? 0 : -1}
                    className={`relative w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-[var(--col-background-brand)] scale-110'
                        : 'bg-[var(--col-border-illustrative)] hover:bg-gray-400'
                    }`}
                  >
                    {/* Autoplay progress ring on active dot */}
                    {isActive && autoplay && !isPaused && (
                      <span
                        className="absolute inset-[-3px] rounded-full border-2 border-[var(--col-background-brand)] animate-[carousel-progress_linear]"
                        style={{
                          animationDuration: `${autoplayDelay}ms`,
                          animationFillMode: 'forwards',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Counter */}
          {showCounter && (
            <div
              className="flex items-center gap-1 text-[0.875rem] leading-[1.375rem] font-light"
              style={{ color: 'var(--col-text-subtle)' }}
            >
              <span className="font-medium" style={{ color: 'var(--col-text-primary)' }}>
                {activeIndex + 1}
              </span>
              <span>/</span>
              <span>{totalSlides}</span>
            </div>
          )}
        </div>
      )}

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing slide {activeIndex + 1} of {totalSlides}
      </div>
    </div>
  );
}
