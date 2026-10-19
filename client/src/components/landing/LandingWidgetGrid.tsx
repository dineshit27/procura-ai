import React from 'react';
import { Reorder, useReducedMotion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Clock3, Package, ShieldCheck, Sparkles } from 'lucide-react';

type Widget = {
  id: string;
  title: string;
  size: 'wide' | 'small';
  content: React.ReactNode;
};

const INITIAL_WIDGETS: Widget[] = [
  {
    id: 'requests',
    title: 'Requests today',
    size: 'wide',
    content: (
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight">24</p>
          <p className="mt-2 text-xs text-neutral-500">↑ 18% from last week</p>
        </div>
        <div className="flex h-14 items-end gap-1.5" aria-label="Request volume trend">
          {[32, 46, 38, 58, 50, 72, 84].map((height, index) => (
            <span
              key={index}
              className={`w-2 rounded-t-sm ${index === 6 ? 'bg-[#623cf6]' : 'bg-[#623cf6]/20'}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'policy',
    title: 'Policy status',
    size: 'small',
    content: (
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-emerald-600" />
        <div>
          <p className="font-semibold">Healthy</p>
          <p className="text-xs text-neutral-500">All rules operational</p>
        </div>
      </div>
    ),
  },
  {
    id: 'approvals',
    title: 'Needs approval',
    size: 'small',
    content: (
      <div className="flex items-center gap-3">
        <Clock3 className="h-7 w-7 text-amber-600" />
        <div>
          <p className="text-3xl font-semibold">03</p>
          <p className="text-xs text-neutral-500">requests waiting</p>
        </div>
      </div>
    ),
  },
  {
    id: 'catalog',
    title: 'Catalog coverage',
    size: 'wide',
    content: (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-[#623cf6]" />
          <div>
            <p className="text-3xl font-semibold">148</p>
            <p className="text-xs text-neutral-500">available items</p>
          </div>
        </div>
        <div className="rounded-full bg-[#ece6ff] px-3 py-1 text-xs font-semibold text-[#623cf6]">
          92% matched
        </div>
      </div>
    ),
  },
  {
    id: 'ai',
    title: 'AI recommendation',
    size: 'small',
    content: (
      <div className="flex items-start gap-3">
        <Sparkles className="h-6 w-6 shrink-0 text-[#623cf6]" />
        <p className="text-sm leading-relaxed text-neutral-600">
          Gemini found 4 options within budget.
        </p>
      </div>
    ),
  },
  {
    id: 'approved',
    title: 'Latest approved',
    size: 'small',
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <p className="font-semibold">Office supplies</p>
          <p className="mt-1 text-xs text-neutral-500">$248.00 · just now</p>
        </div>
      </div>
    ),
  },
];

export const LandingWidgetGrid: React.FC = () => {
  const [widgets, setWidgets] = React.useState(INITIAL_WIDGETS);
  const reduceMotion = useReducedMotion();

  return (
    <section className="border-t border-black/5 py-24">
      <div className="landing-wrap">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
              Your command center
            </p>
            <h2 className="landing-display mt-3 max-w-3xl text-[40px] leading-[1.05] sm:text-[52px]">
              A clearer view of every purchase decision
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
            Drag the cards to make the workspace your own. Every signal stays close to the decision.
          </p>
        </div>

        <Reorder.Group
          axis="y"
          values={widgets}
          onReorder={setWidgets}
          className="landing-widget-grid mt-12"
          aria-label="Procura workspace widgets"
        >
          {widgets.map((widget) => (
            <Reorder.Item
              key={widget.id}
              value={widget}
              as="article"
              whileDrag={reduceMotion ? undefined : { scale: 1.02, zIndex: 10, boxShadow: '0 24px 55px rgba(17,17,17,.16)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`landing-widget landing-widget--${widget.size}`}
              aria-label={`${widget.title}. Drag to rearrange.`}
            >
              <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="landing-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    {widget.title}
                  </h3>
                  <ArrowUpRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                </div>
                <div className="mt-auto">{widget.content}</div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    </section>
  );
};
