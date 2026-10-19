import React from 'react';
import '../styles/landing.css';
import { LandingHero } from '../components/landing/LandingHero';
import Features1 from '../components/ui/feature-1';
import Timeline from '../components/ui/timeline';
import { LandingFaq } from '../components/landing/LandingFaq';
import { LandingCta } from '../components/landing/LandingCta';
import { LandingFooter } from '../components/landing/LandingFooter';

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
            textColor="#111111"
            mutedTextColor="#5b5b5b"
            activeColor="#623cf6"
            backgroundColor="#fefcf6"
          />
          <LandingFaq />
          <LandingCta />
        </main>
        <LandingFooter />
    </div>
  );
};

export default LandingPage;
