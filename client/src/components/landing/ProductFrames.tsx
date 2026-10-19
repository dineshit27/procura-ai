import React from 'react';

export const SpendGuardFrame: React.FC = () => (
  <div className="landing-product-frame text-left">
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-[#f7f5ff]">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[#623cf6] text-white text-[10px] font-bold grid place-items-center">
          P
        </span>
        <span className="text-xs font-semibold">Procura AI · SpendGuard</span>
      </div>
      <span className="landing-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
        Illustrative UI
      </span>
    </div>
    <div className="p-4 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="landing-mono text-[10px] uppercase tracking-wider text-neutral-500">
            Period budget
          </div>
          <div className="text-2xl font-semibold tracking-tight">$20,000</div>
        </div>
        <div className="text-right">
          <div className="landing-mono text-[10px] uppercase tracking-wider text-neutral-500">
            Remaining
          </div>
          <div className="text-lg font-semibold text-emerald-700">$8,420</div>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden flex">
        <div className="h-full w-[42%] bg-[#623cf6]" />
        <div className="h-full w-[16%] bg-[#c4b5fd]" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-xl bg-neutral-50 p-2.5">
          <div className="text-neutral-500">Paid</div>
          <div className="font-semibold">$8,400</div>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2.5">
          <div className="text-neutral-500">Reserved</div>
          <div className="font-semibold">$3,180</div>
        </div>
        <div className="rounded-xl bg-neutral-50 p-2.5">
          <div className="text-neutral-500">Pending</div>
          <div className="font-semibold">2 req</div>
        </div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
        Alert: approaching configured period budget. Figures shown are sample layout, not live spend.
      </div>
    </div>
  </div>
);

export const RequestFrame: React.FC = () => (
  <div className="landing-product-frame text-left">
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
      <span className="text-xs font-semibold">New purchase request</span>
      <span className="landing-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
        Illustrative UI
      </span>
    </div>
    <div className="p-4 space-y-3">
      <div className="rounded-xl bg-neutral-50 p-3 text-[12px] text-neutral-700 leading-relaxed">
        “Need 12 ergonomic chairs for the annex office, delivered within 10 days, stay under $4,200.”
      </div>
      <div className="space-y-2">
        {[
          { name: 'Apex Ergonomic Chair', score: '92', rec: true },
          { name: 'Northwind Mesh Chair', score: '81', rec: false },
        ].map((row) => (
          <div
            key={row.name}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-[12px] ${
              row.rec ? 'border-[#623cf6] bg-[#f7f5ff]' : 'border-black/8'
            }`}
          >
            <span className="font-medium">{row.name}</span>
            <span className="landing-mono text-[11px]">match {row.score}</span>
          </div>
        ))}
      </div>
      <div className="landing-mono text-[10px] text-neutral-500">
        Gemini analysis with a rules-engine fallback when the model is unavailable. Catalog records are
        simulated.
      </div>
    </div>
  </div>
);

export const PayPalFrame: React.FC = () => (
  <div className="landing-product-frame text-left">
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-[#003087]/5">
      <span className="text-xs font-semibold">Checkout</span>
      <span className="landing-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-950">
        PayPal Sandbox
      </span>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex justify-between text-[12px]">
        <span className="text-neutral-500">Request</span>
        <span className="font-medium">REQ-1042 · Apex Chair × 12</span>
      </div>
      <div className="flex justify-between text-[12px]">
        <span className="text-neutral-500">Authoritative total</span>
        <span className="font-semibold">$3,588.00 USD</span>
      </div>
      <div className="rounded-xl bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-600">
        Amounts are recalculated on the server from catalog prices. Paid status is set only after a
        verified PayPal capture — never from the browser alone.
      </div>
      <div className="h-10 rounded-full bg-[#003087] text-white text-xs font-semibold grid place-items-center">
        PayPal Sandbox Checkout
      </div>
    </div>
  </div>
);
