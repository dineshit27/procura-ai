import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Award, Check, Store, SlidersHorizontal } from "lucide-react";

interface Visual2Props {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

interface VendorOption {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  delivery: string;
  isBest?: boolean;
}

const VENDORS: VendorOption[] = [
  {
    id: "insight",
    name: "Insight Direct",
    price: 3420,
    originalPrice: 4188,
    delivery: "2-Day Express",
    isBest: true,
  },
  {
    id: "cdw",
    name: "CDW Procurement",
    price: 3890,
    originalPrice: 4188,
    delivery: "3-5 Business Days",
    isBest: false,
  },
  {
    id: "amazon",
    name: "Amazon Business",
    price: 4188,
    originalPrice: 4188,
    delivery: "Standard Prime",
    isBest: false,
  },
];

const VARIANCE_DATA = [
  { name: "Insight Partner", price: "$3,420", pct: 55, tag: "-18.3%", isBest: true, color: "from-[#173BB8] to-[#2457E6]" },
  { name: "CDW Procurement", price: "$3,890", pct: 76, tag: "-7.1%", isBest: false, color: "from-blue-400 to-indigo-400" },
  { name: "Amazon Baseline", price: "$4,188", pct: 90, tag: "Base 0%", isBest: false, color: "from-neutral-400 to-neutral-300" },
  { name: "OEM List Price", price: "$4,450", pct: 100, tag: "+6.2%", isBest: false, color: "from-rose-400 to-rose-300" },
];

export function Visual2({
  mainColor = "#2457E6",
  secondaryColor = "#173BB8",
}: Visual2Props) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>("insight");
  const selectedVendor = VENDORS.find((v) => v.id === selectedVendorId) || VENDORS[0];
  const maxPrice = 4188;
  const savings = maxPrice - selectedVendor.price;
  const savingsPercent = Math.round((savings / maxPrice) * 100);

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
      {/* Top Header: Comparison Badge & Live Savings Counter */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6EEFE] border border-[#2457E6]/30 text-[10px] font-mono font-bold text-[#2457E6]">
          <Store className="size-3 text-[#2457E6]" />
          <span>MARKETPLACE ARBITRAGE</span>
        </div>

        {/* Animated Savings Callout */}
        <motion.div
          key={selectedVendorId}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300"
        >
          <TrendingDown className="size-3 text-emerald-600" />
          <span>
            {savings > 0 ? `SAVE $${savings.toLocaleString()} (-${savingsPercent}%)` : "BASE QUOTE"}
          </span>
        </motion.div>
      </div>

      {/* Interactive Vendor Comparison Bars */}
      <div className="flex flex-col gap-1.5">
        {VENDORS.map((vendor) => {
          const isSelected = vendor.id === selectedVendorId;
          const barWidthPercent = Math.round((vendor.price / maxPrice) * 100);

          return (
            <div
              key={vendor.id}
              onClick={() => setSelectedVendorId(vendor.id)}
              className={`relative overflow-hidden flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-sans cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-[#E6EEFE] border-[#2457E6] shadow-xs"
                  : "bg-[#FBF9F5] border-[#111827]/10 hover:border-[#111827]/30"
              }`}
            >
              {/* Progress Fill Bar Behind Content */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${barWidthPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute left-0 top-0 bottom-0 pointer-events-none opacity-20 ${
                  vendor.isBest ? "bg-[#2457E6]" : "bg-neutral-400"
                }`}
              />

              <div className="flex items-center gap-1.5 relative z-10">
                {vendor.isBest ? (
                  <Award className="size-3 text-[#2457E6] shrink-0" />
                ) : (
                  <div className={`size-2 rounded-full ${isSelected ? "bg-[#2457E6]" : "bg-neutral-300"}`} />
                )}
                <span className={`font-semibold ${isSelected ? "text-[#111827]" : "text-[#46536B]"}`}>
                  {vendor.name}
                </span>
                {vendor.isBest && (
                  <span className="px-1 py-0.2 rounded bg-[#2457E6] text-white text-[8px] font-mono font-bold uppercase tracking-wider">
                    Best Value
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono relative z-10">
                {vendor.price < vendor.originalPrice && (
                  <span className="text-emerald-700 text-[10px] font-bold">
                    -${vendor.originalPrice - vendor.price}
                  </span>
                )}
                <span className={`font-bold ${isSelected ? "text-[#2457E6]" : "text-neutral-700"}`}>
                  ${vendor.price.toLocaleString()}
                </span>
                {isSelected && <Check className="size-3 text-[#2457E6]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Metric */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#46536B] pt-0.5 border-t border-[#111827]/10">
        <span>Delivery: {selectedVendor.delivery}</span>
        <span className="text-[#2457E6] font-bold">Hover for Variance →</span>
      </div>

      {/* ================= HOVER REVEAL: HORIZONTAL VARIANCE SPREAD GRAPH ================= */}
      <div className="absolute inset-0 bg-white z-20 p-3.5 flex flex-col justify-between translate-y-full opacity-0 pointer-events-none group-hover/animated-card:translate-y-0 group-hover/animated-card:opacity-100 group-hover/animated-card:pointer-events-auto transition-all duration-300 ease-out border-b border-[#111827]/10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E6EEFE] border border-[#2457E6]/30 text-[9px] font-mono font-bold text-[#2457E6]">
            <SlidersHorizontal className="size-3 text-[#2457E6]" />
            <span>PRICE VARIANCE SPREAD</span>
          </div>
          <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-300">
            Max Spread: -$768
          </span>
        </div>

        {/* Animated Horizontal Spread Bars */}
        <div className="flex flex-col gap-1.5 py-1">
          {VARIANCE_DATA.map((item, idx) => (
            <div key={item.name} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className={item.isBest ? "font-bold text-[#2457E6]" : "text-[#46536B]"}>
                  {item.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={item.isBest ? "font-bold text-emerald-700" : "text-neutral-400"}>
                    {item.tag}
                  </span>
                  <span className="font-bold text-[#111827]">{item.price}</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#F4F1EA] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.pct}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between text-[9px] font-mono text-[#46536B] pt-1 border-t border-[#111827]/10">
          <span>4 Connected Marketplaces</span>
          <span className="text-emerald-700 font-bold">18.3% Net Delta Saved</span>
        </div>
      </div>
    </div>
  );
}

export default Visual2;
