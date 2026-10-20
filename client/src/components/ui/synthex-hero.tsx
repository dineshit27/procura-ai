"use client";

import { useEffect, useRef } from "react";
import Navigation5 from "@/components/ui/navigation-5";
import { SparklesText } from "@/components/ui/sparkles-text";

const barCount = 23;
const centerIndex = Math.floor(barCount / 2);

export default function SynthexHero() {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const bars = barsRef.current;
    const start = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const time = (now - start) * 0.001;

      bars.forEach((bar, index) => {
        if (!bar) return;
        const distance = Math.abs(index - centerIndex);
        const normalizedDistance = distance / centerIndex;
        const baseHeight = 22 + Math.pow(normalizedDistance, 1.4) * 68;
        const wave = Math.sin(time * 1.2 + index * 0.25) * 2;
        const pulse = Math.sin(time * 1.5 + index * 0.15) * 0.05;

        bar.style.height = `${baseHeight + wave}%`;
        bar.style.opacity = `${0.9 + pulse}`;
      });

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-hidden bg-[#060B1A] text-white selection:bg-[#2457E6]/40"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="absolute inset-0 z-0 flex items-end justify-center gap-0 px-0 pb-0">
        {Array.from({ length: barCount }, (_, index) => (
          <div
            key={index}
            ref={(bar) => {
              if (bar) barsRef.current[index] = bar;
            }}
            className="h-full w-full flex-1 origin-bottom border-x border-black/40 opacity-90 transition-transform"
            style={{
              height: `${22 + Math.pow(Math.abs(index - centerIndex) / centerIndex, 1.4) * 68}%`,
              background:
                "linear-gradient(to top, #060B1A 0%, #173BB8 22%, #FFFFFF 42%, #2457E6 65%, #386BFF 85%, transparent 95%)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <Navigation5 />

        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8 text-center sm:pb-32 sm:pt-0">
          <div className="group relative mb-7 cursor-pointer">
            <div className="absolute inset-0 rounded-full bg-[#2457E6] opacity-40 blur-2xl transition-all duration-700 group-hover:scale-110 group-hover:opacity-70" />
            <div className="relative rounded-full border border-[#386BFF]/40 bg-[#2457E6]/15 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#EAF0FF] backdrop-blur-sm shadow-[2px_2px_0px_rgba(255,255,255,0.15)]">
              Intelligence for every purchase
            </div>
          </div>

          <h1 className="mb-5 max-w-4xl font-display text-[clamp(2.5rem,5.2vw,4.5rem)] font-bold tracking-[-0.03em] leading-[1.06] text-white">
            Smarter{" "}
            <SparklesText
              as="span"
              className="inline-block text-inherit font-inherit"
              style={{ fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit' }}
              colors={{ first: "#60A5FA", second: "#FFFFFF" }}
              sparklesCount={8}
            >
              purchase
            </SparklesText>
            . Controlled spending.
          </h1>

          <p className="mb-9 max-w-[560px] font-sans text-base leading-relaxed text-slate-300 md:text-lg">
            Procura AI turns purchasing requests into policy-checked recommendations, with budget controls and human approval before payment.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="/app"
              className="w-full rounded-full bg-white px-7 py-3 font-sans text-sm font-bold tracking-wide text-[#111827] border-2 border-white shadow-[3px_3px_0px_#2457E6] transition-all duration-200 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#386BFF] sm:w-auto"
            >
              Open Workspace
            </a>
            <a
              href="#workflow"
              className="w-full rounded-full border-2 border-white/60 bg-black/40 px-7 py-3 font-sans text-sm font-semibold tracking-wide text-white backdrop-blur-md transition-all duration-200 hover:border-white hover:bg-white/10 hover:shadow-[3px_3px_0px_rgba(255,255,255,0.2)] sm:w-auto"
            >
              How it works?
            </a>
          </div>
        </main>
      </div>
    </section>
  );
}
