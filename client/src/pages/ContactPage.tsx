import React from 'react';
import Navigation5 from '../components/ui/navigation-5';
import ContactWithGlobe from '../components/ui/contact-with-globe';
import { LandingFooter } from '../components/landing/LandingFooter';
import { FloatingChatbot } from '../components/chat/FloatingChatbot';
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContactPage: React.FC = () => {
  return (
    <div className="landing min-h-screen flex flex-col justify-between bg-[#FBF9F5] font-sans selection:bg-[#2457E6] selection:text-white">
      <div>
        <header className="sticky top-0 z-40 bg-[#060B1A] border-b-2 border-[#111827]">
          <Navigation5 />
        </header>

        <main>
          {/* Breadcrumb / Back banner */}
          <div className="w-full bg-[#E6EEFE] border-b-2 border-[#111827]/10 py-3.5 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#2457E6] hover:text-[#173BB8] transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to Home
              </Link>
              <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-[#46536B]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#2457E6]" />
                  Verified SLA: 1 business day
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" />
                  Live Sandbox Support
                </span>
              </div>
            </div>
          </div>

          {/* Contact with Globe component */}
          <ContactWithGlobe />
        </main>
      </div>

      <LandingFooter />
      <FloatingChatbot />
    </div>
  );
};

export default ContactPage;
