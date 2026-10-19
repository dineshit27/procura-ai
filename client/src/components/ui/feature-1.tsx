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
  "rounded-3xl bg-muted/50 ring-0 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)]";
const iconClassName =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-[inset_0_2px_0_2px_rgba(255,255,255,1),0_2px_4px_rgba(0,0,0,0.05)]";
const badgeClassName =
  "text-muted-foreground inline-flex items-center rounded-md bg-white/80 px-2 py-1 text-[10px] font-medium shadow-[0_1px_4px_rgba(0,0,0,0.05)]";

export default function Features1() {
  return (
    <section className="theme-injected flex w-full flex-col items-center justify-center px-[clamp(20px,4vw,64px)] py-16">
      <h2 className="mb-12 max-w-3xl text-center text-3xl leading-[0.98] font-semibold md:text-5xl">
        Everything your team needs to purchase with confidence
      </h2>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="bg-muted mb-2 size-fit rounded-lg p-px">
              <div className={iconClassName}>
                <HiLightBulb className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <h3 className="text-lg font-medium">Describe the need</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Turn a plain-language team request into a structured purchase brief.
            </p>
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <span className={badgeClassName}>AI-assisted intake</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="bg-muted mb-2 size-fit rounded-lg p-px">
              <div className={iconClassName}>
                <HiDatabase className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <h3 className="mb-1 text-lg font-medium">Match the catalog</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Compare relevant products, suppliers, and prices before you commit.
            </p>
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <span className={badgeClassName}>Context-aware options</span>
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-2 rounded-3xl bg-muted/50 ring-0 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          <CardContent className="p-6">
            <div className="bg-muted mb-3 size-fit rounded-lg p-px">
              <div className={iconClassName}>
                <HiShieldCheck className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-medium">SpendGuard protection</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Apply budget, supplier, and policy checks before an order reaches checkout.
            </p>

            <div className="space-y-3">
              <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-xs">
                <span className="text-muted-foreground">Budget policy</span>
                <span className="font-medium">Checked</span>
              </div>
              <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-xs">
                <span className="text-muted-foreground">Supplier match</span>
                <span className="font-medium">Verified</span>
              </div>
              <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-xs">
                <span className="text-muted-foreground">Approval trail</span>
                <span className="font-medium">Recorded</span>
              </div>
            </div>
          </CardContent>

          <div className="px-6 pb-6">
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <span className={badgeClassName}>Ready for approval</span>
            </div>
          </div>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="bg-muted mb-2 size-fit rounded-lg p-px">
              <div className={iconClassName}>
                <HiSwitchHorizontal className="h-5 w-5 text-pink-500" />
              </div>
            </div>
            <h3 className="mb-1 text-lg font-medium">Keep work moving</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Keep approved purchases synchronized from decision to Sandbox checkout.
            </p>
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <span className={badgeClassName}>No hidden delays</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardContent className="p-6">
            <div className="bg-muted mb-2 size-fit rounded-lg p-px">
              <div className={iconClassName}>
                <HiSupport className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <h3 className="mb-1 text-lg font-medium">Stay in control</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Give every stakeholder a clear view of status, ownership, and next steps.
            </p>
            <div className="bg-muted inline-flex rounded-lg p-0.5">
              <span className={badgeClassName}>One shared workspace</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
