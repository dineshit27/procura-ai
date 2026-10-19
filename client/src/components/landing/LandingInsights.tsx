import React from 'react';
import { Activity, FileCheck2, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react';

const STATUS_ROWS = [
  { label: 'Request intake', detail: 'Natural-language parsing active', status: 'Active', color: 'emerald' },
  { label: 'Catalog matching', detail: 'AI recommendations optimizing', status: 'Live', color: 'orange' },
  { label: 'SpendGuard', detail: 'Policy checks ready to evaluate', status: 'Ready', color: 'purple' },
];

const PROGRESS_STEPS = [
  { label: 'REQUEST', color: 'bg-emerald-500' },
  { label: 'MATCHING', color: 'bg-emerald-500' },
  { label: 'POLICY', color: 'bg-orange-400' },
  { label: 'APPROVAL', color: 'bg-neutral-300' },
  { label: 'CHECKOUT', color: 'bg-neutral-300' },
];

export const LandingInsights: React.FC = () => {
  return (
    <section className="landing-insights-section relative z-10 py-8 pb-20">
      <div className="landing-wrap">
        <div className="landing-insights-shell">
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="landing-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                (01) Procurement intelligence
              </p>
              <h2 className="landing-display mt-2 text-3xl font-medium tracking-tight text-neutral-900 sm:text-5xl">
                Make every purchase decision visible
              </h2>
            </div>
            <p className="max-w-[42ch] text-sm leading-relaxed text-neutral-600 sm:text-base">
              Procura connects request intake, AI matching, policy controls, and approved checkout
              in one operational view.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <article className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl">
                    Real-time spend intelligence
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Monitor requests, policy outcomes, and approval headroom before spend reaches
                    checkout.
                  </p>
                </div>
                <span className="text-lg font-semibold text-emerald-600">92%</span>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative h-[180px] overflow-hidden rounded-xl bg-gradient-to-br from-[#f0edff] to-[#e3ddff] p-4 ring-1 ring-[#d6ccff]">
                  <div className="landing-insights-grid absolute inset-0 opacity-50" />
                  <div className="relative flex items-center gap-2">
                    {['P', 'A', 'S'].map((letter) => (
                      <span
                        key={letter}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-semibold text-[#623cf6] ring-2 ring-white"
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-[#4931bd] ring-1 ring-[#c8bcff]">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Spend insights
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {STATUS_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
                        row.color === 'emerald'
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 ring-emerald-200'
                          : row.color === 'orange'
                            ? 'bg-gradient-to-r from-orange-50 to-orange-100 ring-orange-200'
                            : 'bg-gradient-to-r from-purple-50 to-purple-100 ring-purple-200'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`h-3 w-3 shrink-0 rounded-full ${
                            row.color === 'emerald'
                              ? 'bg-emerald-500'
                              : row.color === 'orange'
                                ? 'bg-orange-500'
                                : 'bg-purple-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-neutral-800">{row.label}</span>
                          <span className="block truncate text-[10px] text-neutral-600">{row.detail}</span>
                        </div>
                      </div>
                      <span className="ml-3 text-[11px] text-neutral-600">{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-700 ring-1 ring-neutral-200">
                  <Zap className="h-3.5 w-3.5" />
                  AI-assisted matching
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-700 ring-1 ring-neutral-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Policy-backed
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="text-lg font-medium tracking-tight text-neutral-900 sm:text-xl">
                Workflow throughput
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                See how requests move from intake to approved action.
              </p>
              <div className="mt-6 rounded-xl bg-neutral-100 p-4 ring-1 ring-neutral-200">
                <div className="relative h-[120px] overflow-hidden">
                  <svg viewBox="0 0 300 120" className="h-full w-full" role="img" aria-label="Increasing workflow throughput">
                    <path d="M0 100 C35 92 50 82 78 84 C108 86 115 60 142 66 C170 72 180 42 204 48 C230 55 240 25 300 12 L300 120 L0 120 Z" fill="rgba(99,102,241,0.12)" />
                    <path d="M0 100 C35 92 50 82 78 84 C108 86 115 60 142 66 C170 72 180 42 204 48 C230 55 240 25 300 12" fill="none" stroke="rgba(99,102,241,0.8)" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                  <Activity className="h-3 w-3" />
                  +24% requests processed
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium tracking-tight text-neutral-900 sm:text-xl">
                    Safe by design
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
                    Every recommendation and payment stays inside an explicit, inspectable workflow.
                  </p>
                </div>
                <FileCheck2 className="h-6 w-6 text-[#623cf6]" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InsightTile icon={<ShieldCheck />} title="SpendGuard" detail="Policy checks enforced" tone="green" />
                <InsightTile icon={<Sparkles />} title="AI matching" detail="Recommendations explained" tone="blue" />
                <InsightTile icon={<FileCheck2 />} title="Approval trail" detail="Decisions captured" tone="purple" />
              </div>
            </article>
          </div>

          <div className="mt-10">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
            <div className="mt-6 grid grid-cols-2 gap-y-4 text-[11px] text-neutral-600 sm:grid-cols-5">
              {PROGRESS_STEPS.map((step) => (
                <div key={step.label} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${step.color}`} />
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function InsightTile({
  icon,
  title,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: 'green' | 'blue' | 'purple';
}) {
  const styles = {
    green: 'bg-gradient-to-br from-emerald-50 to-emerald-100 ring-emerald-200 text-emerald-800',
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 ring-blue-200 text-blue-800',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 ring-purple-200 text-purple-800',
  };

  return (
    <div className={`rounded-xl p-4 text-center ring-1 ${styles[tone]}`}>
      <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full bg-white/80">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      </div>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="mt-1 text-xs opacity-80">{detail}</p>
    </div>
  );
}
