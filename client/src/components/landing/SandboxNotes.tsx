import React from 'react';
import { useReveal } from './useReveal';

export const SandboxNotes: React.FC = () => {
  const revealRef = useReveal<HTMLElement>();

  return (
    <section id="sandbox" ref={revealRef} className="reveal py-16">
      <div className="landing-wrap">
        <div className="rounded-[28px] border border-black/8 bg-white p-8 sm:p-12">
          <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
            Honest demo boundaries
          </p>
          <h2 className="landing-display mt-3 text-[36px] sm:text-[44px] leading-[1.08] max-w-3xl">
            What this workspace is — and is not
          </h2>
          <ul className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-4 text-sm leading-relaxed text-neutral-700">
            <li>Catalog items, suppliers, and sample history are simulated demo records.</li>
            <li>PayPal calls use Sandbox credentials. This is not live production settlement.</li>
            <li>SpendGuard limits shown in-product are configurable demo policy, not a customer’s books.</li>
            <li>Product frames on this page are illustrative layouts, not live account data.</li>
            <li>Gemini analysis requires a configured API key; otherwise the rules engine fills in.</li>
            <li>No third-party customer logos, win rates, or production SLAs are claimed here.</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
