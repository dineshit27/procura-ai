"use client";

import { useEffect, useRef } from "react";
import Navigation5 from "@/components/ui/navigation-5";

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
      className="relative min-h-screen overflow-hidden bg-[#030303] text-white selection:bg-blue-500/30"
      style={{ fontFamily: "Inter, sans-serif" }}
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
                "linear-gradient(to top, #020617 0%, #1e3a8a 22%, #ffffff 42%, #3b82f6 65%, transparent 95%)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navigation5 />

        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-32 text-center">
          <div className="group relative mb-7 cursor-pointer">
            <div className="absolute inset-0 rounded-full bg-[#3b82f6] opacity-40 blur-2xl transition-all duration-700 group-hover:scale-110 group-hover:opacity-70" />
            <div className="relative rounded-full border border-blue-300/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-100 backdrop-blur-sm">
              Intelligence for every purchase
            </div>
          </div>

          <h1 className="mb-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            Systems That Think Ahead.
          </h1>

          <p className="mb-9 max-w-[540px] text-sm leading-relaxed text-gray-400 md:text-base">
            Design, build, and optimize procurement workflows using intelligence
            that maps your processes and improves with every action.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="/app"
              className="w-full rounded-full bg-white px-7 py-3 text-sm font-medium text-black shadow-[0_0_24px_rgba(255,255,255,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(255,255,255,0.45)] sm:w-auto"
            >
              Launch Now
            </a>
            <a
              href="#workflow"
              className="w-full rounded-full border border-white/10 bg-black/40 px-7 py-3 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              Play Video
            </a>
          </div>
        </main>
      </div>
    </section>
  );
}
