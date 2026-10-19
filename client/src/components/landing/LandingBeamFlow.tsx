import { useRef } from 'react';
import {
  BadgeCheck,
  ClipboardList,
  Cloud,
  Database,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import AnimatedBeam from '../ui/klyv-animated-beam';

interface FlowNodeProps {
  nodeRef: { current: HTMLDivElement | null };
  icon: LucideIcon;
  label: string;
  emphasis?: boolean;
}

function FlowNode({ nodeRef, icon: Icon, label, emphasis = false }: FlowNodeProps) {
  return (
    <div
      ref={(node) => {
        nodeRef.current = node;
      }}
      className="landing-beam-node"
    >
      <div className={`landing-beam-icon${emphasis ? ' landing-beam-icon--emphasis' : ''}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <span>{label}</span>
    </div>
  );
}

export function LandingBeamFlow() {
  const container = useRef<HTMLDivElement>(null);
  const request = useRef<HTMLDivElement>(null);
  const budget = useRef<HTMLDivElement>(null);
  const vendor = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const ledger = useRef<HTMLDivElement>(null);
  const approval = useRef<HTMLDivElement>(null);

  return (
    <section className="landing-beam-section" aria-labelledby="beam-flow-title">
      <div className="landing-wrap">
        <div className="landing-beam-heading">
          <p className="landing-mono">CONNECTED PURCHASE CONTROL</p>
          <h2 id="beam-flow-title" className="landing-display">
            Every decision reaches the right control point.
          </h2>
          <p>
            Procura links the request, policy, vendor, and approval record so a purchase
            never disappears between systems.
          </p>
        </div>

        <div ref={container} className="landing-beam-diagram">
          <div className="landing-beam-column">
            <FlowNode nodeRef={request} icon={ClipboardList} label="Request" />
            <FlowNode nodeRef={budget} icon={Landmark} label="Budget" />
            <FlowNode nodeRef={vendor} icon={BadgeCheck} label="Vendor" />
          </div>

          <FlowNode nodeRef={core} icon={Cloud} label="Procura Core" emphasis />

          <div className="landing-beam-column">
            <FlowNode nodeRef={ledger} icon={Database} label="Ledger" />
            <FlowNode nodeRef={approval} icon={ShieldCheck} label="Approval" />
          </div>

          <AnimatedBeam containerRef={container} fromRef={request} toRef={core} curvature={-34} duration={2.6} />
          <AnimatedBeam containerRef={container} fromRef={budget} toRef={core} curvature={0} duration={2.6} delay={0.5} />
          <AnimatedBeam containerRef={container} fromRef={vendor} toRef={core} curvature={34} duration={2.6} delay={1} />
          <AnimatedBeam containerRef={container} fromRef={core} toRef={ledger} curvature={-28} duration={2.2} delay={0.8} />
          <AnimatedBeam containerRef={container} fromRef={core} toRef={approval} curvature={28} duration={2.2} delay={1.4} />
        </div>
      </div>
    </section>
  );
}

export default LandingBeamFlow;