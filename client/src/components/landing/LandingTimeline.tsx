import React, { useLayoutEffect, useRef } from 'react';
import { ArrowRight, Check, FileText, LockKeyhole, Sparkles, Wallet } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type TimelineStep = {
  number: string;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TOP_STEPS: TimelineStep[] = [
  {
    number: '01',
    label: 'New request',
    title: 'Describe what your team needs',
    description: 'Start with a natural-language purchase request, budget, quantity, and supplier preference.',
    icon: FileText,
  },
  {
    number: '02',
    label: 'AI matching',
    title: 'Compare the right options',
    description: 'Gemini scores catalog items and explains the trade-offs, with a rules-engine fallback when needed.',
    icon: Sparkles,
  },
  {
    number: '03',
    label: 'SpendGuard',
    title: 'Apply policy before spend',
    description: 'Configured policy checks return ALLOWED, NEEDS_APPROVAL, or BLOCKED before submission.',
    icon: LockKeyhole,
  },
];

const BOTTOM_STEPS: TimelineStep[] = [
  {
    number: '04',
    label: 'History',
    title: 'Keep an approval trail',
    description: 'Approved requests move into purchase history so teams can review decisions and remaining headroom.',
    icon: Check,
  },
  {
    number: '05',
    label: 'PayPal Sandbox',
    title: 'Checkout with confidence',
    description: 'Only approved requests can open the PayPal Sandbox checkout flow for a safe end-to-end demo.',
    icon: Wallet,
  },
];

const ALL_STEPS = [...TOP_STEPS, ...BOTTOM_STEPS];

export const LandingTimeline: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const slider = sliderRef.current;
    if (!section || !slider) return;

    const context = gsap.context(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = window.innerWidth < 600;
      const lineWidth = isMobile ? '100%' : '100%';

      gsap.set('.landing-timeline-line-fill', {
        width: reducedMotion ? lineWidth : '0%',
      });
      gsap.set('.landing-timeline-step-line', {
        scaleY: reducedMotion ? 1 : 0,
      });
      gsap.set('.landing-timeline-step-dot', {
        scale: reducedMotion ? 1 : 0,
      });
      gsap.set('.landing-timeline-step-copy', {
        opacity: reducedMotion ? 1 : 0,
        y: reducedMotion ? 0 : 40,
      });

      if (reducedMotion) return;

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
        defaults: { ease: 'none' },
      });

      master
        .to(slider, {
          x: () => Math.min(0, window.innerWidth - slider.scrollWidth),
          duration: 1,
        })
        .to('.landing-timeline-line-fill', { width: lineWidth }, '<');

      ALL_STEPS.forEach((_, index) => {
        const selector = `.landing-timeline-step-${index}`;
        master
          .to(`${selector} .landing-timeline-step-line`, { scaleY: 1, duration: 0.4 }, index * 0.7)
          .to(`${selector} .landing-timeline-step-dot`, { scale: 1, duration: 0.4 }, '<')
          .to(`${selector} .landing-timeline-step-copy`, { opacity: 1, y: 0, duration: 0.7 }, '<');
      });
    }, section);

    const refresh = () => {
      gsap.set(slider, { clearProps: 'transform' });
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', refresh);

    return () => {
      window.removeEventListener('resize', refresh);
      context.revert();
    };
  }, []);

  const renderStep = (step: TimelineStep, index: number, position: 'top' | 'bottom') => {
    const Icon = step.icon;

    return (
      <article className={`landing-timeline-step landing-timeline-step-${index}`} key={step.number}>
        <div className="landing-timeline-step-rail" aria-hidden="true">
          <div className="landing-timeline-step-dot">
            <Icon className="h-4 w-4" />
          </div>
          <div className="landing-timeline-step-line" />
        </div>
        <div className={`landing-timeline-step-copy landing-timeline-step-copy--${position}`}>
          <p className="landing-mono text-[11px] uppercase tracking-[0.14em] text-[#623cf6]">
            {step.number} / {step.label}
          </p>
          <h3 className="mt-3 text-xl font-semibold leading-tight text-neutral-950">{step.title}</h3>
          <p className="mt-3 max-w-[250px] text-sm leading-relaxed text-neutral-600">{step.description}</p>
        </div>
      </article>
    );
  };

  return (
    <section id="journey" ref={sectionRef} className="landing-timeline-section border-t border-black/5">
      <div className="landing-timeline-sticky">
        <div ref={sliderRef} className="landing-timeline-slider">
          <div className="landing-timeline-intro">
            <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
              The journey
            </p>
            <h2 className="landing-display mt-3 text-[40px] leading-[1.05] sm:text-[52px]">
              From purchase prompt to controlled checkout
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-600">
              Keep scrolling to follow one connected flow for better purchasing decisions.
            </p>
            <ArrowRight className="mt-8 h-5 w-5 text-[#623cf6]" aria-hidden="true" />
          </div>

          <div className="landing-timeline-journey">
            <div className="landing-timeline-connector" aria-hidden="true">
              <span className="landing-timeline-line-fill" />
            </div>
            <div className="landing-timeline-row landing-timeline-row--top">
              {TOP_STEPS.map((step, index) => renderStep(step, index, 'top'))}
            </div>
            <div className="landing-timeline-row landing-timeline-row--bottom">
              {BOTTOM_STEPS.map((step, index) => renderStep(step, index + TOP_STEPS.length, 'bottom'))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
