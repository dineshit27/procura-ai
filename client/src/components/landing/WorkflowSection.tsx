import React from 'react';
import { useReveal } from './useReveal';

const STEPS = [
  {
    n: '01',
    title: 'Describe the purchase',
    body: 'Enter a natural-language need, budget, quantity, and optional supplier preference in New Request.',
  },
  {
    n: '02',
    title: 'Compare catalog options',
    body: 'Gemini (or the rules-engine fallback) scores items from the simulated catalog and explains trade-offs.',
  },
  {
    n: '03',
    title: 'SpendGuard decides',
    body: 'POST /api/policies/evaluate returns ALLOWED, NEEDS_APPROVAL, or BLOCKED. Blocked purchases cannot be submitted.',
  },
  {
    n: '04',
    title: 'Approve, then sandbox checkout',
    body: 'History can approve when budget headroom exists. Only approved records open PayPal Sandbox Checkout.',
  },
];

export const WorkflowSection: React.FC = () => {
  const revealRef = useReveal<HTMLElement>();

  return (
    <section id="workflow" ref={revealRef} className="reveal py-24 border-t border-black/5">
      <div className="landing-wrap">
        <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
          Workflow
        </p>
        <h2 className="landing-display mt-3 text-[40px] sm:text-[52px] leading-[1.05] max-w-3xl">
          From prompt to policy to PayPal Sandbox
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="border-t border-black/10 pt-5">
              <div className="landing-mono text-[12px] text-[#623cf6]">{step.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
