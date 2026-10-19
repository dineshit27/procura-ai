import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PayPalFrame, RequestFrame, SpendGuardFrame } from './ProductFrames';

const TABS = [
  {
    id: 'spendguard',
    label: 'SpendGuard',
    eyebrow: 'Connected controls',
    headline: 'One source of truth keeps spend from slipping through',
    body: 'SpendGuard evaluates single-order ceilings, quantity limits, approved suppliers, auto-approval under $500, and cumulative period spend. Concurrent approvals are serialized so two requests cannot both slip under the remaining headroom.',
    cta: { to: '/app', label: 'Open SpendGuard overview' },
    frame: <SpendGuardFrame />,
  },
  {
    id: 'requests',
    label: 'Purchase requests',
    eyebrow: 'Connected intake',
    headline: 'Describe the need. Compare catalog options.',
    body: 'A request captures budget, quantity, urgency, and constraints. Matching uses the in-app demo catalog. Policy results ALLOWED, NEEDS_APPROVAL, or BLOCKED decide whether the record is auto-approved, queued, or kept as a draft.',
    cta: { to: '/app?tab=new-request', label: 'Start a request' },
    frame: <RequestFrame />,
  },
  {
    id: 'paypal',
    label: 'PayPal Sandbox',
    eyebrow: 'Connected settlement',
    headline: 'Checkout only after approval, with captured truth',
    body: 'The workspace loads PayPal JS against sandbox credentials. Create-order and capture-order run on Express. Return and cancel URLs keep purchaseRequestId so the dashboard can reopen the ledger — including visits that land on `/` first.',
    cta: { to: '/app?tab=history', label: 'Open purchase history' },
    frame: <PayPalFrame />,
  },
] as const;

export const ProductShowcase: React.FC = () => {
  const [activeId, setActiveId] = useState<(typeof TABS)[number]['id']>('spendguard');
  const sectionRef = useRef<HTMLElement | null>(null);
  const active = TABS.find((tab) => tab.id === activeId) ?? TABS[0]!;

  useEffect(() => {
    const section = sectionRef.current;
    const scroller = section?.closest<HTMLElement>('.cinematic-scroll');
    if (!section || !scroller) return;

    let frame = 0;
    const updateActiveTab = () => {
      frame = 0;
      const bounds = section.getBoundingClientRect();
      const scrollableHeight = Math.max(bounds.height - scroller.clientHeight, 1);
      const progress = Math.min(1, Math.max(0, -bounds.top / scrollableHeight));
      const nextIndex = Math.min(2, Math.floor(progress * TABS.length));
      const nextId = TABS[nextIndex]!.id;

      setActiveId((currentId) => (currentId === nextId ? currentId : nextId));
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveTab);
    };

    updateActiveTab();
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="product"
      ref={sectionRef}
      className="landing-product-section min-h-[300vh] py-8 pb-24"
    >
      <div className="landing-wrap min-h-[300vh]">
        <div className="landing-product-stage sticky top-0 flex h-screen flex-col justify-start overflow-visible py-8">
          <div className="mb-8 max-w-3xl lg:mb-10">
            <p className="landing-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#623cf6]">
              Purchase control center
            </p>
            <h2 className="landing-display mt-3 text-[40px] leading-[1.05] sm:text-[52px]">
              Every purchase has a clear path to yes
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              Bring requests, policy decisions, and approved checkout into one
              connected operating view.
            </p>
          </div>

          <div className="items-start gap-10 lg:grid lg:grid-cols-[240px_1fr]">
          <div className="space-y-1 pb-6 lg:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              aria-current={activeId === tab.id ? 'step' : undefined}
              className={`w-full text-left px-3 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                activeId === tab.id
                  ? 'border-[#623cf6] bg-[#f7f5ff] text-[#623cf6]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2" aria-label="Purchase flow progress">
            {TABS.map((tab, index) => (
              <React.Fragment key={tab.id}>
                <span
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    TABS.findIndex((item) => item.id === activeId) >= index
                      ? 'bg-[#623cf6]'
                      : 'bg-neutral-200'
                  }`}
                />
              </React.Fragment>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="relative min-h-[280px] overflow-hidden rounded-[28px] bg-[#1d4ed8] p-8 text-white landing-grid-fade sm:p-12">
                <p className="landing-mono text-[11px] uppercase tracking-[0.18em] text-white/80">
                  {active.eyebrow}
                </p>
                <h2 className="landing-display mt-3 max-w-xl text-[40px] leading-[1.05] sm:text-[52px]">
                  {active.headline}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                  {active.body}
                </p>
                <Link to={active.cta.to} className="landing-pill mt-8 border-white bg-white text-black">
                  {active.cta.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mx-auto mt-6 max-w-xl">{active.frame}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>
      </div>
    </section>
  );
};
