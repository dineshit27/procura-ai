// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  Sparkles,
  ShieldCheck,
  Users,
  FileCheck2,
  Wallet,
  BarChart3,
  MessageSquare,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import Strands from "./strands";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/* Inline stand-in for @gsap/react's useGSAP. Mirrors its default
   `revertOnUpdate: false`: one gsap.context lives for the component's
   lifetime, the callback is re-added when dependencies change, and the
   context is reverted only on unmount. A callback may return its own
   cleanup, which runs before the next re-add and on unmount. */
function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => { }, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const monthOrder = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
} as const;

type Month = keyof typeof monthOrder;

type JourneyItem = {
  id: string;
  year: string;
  month: Month;
  content: string;
};

type SplitTextInstance = InstanceType<typeof SplitText>;

export type TimelineProps = {
  title?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Reveal animation duration, in seconds. */
  duration?: number;
  /** Fallback reveal duration when `duration` is omitted, in seconds. */
  scrollDuration?: number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_REVEAL_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [0.04, 0.12], [0.12, 0.2], [0.2, 0.28], [0.28, 0.36],
  [0.36, 0.44], [0.44, 0.52], [0.52, 0.6],
];

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => { };

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

const topJourneyData: JourneyItem[] = [
  {
    id: "intake-march",
    year: "01",
    month: "March",
    content: "Describe a purchase need in plain language",
  },
  {
    id: "guard-april",
    year: "03",
    month: "April",
    content: "SpendGuard checks budget, supplier, and policy fit",
  },
  {
    id: "request-november",
    year: "05",
    month: "November",
    content: "Approved requests move forward with clear ownership",
  },
  {
    id: "learn-september",
    year: "07",
    month: "September",
    content: "Every completed purchase becomes useful operating context",
  },
];

const bottomJourneyData: JourneyItem[] = [
  {
    id: "match-july",
    year: "02",
    month: "July",
    content: "AI matches the request to relevant catalog options",
  },
  {
    id: "approve-may",
    year: "04",
    month: "May",
    content: "Stakeholders review the recommendation and approval trail",
  },
  {
    id: "checkout-october",
    year: "06",
    month: "October",
    content: "PayPal Sandbox checkout stays connected to the decision",
  },
];

const allJourneyItems: JourneyItem[] = [
  ...topJourneyData,
  ...bottomJourneyData,
].sort((a, b) => {
  const yearDiff = Number(a.year) - Number(b.year);
  if (yearDiff !== 0) return yearDiff;
  return monthOrder[a.month] - monthOrder[b.month];
});

type StepMetadata = {
  tag: string;
  detail: string;
  system: string;
  icon: React.ComponentType<{ className?: string }>;
};

const stepMeta: Record<string, StepMetadata> = {
  "intake-march": {
    tag: "Autonomous Intake",
    detail: "Natural Language Prompt",
    system: "Slack & Web",
    icon: MessageSquare,
  },
  "match-july": {
    tag: "AI Sourcing",
    detail: "Catalog & Multi-Vendor",
    system: "Gemini 2.5 Flash",
    icon: Sparkles,
  },
  "guard-april": {
    tag: "SpendGuard Engine",
    detail: "Policy, Budget & Vendor",
    system: "Deterministic",
    icon: ShieldCheck,
  },
  "approve-may": {
    tag: "Stakeholder Review",
    detail: "Threshold Governance",
    system: "Multi-Tier Signoff",
    icon: Users,
  },
  "request-november": {
    tag: "Clearance & PO",
    detail: "Designated Ownership",
    system: "Audit-Locked",
    icon: FileCheck2,
  },
  "checkout-october": {
    tag: "Instant Settlement",
    detail: "Live Sandbox Demo",
    system: "PayPal Gateway",
    icon: Wallet,
  },
  "learn-september": {
    tag: "Continuous Learning",
    detail: "Procurement Analytics",
    system: "Operating Memory",
    icon: BarChart3,
  },
};

