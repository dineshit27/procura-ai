import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, RefreshCw, Cpu, Layers, BarChart3 } from "lucide-react";

interface Visual1Props {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

const PROMPT_SCENARIOS = [
  {
    prompt: "Order 12x Dell UltraSharp 27\" Monitors for Design Team",
    qty: "12 units",
    category: "Hardware / IT",
    cost: "$4,188",
    confidence: "99.4%",
    department: "Engineering",
  },
  {
    prompt: "Renew 25x Figma Enterprise & GitHub Copilot annual seats",
    qty: "25 seats",
    category: "SaaS Software",
    cost: "$3,750",
    confidence: "98.8%",
    department: "Product / UX",
  },
  {
    prompt: "Procure 8x Herman Miller Aeron Chairs for Floor 3 expansion",
    qty: "8 units",
    category: "Office Facilities",
    cost: "$5,200",
    confidence: "99.1%",
    department: "Operations",
  },
];

const DEPARTMENT_VOLUME_DATA = [
  { dept: "Eng", val: 86, amount: "$8.6k" },
  { dept: "Design", val: 64, amount: "$6.4k" },
  { dept: "Ops", val: 42, amount: "$4.2k" },
  { dept: "Sales", val: 94, amount: "$9.4k" },
  { dept: "HR", val: 36, amount: "$3.6k" },
  { dept: "IT", val: 78, amount: "$7.8k" },
];

export function Visual1({
  mainColor = "#2457E6",
  secondaryColor = "#173BB8",
}: Visual1Props) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const currentScenario = PROMPT_SCENARIOS[scenarioIndex];

  // Auto cycle scenarios every 4.5 seconds if untouched
  useEffect(() => {
    const timer = setInterval(() => {
      setScenarioIndex((prev) => (prev + 1) % PROMPT_SCENARIOS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScenarioIndex((prev) => (prev + 1) % PROMPT_SCENARIOS.length);
  };

  return (
    <div
      aria-hidden
      className="relative h-[180px] w-[356px] overflow-hidden rounded-t-lg bg-white p-3.5 flex flex-col justify-between font-sans select-none border-b border-[#111827]/10"
      style={{
        backgroundColor: "#ffffff",
        "--main-color": mainColor,
        "--secondary-color": secondaryColor,
      } as React.CSSProperties}
    >
      {/* ================= NORMAL STATE ================= */}
      {/* Top Header: AI Status & Interactive Trigger */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6EEFE] border border-[#2457E6]/30 text-[10px] font-mono font-bold text-[#2457E6]">
          <Cpu className="size-3 text-[#2457E6] animate-pulse" />
          <span>AUTONOMOUS INTAKE</span>
        </div>

        {/* Clickable scenario switcher */}
        <button
          type="button"
          onClick={handleNext}
          title="Click to test another purchase prompt"
          className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-[#46536B] hover:text-[#2457E6] bg-[#FBF9F5] hover:bg-[#E6EEFE] px-2 py-0.5 rounded-md border border-[#111827]/15 transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className="size-2.5" />
          <span>Scenario {scenarioIndex + 1}/{PROMPT_SCENARIOS.length}</span>
        </button>
      </div>

      {/* Dynamic Prompt Card with animated transition */}
      <div className="rounded-xl border border-[#111827]/15 bg-[#FBF9F5] p-2.5 shadow-2xs transition-all duration-300 group-hover/animated-card:border-[#2457E6] group-hover/animated-card:bg-white relative">
        <div className="flex items-start gap-2">
          <Sparkles className="size-3.5 text-[#2457E6] mt-0.5 shrink-0 animate-bounce" />
          <AnimatePresence mode="wait">
            <motion.p
              key={scenarioIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              className="text-[11px] font-medium text-[#111827] leading-snug line-clamp-2"
            >
              &ldquo;{currentScenario.prompt}&rdquo;
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Extracted Entity Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#111827]/10 text-[10px] font-mono">
          <AnimatePresence mode="wait">
            <motion.div
              key={scenarioIndex + "-chips"}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 w-full"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-white border border-[#111827]/10 font-bold text-[#111827]">
                {currentScenario.qty}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-white border border-[#111827]/10 text-[#46536B]">
                {currentScenario.category}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#E6EEFE] text-[#2457E6] font-bold ml-auto flex items-center gap-1">
                <span className="size-1 rounded-full bg-[#2457E6] animate-ping" />
                {currentScenario.cost}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Live Micro-Sensing Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span>Gemini Parsed ({currentScenario.confidence})</span>
        </div>
        <div className="flex items-center gap-1 text-[#2457E6] font-bold">
          <Layers className="size-3 text-[#2457E6]" />
          <span>Hover for Graph →</span>
        </div>
      </div>

      {/* ================= HOVER REVEAL: VERTICAL BARS GRAPH ================= */}
      <div className="absolute inset-0 bg-white z-20 p-3.5 flex flex-col justify-between translate-y-full opacity-0 pointer-events-none group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100 group-hover/animated-card:pointer-events-auto transition-all duration-300 ease-out border-b border-[#111827]/10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6EEFE] border border-[#2457E6]/30 text-[9px] font-mono font-bold text-[#2457E6]">
            <BarChart3 className="size-3 text-[#2457E6]" />
            <span>DEPARTMENT INTAKE BARS</span>
          </div>
          <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-300">
            +24% vs Last Mo
          </span>
        </div>

        {/* Animated Vertical Bars */}
        <div className="flex items-end justify-between gap-2 h-20 px-1 pt-1.5">
          {DEPARTMENT_VOLUME_DATA.map((item, idx) => (
            <div key={item.dept} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[8px] font-mono font-bold text-[#2457E6]">
                {item.amount}
              </span>
              <div className="w-full bg-[#E6EEFE] rounded-t-md relative overflow-hidden flex items-end h-[50px]">
                <motion.div
                  initial={{ height: "0%" }}
                  whileInView={{ height: `${item.val}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.07, ease: "easeOut" }}
                  className="w-full rounded-t-md bg-gradient-to-t from-[#173BB8] to-[#2457E6]"
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-[#46536B]">
                {item.dept}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between text-[9px] font-mono text-[#46536B] pt-1 border-t border-[#111827]/10">
          <span>142 Active Requests</span>
          <span className="text-[#2457E6] font-bold">Auto-Categorized</span>
        </div>
      </div>
    </div>
  );
}

export default Visual1;
