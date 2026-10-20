import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const MARQUEE_ITEMS = [
  'Purchase requests',
  'AI recommendations',
  'SpendGuard policies',
  'Approval history',
  'PayPal Sandbox',
];

type VerticalMarqueeProps = {
  children: React.ReactNode;
  speed?: number;
};

const VerticalMarquee: React.FC<VerticalMarqueeProps> = ({ children, speed = 22 }) => (
  <div
    className="landing-cta-marquee-group"
    style={{ '--marquee-duration': `${speed}s` } as React.CSSProperties}
  >
    <div className="landing-cta-marquee-track">{children}</div>
    <div className="landing-cta-marquee-track" aria-hidden="true">
      {children}
    </div>
  </div>
);

export const LandingCta: React.FC = () => {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    let frame = 0;
    const updateOpacity = () => {
      const bounds = marquee.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const maxDistance = bounds.height / 2;

      marquee.querySelectorAll<HTMLElement>('.landing-cta-marquee-item').forEach((item) => {
        const itemBounds = item.getBoundingClientRect();
        const distance = Math.abs(center - (itemBounds.top + itemBounds.height / 2));
        const opacity = 1 - Math.min(distance / maxDistance, 1) * 0.72;
        item.style.opacity = opacity.toString();
      });

      frame = window.requestAnimationFrame(updateOpacity);
    };

    frame = window.requestAnimationFrame(updateOpacity);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="landing-cta-section bg-[#E6EEFE] py-6 sm:py-10 border-b-2 border-[#111827]/10">
      <div className="landing-cta-shell bg-[#E6EEFE]">
        <div className="landing-cta-shell-inner">
          <div className="landing-cta-copy">
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#2457E6] font-bold">
              Start with one request
            </p>
            <h2 className="font-display mt-4 text-[clamp(2.25rem,4.5vw,4rem)] leading-[1.02] font-bold tracking-[-0.025em] text-[#111827]">
              Bring order to the next purchase.
            </h2>
            <p className="mt-4 sm:mt-6 max-w-xl font-sans text-base leading-relaxed text-[#46536B] sm:text-lg">
              Open the demo workspace to inspect SpendGuard, submit a request, or walk an approved
              order through PayPal Sandbox.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row font-sans">
              <Link to="/app" className="landing-pill landing-pill--purple font-bold text-sm tracking-wide">
                Open workspace
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/app?tab=new-request" className="landing-pill landing-cta-light-pill font-bold text-sm tracking-wide">
                Create a purchase request
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div ref={marqueeRef} className="landing-cta-marquee" aria-label="Procura workflow areas">
            <VerticalMarquee>
              {MARQUEE_ITEMS.map((item) => (
                <div key={item} className="landing-cta-marquee-item font-display font-bold tracking-tight text-[clamp(32px,3.8vw,64px)]">
                  {item}
                </div>
              ))}
            </VerticalMarquee>
            <div className="landing-cta-vignette landing-cta-vignette--top" aria-hidden="true" />
            <div className="landing-cta-vignette landing-cta-vignette--bottom" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};