export default function Timeline({
  title = "From request to checkout",
  periodLabel = "PROCURA WORKFLOW",
  textColor = "var(--color-foreground, #000000)",
  mutedTextColor = "var(--color-muted-foreground, #3f3f46)",
  activeColor = "#ff5f00",
  backgroundColor = "var(--color-background, #ffffff)",
  imageUrl = "https://i.pinimg.com/736x/8d/48/32/8d4832f91daa5b3eefb01e238e719288.jpg",
  imageAlt = "Team collaborating around a table",
  duration,
  scrollDuration = 1.2,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const launchpadRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);
  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  // Mobile browser chrome changes the visual viewport while scrolling. Drive
  // this sequence from the actual custom-scroller position so it remains
  // animated when ScrollTrigger's cached measurements become stale.
  useEffect(() => {
    const section = sectionRef.current;
    const slider = wholeSliderRef.current;
    const launchpad = launchpadRef.current;
    if (!section || !slider || !launchpad || window.innerWidth > 768) return;

    const scroller = section.closest<HTMLElement>(".cinematic-scroll");
    const scrollTarget: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const select = (selector: string) => Array.from(section.querySelectorAll<HTMLElement>(selector));
    const setAll = (selector: string, properties: gsap.TweenVars) => {
      const elements = select(selector);
      if (elements.length) gsap.set(elements, properties);
    };
    const offsetWithin = (element: HTMLElement, ancestor: HTMLElement) => {
      let offset = 0;
      let current: HTMLElement | null = element;
      while (current && current !== ancestor) {
        offset += current.offsetLeft;
        current = current.offsetParent as HTMLElement | null;
      }
      return offset;
    };

    const render = () => {
      frame = 0;
      const viewportHeight = scroller?.clientHeight ?? window.innerHeight;
      const sectionTop = scroller
        ? section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
        : section.getBoundingClientRect().top + window.scrollY;
      const scrollTop = scroller?.scrollTop ?? window.scrollY;
      const travel = Math.max(1, section.offsetHeight - viewportHeight);
      const progress = Math.min(1, Math.max(0, (scrollTop - sectionTop) / travel));

      // The track has a deliberately oversized width on phones.  Translating
      // by a percentage of that width leaves the terminal card off-screen on
      // many devices, so calculate the exact distance to its right edge.
      const viewportWidth = scroller?.clientWidth ?? window.innerWidth;
      const launchpadLeft = offsetWithin(launchpad, slider);
      const sliderTravel = Math.max(0, launchpadLeft + launchpad.offsetWidth - viewportWidth + 16);
      gsap.set(slider, { x: -sliderTravel * progress, xPercent: 0 });

      // Grow the conduit from the first scroll frame and finish it exactly at
      // the launchpad rail rather than at an arbitrary percentage of the track.
      const line = section.querySelector<HTMLElement>(".journey-line");
      const lineContainer = line?.parentElement;
      const lineTarget = lineContainer
        ? Math.max(0, launchpadLeft - offsetWithin(lineContainer, slider) + 8)
        : 0;
      setAll(".journey-line", { width: `${lineTarget * (reducedMotion ? 1 : progress)}px` });

      allJourneyItems.forEach((item, index) => {
        const [start, end] = MOBILE_REVEAL_POSITIONS[index];
        const itemProgress = reducedMotion ? 1 : Math.min(1, Math.max(0, (progress - start) / (end - start)));
        setAll(`.jl-${item.id}`, { scaleY: itemProgress });
        setAll(`.jh-${item.id}`, { scaleX: itemProgress });
        setAll(`.jd-${item.id}`, { scale: itemProgress });
        setAll(`.jc-${item.id}`, { opacity: 0.25 + itemProgress * 0.75, y: (1 - itemProgress) * 12 });
      });
    };
    const scheduleRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    allJourneyItems.forEach((item) => {
      setAll(`.jl-${item.id}`, { scaleY: 0, transformOrigin: "bottom bottom" });
      setAll(`.jh-${item.id}`, { scaleX: 0, transformOrigin: "left center" });
      setAll(`.jd-${item.id}`, { scale: 0 });
      setAll(`.jc-${item.id}`, { opacity: 0.25, y: 12 });
    });
    bottomJourneyData.forEach((item) => setAll(`.jl-${item.id}`, { transformOrigin: "top top" }));

    scheduleRender();
    scrollTarget.addEventListener("scroll", scheduleRender, { passive: true });
    window.addEventListener("resize", scheduleRender);
    window.visualViewport?.addEventListener("resize", scheduleRender);
    return () => {
      scrollTarget.removeEventListener("scroll", scheduleRender);
      window.removeEventListener("resize", scheduleRender);
      window.visualViewport?.removeEventListener("resize", scheduleRender);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section) return;
    const scroller = section.closest<HTMLElement>(".cinematic-scroll") ?? undefined;

    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    // The mobile track is deliberately shorter than the desktop one.  A long
    // off-screen tail made the later cards pass the viewport before their
    // reveal animation had completed.
    const slidePercent = isMobile ? -82 : -74;
    // End the conduit at the launchpad (the terminal card) instead of drawing
    // a line through the empty part of the mobile track.
    const lineWidth = isMobile ? "72%" : "100%";
    const lineStart = isMobile ? "top 20%" : "top 25%";
    const slideEnd = isMobile ? "98% bottom" : "94% bottom";
    // Finish the mobile conduit while the last workflow cards are still in
    // view.  This prevents the line from visibly crawling after step 3.
    const lineEnd = isMobile ? "76% bottom" : "94% bottom";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        scroller,
        start: "top top",
        end: slideEnd,
        scrub: true,
      },
      defaults: {
        ease: "none",
      },
    });

    tl.fromTo(
      wholeSliderRef.current,
      { xPercent: 0 },
      { xPercent: slidePercent },
    );

    if (reducedMotion) {
      gsap.set(".journey-line", { width: lineWidth });
      return;
    }

    gsap.to(".journey-line", {
      width: lineWidth,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        scroller,
        start: lineStart,
        end: lineEnd,
        scrub: true,
      },
    });
  }, { dependencies: [reducedMotion], scope: sectionRef });

  useGSAP(() => {
    const section = sectionRef.current;

    if (!section) return;
    const scroller = section.closest<HTMLElement>(".cinematic-scroll") ?? undefined;

    const items = allJourneyItems;

    if (window.innerWidth <= 768) return;

    if (reducedMotion) {
      items.forEach((item) => {
        gsap.set(`.jl-${item.id}`, { scaleY: 1 });
        gsap.set(`.jh-${item.id}`, { scaleX: 1 });
        gsap.set(`.jd-${item.id}`, { scale: 1 });
        gsap.set(`.jc-${item.id}`, { opacity: 1 });
        gsap.set(`.title-${item.id}`, { opacity: 1, clearProps: "transform" });
        gsap.set(`.description-${item.id}`, {
          opacity: 1,
          clearProps: "transform",
        });
      });
      return;
    }

    items.forEach((item) => {
      gsap.set(`.jl-${item.id}`, {
        scaleY: 0,
        transformOrigin: "bottom bottom",
      });
      gsap.set(`.jh-${item.id}`, {
        scaleX: 0,
        transformOrigin: "left center",
      });
      gsap.set(`.jd-${item.id}`, { scale: 0 });
      gsap.set(`.jc-${item.id}`, { opacity: 0.25 });
      gsap.set(`.title-${item.id}`, { opacity: 1 });
      gsap.set(`.description-${item.id}`, { opacity: 1 });
    });

    const titleSplits: Partial<Record<string, SplitTextInstance>> = {};
    const descriptionSplits: Partial<Record<string, SplitTextInstance>> = {};

    items.forEach((item) => {
      titleSplits[item.id] = new SplitText(`.title-${item.id}`, {
        type: "chars, words, lines",
        mask: "lines",
      });

      descriptionSplits[item.id] = new SplitText(`.description-${item.id}`, {
        type: "chars, words, lines",
        mask: "lines",
      });
    });

    const createItemTimeline = (
      item: JourneyItem,
      startPos: number,
      endPos: number,
    ) => {
      const lineSelector = `.jl-${item.id}`;
      const horizLineSelector = `.jh-${item.id}`;
      const dotSelector = `.jd-${item.id}`;
      const cardSelector = `.jc-${item.id}`;
      const titleLines = titleSplits[item.id]?.lines || [];
      const descriptionLines = descriptionSplits[item.id]?.lines || [];

      const isTop = topJourneyData.some((topItem) => topItem.id === item.id);

      if (!isTop) {
        gsap.set(lineSelector, { transformOrigin: "top top" });
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          scroller,
          start: `${startPos}% 30%`,
          end: `${endPos}% 50%`,
          scrub: true,
        },
      });

      timeline
        .to(lineSelector, {
          scaleY: 1,
          duration: normalizedDuration * 0.4,
        })
        .to(
          dotSelector,
          {
            scale: 1,
            duration: normalizedDuration * 0.4,
          },
          "<",
        )
        .to(
          horizLineSelector,
          {
            scaleX: 1,
            duration: normalizedDuration * 0.4,
          },
          "<",
        )
        .to(
          cardSelector,
          {
            opacity: 1,
            duration: normalizedDuration * 0.4,
          },
          "<",
        )
        .fromTo(
          titleLines,
          { y: 100 },
          {
            y: 0,
            delay: -0.8 * normalizedDuration,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
        )
        .fromTo(
          descriptionLines,
          { y: 100 },
          {
            y: 0,
            duration: normalizedDuration,
            stagger: 0.02,
            ease: "power2.out",
          },
          "<",
        );

      return timeline;
    };

    const positions: ReadonlyArray<readonly [number, number]> =
      window.innerWidth <= 768
        ? [
          // Reveal each card just before it reaches the viewport.  Keeping
          // these short and early prevents steps 5–7 from appearing only
          // after they have already scrolled past on phones.
          [10, 18],
          [17, 25],
          [24, 32],
          [31, 39],
          [38, 46],
          [45, 53],
          [52, 60],
        ]
        : [
          [6, 26],
          [16, 36],
          [26, 46],
          [35, 55],
          [32, 52],
          [43, 63],
          [54, 74],
        ];

    items.forEach((item, index) => {
      const [startPos, endPos] = positions[index];
      createItemTimeline(item, startPos, endPos);
    });

    const handleResize = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener("resize", handleResize);
    ScrollTrigger.refresh();
    const refreshFrame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      window.requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      Object.values(titleSplits).forEach((split) => split?.revert?.());
      Object.values(descriptionSplits).forEach((split) => split?.revert?.());
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(refreshFrame);
    };
  }, { dependencies: [normalizedDuration, reducedMotion], scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="workflow"
      className="h-[160vw] max-[768px]:h-[380vh] max-[600px]:h-[380vh] w-full relative border-b-2 border-[#111827]/10"
      style={sectionStyle}
    >
      <span id="journey" className="sr-only" />
      <div className="h-screen w-screen sticky top-[0%] flex flex-col justify-center overflow-hidden">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[30vw] w-[280vw] items-center gap-[5vw] px-[5vw] max-[768px]:h-[82vh] max-[768px]:w-[800vw] max-[768px]:px-[7vw] max-[600px]:h-[80vh] max-[600px]:w-[800vw] max-[600px]:px-[7vw]"
        >
          <div className="h-full w-[30vw] overflow-hidden rounded-[1vw] border-2 border-[#111827] shadow-[4px_4px_0px_#111827] max-[600px]:h-[min(65vw,240px)] max-[600px]:w-[85vw] max-[600px]:rounded-[3vw] max-[600px]:shadow-[3px_3px_0px_#111827]">
            <img
              src={imageUrl}
              alt={imageAlt}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="relative h-full w-full">
            {/* Center Conduit Track (Animated Horizontal Railway) */}
            <div className="w-full absolute left-0 top-1/2 -translate-y-1/2 flex items-center h-fit pointer-events-none">
              <div
                className="size-[0.8vw] max-[600px]:size-[2vw] rounded-full border-2 border-[#111827] shadow-[1px_1px_0px_#111827]"
                style={activeStyle}
              ></div>
              <div
                className="h-[3px] w-[0%] rounded-full journey-line"
                style={activeStyle}
              ></div>
            </div>

            {/* Top Row: Title + Steps 01, 03, 05, 07 */}
            <div className="flex h-1/2 w-full items-center justify-start gap-[.5vw]">
              <div className="h-full w-[20%] pt-[2vw] max-[600px]:h-fit max-[600px]:pt-[5vw] shrink-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#2457E6] text-white border-2 border-[#111827] shadow-[2px_2px_0px_#111827] font-mono text-[0.65vw] max-[600px]:text-[10px] font-bold uppercase mb-[0.6vw]">
                  <Zap className="size-[0.7vw] max-[600px]:size-2.5 fill-current" />
                  <span>Autonomous Flow</span>
                </div>
                <h2 className="w-[85%] font-display font-black tracking-[-0.025em] text-[2.6vw] leading-[1.0] text-[#111827] max-[600px]:text-[7.5vw]">
                  {title}
                </h2>
              </div>

              <div className="w-full flex h-full gap-x-[15vw] max-[600px]:gap-x-[40vw]">
                {topJourneyData.map((item) => {
                  const meta = stepMeta[item.id];
                  const Icon = meta?.icon || Sparkles;

                  return (
                    <div
                      key={`top-${item.id}`}
                      className="relative h-full w-[30vw] px-[3vw] max-[600px]:flex max-[600px]:w-[70vw] max-[600px]:flex-col max-[600px]:px-[7vw]"
                    >
                      {/* Vertical and horizontal connector lines & node */}
                      <div className="w-[3vw] max-[600px]:w-[7vw] absolute left-0 bottom-0 top-0 h-full pointer-events-none">
                        {/* Vertical line: from top-[0.7vw] down to bottom-0 (exact center line) */}
                        <div
                          className={`absolute left-0 top-[0.7vw] bottom-0 w-[2.5px] -translate-x-1/2 origin-bottom jl-${item.id}`}
                          style={activeStyle}
                        ></div>
                        {/* Horizontal line: bridges from left-0 straight into the card border */}
                        <div
                          className={`absolute left-0 top-[0.7vw] -translate-y-1/2 h-[2.5px] w-full origin-left jh-${item.id}`}
                          style={activeStyle}
                        ></div>
                        {/* Corner junction node */}
                        <div
                          className={`absolute left-0 top-[0.7vw] -translate-x-1/2 -translate-y-1/2 size-[1vw] max-[600px]:size-[2.5vw] rounded-full border-2 border-[#111827] bg-[#2457E6] shadow-[2px_2px_0px_#111827] flex items-center justify-center jd-${item.id}`}
                        >
                          <div className="size-[0.3vw] max-[600px]:size-[1vw] rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Neo-brutalist Step Card Container */}
                      <div className={`mt-[-1vw] max-[600px]:mt-[-2vw] jc-${item.id}`}>
                        <div className="bg-white border-2 border-[#111827] rounded-xl p-[1vw] max-[600px]:p-3.5 shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#2457E6] transition-shadow duration-200">
                          {/* Card header */}
                          <div className="flex items-center justify-between gap-2 border-b-2 border-[#111827]/10 pb-[0.4vw] mb-[0.6vw] max-[600px]:pb-2 max-[600px]:mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-black uppercase px-2 py-0.5 bg-[#2457E6] text-white rounded border border-[#111827] shadow-[1px_1px_0px_#111827]">
                                STEP {Number(item.year)}
                              </span>
                              <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-bold uppercase tracking-wider text-[#111827]">
                                {meta?.tag}
                              </span>
                            </div>
                            <div className="size-[1.6vw] max-[600px]:size-7 rounded-md bg-[#E6EEFE] border border-[#2457E6]/30 flex items-center justify-center text-[#2457E6]">
                              <Icon className="size-[0.85vw] max-[600px]:size-3.5" />
                            </div>
                          </div>

                          {/* Animated Title & Description */}
                          <div className="space-y-[0.3vw] max-[600px]:space-y-1">
                            <h4
                              className={`title-${item.id} font-display font-black tracking-tight text-[1.4vw] leading-tight text-[#111827] max-[600px]:text-[4.5vw]`}
                            >
                              Step {Number(item.year)}
                            </h4>
                            <p
                              className={`description-${item.id} font-sans text-[0.9vw] leading-snug text-[#46536B] max-[600px]:text-[3.2vw] font-medium`}
                              style={mutedTextStyle}
                            >
                              {item.content}
                            </p>
                          </div>

                          {/* Technical micro-spec footer */}
                          <div className="mt-[0.6vw] pt-[0.4vw] border-t border-[#111827]/10 flex items-center justify-between text-[0.6vw] max-[600px]:text-[8.5px] font-mono text-[#6B7280] max-[600px]:mt-2 max-[600px]:pt-1.5">
                            <span className="flex items-center gap-1 font-semibold">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {meta?.detail}
                            </span>
                            <span className="text-[#2457E6] font-bold">{meta?.system}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Procura AI App Launchpad Card after Step 07 (Phase 7) */}
                <div
                  ref={launchpadRef}
                  className="relative h-full w-[30vw] px-[2vw] max-[768px]:flex max-[768px]:w-[76vw] max-[768px]:flex-col max-[768px]:px-[6vw] max-[600px]:flex max-[600px]:w-[76vw] max-[600px]:flex-col max-[600px]:px-[6vw] shrink-0 pointer-events-auto"
                >
                  {/* Terminal rail: the launchpad is the end of the journey,
                      so it is centered on and connected to the conduit. */}
                  <div className="w-[3vw] max-[600px]:w-[7vw] absolute left-0 bottom-0 top-0 h-full pointer-events-none" aria-hidden="true">
                    <div
                      className="absolute left-0 top-[0.7vw] bottom-0 w-[2.5px] -translate-x-1/2"
                      style={activeStyle}
                    />
                    <div
                      className="absolute left-0 top-[0.7vw] -translate-y-1/2 h-[2.5px] w-full"
                      style={activeStyle}
                    />
                    <div className="absolute left-0 top-[0.7vw] -translate-x-1/2 -translate-y-1/2 size-[1vw] max-[600px]:size-[2.5vw] rounded-full border-2 border-[#111827] bg-[#2457E6] shadow-[2px_2px_0px_#111827] flex items-center justify-center">
                      <div className="size-[0.3vw] max-[600px]:size-[1vw] rounded-full bg-white" />
                    </div>
                  </div>
                  {/* Neo-brutalist Step Card Container */}
                  <div className="mt-[-1vw] max-[768px]:mt-[-2vw] max-[600px]:mt-[-2vw]">
                    <div className="relative bg-white border-2 border-[#111827] rounded-xl p-[1vw] max-[768px]:p-3.5 max-[600px]:p-3.5 shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#2457E6] transition-shadow duration-200">
                      {/* Card header */}
                      <div className="flex items-center justify-between gap-2 border-b-2 border-[#111827]/10 pb-[0.4vw] mb-[0.6vw] max-[600px]:pb-2 max-[600px]:mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-black uppercase px-2 py-0.5 bg-[#2457E6] text-white rounded border border-[#111827] shadow-[1px_1px_0px_#111827]">
                            PROCURA AI APP
                          </span>
                          <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-bold uppercase tracking-wider text-[#111827]">
                            Live Interactive Workspace
                          </span>
                        </div>
                        <div className="size-[1.6vw] max-[600px]:size-7 rounded-md bg-white border border-[#2457E6]/30 flex items-center justify-center p-0.5 shadow-xs overflow-hidden">
                          <img src="/procura-icon.png" alt="Procura AI Logo" className="size-full object-contain" />
                        </div>
                      </div>

                      {/* Animated Title & Description */}
                      <div className="space-y-[0.3vw] max-[600px]:space-y-1">
                        <h4
                          className="font-display font-black tracking-tight text-[1.4vw] leading-tight text-[#111827] max-[600px]:text-[4.5vw]"
                        >
                          Enter Procura AI
                        </h4>
                        <p
                          className="font-sans text-[0.85vw] leading-snug text-[#46536B] max-[600px]:text-[3vw] font-medium"
                          style={mutedTextStyle}
                        >
                          Launch the full procurement workspace to submit purchase requests, test SpendGuard policies, and run autonomous approvals.
                        </p>
                      </div>

                      {/* Clearly Visible Interactive Strands Canvas */}
                      <div className="h-[12vw] max-[768px]:h-28 max-[600px]:h-24 w-full relative rounded-lg border-2 border-[#111827] bg-[#111c38] overflow-hidden shadow-[2px_2px_0px_#111827] mt-[0.5vw]">
                        {/* Luminous ambient backdrop to make the particle clearly visible */}
                        <div
                          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.35)_0%,rgba(37,99,235,0.18)_50%,rgba(17,28,56,0.95)_85%)] pointer-events-none"
                          aria-hidden="true"
                        />
                        <Strands
                          colors={['#2457E6', '#60a5fa', '#93c5fd', '#ffffff', '#38bdf8', '#3b82f6', '#2563eb']}
                          interactive={true}
                          clickPulse={true}
                          energy={0.8}
                          speed={1.1}
                          glass={true}
                          glassSize={0.92}
                          scale={1.0}
                          glow={1.6}
                          intensity={1.3}
                          rim={2.2}
                          className="w-full h-full relative z-10"
                        />
                      </div>

                      {/* Action CTA: Open Workspace */}
                      <Link
                        to="/app"
                        className="mt-[0.6vw] max-[600px]:mt-2.5 w-full flex items-center justify-center gap-2 py-[0.6vw] max-[600px]:py-2.5 px-4 rounded-lg bg-[#2457E6] hover:bg-[#1d4ed8] text-white font-mono text-[0.8vw] max-[600px]:text-[12px] font-black uppercase tracking-wider border-2 border-[#111827] shadow-[3px_3px_0px_#111827] hover:shadow-[1px_1px_0px_#111827] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer group"
                      >
                        <span>Open Workspace</span>
                        <ArrowUpRight className="size-[0.9vw] max-[600px]:size-4 stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>

                      {/* Technical micro-spec footer */}
                      <div className="mt-[0.6vw] pt-[0.4vw] border-t border-[#111827]/10 flex items-center justify-between text-[0.6vw] max-[600px]:text-[8.5px] font-mono text-[#6B7280] max-[600px]:mt-2 max-[600px]:pt-1.5">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Live Demo Workspace
                        </span>
                        <span className="text-[#2457E6] font-bold">Instant Access</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Period Label + Steps 02, 04, 06 */}
            <div className="h-1/2 flex items-center justify-start w-full">
              <div className="w-[34%] pt-[2vw] max-[600px]:pt-[5vw] max-[600px]:w-[30%] h-full shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-[#111827] shadow-[3px_3px_0px_#111827] w-fit mb-[0.6vw]">
                  <span className="size-2 rounded-full bg-[#2457E6] animate-ping" />
                  <p className="font-mono uppercase tracking-[0.16em] text-[0.85vw] leading-none max-[600px]:text-[3.2vw] font-black text-[#111827]">
                    {periodLabel}
                  </p>
                </div>
                <p className="font-mono text-[0.75vw] text-[#46536B] leading-normal max-[600px]:text-[2.8vw] w-[80%]">
                  7 interconnected stages from natural language prompt to audit-locked transaction.
                </p>
              </div>

              <div className="w-full flex h-full gap-x-[20vw] ml-[7vw] max-[600px]:gap-x-[40vw] max-[600px]:ml-[7vw]">
                {bottomJourneyData.map((item) => {
                  const meta = stepMeta[item.id];
                  const Icon = meta?.icon || Sparkles;

                  return (
                    <div
                      key={`bottom-${item.id}`}
                      className="relative h-full w-[25vw] px-[3vw] max-[600px]:w-[70vw] max-[600px]:px-[7vw]"
                    >
                      {/* Vertical and horizontal connector lines & node */}
                      <div className="w-[3vw] max-[600px]:w-[7vw] absolute left-0 top-0 bottom-0 h-full pointer-events-none">
                        {/* Vertical line: from top-0 (exact center line) down to bottom-[0.8vw] */}
                        <div
                          className={`absolute left-0 top-0 bottom-[0.8vw] w-[2.5px] -translate-x-1/2 origin-top jl-${item.id}`}
                          style={activeStyle}
                        ></div>
                        {/* Horizontal line: bridges from left-0 straight into the card border */}
                        <div
                          className={`absolute left-0 bottom-[0.8vw] -translate-y-1/2 h-[2.5px] w-full origin-left jh-${item.id}`}
                          style={activeStyle}
                        ></div>
                        {/* Corner junction node */}
                        <div
                          className={`absolute left-0 bottom-[0.8vw] -translate-x-1/2 translate-y-1/2 size-[1vw] max-[600px]:size-[2.5vw] rounded-full border-2 border-[#111827] bg-[#2457E6] shadow-[2px_2px_0px_#111827] flex items-center justify-center jd-${item.id}`}
                        >
                          <div className="size-[0.3vw] max-[600px]:size-[1vw] rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Neo-brutalist Step Card Container */}
                      <div className={`flex h-full w-full flex-col justify-end jc-${item.id}`}>
                        <div className="bg-white border-2 border-[#111827] rounded-xl p-[1vw] max-[600px]:p-3.5 shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#2457E6] transition-shadow duration-200">
                          {/* Card header */}
                          <div className="flex items-center justify-between gap-2 border-b-2 border-[#111827]/10 pb-[0.4vw] mb-[0.6vw] max-[600px]:pb-2 max-[600px]:mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-black uppercase px-2 py-0.5 bg-[#2457E6] text-white rounded border border-[#111827] shadow-[1px_1px_0px_#111827]">
                                STEP {Number(item.year)}
                              </span>
                              <span className="font-mono text-[0.65vw] max-[600px]:text-[9.5px] font-bold uppercase tracking-wider text-[#111827]">
                                {meta?.tag}
                              </span>
                            </div>
                            <div className="size-[1.6vw] max-[600px]:size-7 rounded-md bg-[#E6EEFE] border border-[#2457E6]/30 flex items-center justify-center text-[#2457E6]">
                              <Icon className="size-[0.85vw] max-[600px]:size-3.5" />
                            </div>
                          </div>

                          {/* Animated Title & Description */}
                          <div className="space-y-[0.3vw] max-[600px]:space-y-1">
                            <h4
                              className={`title-${item.id} font-display font-black tracking-tight text-[1.4vw] leading-tight text-[#111827] max-[600px]:text-[4.5vw]`}
                            >
                              Step {Number(item.year)}
                            </h4>
                            <p
                              className={`description-${item.id} font-sans text-[0.9vw] leading-snug text-[#46536B] max-[600px]:text-[3.2vw] font-medium`}
                              style={mutedTextStyle}
                            >
                              {item.content}
                            </p>
                          </div>

                          {/* Technical micro-spec footer */}
                          <div className="mt-[0.6vw] pt-[0.4vw] border-t border-[#111827]/10 flex items-center justify-between text-[0.6vw] max-[600px]:text-[8.5px] font-mono text-[#6B7280] max-[600px]:mt-2 max-[600px]:pt-1.5">
                            <span className="flex items-center gap-1 font-semibold">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {meta?.detail}
                            </span>
                            <span className="text-[#2457E6] font-bold">{meta?.system}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
