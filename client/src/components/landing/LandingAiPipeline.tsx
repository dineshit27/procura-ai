import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const MESSAGES = [
  'Received: "Find ergonomic chairs for the new team..."',
  'Parsing request → budget, quantity, urgency, supplier preference',
  'Catalog match complete: 5 items, best fit scored 0.91',
  'SpendGuard evaluating single-order and cumulative spend limits',
  'Policy result: NEEDS_APPROVAL → approval record created',
  'Approval granted → PayPal Sandbox checkout unlocked',
  'Purchase history updated with the decision and payment state',
  'Workflow complete. Request trace captured for review.',
  'Idle. Listening for the next purchase request...',
];

const PATHS = {
  request: 'M116,88 L158,88',
  catalog: 'M268,88 L306,88',
  approved: 'M411,88 C425,88 435,50 448,50',
  policy: 'M411,88 L448,88',
  checkout: 'M411,88 C425,88 435,126 448,126',
};

function AnimatedDot({
  path,
  duration,
  delay,
  size,
  opacity,
}: {
  path: string;
  duration: number;
  delay: number;
  size: number;
  opacity: number;
}) {
  return (
    <circle r={size} fill="#623cf6" opacity={opacity}>
      <animateMotion dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`} path={path} />
    </circle>
  );
}

function PulsingDot({ cx, cy, color, delay = 0 }: { cx: number; cy: number; color: string; delay?: number }) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={2.8}
      fill={color}
      animate={{ opacity: [0.15, 1, 0.15] }}
      transition={{ duration: 1.5, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export const LandingAiPipeline: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [workflows, setWorkflows] = useState(1247);
  const reduceMotion = useReducedMotion();
  const pipelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const messageInterval = window.setInterval(
      () => setMessageIndex((previous) => (previous + 1) % MESSAGES.length),
      2700,
    );
    const workflowInterval = window.setInterval(() => setWorkflows((previous) => previous + 1), 7200);

    return () => {
      window.clearInterval(messageInterval);
      window.clearInterval(workflowInterval);
    };
  }, [reduceMotion]);

  useEffect(() => {
    const container = pipelineRef.current;
    if (!container || reduceMotion) return;

    let frame = 0;
    const update = () => {
      const bounds = container.getBoundingClientRect();
      const centerY = bounds.top + bounds.height / 2;
      const maxDistance = Math.max(bounds.height / 2, 1);

      container.querySelectorAll<HTMLElement>('[data-pipeline-message]').forEach((item) => {
        const itemBounds = item.getBoundingClientRect();
        const distance = Math.abs(centerY - (itemBounds.top + itemBounds.height / 2));
        item.style.opacity = String(1 - Math.min(distance / maxDistance, 1) * 0.72);
      });
      frame = window.requestAnimationFrame(update);
    };

    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return (
    <section className="landing-ai-section border-t border-black/5 py-24">
      <div className="landing-ai-content">
        <div className="mb-10 max-w-2xl">
          <p className="landing-mono text-[12px] uppercase tracking-[0.16em] text-[#623cf6] font-semibold">
            AI procurement pipeline
          </p>
          <h2 className="landing-display mt-3 text-[40px] leading-[1.05] sm:text-[52px]">
            From request to decision, with every step visible
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600">
            Watch Procura route a purchase request through matching, policy controls, approval, and
            sandbox checkout.
          </p>
        </div>

        <div ref={pipelineRef} className="landing-ai-pipeline">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-2">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                animate={reduceMotion ? undefined : { opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="landing-mono text-[10px] tracking-[0.1em] text-white/40">
                PROCUREMENT PIPELINE · LIVE
              </span>
            </div>
            <span className="landing-mono text-[10px] text-white/25">5 stages · 0 errors</span>
          </div>

          <svg viewBox="0 0 580 172" className="block w-full" role="img" aria-label="Procura request processing pipeline">
            <defs>
              <marker id="procura-pipeline-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M2 1.5L7.5 5L2 8.5" fill="none" stroke="rgba(98,60,246,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            {Object.entries(PATHS).map(([key, path]) => (
              <path
                key={key}
                d={path}
                fill="none"
                stroke="rgba(98,60,246,0.25)"
                strokeWidth="1.5"
                strokeDasharray="3 5"
                markerEnd={key === 'request' || key === 'catalog' ? 'url(#procura-pipeline-arrow)' : undefined}
              />
            ))}
            <AnimatedDot path={PATHS.request} duration={1.05} delay={0} size={2.5} opacity={1} />
            <AnimatedDot path={PATHS.catalog} duration={0.88} delay={0.18} size={2.5} opacity={1} />
            <AnimatedDot path={PATHS.approved} duration={1.3} delay={0.08} size={2.2} opacity={0.9} />
            <AnimatedDot path={PATHS.policy} duration={1.15} delay={0.28} size={2.2} opacity={0.9} />
            <AnimatedDot path={PATHS.checkout} duration={1.4} delay={0.45} size={2.2} opacity={0.9} />

            <PipelineNode x="16" y="66" width="100" label="TRIGGER" title="Request" detail="new-request" />
            <PipelineNode x="158" y="66" width="110" label="CATALOG" title="Matching" detail="demo-catalog" />
            <rect x="306" y="53" width="105" height="70" rx="10" fill="#110d2c" stroke="#623cf6" />
            <text x="358" y="78" textAnchor="middle" fontSize="9.5" fill="#b9a9ff" fontFamily="system-ui" letterSpacing=".07em">SPENDGUARD</text>
            <text x="358" y="97" textAnchor="middle" fontSize="13" fill="#fff" fontFamily="system-ui" fontWeight="500">Evaluating</text>
            <PulsingDot cx={346} cy={113} color="#8b75ff" />
            <PulsingDot cx={358} cy={113} color="#8b75ff" delay={0.4} />
            <PulsingDot cx={370} cy={113} color="#8b75ff" delay={0.8} />
            <text x="358" y="139" textAnchor="middle" fontSize="8.5" fill="rgba(185,169,255,0.65)" fontFamily="monospace">policy-engine</text>
            <OutputNode y="35" title="Approved" color="#22c55e" />
            <OutputNode y="73" title="Needs approval" color="#f59e0b" pulsing />
            <OutputNode y="111" title="Sandbox checkout" color="#8b75ff" pulsing delay={0.35} />
          </svg>

          <div className="border-t border-white/[0.06] px-5 py-3">
            <div className="flex h-9 items-start gap-2 overflow-hidden">
              <span className="landing-mono text-[13px] leading-[1.5] text-[#8b75ff]">›</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  data-pipeline-message
                  initial={reduceMotion ? undefined : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="landing-mono text-[11px] leading-[1.55] text-white/45"
                >
                  {MESSAGES[messageIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-7 border-t border-white/[0.06] px-5 py-3">
            <PipelineStat label="WORKFLOWS" value={workflows.toLocaleString()} />
            <PipelineStat label="POLICY CHECKS" value="4.2M" />
            <PipelineStat label="AVG LATENCY" value="342ms" />
          </div>
        </div>
      </div>
    </section>
  );
};

function PipelineNode({ x, y, width, label, title, detail }: { x: string; y: string; width: string; label: string; title: string; detail: string }) {
  return (
    <>
      <rect x={x} y={y} width={width} height="44" rx="8" fill="#141414" stroke="rgba(255,255,255,0.09)" />
      <text x={Number(x) + Number(width) / 2} y="83" textAnchor="middle" fontSize="9.5" fill="rgba(255,255,255,0.3)" fontFamily="system-ui" letterSpacing=".07em">{label}</text>
      <text x={Number(x) + Number(width) / 2} y="100" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.82)" fontFamily="system-ui">{title}</text>
      <text x={Number(x) + Number(width) / 2} y="122" textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.2)" fontFamily="monospace">{detail}</text>
    </>
  );
}

function OutputNode({ y, title, color, pulsing = false, delay = 0 }: { y: string; title: string; color: string; pulsing?: boolean; delay?: number }) {
  return (
    <>
      <rect x="448" y={y} width="116" height="30" rx="7" fill="#111" stroke="rgba(255,255,255,0.08)" />
      <text x="490" y={Number(y) + 18.5} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.65)" fontFamily="system-ui">{title}</text>
      {pulsing ? <PulsingDot cx={550} cy={Number(y) + 8} color={color} delay={delay} /> : <circle cx="550" cy={Number(y) + 8} r="3" fill={color} />}
    </>
  );
}

function PipelineStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="landing-mono mb-1 text-[9px] tracking-[0.09em] text-white/25">{label}</div>
      <div className="landing-mono text-[16px] text-white/75">{value}</div>
    </div>
  );
}
