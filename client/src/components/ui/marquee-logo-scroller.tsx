import React from 'react';
import { cn } from '../../lib/utils';

interface Logo {
  src: string;
  alt: string;
  gradient: {
    from: string;
    via: string;
    to: string;
  };
}

interface MarqueeLogoScrollerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  logos: Logo[];
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
        <div className="grid grid-cols-1 gap-6 border-b pb-6 md:pb-8 lg:grid-cols-[3fr_2fr] lg:gap-8">
          <h2 className="text-balance text-3xl font-semibold tracking-tighter md:text-4xl">
            {title}
          </h2>
          <p className="self-start text-balance text-sm leading-relaxed text-neutral-600 lg:justify-self-end">
            {description}
          </p>
        </div>
      </div>

      <div
        className="w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div
          className="marquee-logo-track flex w-max items-center gap-4 py-4 pr-4"
          style={{ animationDuration: durationMap[speed] }}
        >
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={`${logo.alt}-${index}`}
              className="group relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100"
            >
              <div
                style={
                  {
                    '--logo-from': logo.gradient.from,
                    '--logo-via': logo.gradient.via,
                    '--logo-to': logo.gradient.to,
                  } as React.CSSProperties
                }
                className="absolute inset-0 scale-150 bg-gradient-to-br from-[var(--logo-from)] via-[var(--logo-via)] to-[var(--logo-to)] opacity-0 transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100"
              />
              <img
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                className="relative h-3/4 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  ),
);

MarqueeLogoScroller.displayName = 'MarqueeLogoScroller';

export { MarqueeLogoScroller };
