"use client";

import { useState } from "react";
import {
  ArrowRight,
  GitBranch,
  HelpCircle,
  Mail,
  Menu,
  X,
  Zap,
} from "lucide-react";

const links = [
  { label: "Features", href: "/#product", icon: Zap },
  { label: "Workflow", href: "/#workflow", icon: GitBranch },
  { label: "FAQ", href: "/#faq", icon: HelpCircle },
  { label: "Contact", href: "/#contact", icon: Mail },
];

export function Navigation5() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full px-4 pt-6">
      <div className="mx-auto flex max-w-7xl justify-center">
        <nav className="flex min-h-16 w-full max-w-5xl items-center justify-between gap-2 rounded-full border-2 border-[#111827] bg-white px-3 shadow-[3px_3px_0px_#111827]">
          <a href="/#top" className="flex items-center gap-3 pl-2 pr-4 group">
            <div className="size-9 sm:size-10 rounded-xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 shrink-0">
              <img
                src="/procura-icon.png"
                alt="Procura AI Logo"
                className="size-full object-contain scale-120"
              />
            </div>
            <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#111827]">
              Procura
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex font-sans">
            <a
              href="/#product"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#46536B] transition-colors hover:bg-[#EAF0FF] hover:text-[#111827]"
            >
              Features
            </a>
            <a
              href="/#workflow"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#46536B] transition-colors hover:bg-[#EAF0FF] hover:text-[#111827]"
            >
              Workflow
              <span className="font-mono rounded-full bg-[#2457E6] px-1.5 py-0.5 text-[10px] font-bold text-white tracking-wider">
                AI
              </span>
            </a>
            <a
              href="/#faq"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#46536B] transition-colors hover:bg-[#EAF0FF] hover:text-[#111827]"
            >
              FAQ
            </a>
            <a
              href="/#contact"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#46536B] transition-colors hover:bg-[#EAF0FF] hover:text-[#111827]"
            >
              Contact
            </a>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <a
              href="/app"
              className="rounded-full bg-[#2457E6] px-6 py-2.5 text-sm font-bold text-white border-2 border-[#111827] shadow-[2px_2px_0px_#111827] transition-all hover:bg-[#173BB8] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#111827] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              Get started
            </a>
          </div>

          <button
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="rounded-full p-2 text-[#111827] transition-colors hover:bg-[#EAF0FF] lg:hidden cursor-pointer"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </div>

      {open && (
        <div className="absolute top-24 right-4 left-4 z-30 mx-auto max-w-5xl rounded-2xl border-2 border-[#111827] bg-white p-5 shadow-[4px_4px_0px_#111827] lg:hidden">
          <div className="grid gap-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#111827] hover:bg-[#EAF0FF] hover:text-[#2457E6] transition-colors"
                >
                  <Icon className="size-4 text-[#2457E6]" />
                  <span>{link.label}</span>
                </a>
              );
            })}
            <a
              href="/app"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#2457E6] px-5 py-2.5 text-center text-sm font-bold text-white border-2 border-[#111827] shadow-[2px_2px_0px_#111827]"
            >
              <span>Get started</span>
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navigation5;
