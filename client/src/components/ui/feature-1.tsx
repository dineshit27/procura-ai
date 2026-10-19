"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  HiDatabase,
  HiLightBulb,
  HiShieldCheck,
  HiSupport,
  HiSwitchHorizontal,
} from "react-icons/hi";

const cardClassName =
  "rounded-2xl border-2 border-[#111827] bg-white transition-all duration-200 shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#2457E6]";
const iconClassName =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-[#111827] bg-[#EAF0FF] shadow-[2px_2px_0px_#111827]";
const badgeClassName =
  "font-mono text-[#173BB8] inline-flex items-center rounded-md border border-[#2457E6]/30 bg-[#EAF0FF] px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase";

export default function Features1() {
  return (
    <section id="product" className="theme-injected flex w-full flex-col items-center justify-center bg-white px-[clamp(20px,4vw,64px)] py-10 sm:py-14 border-b-2 border-[#111827]/10">
      <span id="platform" className="sr-only" />
      <h2 className="mb-8 max-w-3xl text-center font-display text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.025em] leading-[1.08] text-[#111827]">
        Everything your team needs to purchase with confidence
      </h2>

      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3">
        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="mb-3 size-fit">
              <div className={iconClassName}>
                <HiLightBulb className="h-5 w-5 text-[#2457E6]" />
              </div>
            </div>
            <h3 className="font-display text-[22px] font-bold tracking-tight text-[#111827]">Describe the need</h3>
            <p className="mb-4 font-sans text-[15px] leading-relaxed text-[#46536B]">
              Turn a plain-language team request into a structured purchase brief.
            </p>
            <div className="inline-flex">
              <span className={badgeClassName}>AI-assisted intake</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="mb-3 size-fit">
              <div className={iconClassName}>
                <HiDatabase className="h-5 w-5 text-[#173BB8]" />
              </div>
            </div>
            <h3 className="mb-1 font-display text-[22px] font-bold tracking-tight text-[#111827]">Match the catalog</h3>
            <p className="mb-4 font-sans text-[15px] leading-relaxed text-[#46536B]">
              Compare relevant products, suppliers, and prices before you commit.
            </p>
            <div className="inline-flex">
              <span className={badgeClassName}>Context-aware options</span>
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-2 rounded-2xl border-2 border-[#111827] bg-white transition-all duration-200 shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#2457E6]">
          <CardContent className="p-6">
            <div className="mb-4 size-fit">
              <div className={iconClassName}>
                <HiShieldCheck className="h-5 w-5 text-[#2457E6]" />
              </div>
            </div>
            <h3 className="mb-2 font-display text-[22px] font-bold tracking-tight text-[#111827]">SpendGuard protection</h3>
            <p className="mb-6 font-sans text-[15px] leading-relaxed text-[#46536B]">
              Apply budget, supplier, and policy checks before an order reaches checkout.
            </p>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between rounded-lg border border-[#111827]/15 bg-[#F5F8FF] px-3.5 py-2.5 text-xs">
                <span className="text-[#46536B] font-medium">Budget policy</span>
                <span className="font-bold text-[#2457E6] bg-[#EAF0FF] px-2 py-0.5 rounded border border-[#2457E6]/20 uppercase tracking-wider text-[11px]">Checked</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#111827]/15 bg-[#F5F8FF] px-3.5 py-2.5 text-xs">
                <span className="text-[#46536B] font-medium">Supplier match</span>
                <span className="font-bold text-[#2457E6] bg-[#EAF0FF] px-2 py-0.5 rounded border border-[#2457E6]/20 uppercase tracking-wider text-[11px]">Verified</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#111827]/15 bg-[#F5F8FF] px-3.5 py-2.5 text-xs">
                <span className="text-[#46536B] font-medium">Approval trail</span>
                <span className="font-bold text-[#2457E6] bg-[#EAF0FF] px-2 py-0.5 rounded border border-[#2457E6]/20 uppercase tracking-wider text-[11px]">Recorded</span>
              </div>
            </div>
          </CardContent>

          <div className="px-6 pb-6">
            <div className="inline-flex">
              <span className={badgeClassName}>Ready for approval</span>
            </div>
          </div>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="mb-3 size-fit">
              <div className={iconClassName}>
                <HiSwitchHorizontal className="h-5 w-5 text-[#386BFF]" />
              </div>
            </div>
            <h3 className="mb-1 font-display text-[22px] font-bold tracking-tight text-[#111827]">Keep work moving</h3>
            <p className="mb-4 font-sans text-[15px] leading-relaxed text-[#46536B]">
              Keep approved purchases synchronized from decision to Sandbox checkout.
            </p>
            <div className="inline-flex">
              <span className={badgeClassName}>No hidden delays</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="mb-3 size-fit">
              <div className={iconClassName}>
                <HiSupport className="h-5 w-5 text-[#2457E6]" />
              </div>
            </div>
            <h3 className="mb-1 font-display text-[22px] font-bold tracking-tight text-[#111827]">Stay in control</h3>
            <p className="mb-4 font-sans text-[15px] leading-relaxed text-[#46536B]">
              Give every stakeholder a clear view of status, ownership, and next steps.
            </p>
            <div className="inline-flex">
              <span className={badgeClassName}>One shared workspace</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
