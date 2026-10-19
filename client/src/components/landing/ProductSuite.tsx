import React from 'react';
import { ArrowUpRight, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useReveal } from './useReveal';

const CARDS = [
  {
    title: 'SpendGuard',
    body: 'Server-enforced period budgets, supplier allowlists, quantity ceilings, and atomic approvals. The browser cannot mark an order paid.',
    icon: ShieldCheck,
    href: '#product',
  },
  {
    title: 'Catalog intelligence',
    body: 'Natural-language requests are analyzed with Gemini 2.0 Flash, with a deterministic rules-engine fallback if the model is unreachable.',
    icon: Sparkles,
    href: '#workflow',
  },
  {
    title: 'PayPal Sandbox',
    body: 'Approved requests create sandbox orders from server-calculated totals, then capture through the official PayPal Checkout flow.',
    icon: Wallet,
    href: '#sandbox',
  },
];

export const ProductSuite: React.FC = () => {
  const revealRef = useReveal<HTMLElement>();

  return (
    <section id="platform" ref={revealRef} className="reveal py-24">
      <div className="landing-wrap">
        <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
          Platform
        </p>
        <h2 className="landing-display mt-3 text-[40px] sm:text-[52px] leading-[1.05] max-w-3xl">
          The stack for running a controlled purchase, end to end
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-black/8 bg-white p-6 hover:border-[#623cf6]/40 transition-colors"
            >
              <card.icon className="w-6 h-6 text-[#623cf6]" />
              <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{card.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all">
                Learn more <ArrowUpRight className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
