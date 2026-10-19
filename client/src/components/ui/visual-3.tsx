import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, CheckCircle2, Loader2, ArrowRight, Gauge } from "lucide-react";

interface Visual3Props {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

const POLICY_METRICS = [
  { rule: "Budget Limit ($5k)", pct: 68, label: "$3,420 Used", color: "from-blue-600 to-[#2457E6]" },
  { rule: "Vendor Trust Score", pct: 98, label: "Tier 1 Validated", color: "from-emerald-500 to-teal-600" },
  { rule: "Tax & Compliance", pct: 100, label: "Audit Certificate", color: "from-cyan-500 to-blue-600" },
  { rule: "Manager Approvals", pct: 100, label: "Pre-Authorized", color: "from-indigo-500 to-purple-600" },
];

export function Visual3({
  mainColor = "#2457E6",
  secondaryColor = "#173BB8",
}: Visual3Props) {
  const [checkoutState, setCheckoutState] = useState<"idle" | "processing" | "success">("idle");

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checkoutState !== "idle") return;

    setCheckoutState("processing");
    setTimeout(() => {
      setCheckoutState("success");
      setTimeout(() => {
        setCheckoutState("idle");
      }, 3500);
    }, 900);
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
      {/* Top Header: Policy Engine Status */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-mono font-bold text-emerald-700">
          <ShieldCheck className="size-3 text-emerald-600" />
          <span>SPENDGUARD™ PASS</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-[#2457E6] bg-[#E6EEFE] px-2 py-0.5 rounded-full border border-[#2457E6]/20">
          $3,420 / $5,000 CAP
        </span>
      </div>

      {/* Policy Progress & Interactive Checkout Box */}
      <div className="rounded-xl border border-[#111827]/15 bg-[#FBF9F5] p-2.5 space-y-2">
        {/* Animated Budget Bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#46536B] mb-1">
            <span>Budget Policy Utilization</span>
            <span className="font-bold text-[#111827]">68.4%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#E6EEFE] overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "68.4%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[#2457E6] to-[#386BFF]"
            />
          </div>
        </div>

        {/* Interactive PayPal Sandbox Gateway Card */}
        <div
          onClick={handleCheckoutClick}
          title="Click to simulate 1-click PayPal Sandbox Checkout"
          className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#111827]/15 shadow-2xs hover:border-[#2457E6] hover:shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[#003087] flex items-center justify-center text-white font-black text-[10px] tracking-tighter shrink-0">
              P
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#111827] leading-none">
                PayPal Sandbox Gateway
              </span>
              <span className="text-[9px] font-mono text-[#46536B] mt-0.5">
                {checkoutState === "idle" && "Click to test 1-Click Pay"}
                {checkoutState === "processing" && "Authorizing Sandbox Order..."}
                {checkoutState === "success" && "Captured • TXN-8921-PP"}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {checkoutState === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 bg-[#003087] text-white px-2 py-1 rounded text-[10px] font-mono font-bold hover:bg-[#002266] transition-colors"
              >
                <span>$3,420</span>
                <ArrowRight className="size-2.5" />
              </motion.div>
            )}

            {checkoutState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-mono font-bold"
              >
                <Loader2 className="size-2.5 animate-spin" />
                <span>Checking...</span>
              </motion.div>
            )}

            {checkoutState === "success" && (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-mono font-bold"
              >
                <CheckCircle2 className="size-2.5" />
                <span>Paid</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#46536B] pt-0.5 border-t border-[#111827]/10">
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <Lock className="size-2.5" />
          <span>256-bit Encrypted</span>
        </span>
        <span className="text-[#2457E6] font-bold flex items-center gap-1">
          <span>Hover for Matrix →</span>
        </span>
      </div>

      {/* ================= HOVER REVEAL: COMPLIANCE MATRIX RISK GAUGES ================= */}
      <div className="absolute inset-0 bg-white z-20 p-3.5 flex flex-col justify-between translate-y-full opacity-0 pointer-events-none group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100 group-hover/animated-card:pointer-events-auto transition-all duration-300 ease-out border-b border-[#111827]/10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[9px] font-mono font-bold text-emerald-700">
            <Gauge className="size-3 text-emerald-600" />
            <span>POLICY COMPLIANCE GAUGES</span>
          </div>
          <span className="font-mono text-[9px] font-bold text-[#2457E6] bg-[#E6EEFE] px-1.5 py-0.5 rounded-full border border-[#2457E6]/20">
            Risk: 0/100 (Safe)
          </span>
        </div>

        {/* 4 Compliance Category Progress Bars */}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 py-0.5">
          {POLICY_METRICS.map((item, idx) => (
            <div key={item.rule} className="flex flex-col gap-1 p-1.5 rounded-lg bg-[#FBF9F5] border border-[#111827]/10">
              <div className="flex items-center justify-between text-[8px] font-mono font-bold text-[#111827]">
                <span className="truncate">{item.rule}</span>
                <span className="text-[#2457E6]">{item.pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E6EEFE] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.pct}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                />
              </div>
              <span className="text-[7.5px] font-mono text-neutral-500 leading-none">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between text-[9px] font-mono text-[#46536B] pt-0.5 border-t border-[#111827]/10">
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <CheckCircle2 className="size-2.5" />
            <span>Auto-Checkout Cleared</span>
          </span>
          <span className="text-[#003087] font-bold">PayPal Sandbox Ready</span>
        </div>
      </div>
    </div>
  );
}

export default Visual3;
