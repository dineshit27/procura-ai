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
    <section className="landing-cta-section py-8">
      <div className="landing-cta-shell">
        <div className="landing-cta-shell-inner">
          <div className="landing-cta-copy">
            <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
              Start with one request
            </p>
            <h2 className="landing-display mt-4 text-[48px] leading-[0.98] sm:text-[64px]">
              Bring order to the next purchase.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              Open the demo workspace to inspect SpendGuard, submit a request, or walk an approved
              order through PayPal Sandbox.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/app" className="landing-pill landing-pill--purple">
                Open workspace
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/app?tab=new-request" className="landing-pill landing-cta-light-pill">
                Create a purchase request
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div ref={marqueeRef} className="landing-cta-marquee" aria-label="Procura workflow areas">
            <VerticalMarquee>
              {MARQUEE_ITEMS.map((item) => (
                <div key={item} className="landing-cta-marquee-item landing-display">
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
