"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  CircleUserRound,
  Menu,
  Network,
  ShieldCheck,
  X,
} from "lucide-react";

const links = [
  { label: "Platform", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "FAQ", href: "#faq" },
];

export function Navigation5() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full px-4 pt-6">
      <div className="mx-auto flex max-w-7xl justify-center">
        <nav className="flex min-h-16 w-full max-w-5xl items-center justify-between gap-2 rounded-full border border-neutral-200 bg-white px-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <a href="#top" className="flex items-center gap-2 pl-2 pr-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white">
              <Network className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Procura
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            <a
              href="#product"
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Platform
            </a>
            <a
              href="#workflow"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Workflow
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">
                AI
              </span>
            </a>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              Solutions
              <ChevronDown className="size-4" />
            </button>
            <a
              href="#faq"
              className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              FAQ
            </a>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <a
              href="/app"
              aria-label="Open account"
              className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <CircleUserRound className="size-5" />
            </a>
            <a
              href="/app"
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Get started
            </a>
          </div>

          <button
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="rounded-full p-2 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </div>

      {open && (
        <div className="absolute top-24 right-4 left-4 z-30 mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 lg:hidden">
          <div className="grid gap-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {link.label === "Platform" ? (
                  <Activity className="size-4" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                {link.label}
              </a>
            ))}
            <a
              href="/app"
              className="mt-2 rounded-full bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get started
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navigation5;
