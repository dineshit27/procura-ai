import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Github, Menu, X } from 'lucide-react';

const SECTION_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#sandbox', label: 'Sandbox' },
];

export const LandingNav: React.FC = () => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="landing-nav">
      <div className="landing-wrap flex items-center justify-between h-[72px] gap-4">
        <a href="#top" className="flex items-center gap-2.5 shrink-0" onClick={close}>
          <span className="w-8 h-8 rounded-full bg-[#623cf6] text-white grid place-items-center text-sm font-bold">
            P
          </span>
          <span className="text-[22px] tracking-tight text-black landing-display leading-none pt-0.5">
            procura
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-neutral-800">
          {SECTION_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-[#623cf6] transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2.5">
          <a
            href="https://github.com/dineshit27/procura-ai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="w-9 h-9 rounded-full border border-black/15 grid place-items-center text-neutral-600 hover:text-[#623cf6] hover:border-[#623cf6]/30 transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <a href="#sandbox" className="landing-pill landing-pill--outline-light">
            Sandbox notes
          </a>
          <Link to="/app" className="landing-pill landing-pill--purple">
            Open workspace
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden w-10 h-10 rounded-full border border-black/15 grid place-items-center"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-black/10 bg-white px-5 pb-5 pt-3 space-y-1">
          {SECTION_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={close}
              className="block py-2.5 text-sm font-medium"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link to="/app" onClick={close} className="landing-pill landing-pill--purple w-full">
              Open workspace
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/app?tab=new-request"
              onClick={close}
              className="landing-pill landing-pill--ghost w-full"
            >
              New purchase request
            </Link>
            <a
              href="https://github.com/dineshit27/procura-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-pill landing-pill--outline-light w-full"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
