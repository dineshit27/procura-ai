import React from 'react';
import { useReveal } from './useReveal';
import SynthexHero from '@/components/ui/synthex-hero';
import {
  AnimatedCard,
  CardBody,
  CardTitle,
  CardVisual,
} from '@/components/ui/animated-card';
import { Visual1 } from '@/components/ui/visual-1';
import { Visual2 } from '@/components/ui/visual-2';
import { Visual3 } from '@/components/ui/visual-3';
import { MarqueeLogoScroller } from '@/components/ui/marquee-logo-scroller';
import { PROCUREMENT_LOGOS } from './procurementLogos';

export const LandingHero: React.FC = () => {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <section className="landing-hero" id="top">
      <SynthexHero />

      <div className="w-full bg-white border-b-2 border-[#111827]/10" style={{ backgroundColor: '#ffffff' }}>
        <div ref={revealRef} className="reveal landing-wrap relative z-[1] landing-grid-fade pt-8 pb-8 px-2 sm:px-10 bg-white" style={{ backgroundColor: '#ffffff' }}>
          <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-start">
            <AnimatedCard className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <CardVisual className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <Visual1 mainColor="#2457E6" secondaryColor="#173BB8" />
              </CardVisual>
              <CardBody className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <CardTitle>Describe the purchase</CardTitle>
              </CardBody>
            </AnimatedCard>
            <AnimatedCard className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <CardVisual className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <Visual2 mainColor="#2457E6" secondaryColor="#173BB8" />
              </CardVisual>
              <CardBody className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <CardTitle>Compare better options</CardTitle>
              </CardBody>
            </AnimatedCard>
            <AnimatedCard className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <CardVisual className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <Visual3 mainColor="#2457E6" secondaryColor="#173BB8" />
              </CardVisual>
              <CardBody className="bg-white" style={{ backgroundColor: '#ffffff' }}>
                <CardTitle>Control the checkout</CardTitle>
              </CardBody>
            </AnimatedCard>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#E6EEFE] border-t-2 border-b-2 border-[#111827]/10 py-8 sm:py-10">
        <div className="landing-wrap relative z-[1]">
          <MarqueeLogoScroller
            title="One procurement layer for every marketplace"
            description="Procura can connect your purchasing workflow with platforms such as Amazon, Flipkart, Swiggy, Meesho, and more so teams can compare options, enforce policy, and keep every order traceable."
            logos={[...PROCUREMENT_LOGOS]}
            speed="normal"
            className="bg-white border-2 border-[#111827] shadow-[4px_4px_0px_#111827]"
          />
        </div>
      </div>
    </section>
  );
};
