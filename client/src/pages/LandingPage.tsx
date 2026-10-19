import React from 'react';
import '../styles/landing.css';
import { LandingHero } from '../components/landing/LandingHero';
import Features1 from '../components/ui/feature-1';
import Timeline from '../components/ui/timeline';
import { LandingFaq } from '../components/landing/LandingFaq';
import ContactWithGlobe from '../components/ui/contact-with-globe';
import { LandingCta } from '../components/landing/LandingCta';
import { LandingFooter } from '../components/landing/LandingFooter';
import { FloatingChatbot } from '../components/chat/FloatingChatbot';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing">
        <a
          href="#platform"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <main>
          <LandingHero />
          <Features1 />
          <Timeline
            title="From request to checkout"
            periodLabel="PROCURA WORKFLOW"
            textColor="#111827"
            mutedTextColor="#46536B"
            activeColor="#2457E6"
            backgroundColor="#E6EEFE"
          />
          <LandingFaq />
          <LandingCta />
          <ContactWithGlobe />
        </main>
        <LandingFooter />
        <FloatingChatbot />
    </div>
  );
};

export default LandingPage;
