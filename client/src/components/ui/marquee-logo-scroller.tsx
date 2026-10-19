import React from 'react';
import { cn } from '../../lib/utils';

export interface LogoItem {
  alt: string;
  color: string;
  svg?: React.ReactNode;
  src?: string;
  gradient?: {
    from: string;
    via: string;
    to: string;
  };
}

export interface MarqueeLogoScrollerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  logos: LogoItem[];
  speed?: 'normal' | 'slow' | 'fast';
}

const durationMap = {
  normal: '40s',
  slow: '80s',
  fast: '5s',
} as const;

const MarqueeLogoScroller = React.forwardRef<HTMLDivElement, MarqueeLogoScrollerProps>(
  ({ title, description, logos, speed = 'normal', className, ...props }, ref) => (
    <section
      ref={ref}
      aria-label={title}
      className={cn('marquee-logo-scroller w-full overflow-hidden rounded-lg border', className)}
      {...props}
    >
      <div className="p-6 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 gap-6 border-b-2 border-[#111827]/10 pb-6 md:pb-8 lg:grid-cols-[3fr_2fr] lg:gap-8">
          <h2 className="font-display text-balance text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[-0.025em] leading-[1.1] text-[#111827]">
            {title}
          </h2>
          <p className="font-sans self-start text-balance text-sm leading-relaxed text-[#46536B] lg:justify-self-end">
            {description}
          </p>
        </div>
      </div>

      <div
        className="w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div
          className="marquee-logo-track flex w-max items-center gap-4 py-4 pr-4"
          style={{ animationDuration: durationMap[speed] }}
        >
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={`${logo.alt}-${index}`}
              style={
                {
                  '--logo-color': logo.color,
                  '--logo-bg': `${logo.color}0D`,
                } as React.CSSProperties
              }
              className="marquee-logo-card group relative flex h-24 w-44 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-[#111827]/15 bg-white transition-all duration-200 cursor-pointer select-none"
            >
              <div
                style={{ color: logo.color }}
                className="flex size-9 items-center justify-center transition-transform duration-200 group-hover:scale-110"
              >
                {logo.svg ? (
                  logo.svg
                ) : logo.src ? (
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <span className="marquee-logo-text font-sans text-xs font-bold tracking-wide text-[#111827] transition-colors duration-200">
                {logo.alt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  ),
);

MarqueeLogoScroller.displayName = 'MarqueeLogoScroller';

export { MarqueeLogoScroller };
